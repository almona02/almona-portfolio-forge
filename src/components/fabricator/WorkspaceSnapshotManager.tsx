import React, { useState } from 'react';
import { useFabricatorWorkspace } from '@/context/FabricatorWorkspaceContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/ui/card';
import { Button } from '@/shared/ui/ui/button';
import { Badge } from '@/shared/ui/ui/badge';
import { Input } from '@/shared/ui/ui/input';
import { Calendar, RotateCcw, Trash2 } from 'lucide-react';

export const WorkspaceSnapshotManager: React.FC = () => {
  const { state, dispatch } = useFabricatorWorkspace();
  const [label, setLabel] = useState('');

  const handleSave = () => {
    const trimmed = label.trim();
    const effectiveLabel =
      trimmed || `Snapshot ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
    dispatch({ type: 'SAVE_SNAPSHOT', payload: { label: effectiveLabel } });
    setLabel('');
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  if (!state.snapshots.length) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Snapshot name"
            className="h-8 text-xs bg-slate-900/70 border-slate-700/70"
          />
          <Button
            size="sm"
            className="btn-secondary"
            onClick={handleSave}
          >
            Save Snapshot
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Snapshot name"
          className="h-8 text-xs bg-slate-900/70 border-slate-700/70"
        />
        <Button
          size="sm"
          className="btn-secondary"
          onClick={handleSave}
        >
          Save Snapshot
        </Button>
      </div>
      <Card className="bg-slate-900/70 border-slate-800/80">
        <CardHeader className="py-2 px-3">
          <CardTitle className="flex items-center justify-between text-xs text-slate-200">
            <span>Workspace Snapshots</span>
            <Badge variant="outline" className="text-[10px]">
              {state.snapshots.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-3 space-y-2">
          {state.snapshots.map((snap) => (
            <div
              key={snap.id}
              className={`flex items-center justify-between rounded-md px-2 py-1 text-[11px] ${
                state.currentSnapshotId === snap.id
                  ? 'bg-blue-900/40 border border-blue-500/40'
                  : 'bg-slate-900/60 border border-slate-800/60'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold truncate">{snap.label}</span>
                  {state.currentSnapshotId === snap.id && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      Active
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                  <Calendar className="w-3 h-3" />
                  <span className="truncate">{formatDate(snap.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Button
                  size="icon"
                  variant="outline"
                  className="h-6 w-6"
                  onClick={() => dispatch({ type: 'RESTORE_SNAPSHOT', payload: { id: snap.id } })}
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-6 w-6"
                  onClick={() => dispatch({ type: 'DELETE_SNAPSHOT', payload: { id: snap.id } })}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkspaceSnapshotManager;


