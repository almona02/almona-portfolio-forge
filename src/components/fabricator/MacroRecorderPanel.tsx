/**
 * MacroRecorderPanel Component
 * 
 * UI component for macro recording and playback in EngineeringBay.
 * Provides controls for recording, playing, and managing macros.
 */

import { CardContent, CardHeader, CardTitle, GoldTierCard } from '@/components/ui/card-gold-tier';
import { MacroRecorder, type Macro } from '@/lib/keyboard/MacroRecorder';
import { Button } from '@/shared/ui/ui/button';
import { Circle, Clock, Play, Save, Square, Trash2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface MacroRecorderPanelProps {
  recorder: MacroRecorder;
  onActionRecord?: (actionType: string, data?: Record<string, any>) => void;
  onActionExecute?: (actionType: string, data?: Record<string, any>) => Promise<void>;
  className?: string;
}

export const MacroRecorderPanel: React.FC<MacroRecorderPanelProps> = ({
  recorder,
  onActionExecute,
  className = '',
}) => {
  const { t } = useTranslation('fabricator');
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMacro, setCurrentMacro] = useState<Macro | null>(null);
  const [macros, setMacros] = useState<Macro[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [playbackProgress, setPlaybackProgress] = useState(0);

  // Load macros on mount
  useEffect(() => {
    const loadedMacros = recorder.getMacros();
    setMacros(loadedMacros);
  }, [recorder]);

  // Update recording/playing state from recorder
  useEffect(() => {
    const interval = setInterval(() => {
      const recording = recorder.isRecording();
      const playing = recorder.isPlaying();
      
      if (recording !== isRecording) {
        setIsRecording(recording);
      }
      
      if (playing !== isPlaying) {
        setIsPlaying(playing);
        if (playing) {
          const playbackState = recorder.getPlaybackState();
          if (playbackState.currentMacro) {
            setCurrentMacro(playbackState.currentMacro);
            const progress = playbackState.currentMacro.actions.length > 0
              ? (playbackState.currentActionIndex / playbackState.currentMacro.actions.length) * 100
              : 0;
            setPlaybackProgress(progress);
          }
        } else {
          setPlaybackProgress(0);
        }
      }
      
      // Update macros list
      const loadedMacros = recorder.getMacros();
      if (loadedMacros.length !== macros.length) {
        setMacros(loadedMacros);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [recorder, isRecording, isPlaying, macros.length]);

  const handleStartRecording = () => {
    const name = `Macro ${new Date().toLocaleTimeString()}`;
    recorder.startRecording(name, 'Recorded macro', 'workflow');
  };

  const handleStopRecording = () => {
    const macro = recorder.stopRecording();
    if (macro) {
      setCurrentMacro(macro);
    }
  };

  const handlePlay = async (macro?: Macro) => {
    const macroToPlay = macro || currentMacro;
    if (macroToPlay) {
      // Create action executor that maps macro actions to actual UI actions
      const actionExecutor = async (action: any) => {
        // Execute the action through the parent component
        if (onActionExecute) {
          await onActionExecute(action.type, action.data);
        }
      };
      
      await recorder.playMacro(macroToPlay.id, playbackSpeed, actionExecutor);
    }
  };

  const handleStop = () => {
    recorder.stopPlayback();
    setIsPlaying(false);
  };

  const handleDelete = (macroId: string) => {
    recorder.deleteMacro(macroId);
    const loadedMacros = recorder.getMacros();
    setMacros(loadedMacros);
    if (currentMacro?.id === macroId) {
      setCurrentMacro(null);
    }
  };

  const handleSave = (macro: Macro) => {
    recorder.saveMacro(macro);
    const loadedMacros = recorder.getMacros();
    setMacros(loadedMacros);
  };

  return (
    <GoldTierCard variant="elevated" className={className}>
      <CardHeader>
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {t('macro_recorder.title', 'Macro Recorder')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recording Controls */}
        <div className="flex items-center gap-2">
          {!isRecording ? (
            <Button
              size="sm"
              onClick={handleStartRecording}
              disabled={isPlaying}
              className="flex-1"
            >
              <Circle className="h-4 w-4 mr-2" />
              {t('macro_recorder.start_recording', 'Start Recording')}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleStopRecording}
              variant="destructive"
              className="flex-1"
            >
              <Square className="h-4 w-4 mr-2" />
              {t('macro_recorder.stop_recording', 'Stop Recording')}
            </Button>
          )}
        </div>

        {/* Playback Controls */}
        {currentMacro && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {!isPlaying ? (
                <Button
                  size="sm"
                  onClick={() => handlePlay()}
                  disabled={isRecording}
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  {t('macro_recorder.play', 'Play')}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleStop}
                  variant="destructive"
                  className="flex-1"
                >
                  <Square className="h-4 w-4 mr-2" />
                  {t('macro_recorder.stop', 'Stop')}
                </Button>
              )}
            </div>

            {/* Playback Speed */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-amber-600/80">
                {t('macro_recorder.speed', 'Speed')}:
              </label>
              <select
                value={playbackSpeed}
                onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
                className="flex-1 text-xs bg-gray-900 border border-amber-600/30 rounded px-2 py-1 text-amber-200"
                disabled={isPlaying || isRecording}
              >
                <option value={0.25}>0.25x</option>
                <option value={0.5}>0.5x</option>
                <option value={1.0}>1x</option>
                <option value={2.0}>2x</option>
                <option value={4.0}>4x</option>
              </select>
            </div>

            {/* Progress */}
            {isPlaying && (
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div
                  className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${playbackProgress}%` }}
                />
              </div>
            )}

            {/* Macro Info */}
            <div className="text-xs text-amber-600/80">
              <div>{currentMacro.name}</div>
              <div className="text-amber-600/60">
                {currentMacro.actions.length} {t('macro_recorder.actions', 'actions')}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSave(currentMacro)}
                className="flex-1 text-xs"
              >
                <Save className="h-3 w-3 mr-1" />
                {t('macro_recorder.save', 'Save')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDelete(currentMacro.id)}
                className="text-xs"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Macros List */}
        {macros.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-semibold text-amber-600/80">
              {t('macro_recorder.saved_macros', 'Saved Macros')}
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {macros.map((macro) => (
                <div
                  key={macro.id}
                  className="flex items-center justify-between p-2 bg-gray-900/50 rounded text-xs hover:bg-gray-900/70 cursor-pointer"
                  onClick={() => setCurrentMacro(macro)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-amber-200">{macro.name}</div>
                    <div className="text-amber-600/60 text-[10px]">
                      {macro.actions.length} actions
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlay(macro);
                      }}
                      disabled={isRecording || isPlaying}
                      className="h-6 w-6 p-0"
                    >
                      <Play className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(macro.id);
                      }}
                      className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Indicator */}
        {(isRecording || isPlaying) && (
          <div className="flex items-center gap-2 text-xs">
            <div
              className={`h-2 w-2 rounded-full ${
                isRecording ? 'bg-red-500 animate-pulse' : 'bg-amber-500 animate-pulse'
              }`}
            />
            <span className="text-amber-600/80">
              {isRecording
                ? t('macro_recorder.recording', 'Recording...')
                : t('macro_recorder.playing', 'Playing...')}
            </span>
          </div>
        )}
      </CardContent>
    </GoldTierCard>
  );
};
