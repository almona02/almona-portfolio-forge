// src/components/fabricator/drafting/components/CollaborativeCursors.tsx

import React from 'react';
import type { CollaborativeUser } from '../hooks/useCollaborativeDrafting';

interface CollaborativeCursorsProps {
  users: CollaborativeUser[];
  currentUserId: string;
}

/**
 * Render cursors for all collaborative users
 */
interface UserWithCursor extends CollaborativeUser {
  cursor: { x: number; y: number };
}

export const CollaborativeCursors: React.FC<CollaborativeCursorsProps> = ({
  users,
  currentUserId
}) => {
  const usersWithCursors = users.filter(
    (u): u is UserWithCursor => u.id !== currentUserId && !!u.cursor
  );
  return (
    <g>
      {usersWithCursors.map((u) => (
          <g key={u.id}>
            {/* Cursor */}
            <circle
              cx={u.cursor.x}
              cy={u.cursor.y}
              r={8}
              fill={u.color}
              stroke="white"
              strokeWidth={2}
              opacity={0.8}
              className="pointer-events-none"
            />
            {/* User name label */}
            <text
              x={u.cursor.x + 12}
              y={u.cursor.y - 12}
              fill={u.color}
              fontSize="12"
              fontWeight="500"
              className="pointer-events-none"
            >
              {u.name}
            </text>
            {/* Selection indicator */}
            {u.selection !== null && u.selection !== undefined && (
              <circle
                cx={u.cursor.x}
                cy={u.cursor.y}
                r={12}
                fill="none"
                stroke={u.color}
                strokeWidth={2}
                strokeDasharray="4,4"
                opacity={0.6}
                className="pointer-events-none"
              />
            )}
          </g>
        ))}
    </g>
  );
};

