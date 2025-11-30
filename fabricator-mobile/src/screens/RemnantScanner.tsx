/**
 * Remnant Scanner Screen - Scan and manage remnants on shop floor
 */
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Appbar, FAB, Text, Card, Chip, Button } from 'react-native-paper';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { RemnantCard } from '../components/RemnantCard';
import { ScanResult, MobileRemnant } from '../types/mobile';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { supabase } from '../services/supabaseClient';

export const RemnantScanner: React.FC = () => {
  const [showScanner, setShowScanner] = useState(false);
  const [scannedRemnants, setScannedRemnants] = useState<MobileRemnant[]>([]);
  const [currentLocation, setCurrentLocation] = useState('main-warehouse');
  const [loading, setLoading] = useState(false);
  const { queueOperation, isOnline, networkStatus } = useOfflineSync();

  // Load existing remnants on mount
  useEffect(() => {
    loadRemnants();
  }, []);

  const loadRemnants = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('fabricator_remnants')
        .select('*')
        .eq('is_available', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data) {
        const remnants: MobileRemnant[] = data.map((r: any) => ({
          id: r.id,
          profileId: r.profile_id,
          profileType: r.profile_name || 'Unknown',
          length: r.length,
          location: r.location || 'unknown',
          barcode: r.barcode,
          scannedAt: r.scanned_at ? new Date(r.scanned_at) : undefined,
          scannedBy: r.scanned_by,
          isAvailable: r.is_available,
        }));
        setScannedRemnants(remnants);
      }
    } catch (error) {
      console.error('Failed to load remnants:', error);
      Alert.alert('Error', 'Failed to load remnants. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemnantScan = async (scanData: ScanResult) => {
    try {
      const remnantId = scanData.data.id;
      if (!remnantId) {
        Alert.alert('Invalid Barcode', 'Could not identify remnant from barcode.');
        setShowScanner(false);
        return;
      }

      // Update remnant location
      const updatePayload = {
        remnantId,
        location: currentLocation,
        scannedAt: new Date().toISOString(),
        scannedBy: 'mobile-user', // TODO: Get from auth
      };

      if (isOnline) {
        // Try immediate sync
        const { error } = await supabase
          .from('fabricator_remnants')
          .update({
            location: currentLocation,
            scanned_at: new Date().toISOString(),
            scanned_by: 'mobile-user',
            updated_at: new Date().toISOString(),
          })
          .eq('id', remnantId);

        if (error) throw error;

        Alert.alert('Success', 'Remnant location updated successfully!');
        await loadRemnants();
      } else {
        // Queue for offline sync
        await queueOperation('scan_remnant', updatePayload);
        Alert.alert(
          'Queued',
          'Remnant update queued. Will sync when online.',
          [{ text: 'OK', onPress: () => setShowScanner(false) }]
        );
      }
    } catch (error) {
      console.error('Failed to update remnant:', error);
      Alert.alert('Error', 'Failed to update remnant. Please try again.');
    }
  };

  if (showScanner) {
    return (
      <BarcodeScanner
        onScan={handleRemnantScan}
        scanType="remnant"
        onClose={() => setShowScanner(false)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Remnant Scanner" />
        <Appbar.Action
          icon="refresh"
          onPress={loadRemnants}
          disabled={loading}
        />
      </Appbar.Header>

      <View style={styles.content}>
        <Card style={styles.locationCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.locationLabel}>
              Current Location
            </Text>
            <Chip
              icon="map-marker"
              style={styles.locationChip}
              onPress={() => {
                // TODO: Open location picker
                Alert.alert('Location', 'Location picker coming soon');
              }}
            >
              {currentLocation}
            </Chip>
          </Card.Content>
        </Card>

        {!networkStatus.isOnline && (
          <Card style={styles.offlineCard}>
            <Card.Content>
              <Text variant="bodySmall" style={styles.offlineText}>
                ⚠️ Offline mode - changes will sync when online
              </Text>
            </Card.Content>
          </Card>
        )}

        <ScrollView style={styles.scrollView}>
          {scannedRemnants.length === 0 ? (
            <View style={styles.emptyState}>
              <Text variant="bodyLarge" style={styles.emptyText}>
                No remnants found
              </Text>
              <Text variant="bodyMedium" style={styles.emptySubtext}>
                Scan a remnant to get started
              </Text>
            </View>
          ) : (
            scannedRemnants.map(remnant => (
              <RemnantCard key={remnant.id} remnant={remnant} />
            ))
          )}
        </ScrollView>
      </View>

      <FAB
        icon="barcode-scan"
        style={styles.fab}
        onPress={() => setShowScanner(true)}
        label="Scan"
      />
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
  locationCard: {
    margin: 16,
    marginBottom: 8,
  },
  locationLabel: {
    marginBottom: 8,
    color: '#64748b',
  },
  locationChip: {
    alignSelf: 'flex-start',
  },
  offlineCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#fef3c7',
  },
  offlineText: {
    color: '#92400e',
  },
  scrollView: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginBottom: 8,
    color: '#64748b',
  },
  emptySubtext: {
    color: '#94a3b8',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#2563eb',
  },
});

