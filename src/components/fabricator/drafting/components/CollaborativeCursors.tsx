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
export const CollaborativeCursors: React.FC<CollaborativeCursorsProps> = ({
  users,
  currentUserId
}) => {
  return (
    <g>
      {users
        .filter(user => user.id !== currentUserId && user.cursor)
        .map(user => (
          <g key={user.id}>
            {/* Cursor */}
            <circle
              cx={user.cursor!.x}
              cy={user.cursor!.y}
              r={8}
              fill={user.color}
              stroke="white"
              strokeWidth={2}
              opacity={0.8}
              className="pointer-events-none"
            />
            {/* User name label */}
            <text
              x={user.cursor!.x + 12}
              y={user.cursor!.y - 12}
              fill={user.color}
              fontSize="12"
              fontWeight="500"
              className="pointer-events-none"
            >
              {user.name}
            </text>
            {/* Selection indicator */}
            {user.selection !== null && user.selection !== undefined && (
              <circle
                cx={user.cursor!.x}
                cy={user.cursor!.y}
                r={12}
                fill="none"
                stroke={user.color}
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

