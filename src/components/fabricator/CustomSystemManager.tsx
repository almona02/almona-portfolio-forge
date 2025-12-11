import React from 'react';
import { Button } from '@/shared/ui/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/ui/dropdown-menu';
import { MoreVertical, Trash2, Archive, Copy, Edit } from 'lucide-react';
import {
  deleteCustomSystem,
  archiveCustomSystem,
  duplicateCustomSystem,
} from '@/lib/fabricator/customSystemStorage';

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
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
          <span className="sr-only">Manage custom system</span>
        </Button>
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

