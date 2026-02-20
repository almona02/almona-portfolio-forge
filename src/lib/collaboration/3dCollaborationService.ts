import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface CollaborationSession {
  id: string
  model_path: string
  created_by: string
  participants: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Participant {
  id: string
  name: string
  avatar_url?: string
  role: 'viewer' | 'annotator' | 'presenter'
  cursor_position?: {
    x: number
    y: number
    z: number
  }
  camera_position?: {
    position: { x: number; y: number; z: number }
    target: { x: number; y: number; z: number }
  }
  last_seen: string
}

export interface Annotation {
  id: string
  session_id: string
  author_id: string
  position: { x: number; y: number; z: number }
  text: string
  color: string
  created_at: string
}

export interface CollaborationState {
  session: CollaborationSession | null
  participants: Participant[]
  annotations: Annotation[]
  isConnected: boolean
}

class Collaboration3DService {
  private channel: RealtimeChannel | null = null
  private sessionId: string | null = null
  private userId: string | null = null

  async createSession(modelPath: string, userId: string): Promise<CollaborationSession> {
    const { data, error } = await supabase
      .from('collaboration_sessions')
      .insert({
        model_path: modelPath,
        created_by: userId,
        participants: [userId],
        is_active: true
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  async joinSession(sessionId: string, userId: string): Promise<CollaborationSession> {
    const { data, error } = await supabase
      .from('collaboration_sessions')
      .update({
        participants: supabase.sql`array_append(participants, ${userId})`,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async leaveSession(sessionId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('collaboration_sessions')
      .update({
        participants: supabase.sql`array_remove(participants, ${userId})`,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)

    if (error) throw error
  }

  subscribeToSession(
    sessionId: string,
    userId: string,
    callbacks: {
      onParticipantJoin?: (participant: Participant) => void
      onParticipantLeave?: (participantId: string) => void
      onCursorUpdate?: (participantId: string, position: any) => void
      onCameraUpdate?: (participantId: string, camera: { position: { x: number; y: number; z: number }; target: { x: number; y: number; z: number } }) => void
      onAnnotationAdd?: (annotation: Annotation) => void
      onAnnotationUpdate?: (annotation: Annotation) => void
      onAnnotationRemove?: (annotationId: string) => void
    }
  ): RealtimeChannel {
    this.sessionId = sessionId
    this.userId = userId

    this.channel = supabase.channel(`collaboration-${sessionId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = this.channel?.presenceState()
        console.log('Presence state:', state)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', key, newPresences)
        newPresences.forEach((presence: any) => {
          if (presence.user_id !== userId) {
            callbacks.onParticipantJoin?.(presence)
          }
        })
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', key, leftPresences)
        leftPresences.forEach((presence: any) => {
          callbacks.onParticipantLeave?.(presence.user_id)
        })
      })
      .on('broadcast', { event: 'cursor_update' }, ({ payload }) => {
        if (payload.user_id !== userId) {
          callbacks.onCursorUpdate?.(payload.user_id, payload.position)
        }
      })
      .on('broadcast', { event: 'camera_update' }, ({ payload }) => {
        if (payload.user_id !== userId) {
          callbacks.onCameraUpdate?.(payload.user_id, payload.camera)
        }
      })
      .on('broadcast', { event: 'annotation_add' }, ({ payload }) => {
        callbacks.onAnnotationAdd?.(payload.annotation)
      })
      .on('broadcast', { event: 'annotation_update' }, ({ payload }) => {
        callbacks.onAnnotationUpdate?.(payload.annotation)
      })
      .on('broadcast', { event: 'annotation_remove' }, ({ payload }) => {
        callbacks.onAnnotationRemove?.(payload.annotation_id)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track user presence
          await this.channel?.track({
            user_id: userId,
            joined_at: new Date().toISOString(),
            cursor_position: null,
            camera_position: null
          })
        }
      })

    return this.channel
  }

  updateCursor(position: { x: number; y: number; z: number }): void {
    if (this.channel && this.userId) {
      this.channel.send({
        type: 'broadcast',
        event: 'cursor_update',
        payload: {
          user_id: this.userId,
          position
        }
      })

      // Update presence with cursor position
      this.channel.track({
        user_id: this.userId,
        cursor_position: position
      })
    }
  }

  updateCamera(camera: {
    position: { x: number; y: number; z: number }
    target: { x: number; y: number; z: number }
  }): void {
    if (this.channel && this.userId) {
      this.channel.send({
        type: 'broadcast',
        event: 'camera_update',
        payload: {
          user_id: this.userId,
          camera
        }
      })

      // Update presence with camera position
      this.channel.track({
        user_id: this.userId,
        camera_position: camera
      })
    }
  }

  addAnnotation(annotation: Omit<Annotation, 'id' | 'created_at'>): void {
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'annotation_add',
        payload: {
          annotation: {
            ...annotation,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString()
          }
        }
      })
    }
  }

  updateAnnotation(annotation: Annotation): void {
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'annotation_update',
        payload: { annotation }
      })
    }
  }

  removeAnnotation(annotationId: string): void {
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'annotation_remove',
        payload: { annotation_id: annotationId }
      })
    }
  }

  disconnect(): void {
    if (this.channel) {
      this.channel.unsubscribe()
      this.channel = null
    }
    this.sessionId = null
    this.userId = null
  }
}

export const collaboration3DService = new Collaboration3DService()
