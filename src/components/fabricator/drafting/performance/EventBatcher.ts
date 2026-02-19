/**
 * ALMONA Constitutional Event Batcher
 * @tier Tier 0 (Visual Only)
 * 
 * Optimizes high-frequency input events (mousemove, wheel) by aligning them
 * with the browser's refresh rate (requestAnimationFrame).
 * 
 * Essential for 60fps performance when dragging complex "Heavy" Egyptian templates.
 */
export class EventBatcher {
  private rafId: number | null = null;
  private latestEvent: React.MouseEvent | WheelEvent | null = null;
  private callback: (e: unknown) => void;

  constructor(callback: (e: unknown) => void) {
    this.callback = callback;
  }

  /**
   * Schedule an event to be processed on the next animation frame.
   * Only the latest event of the same type is processed (coalescing).
   */
  public schedule(e: React.MouseEvent | WheelEvent) {
    // Synthetic events reuse warning: In React 17+, this is less of an issue, 
    // but we should persist if we were storing it async. 
    // However, for rAF we might strictly need just coordinates.
    // For now, we assume we pass the event structure needed.
    // If React pooling is an issue (older React), e.persist() would be needed.
    // We'll trust the modern React environment of this project.
    
    this.latestEvent = e;

    if (!this.rafId) {
      this.rafId = requestAnimationFrame(this.flush);
    }
  }

  private flush = () => {
    this.rafId = null;
    if (this.latestEvent) {
      try {
        this.callback(this.latestEvent);
      } finally {
        this.latestEvent = null;
      }
    }
  };

  /**
   * Cancel pending updates
   */
  public cancel() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.latestEvent = null;
  }
}
