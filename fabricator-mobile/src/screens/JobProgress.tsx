/**
 * Job Progress Screen - Track cutting plan progress in real-time
 */
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, FlatList } from 'react-native';
import { Appbar, Card, Text, Checkbox, Chip, Button } from 'react-native-paper';
import { ProgressBar } from '../components/ProgressBar';
import { MobileCuttingPlan, OptimizedCut, JobProgress as JobProgressType } from '../types/mobile';
import { useRealTimeJobUpdates } from '../hooks/useSupabaseSync';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { supabase } from '../services/supabaseClient';

interface JobProgressProps {
  jobId: string;
  onBack?: () => void;
}

export const JobProgress: React.FC<JobProgressProps> = ({ jobId, onBack }) => {
  const [cuttingPlan, setCuttingPlan] = useState<MobileCuttingPlan | null>(null);
  const [completedCuts, setCompletedCuts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<JobProgressType | null>(null);
  const { queueOperation, isOnline } = useOfflineSync();
  
  // Subscribe to real-time updates
  useRealTimeJobUpdates(jobId);

  useEffect(() => {
    loadJobData();
  }, [jobId]);

  useEffect(() => {
    if (cuttingPlan) {
      calculateProgress();
    }
  }, [completedCuts, cuttingPlan]);

  const loadJobData = async () => {
    try {
      setLoading(true);
      
      // Load job and cutting plan from Supabase
      const { data: jobData, error: jobError } = await supabase
        .from('cutting_jobs')
        .select('*, cutting_plans(*)')
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;

      if (jobData) {
        // Transform to mobile format
        const plan: MobileCuttingPlan = {
          id: jobData.id,
          projectName: jobData.project_name || 'Untitled Project',
          projectCode: jobData.project_code,
          profiles: [], // TODO: Load profiles
          status: jobData.status || 'pending',
          optimizedCuts: [], // TODO: Load cuts from cutting_plans
          totalProgress: 0,
          createdAt: new Date(jobData.created_at),
          updatedAt: new Date(jobData.updated_at),
        };

        setCuttingPlan(plan);
        
        // Load completed cuts
        if (jobData.completed_cuts) {
          setCompletedCuts(new Set(jobData.completed_cuts));
        }
      }
    } catch (error) {
      console.error('Failed to load job data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = () => {
    if (!cuttingPlan || cuttingPlan.optimizedCuts.length === 0) {
      setProgress(null);
      return;
    }

    const totalCuts = cuttingPlan.optimizedCuts.length;
    const completed = completedCuts.size;
    const progressPercentage = (completed / totalCuts) * 100;

    setProgress({
      jobId,
      totalCuts,
      completedCuts: completed,
      progressPercentage,
      lastUpdated: new Date(),
    });
  };

  const handleCutComplete = async (cutId: string) => {
    const newCompleted = new Set(completedCuts);
    
    if (newCompleted.has(cutId)) {
      newCompleted.delete(cutId);
    } else {
      newCompleted.add(cutId);
    }

    setCompletedCuts(newCompleted);

    // Sync to server
    const payload = {
      cutId,
      jobId,
      completedAt: new Date().toISOString(),
      completedBy: 'mobile-user', // TODO: Get from auth
    };

    if (isOnline) {
      try {
        // Update job progress in Supabase
        const { error } = await supabase
          .from('cutting_jobs')
          .update({
            completed_cuts: Array.from(newCompleted),
            updated_at: new Date().toISOString(),
          })
          .eq('id', jobId);

        if (error) throw error;
      } catch (error) {
        console.error('Failed to sync cut completion:', error);
        // Revert on error
        setCompletedCuts(completedCuts);
      }
    } else {
      // Queue for offline sync
      await queueOperation('complete_cut', payload);
    }
  };

  const handleStatusChange = async (newStatus: 'pending' | 'in-progress' | 'completed' | 'paused') => {
    if (!cuttingPlan) return;

    const updatedPlan = { ...cuttingPlan, status: newStatus };
    setCuttingPlan(updatedPlan);

    const payload = {
      jobId,
      status: newStatus,
    };

    if (isOnline) {
      try {
        const { error } = await supabase
          .from('cutting_jobs')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', jobId);

        if (error) throw error;
      } catch (error) {
        console.error('Failed to update status:', error);
        setCuttingPlan(cuttingPlan); // Revert
      }
    } else {
      await queueOperation('update_job_status', payload);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={onBack} />
          <Appbar.Content title="Loading..." />
        </Appbar.Header>
        <View style={styles.centerContent}>
          <Text>Loading job data...</Text>
        </View>
      </View>
    );
  }

  if (!cuttingPlan) {
    return (
      <View style={styles.container}>
        <Appbar.Header>
          <Appbar.BackAction onPress={onBack} />
          <Appbar.Content title="Job Not Found" />
        </Appbar.Header>
        <View style={styles.centerContent}>
          <Text>Job not found or failed to load.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={onBack} />
        <Appbar.Content title={cuttingPlan.projectName} />
        <Appbar.Action icon="refresh" onPress={loadJobData} />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* Progress Summary */}
        {progress && (
          <Card style={styles.progressCard}>
            <Card.Content>
              <ProgressBar
                progress={progress.progressPercentage}
                label="Overall Progress"
              />
              <View style={styles.statsRow}>
                <Text variant="bodyMedium">
                  {progress.completedCuts} / {progress.totalCuts} cuts completed
                </Text>
              </View>
            </Card.Content>
          </Card>
        )}

        {/* Status Controls */}
        <Card style={styles.statusCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Status
            </Text>
            <View style={styles.statusButtons}>
              {(['pending', 'in-progress', 'paused', 'completed'] as const).map(status => (
                <Button
                  key={status}
                  mode={cuttingPlan.status === status ? 'contained' : 'outlined'}
                  onPress={() => handleStatusChange(status)}
                  style={styles.statusButton}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </View>
          </Card.Content>
        </Card>

        {/* Cuts List */}
        <Card style={styles.cutsCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              Cuts ({cuttingPlan.optimizedCuts.length})
            </Text>
            {cuttingPlan.optimizedCuts.length === 0 ? (
              <Text variant="bodyMedium" style={styles.emptyText}>
                No cuts in this plan
              </Text>
            ) : (
              cuttingPlan.optimizedCuts.map(cut => (
                <View key={cut.id} style={styles.cutItem}>
                  <Checkbox
                    status={completedCuts.has(cut.id) ? 'checked' : 'unchecked'}
                    onPress={() => handleCutComplete(cut.id)}
                  />
                  <View style={styles.cutDetails}>
                    <Text variant="bodyMedium">
                      {cut.length}mm @ {cut.angle}°
                    </Text>
                    <Text variant="bodySmall" style={styles.cutMeta}>
                      {cut.componentType || 'Component'} • Stock: {cut.stockLength}mm
                    </Text>
                  </View>
                  {completedCuts.has(cut.id) && (
                    <Chip icon="check" style={styles.completedChip}>
                      Done
                    </Chip>
                  )}
                </View>
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressCard: {
    margin: 16,
    marginBottom: 8,
  },
  statsRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusCard: {
    margin: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    marginRight: 8,
    marginBottom: 8,
  },
  cutsCard: {
    margin: 16,
    marginBottom: 8,
  },
  emptyText: {
    color: '#64748b',
    textAlign: 'center',
    padding: 16,
  },
  cutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  cutDetails: {
    flex: 1,
    marginLeft: 12,
  },
  cutMeta: {
    color: '#64748b',
    marginTop: 4,
  },
  completedChip: {
    backgroundColor: '#dcfce7',
  },
});

