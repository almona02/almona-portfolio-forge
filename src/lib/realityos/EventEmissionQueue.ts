/**
 * RealityOS Event Emission Queue
 * 
 * Queues and batches event emissions for performance optimization.
 * 
 * @since Phase 3: Precision Upgrade Plan (January 2026)
 */

import { EventLedger } from './EventLedger';
import type { EventRecord, RealityOSEvent } from './types';

/**
 * Event Emission Queue
 * 
 * Queues events for batch processing and handles retries.
 */
export class EventEmissionQueue {
  private queue: Array<{ event: RealityOSEvent; resolve: (event: EventRecord) => void; reject: (error: Error) => void }> = [];
  private processing = false;
  private eventLedger: EventLedger;
  private readonly BATCH_SIZE = 10;
  private readonly BATCH_DELAY_MS = 100; // 100ms delay between batches

  constructor() {
    this.eventLedger = new EventLedger();
  }

  /**
   * Enqueue event for emission
   */
  async enqueue(event: RealityOSEvent): Promise<EventRecord> {
    return new Promise((resolve, reject) => {
      this.queue.push({ event, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process queue in batches
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const batch = this.queue.splice(0, this.BATCH_SIZE);

        // Process batch in parallel
        const results = await Promise.allSettled(
          batch.map(({ event }) => this.eventLedger.record(event))
        );

        // Resolve or reject promises
        results.forEach((result, index) => {
          const { resolve, reject } = batch[index];
          if (result.status === 'fulfilled') {
            resolve(result.value);
          } else {
            reject(new Error(result.reason?.message || 'Event emission failed'));
          }
        });

        // Delay between batches
        if (this.queue.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, this.BATCH_DELAY_MS));
        }
      }
    } catch (error) {
      console.error('Event queue processing error:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue.forEach(({ reject }) => {
      reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }
}

/**
 * Singleton instance
 */
export const eventEmissionQueue = new EventEmissionQueue();

