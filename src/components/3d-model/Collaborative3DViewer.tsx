import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { track } from '@/lib/analytics'
import { collaboration3DService, type Annotation, type Participant } from '@/lib/collaboration/3dCollaborationService'
import { Html, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Eye, EyeOff, MessageSquare, Share2, Users } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Vector3 } from 'three'

interface Collaborative3DViewerProps {
  modelPath: string
  onClose?: () => void
}

interface Cursor3DProps {
  participant: Participant
  isLocal: boolean
}

const Cursor3D: React.FC<Cursor3DProps> = ({ participant, isLocal }) => {
  if (!participant.cursor_position) return null

  const position = new Vector3(
    participant.cursor_position.x,
    participant.cursor_position.y,
    participant.cursor_position.z
  )

  return (
    <group position={position}>
      <mesh>
        <coneGeometry args={[0.1, 0.3, 8]} />
        <meshBasicMaterial 
          color={isLocal ? '#ff6b35' : '#3b82f6'} 
          transparent 
          opacity={0.8}
        />
      </mesh>
      {!isLocal && (
        <Html distanceFactor={10}>
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-xs shadow-lg">
            <div className="font-medium text-gray-900">{participant.name}</div>
          </div>
        </Html>
      )}
    </group>
  )
}

interface Annotation3DProps {
  annotation: Annotation
  onUpdate?: (annotation: Annotation) => void
  onRemove?: (id: string) => void
  canEdit: boolean
}

const Annotation3D: React.FC<Annotation3DProps> = ({ 
  annotation, 
  onUpdate, 
  onRemove, 
  canEdit 
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(annotation.text)

  const position = new Vector3(
    annotation.position.x,
    annotation.position.y,
    annotation.position.z
  )

  const handleSave = () => {
    if (text.trim() && onUpdate) {
      onUpdate({ ...annotation, text: text.trim() })
    }
    setIsEditing(false)
  }

  const handleRemove = () => {
    if (onRemove) {
      onRemove(annotation.id)
    }
  }

  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshBasicMaterial color={annotation.color} />
      </mesh>
      <Html distanceFactor={8}>
        <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg max-w-xs">
          {isEditing ? (
            <div className="space-y-2">
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="text-sm"
                autoFocus
              />
              <div className="flex gap-1">
                <Button size="sm" onClick={handleSave}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-900">{annotation.text}</p>
              {canEdit && (
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleRemove}>
                    Remove
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </Html>
    </group>
  )
}

export const Collaborative3DViewer: React.FC<Collaborative3DViewerProps> = ({
  modelPath,
  onClose
}) => {
  const { user } = useAuth()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [showParticipants, setShowParticipants] = useState(true)
  const [newAnnotationText, setNewAnnotationText] = useState('')
  const [isAddingAnnotation, setIsAddingAnnotation] = useState(false)
  const [clickPosition, setClickPosition] = useState<Vector3 | null>(null)
  
  const controlsRef = useRef<{ object: { position: { x: number; y: number; z: number } }; target: { x: number; y: number; z: number } } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Initialize collaboration session
  useEffect(() => {
    if (!user) return

    const initializeSession = async () => {
      try {
        const session = await collaboration3DService.createSession(modelPath, user.id)
        setSessionId(session.id)
        
        // Subscribe to real-time updates
        collaboration3DService.subscribeToSession(session.id, user.id, {
          onParticipantJoin: (participant) => {
            setParticipants(prev => [...prev, participant])
            track('collaboration_participant_join', { sessionId: session.id })
          },
          onParticipantLeave: (participantId) => {
            setParticipants(prev => prev.filter(p => p.id !== participantId))
            track('collaboration_participant_leave', { sessionId: session.id })
          },
          onCursorUpdate: (participantId, position) => {
            const pos = position as Participant['cursor_position']
            setParticipants(prev =>
              prev.map(p =>
                p.id === participantId
                  ? { ...p, cursor_position: pos }
                  : p
              )
            )
          },
          onCameraUpdate: (participantId, camera) => {
            const cam = camera as Participant['camera_position']
            setParticipants(prev =>
              prev.map(p =>
                p.id === participantId
                  ? { ...p, camera_position: cam }
                  : p
              )
            )
          },
          onAnnotationAdd: (annotation) => {
            setAnnotations(prev => [...prev, annotation])
            track('collaboration_annotation_add', { sessionId: session.id })
          },
          onAnnotationUpdate: (annotation) => {
            setAnnotations(prev => 
              prev.map(a => a.id === annotation.id ? annotation : a)
            )
          },
          onAnnotationRemove: (annotationId) => {
            setAnnotations(prev => prev.filter(a => a.id !== annotationId))
          }
        })

        setIsConnected(true)
        track('collaboration_session_created', { sessionId: session.id, modelPath })

        return () => {
          collaboration3DService.disconnect()
        }
      } catch (error) {
        console.error('Failed to initialize collaboration session:', error)
      }
    }

    void initializeSession()
  }, [user, modelPath])

  // Handle canvas clicks for annotations
  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    if (!isAddingAnnotation || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    // Simple 3D position calculation (you might want to use raycasting for more accuracy)
    const position = new Vector3(x * 5, y * 5, 0)
    setClickPosition(position)
  }, [isAddingAnnotation])

  // Add annotation
  const handleAddAnnotation = () => {
    if (!newAnnotationText.trim() || !clickPosition || !user) return

    const annotation: Omit<Annotation, 'id' | 'created_at'> = {
      session_id: sessionId!,
      author_id: user.id,
      position: {
        x: clickPosition.x,
        y: clickPosition.y,
        z: clickPosition.z
      },
      text: newAnnotationText.trim(),
      color: '#ff6b35'
    }

    collaboration3DService.addAnnotation(annotation)
    setNewAnnotationText('')
    setIsAddingAnnotation(false)
    setClickPosition(null)
  }

  // Update annotation
  const handleUpdateAnnotation = (annotation: Annotation) => {
    collaboration3DService.updateAnnotation(annotation)
  }

  // Remove annotation
  const handleRemoveAnnotation = (annotationId: string) => {
    collaboration3DService.removeAnnotation(annotationId)
  }

  // Handle camera changes for synchronization
  const handleCameraChange = useCallback(() => {
    if (!controlsRef.current || !isConnected) return

    const camera = controlsRef.current.object
    const target = controlsRef.current.target

    collaboration3DService.updateCamera({
      position: {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
      },
      target: {
        x: target.x,
        y: target.y,
        z: target.z
      }
    })
  }, [isConnected])

  // Handle cursor movement
  const handlePointerMove = useCallback((event: React.PointerEvent) => {
    if (!canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    collaboration3DService.updateCursor({ x: x * 5, y: y * 5, z: 0 })
  }, [])

  return (
    <div className="relative w-full h-full bg-gray-900">
      {/* Collaboration Controls */}
      <div className="absolute top-4 left-4 z-10 space-y-2">
        <Card className="w-80">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" />
              Collaboration Session
              <Badge variant={isConnected ? "default" : "secondary"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Participants List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Participants ({participants.length})</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowParticipants(!showParticipants)}
                >
                  {showParticipants ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {showParticipants && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-2 text-xs">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: participant.id === user?.id ? '#ff6b35' : '#3b82f6' }}
                      />
                      <span>{participant.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {participant.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Annotation Controls */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant={isAddingAnnotation ? "default" : "outline"}
                  onClick={() => setIsAddingAnnotation(!isAddingAnnotation)}
                >
                  <MessageSquare className="h-4 w-4 mr-1" />
                  {isAddingAnnotation ? "Cancel" : "Add Note"}
                </Button>
                {sessionId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      void navigator.clipboard.writeText(`${window.location.origin}/collaborate/${sessionId}`)
                      track('collaboration_link_shared', { sessionId })
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {isAddingAnnotation && (
                <div className="space-y-2">
                  <Input
                    placeholder="Enter annotation text..."
                    value={newAnnotationText}
                    onChange={(e) => setNewAnnotationText(e.target.value)}
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-500">
                    Click on the 3D model to place annotation
                  </p>
                  {clickPosition && (
                    <Button size="sm" onClick={handleAddAnnotation}>
                      Add Annotation
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3D Canvas */}
      <Canvas
        ref={canvasRef}
        camera={{ position: [5, 5, 5], fov: 50 }}
        onClick={handleCanvasClick}
        onPointerMove={handlePointerMove}
        className="w-full h-full"
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        
        {/* 3D Model would go here - using a placeholder for now */}
        <mesh>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#ff6b35" />
        </mesh>

        {/* Participant Cursors */}
        {participants.map((participant) => (
          <Cursor3D
            key={participant.id}
            participant={participant}
            isLocal={participant.id === user?.id}
          />
        ))}

        {/* Annotations */}
        {annotations.map((annotation) => (
          <Annotation3D
            key={annotation.id}
            annotation={annotation}
            onUpdate={handleUpdateAnnotation}
            onRemove={handleRemoveAnnotation}
            canEdit={annotation.author_id === user?.id}
          />
        ))}

        <OrbitControls
          ref={controlsRef}
          onChange={handleCameraChange}
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
        />
      </Canvas>

      {/* Close Button */}
      {onClose && (
        <Button
          className="absolute top-4 right-4 z-10"
          variant="outline"
          onClick={onClose}
        >
          Close
        </Button>
      )}
    </div>
  )
}
