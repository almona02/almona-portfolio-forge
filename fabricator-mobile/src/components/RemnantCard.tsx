/**
 * Card component for displaying remnant information
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { MobileRemnant } from '../types/mobile';

interface RemnantCardProps {
  remnant: MobileRemnant;
  onPress?: () => void;
}

export const RemnantCard: React.FC<RemnantCardProps> = ({ remnant, onPress }) => {
  return (
    <Card style={styles.card} onPress={onPress} mode="outlined">
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.profileType}>
            {remnant.profileType}
          </Text>
          <Chip
            icon={remnant.isAvailable ? 'check-circle' : 'close-circle'}
            style={[
              styles.statusChip,
              remnant.isAvailable ? styles.available : styles.unavailable,
            ]}
          >
            {remnant.isAvailable ? 'Available' : 'Used'}
          </Chip>
        </View>
        
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text variant="bodyMedium" style={styles.label}>
              Length:
            </Text>
            <Text variant="bodyLarge" style={styles.value}>
              {remnant.length} mm
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text variant="bodyMedium" style={styles.label}>
              Location:
            </Text>
            <Text variant="bodyMedium" style={styles.value}>
              {remnant.location}
            </Text>
          </View>
          
          {remnant.barcode && (
            <View style={styles.detailRow}>
              <Text variant="bodySmall" style={styles.barcode}>
                Barcode: {remnant.barcode}
              </Text>
            </View>
          )}
          
          {remnant.scannedAt && (
            <Text variant="bodySmall" style={styles.scannedAt}>
              Scanned: {new Date(remnant.scannedAt).toLocaleString()}
            </Text>
          )}
        </View>
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileType: {
    fontWeight: 'bold',
    flex: 1,
  },
  statusChip: {
    height: 28,
  },
  available: {
    backgroundColor: '#dcfce7',
  },
  unavailable: {
    backgroundColor: '#fee2e2',
  },
  details: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: '#64748b',
  },
  value: {
    fontWeight: '600',
  },
  barcode: {
    color: '#64748b',
    fontFamily: 'monospace',
  },
  scannedAt: {
    color: '#94a3b8',
    marginTop: 4,
  },
});

