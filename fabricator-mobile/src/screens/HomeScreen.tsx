/**
 * Home Screen - Main dashboard with quick access to features
 */
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Appbar, Card, Text, Button, FAB } from 'react-native-paper';
import { useOfflineSync } from '../hooks/useOfflineSync';

interface HomeScreenProps {
  onNavigateToRemnants: () => void;
  onNavigateToJobs: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToRemnants,
  onNavigateToJobs,
}) => {
  const { networkStatus, queueLength, syncNow, isOnline } = useOfflineSync();

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Fabricator Pro" />
        {queueLength > 0 && (
          <Appbar.Action
            icon="sync"
            onPress={syncNow}
            disabled={!isOnline}
          />
        )}
      </Appbar.Header>

      <ScrollView style={styles.content}>
        {/* Network Status */}
        {!isOnline && (
          <Card style={styles.statusCard}>
            <Card.Content>
              <Text variant="bodyMedium" style={styles.offlineText}>
                ⚠️ Offline Mode
              </Text>
              {queueLength > 0 && (
                <Text variant="bodySmall" style={styles.queueText}>
                  {queueLength} operation(s) queued for sync
                </Text>
              )}
            </Card.Content>
          </Card>
        )}

        {/* Quick Actions */}
        <Card style={styles.actionCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Quick Actions
            </Text>
            
            <Button
              mode="contained"
              icon="barcode-scan"
              onPress={onNavigateToRemnants}
              style={styles.actionButton}
            >
              Scan Remnant
            </Button>

            <Button
              mode="outlined"
              icon="clipboard-list"
              onPress={onNavigateToJobs}
              style={styles.actionButton}
            >
              View Jobs
            </Button>
          </Card.Content>
        </Card>

        {/* Stats Card */}
        <Card style={styles.statsCard}>
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Today's Summary
            </Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text variant="headlineMedium" style={styles.statValue}>
                  0
                </Text>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Remnants Scanned
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text variant="headlineMedium" style={styles.statValue}>
                  0
                </Text>
                <Text variant="bodySmall" style={styles.statLabel}>
                  Cuts Completed
                </Text>
              </View>
            </View>
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
  statusCard: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#fef3c7',
  },
  offlineText: {
    color: '#92400e',
    fontWeight: '600',
  },
  queueText: {
    color: '#92400e',
    marginTop: 4,
  },
  actionCard: {
    margin: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: '600',
  },
  actionButton: {
    marginBottom: 8,
  },
  statsCard: {
    margin: 16,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontWeight: 'bold',
    color: '#2563eb',
  },
  statLabel: {
    color: '#64748b',
    marginTop: 4,
  },
});

