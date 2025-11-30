/**
 * Barcode scanner component for scanning remnants, profiles, and projects
 */
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ScanResult } from '../types/mobile';
import { Button, Card } from 'react-native-paper';

interface BarcodeScannerProps {
  onScan: (result: ScanResult) => void;
  scanType: 'remnant' | 'project' | 'profile';
  onClose?: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onScan,
  scanType,
  onClose,
}) => {
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          Camera permission is required to scan barcodes
        </Text>
        <Button mode="contained" onPress={requestPermission} style={styles.button}>
          Grant Permission
        </Button>
        {onClose && (
          <Button mode="outlined" onPress={onClose} style={styles.button}>
            Cancel
          </Button>
        )}
      </View>
    );
  }

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return; // Prevent multiple scans

    setScanned(true);

    try {
      // Parse barcode data
      // Expected format: "FABRICATOR:{type}:{id}" or just the ID
      let parsedData: any = { id: data };
      
      if (data.startsWith('FABRICATOR:')) {
        const parts = data.split(':');
        if (parts.length >= 3) {
          parsedData = {
            type: parts[1],
            id: parts[2],
            raw: data,
          };
        }
      }

      const result: ScanResult = {
        type: scanType,
        data: parsedData,
        timestamp: new Date(),
        barcode: data,
      };

      onScan(result);

      // Reset after 2 seconds to allow scanning again
      setTimeout(() => {
        setScanned(false);
      }, 2000);
    } catch (error) {
      console.error('Error parsing barcode:', error);
      Alert.alert('Scan Error', 'Failed to parse barcode. Please try again.');
      setScanned(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing={facing}
        onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'code128', 'ean13', 'ean8', 'code39'],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.scanArea}>
            <View style={styles.corner} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.instruction}>
            Position barcode within the frame
          </Text>
        </View>
      </CameraView>
      
      <Card style={styles.controls}>
        <Card.Content>
          <View style={styles.controlsRow}>
            <Button
              mode="outlined"
              onPress={toggleCameraFacing}
              icon="camera-flip"
            >
              Flip Camera
            </Button>
            {onClose && (
              <Button mode="contained" onPress={onClose}>
                Close
              </Button>
            )}
          </View>
          {scanned && (
            <Text style={styles.scanStatus}>Barcode scanned! Processing...</Text>
          )}
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#2563eb',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderLeftWidth: 4,
    borderTopWidth: 4,
    borderColor: '#2563eb',
    top: 0,
    left: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    left: 'auto',
    borderLeftWidth: 0,
    borderRightWidth: 4,
  },
  bottomLeft: {
    top: 'auto',
    bottom: 0,
    borderTopWidth: 0,
    borderBottomWidth: 4,
  },
  bottomRight: {
    top: 'auto',
    bottom: 0,
    right: 0,
    left: 'auto',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4,
  },
  instruction: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 8,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  button: {
    marginVertical: 8,
  },
  message: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    margin: 20,
  },
  scanStatus: {
    textAlign: 'center',
    color: '#22c55e',
    marginTop: 8,
    fontWeight: 'bold',
  },
});

