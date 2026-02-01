/**
 * MobileMeasurementSync.ts
 * Bridge for synchronizing measurement data from the companion mobile app.
 * Allows site surveyors to push dimensions directly to the cloud.
 */

export interface MobileMeasurementBatch {
    surveyorId: string;
    projectId: string; // Creates new project if null
    timestamp: number;
    deviceId: string;
    measurements: SiteMeasurement[];
}

export interface SiteMeasurement {
    tempId: string;
    floor: string;
    room: string;
    openingName: string; // e.g., "W1"
    width: number;
    height: number;
    depth: number; // Wall thickness
    photos: string[]; // URLs or base64 (handled via dedicated media endpoint)
    notes: string;
    status: 'draft' | 'verified';
}

export class MobileBridge {
    /**
     * Receives a batch of measurements and converts them to positions
     */
    static async processIncomingBatch(batch: MobileMeasurementBatch): Promise<{ projectId: string; count: number }> {
        console.log(`[MobileBridge] Processing batch from ${batch.surveyorId}`);
        
        // Logic to create/find project
        // Logic to map SiteMeasurement -> WindowUnit (Positions)
        
        return { 
            projectId: batch.projectId || 'new-proj-123', 
            count: batch.measurements.length 
        };
    }

    static validateBatch(batch: MobileMeasurementBatch): boolean {
        // Enforce data integrity
        return batch.measurements.every(m => m.width > 0 && m.height > 0);
    }
}
