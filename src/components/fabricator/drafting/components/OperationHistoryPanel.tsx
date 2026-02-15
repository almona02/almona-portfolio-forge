/**
 * Operation History Panel Component
 * 
 * Gold-tier operation history visualization with undo/redo navigation,
 * version management, and operation descriptions for the Drafting Workbench.
 * 
 * Constitutional: Deterministic UI, no ML/AI
 * Tier: 3 Protected Determinism
 */

import { Button } from '@/shared/ui/ui/button';
import { ScrollArea } from '@/shared/ui/ui/scroll-area';
import {
    CheckCircle2,
    Clock,
    History,
    RotateCcw,
    RotateCw,
    Save,
    Trash2,
    X
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import { getGap, getPadding } from '../styles/spacing';
import { getTypographyPreset } from '../styles/typography';
import type { DraftVersion } from '../utils/statePersistence';
import { formatFileSize, formatVersionTimestamp } from '../utils/statePersistence';

export interface OperationHistoryItem {
  /** Operation ID */
  id: string;
  /** Operation type */
  type: string;
  /** Operation description */
  description: string;
  /** Timestamp */
  timestamp: number;
  /** Is this a checkpoint */
  isCheckpoint?: boolean;
  /** Can undo to this point */
  canUndoTo?: boolean;
  /** Can redo to this point */
  canRedoTo?: boolean;
}

export interface OperationHistoryPanelProps {
  /** History items */
  items: OperationHistoryItem[];
  /** Versions */
  versions?: DraftVersion[];
  /** Current position in history */
  currentIndex?: number;
  /** On undo */
  onUndo?: () => void;
  /** On redo */
  onRedo?: () => void;
  /** On restore version */
  onRestoreVersion?: (versionId: string) => void;
  /** On delete version */
  onDeleteVersion?: (versionId: string) => void;
  /** On create checkpoint */
  onCreateCheckpoint?: () => void;
  /** Can undo */
  canUndo?: boolean;
  /** Can redo */
  canRedo?: boolean;
  /** Class name */
  className?: string;
  /** On close */
  onClose?: () => void;
}

export const OperationHistoryPanel: React.FC<OperationHistoryPanelProps> = ({
  items = [],
  versions = [],
  currentIndex = -1,
  onUndo,
  onRedo,
  onRestoreVersion,
  onDeleteVersion,
  onCreateCheckpoint,
  canUndo = false,
  canRedo = false,
  className = '',
  onClose,
}) => {
  const [selectedTab, setSelectedTab] = useState<'history' | 'versions'>('history');
  // TODO: Implement expand/collapse functionality
  // const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  // const expandedItems = new Set<string>(); // Placeholder for future functionality

  // Sort items by timestamp (newest first)
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => b.timestamp - a.timestamp);
  }, [items]);

  // Sort versions by timestamp (newest first)
  const sortedVersions = useMemo(() => {
    return [...versions].sort((a, b) => b.timestamp - a.timestamp);
  }, [versions]);

  // TODO: Implement expand/collapse functionality
  // const toggleExpanded = (id: string) => {
  //   setExpandedItems(prev => {
  //     const next = new Set(prev);
  //     if (next.has(id)) {
  //       next.delete(id);
  //     } else {
  //       next.add(id);
  //     }
  //     return next;
  //   });
  // };

  const getOperationIcon = (type: string) => {
    if (type.includes('undo')) return <RotateCcw className="h-4 w-4" />;
    if (type.includes('redo')) return <RotateCw className="h-4 w-4" />;
    if (type.includes('checkpoint') || type.includes('save')) return <Save className="h-4 w-4" />;
    return <History className="h-4 w-4" />;
  };

  const getOperationColor = (type: string, isCheckpoint?: boolean) => {
    if (isCheckpoint) return 'text-amber-400';
    if (type.includes('undo')) return 'text-blue-400';
    if (type.includes('redo')) return 'text-amber-400';
    return 'text-slate-400';
  };

  return (
    <div className={`flex flex-col h-full bg-slate-900 border-l border-amber-600/30 ${className}`}>
      {/* Header */}
      <div className={`flex items-center justify-between ${getPadding('panelHeader')} border-b border-amber-600/20`}>
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-amber-400" />
          <h3 className={`${getTypographyPreset('h4')} text-amber-200`}>Operation History</h3>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-slate-400 hover:text-amber-400"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-amber-600/20">
        <button
          onClick={() => setSelectedTab('history')}
          className={`flex-1 ${getPadding('buttonSmall')} text-sm font-medium transition-colors ${
            selectedTab === 'history'
              ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-500/5'
              : 'text-slate-400 hover:text-amber-300'
          }`}
        >
          History ({sortedItems.length})
        </button>
        <button
          onClick={() => setSelectedTab('versions')}
          className={`flex-1 ${getPadding('buttonSmall')} text-sm font-medium transition-colors ${
            selectedTab === 'versions'
              ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-500/5'
              : 'text-slate-400 hover:text-amber-300'
          }`}
        >
          Versions ({sortedVersions.length})
        </button>
      </div>

      {/* Actions */}
      <div className={`flex items-center gap-2 ${getPadding('componentTight')} border-b border-amber-600/20`}>
        <Button
          variant="outline"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          className="flex-1 border-amber-600/30 text-amber-400 hover:bg-amber-500/10 disabled:opacity-50"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Undo
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          className="flex-1 border-amber-600/30 text-amber-400 hover:bg-amber-500/10 disabled:opacity-50"
        >
          <RotateCw className="h-3 w-3 mr-1" />
          Redo
        </Button>
        {onCreateCheckpoint && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCreateCheckpoint}
            className="border-amber-600/30 text-amber-400 hover:bg-amber-500/10"
          >
            <Save className="h-3 w-3 mr-1" />
            Checkpoint
          </Button>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className={getPadding('panelContent')}>
          {selectedTab === 'history' ? (
            <div className={`flex flex-col ${getGap('tight')}`}>
              {sortedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <History className="h-12 w-12 text-slate-600 mb-4" />
                  <p className={`${getTypographyPreset('body')} text-slate-400`}>
                    No operation history yet
                  </p>
                  <p className={`${getTypographyPreset('caption')} text-slate-500 mt-2`}>
                    Operations will appear here as you work
                  </p>
                </div>
              ) : (
                sortedItems.map((item, index) => {
                  const isCurrent = index === sortedItems.length - 1 - (currentIndex >= 0 ? currentIndex : 0);
                  // TODO: Use isExpanded when expand/collapse is implemented
                  // const isExpanded = expandedItems.has(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        isCurrent
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-slate-800/50 border-amber-600/20 hover:border-amber-600/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 ${getOperationColor(item.type, item.isCheckpoint)}`}>
                          {getOperationIcon(item.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className={`${getTypographyPreset('bodySmall')} font-medium text-slate-200`}>
                              {item.description}
                            </p>
                            {item.isCheckpoint && (
                              <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                                Checkpoint
                              </span>
                            )}
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                                Current
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Clock className="h-3 w-3" />
                            <span>{formatVersionTimestamp(item.timestamp)}</span>
                          </div>
                        </div>
                        {(item.canUndoTo || item.canRedoTo) && (
                          <div className="flex items-center gap-1">
                            {item.canUndoTo && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                onClick={onUndo}
                                title="Undo to this point"
                              >
                                <RotateCcw className="h-3 w-3" />
                              </Button>
                            )}
                            {item.canRedoTo && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                                onClick={onRedo}
                                title="Redo to this point"
                              >
                                <RotateCw className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className={`flex flex-col ${getGap('tight')}`}>
              {sortedVersions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Save className="h-12 w-12 text-slate-600 mb-4" />
                  <p className={`${getTypographyPreset('body')} text-slate-400`}>
                    No saved versions yet
                  </p>
                  <p className={`${getTypographyPreset('caption')} text-slate-500 mt-2`}>
                    Create checkpoints to save versions
                  </p>
                </div>
              ) : (
                sortedVersions.map((version) => (
                  <div
                    key={version.id}
                    className="p-3 rounded-lg border bg-slate-800/50 border-amber-600/20 hover:border-amber-600/30 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 text-amber-400">
                        {version.isCheckpoint ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`${getTypographyPreset('bodySmall')} font-medium text-slate-200`}>
                            {version.label || (version.isCheckpoint ? 'Checkpoint' : 'Auto-save')}
                          </p>
                          {version.isCheckpoint && (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded">
                              Checkpoint
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatVersionTimestamp(version.timestamp)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>{formatFileSize(version.size)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {onRestoreVersion && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                            onClick={() => onRestoreVersion(version.id)}
                            title="Restore this version"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                        {onDeleteVersion && !version.isCheckpoint && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={() => onDeleteVersion(version.id)}
                            title="Delete this version"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

OperationHistoryPanel.displayName = 'OperationHistoryPanel';

export default OperationHistoryPanel;

