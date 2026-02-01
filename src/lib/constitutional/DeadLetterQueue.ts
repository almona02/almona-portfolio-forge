
/**
 * Dead Letter Queue (DLQ)
 * 
 * Captures failed events/operations for later analysis or retry.
 * Prevents data loss when primary processing fails.
 * 
 * @constitutional_compliance AICS-001 §9.3 (Audit Completeness)
 */
export class DeadLetterQueue {
  private queue: any[] = [];
  // Max size to prevent memory exhaustion
  private readonly MAX_SIZE = 1000;

  /**
   * Push a failed event to the DLQ
   * @param event The original event/data
   * @param error The error that caused failure
   * @param context Optional context (e.g. retry count)
   */
  push(event: any, error: any, context: { retryCount?: number } = {}) {
    if (this.queue.length >= this.MAX_SIZE) {
        // Drop oldest element (Ring buffer behavior)
        this.queue.shift();
    }
    
    this.queue.push({
      event,
      error: error instanceof Error ? error.message : String(error),
      timestamp: Date.now(),
      retryCount: (context.retryCount || 0) + 1
    });
    
    console.warn('[DeadLetterQueue] Captured failed event:', { error });
  }

  /**
   * Get all items in DLQ
   */
  getItems(): any[] {
    return [...this.queue];
  }

  /**
   * Clear the queue
   */
  clear() {
    this.queue = [];
  }

  /**
   * Attempt to retry all items in the DLQ using a handler
   * @param handler Function to process the event
   * @returns Number of successfully retried items
   */
  async retryAll(handler: (event: any) => Promise<void>): Promise<number> {
    const itemsToRetry = [...this.queue];
    this.queue = []; // Clear queue, re-add failures if they fail again
    
    let successCount = 0;
    
    for (const item of itemsToRetry) {
      try {
        await handler(item.event);
        successCount++;
      } catch (error) {
        // Re-queue with updated error info and incremented retry count
        this.push(item.event, error, { retryCount: item.retryCount });
      }
    }
    
    return successCount;
  }
  
  /**
   * Get formatted metrics for health check
   */
  getMetrics() {
      return {
          size: this.queue.length,
          capacity: this.MAX_SIZE,
          oldestTimestamp: this.queue.length > 0 ? this.queue[0].timestamp : null
      };
  }
}
