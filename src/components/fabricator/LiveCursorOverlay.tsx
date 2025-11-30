/**
 * Live Cursor Overlay
 * Shows collaborator cursors and selections in real-time
 */

import React, { useEffect, useState } from 'react';
import { useFabricatorCollaboration } from '@/contexts/FabricatorCollaborationContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/ui/avatar';

interface CursorPosition {
  x: number;
  y: number;
  userId: string;
  userName: string;
  avatarUrl?: string;
  element?: string;
}

export const LiveCursorOverlay: React.FC<{ containerRef: React.RefObject<HTMLElement> }> = ({
  containerRef,
}) => {
  const { state } = useFabricatorCollaboration();
  const [cursorPositions, setCursorPositions] = useState<CursorPosition[]>([]);

  useEffect(() => {
    const cursors: CursorPosition[] = state.collaborators
      .filter(collab => collab.cursor && collab.userId !== state.currentUser?.userId)
      .map(collab => ({
        x: collab.cursor!.x,
        y: collab.cursor!.y,
        userId: collab.userId,
        userName: collab.userName,
        avatarUrl: collab.avatarUrl,
        element: collab.cursor!.element,
      }));

    setCursorPositions(cursors);
  }, [state.collaborators, state.currentUser]);

  if (cursorPositions.length === 0 || !containerRef.current) {
    return null;
  }

  const containerRect = containerRef.current.getBoundingClientRect();

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50"
      style={{
        left: containerRect.left,
        top: containerRect.top,
        width: containerRect.width,
        height: containerRect.height,
      }}
    >
      {cursorPositions.map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute transition-all duration-100 ease-linear"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="flex flex-col items-center">
            <Avatar className="h-6 w-6 border-2 border-white shadow-lg">
              <AvatarImage src={cursor.avatarUrl} alt={cursor.userName} />
              <AvatarFallback className="text-xs bg-blue-600 text-white">
                {cursor.userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="mt-1 px-2 py-0.5 bg-blue-600 text-white text-xs rounded shadow-lg">
              {cursor.userName}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

