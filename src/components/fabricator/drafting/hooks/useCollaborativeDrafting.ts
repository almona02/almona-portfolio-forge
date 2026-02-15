// src/components/fabricator/drafting/hooks/useCollaborativeDrafting.ts

/**
 * Collaborative Drafting Hook
 * WebSocket-based multi-user support for real-time collaboration
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { DraftingState } from '../types/drafting';
import { logDraftingAction } from '../utils/constitutionalAudit';
import {
    MessageRateLimiter,
    safeJsonParse,
    sanitizeUserName,
    validateRoomId,
    validateUserId,
    validateWebSocketMessage,
    type CollaborativeMessage
} from '../utils/securityUtils';

interface CollaborativeUser {
  id: string;
  name: string;
  color: string;
  cursor?: { x: number; y: number };
  selection?: number | null;
}

// Message type moved to securityUtils

interface UseCollaborativeDraftingOptions {
  roomId: string;
  userId: string;
  userName: string;
  enabled?: boolean;
  onStateUpdate?: (state: DraftingState) => void;
  onUserJoin?: (user: CollaborativeUser) => void;
  onUserLeave?: (userId: string) => void;
}

/**
 * Collaborative Drafting Hook
 * Manages WebSocket connection and real-time state synchronization
 */
export function useCollaborativeDrafting({
  roomId,
  userId,
  userName,
  enabled = false,
  onStateUpdate,
  onUserJoin,
  onUserLeave
}: UseCollaborativeDraftingOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<CollaborativeUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const rateLimiter = useRef(new MessageRateLimiter(100, 60000)); // 100 messages per minute
  const maxMessageSize = 10 * 1024 * 1024; // 10MB
  
  // Generate user color based on ID
  const getUserColor = useCallback((id: string): string => {
    const colors = [
      '#3b82f6', // blue
      '#10b981', // green
      '#f59e0b', // amber
      '#ef4444', // red
      '#f59e0b', // amber
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#84cc16'  // lime
    ];
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }, []);

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (!enabled) return;
    
    // Validate room ID
    if (!validateRoomId(roomId)) {
      setError('Invalid room ID format');
      return;
    }
    
    // Validate user ID
    if (!validateUserId(userId)) {
      setError('Invalid user ID format');
      return;
    }
    
    // Sanitize user name
    const sanitizedUserName = sanitizeUserName(userName);
    
    try {
      // In production, use actual WebSocket server URL
      const wsUrl = import.meta.env.VITE_WS_URL || `ws://localhost:8080/drafting/${roomId}`;
      
      // Validate URL format (basic check)
      if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
        setError('Invalid WebSocket URL format');
        return;
      }
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        
        // Send join message (with validation)
        const joinMessage = {
          type: 'user_join' as const,
          userId,
          userName: sanitizedUserName,
          timestamp: Date.now(),
          data: { color: getUserColor(userId) }
        };
        
        // Check rate limit
        if (!rateLimiter.current.checkLimit(userId)) {
          setError('Rate limit exceeded');
          ws.close();
          return;
        }
        
        ws.send(JSON.stringify(joinMessage));
        
        logDraftingAction(
          'collaborative_connected',
          { roomId, userId },
          {},
          'CHECKPOINT-COLLAB-CONNECT'
        );
      };
      
      ws.onmessage = (event) => {
        try {
          // Check message size
          if (event.data instanceof Blob) {
            if (event.data.size > maxMessageSize) {
              console.error('WebSocket message too large:', event.data.size);
              return;
            }
          } else if (typeof event.data === 'string') {
            if (event.data.length > maxMessageSize) {
              console.error('WebSocket message too large:', event.data.length);
              return;
            }
          }
          
          // Safe JSON parse with validation
          const rawMessage = safeJsonParse<CollaborativeMessage>(event.data as string, maxMessageSize);
          
          // Validate message structure
          const validation = validateWebSocketMessage(rawMessage);
          if (!validation.valid) {
            console.error('Invalid WebSocket message:', validation.error);
            return;
          }
          
          const message = validation.sanitized!;
          
          // Check rate limit
          if (!rateLimiter.current.checkLimit(message.userId)) {
            console.warn('Rate limit exceeded for user:', message.userId);
            return;
          }
          
          switch (message.type) {
            case 'user_join':
              if (message.userId !== userId) {
                const newUser: CollaborativeUser = {
                  id: message.userId,
                  name: sanitizeUserName(message.data?.userName || 'Anonymous'),
                  color: message.data?.color || getUserColor(message.userId)
                };
                setUsers(prev => [...prev.filter(u => u.id !== newUser.id), newUser]);
                onUserJoin?.(newUser);
              }
              break;
              
            case 'user_leave':
              setUsers(prev => prev.filter(u => u.id !== message.userId));
              onUserLeave?.(message.userId);
              break;
              
            case 'state_sync':
              if (message.userId !== userId && onStateUpdate) {
                onStateUpdate(message.data.state);
              }
              break;
              
            case 'cursor_move':
              if (message.userId !== userId && message.data?.cursor) {
                const cursor = message.data.cursor;
                // Validate cursor coordinates
                if (typeof cursor.x === 'number' && isFinite(cursor.x) &&
                    typeof cursor.y === 'number' && isFinite(cursor.y) &&
                    cursor.x >= -1000000 && cursor.x <= 1000000 &&
                    cursor.y >= -1000000 && cursor.y <= 1000000) {
                  setUsers(prev => prev.map(u => 
                    u.id === message.userId 
                      ? { ...u, cursor: { x: cursor.x, y: cursor.y } }
                      : u
                  ));
                }
              }
              break;
              
            case 'selection_change':
              if (message.userId !== userId && message.data?.selection !== undefined) {
                const selection = message.data.selection;
                // Validate selection (null or non-negative integer)
                if (selection === null || (typeof selection === 'number' && 
                    isFinite(selection) && selection >= 0 && Number.isInteger(selection))) {
                  setUsers(prev => prev.map(u => 
                    u.id === message.userId 
                      ? { ...u, selection }
                      : u
                  ));
                }
              }
              break;
              
            case 'geometry_add':
            case 'geometry_update':
            case 'geometry_delete':
              // Handle geometry changes from other users
              if (message.userId !== userId && onStateUpdate) {
                // Merge remote changes (conflict resolution would go here)
                logDraftingAction(
                  'collaborative_geometry_change',
                  { type: message.type, fromUser: message.userId },
                  {},
                  'CHECKPOINT-COLLAB-GEOMETRY'
                );
              }
              break;
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error');
        setIsConnected(false);
      };
      
      ws.onclose = () => {
        setIsConnected(false);
        
        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setError('Failed to connect after multiple attempts');
        }
      };
      
      wsRef.current = ws;
    } catch (err) {
      console.error('Error creating WebSocket:', err);
      setError('Failed to create connection');
    }
  }, [enabled, roomId, userId, userName, getUserColor, onStateUpdate, onUserJoin, onUserLeave, maxMessageSize]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setIsConnected(false);
    setUsers([]);
  }, []);

  // Send state update (with rate limiting and size checking)
  const broadcastState = useCallback((state: DraftingState) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Check rate limit
      if (!rateLimiter.current.checkLimit(userId)) {
        console.warn('Rate limit exceeded, skipping state broadcast');
        return;
      }
      
      const message = {
        type: 'state_sync' as const,
        userId,
        timestamp: Date.now(),
        data: { state }
      };
      
      const messageString = JSON.stringify(message);
      
      // Check message size
      if (messageString.length > maxMessageSize) {
        console.warn('State message too large, skipping broadcast');
        return;
      }
      
      try {
        wsRef.current.send(messageString);
      } catch (error) {
        console.error('Error sending state update:', error);
      }
    }
  }, [userId, maxMessageSize]);

  // Send cursor position (with validation)
  const broadcastCursor = useCallback((cursor: { x: number; y: number }) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Validate cursor coordinates
      if (typeof cursor.x !== 'number' || !isFinite(cursor.x) ||
          typeof cursor.y !== 'number' || !isFinite(cursor.y) ||
          cursor.x < -1000000 || cursor.x > 1000000 ||
          cursor.y < -1000000 || cursor.y > 1000000) {
        return; // Invalid cursor, don't send
      }
      
      // Check rate limit (cursor updates can be frequent)
      if (!rateLimiter.current.checkLimit(`${userId}-cursor`)) {
        return; // Rate limited, skip
      }
      
      try {
        wsRef.current.send(JSON.stringify({
          type: 'cursor_move',
          userId,
          timestamp: Date.now(),
          data: { cursor: { x: cursor.x, y: cursor.y } }
        }));
      } catch (error) {
        console.error('Error sending cursor update:', error);
      }
    }
  }, [userId]);

  // Send selection change (with validation)
  const broadcastSelection = useCallback((selection: number | null) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Validate selection
      if (selection !== null && 
          (typeof selection !== 'number' || !isFinite(selection) || 
           selection < 0 || !Number.isInteger(selection))) {
        return; // Invalid selection, don't send
      }
      
      try {
        wsRef.current.send(JSON.stringify({
          type: 'selection_change',
          userId,
          timestamp: Date.now(),
          data: { selection }
        }));
      } catch (error) {
        console.error('Error sending selection update:', error);
      }
    }
  }, [userId]);

  // Send geometry change (with validation and rate limiting)
  const broadcastGeometryChange = useCallback((type: 'geometry_add' | 'geometry_update' | 'geometry_delete', data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // Check rate limit
      if (!rateLimiter.current.checkLimit(userId)) {
        console.warn('Rate limit exceeded, skipping geometry change broadcast');
        return;
      }
      
      const message = {
        type,
        userId,
        timestamp: Date.now(),
        data
      };
      
      const messageString = JSON.stringify(message);
      
      // Check message size
      if (messageString.length > maxMessageSize) {
        console.warn('Geometry change message too large, skipping broadcast');
        return;
      }
      
      try {
        wsRef.current.send(messageString);
      } catch (error) {
        console.error('Error sending geometry change:', error);
      }
    }
  }, [userId, maxMessageSize]);

  // Initialize connection (use refs to avoid infinite loop)
  const connectRef = useRef(connect);
  const disconnectRef = useRef(disconnect);
  connectRef.current = connect;
  disconnectRef.current = disconnect;
  
  useEffect(() => {
    if (enabled) {
      connectRef.current();
    } else {
      disconnectRef.current();
    }
    
    return () => {
      disconnectRef.current();
    };
  }, [enabled]);

  return {
    isConnected,
    users,
    error,
    connect,
    disconnect,
    broadcastState,
    broadcastCursor,
    broadcastSelection,
    broadcastGeometryChange
  };
}

