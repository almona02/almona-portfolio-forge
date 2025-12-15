import {
  archiveCustomSystem,
  deleteCustomSystem,
  duplicateCustomSystem,
} from '@/lib/fabricator/customSystemStorage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/ui/dropdown-menu';
import { Archive, Copy, Edit, MoreVertical, Trash2 } from 'lucide-react';
import React from 'react';

interface CustomSystemManagerProps {
  systemId: string;
  systemName: string;
  onDelete?: () => void;
  onArchive?: () => void;
  onDuplicate?: () => void;
  onEdit?: () => void;
}

export const CustomSystemManager: React.FC<CustomSystemManagerProps> = ({
  systemId,
  systemName,
  onDelete,
  onArchive,
  onDuplicate,
  onEdit,
}) => {
  const handleDelete = () => {
    if (confirm(`Delete custom system "${systemName}"? This cannot be undone.`)) {
      deleteCustomSystem(systemId);
      onDelete?.();
    }
  };

  const handleArchive = () => {
    archiveCustomSystem(systemId);
    onArchive?.();
  };

  const handleDuplicate = () => {
    duplicateCustomSystem(systemId);
    onDuplicate?.();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          role="button"
          tabIndex={0}
          className="inline-flex items-center justify-center rounded-md h-8 w-8 p-0 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
        >
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Manage custom system</span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="h-4 w-4 mr-2" />
            Edit System
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleDuplicate}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleArchive}>
          <Archive className="h-4 w-4 mr-2" />
          Archive
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete} className="text-red-600">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

