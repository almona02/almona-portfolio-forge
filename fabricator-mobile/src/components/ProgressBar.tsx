/**
 * Progress bar component for job tracking
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ProgressBar as PaperProgressBar, Text } from 'react-native-paper';

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  showPercentage = true,
}) => {
  const clampedProgress = Math.max(0, Math.min(100, progress)) / 100;

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelRow}>
          <Text variant="bodyMedium" style={styles.label}>
            {label}
          </Text>
          {showPercentage && (
            <Text variant="bodyMedium" style={styles.percentage}>
              {Math.round(progress)}%
            </Text>
          )}
        </View>
      )}
      <PaperProgressBar
        progress={clampedProgress}
        color="#2563eb"
        style={styles.progressBar}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontWeight: '500',
  },
  percentage: {
    fontWeight: '600',
    color: '#2563eb',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
});

