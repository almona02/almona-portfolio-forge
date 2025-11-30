/**
 * User Presence Indicator
 * Shows active collaborators on the current project
 */

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/ui/ui/avatar';
import { Badge } from '@/shared/ui/ui/badge';
import { useFabricatorCollaboration } from '@/contexts/FabricatorCollaborationContext';
import { Users, Circle } from 'lucide-react';

export const UserPresenceIndicator: React.FC = () => {
  const { state } = useFabricatorCollaboration();

  if (state.collaborators.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg border border-gray-700">
      <Users className="h-4 w-4 text-gray-400" />
      <span className="text-xs text-gray-400">
        {state.collaborators.length} {state.collaborators.length === 1 ? 'collaborator' : 'collaborators'}
      </span>
      <div className="flex -space-x-2">
        {state.collaborators.slice(0, 5).map((collab) => (
          <Avatar key={collab.id} className="h-6 w-6 border-2 border-gray-700">
            <AvatarImage src={collab.avatarUrl} alt={collab.userName} />
            <AvatarFallback className="text-xs bg-gray-700 text-gray-300">
              {collab.userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
        {state.collaborators.length > 5 && (
          <div className="h-6 w-6 rounded-full bg-gray-700 border-2 border-gray-700 flex items-center justify-center">
            <span className="text-xs text-gray-300">+{state.collaborators.length - 5}</span>
          </div>
        )}
      </div>
      {state.isConnected && (
        <Badge variant="outline" className="bg-green-900/20 border-green-700 text-green-400 text-xs">
          <Circle className="h-2 w-2 fill-current mr-1" />
          Live
        </Badge>
      )}
    </div>
  );
};

