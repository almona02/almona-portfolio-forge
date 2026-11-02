/**
 * Draft List Dialog Component
 * 
 * Gold-tier dialog for listing and selecting user drafts.
 * Allows users to continue working on saved drafts.
 * 
 * Features:
 * - List user's drafts with metadata
 * - Search and filter drafts
 * - Continue draft (load into workbench)
 * - Delete draft
 * - Import from file (fallback)
 */

import { deleteDraft, listDrafts, type DraftMetadata } from '@/lib/api/drafts';
import { Button } from '@/shared/ui/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/shared/ui/ui/dialog';
import { Input } from '@/shared/ui/ui/input';
import { ScrollArea } from '@/shared/ui/ui/scroll-area';
import { Clock, FileText, Grid3x3, Search, Trash2, Upload } from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { formatVersionTimestamp } from '../utils/statePersistence';

export interface DraftListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectDraft: (draftId: string) => Promise<void>;
  onImportFile?: () => void;
  userId: string;
}

export const DraftListDialog: React.FC<DraftListDialogProps> = ({
  open,
  onOpenChange,
  onSelectDraft,
  onImportFile,
  userId,
}) => {
  const [drafts, setDrafts] = useState<DraftMetadata[]>([]);
  const [filteredDrafts, setFilteredDrafts] = useState<DraftMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState<string | null>(null);

  // Load drafts when dialog opens


  // Filter drafts based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredDrafts(drafts);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = drafts.filter(draft =>
      draft.name.toLowerCase().includes(query) ||
      draft.twincode.toLowerCase().includes(query)
    );
    setFilteredDrafts(filtered);
  }, [searchQuery, drafts]);

  const loadDrafts = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await listDrafts(userId);
      setDrafts(result.drafts);
      setFilteredDrafts(result.drafts);
      if (result.usedFallback && result.drafts.length === 0) {
        // Silently handle fallback - no need to show error if no drafts exist
      }
    } catch (error) {
      console.error('Failed to load drafts:', error);
      toast.error('Failed to load drafts');
      setDrafts([]);
      setFilteredDrafts([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Load drafts when dialog opens
  useEffect(() => {
    if (open && userId) {
      void loadDrafts();
    } else {
      setDrafts([]);
      setFilteredDrafts([]);
      setSearchQuery('');
    }
  }, [open, userId, loadDrafts]);

  const handleSelectDraft = useCallback(async (draftId: string) => {
    setIsLoadingDraft(draftId);
    try {
      await onSelectDraft(draftId);
      onOpenChange(false);
      toast.success('Draft loaded successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load draft';
      toast.error(errorMessage);
    } finally {
      setIsLoadingDraft(null);
    }
  }, [onSelectDraft, onOpenChange]);

  const handleDeleteDraft = useCallback(async (draftId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent selecting draft when clicking delete
    
    if (!confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(draftId);
    try {
      const result = await deleteDraft(draftId, userId);
      if (result.success) {
        toast.success('Draft deleted successfully');
        await loadDrafts(); // Reload list
      } else {
        toast.error('Failed to delete draft');
      }
    } catch (error) {
      console.error('Failed to delete draft:', error);
      toast.error('Failed to delete draft');
    } finally {
      setIsDeleting(null);
    }
  }, [userId, loadDrafts]);

  const handleImportFile = useCallback(() => {
    onOpenChange(false);
    onImportFile?.();
  }, [onOpenChange, onImportFile]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-background border-amber-600/30">
        <DialogHeader>
          <DialogTitle className="text-warning flex items-center gap-2">
            <FileText className="h-5 w-5" />
            My Drafts
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Select a draft to continue working, or import a file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search drafts by name or twincode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card/50 border-border text-foreground"
            />
          </div>

          {/* Drafts List */}
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading drafts...</p>
              </div>
            </div>
          ) : filteredDrafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-2">
                {searchQuery ? 'No drafts match your search' : 'No drafts found'}
              </p>
              {!searchQuery && (
                <p className="text-sm text-muted-foreground">
                  Create a new draft and save it to see it here.
                </p>
              )}
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {filteredDrafts.map((draft) => (
                  <div
                    key={draft.id}
                    onClick={() => void handleSelectDraft(draft.id)}
                    className={`group relative p-4 rounded-lg border transition-all cursor-pointer ${
                      isLoadingDraft === draft.id
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-border bg-card/50 hover:border-amber-500/50 hover:bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Grid3x3 className="h-4 w-4 text-warning flex-shrink-0" />
                          <h3 className="font-medium text-foreground truncate">
                            {draft.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatVersionTimestamp(new Date(draft.updated_at).getTime())}</span>
                          </div>
                          {draft.element_count !== undefined && (
                            <div className="flex items-center gap-1">
                              <span>{draft.element_count} elements</span>
                            </div>
                          )}
                          <div className="font-mono text-warning/70">
                            {draft.twincode}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => void handleDeleteDraft(draft.id, e)}
                        disabled={isDeleting === draft.id}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        {isDeleting === draft.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {isLoadingDraft === draft.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-400 mx-auto mb-2"></div>
                          <p className="text-xs text-foreground">Loading draft...</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between border-t border-border pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleImportFile}
            className="border-border text-foreground hover:bg-card"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import File
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border text-foreground hover:bg-card"
            >
              Cancel
            </Button>
            {filteredDrafts.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {filteredDrafts.length} draft{filteredDrafts.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

DraftListDialog.displayName = 'DraftListDialog';
