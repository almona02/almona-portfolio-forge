/**
 * Gold-Tier Touch Gesture Manager
 * Precision multi-touch handling for CAD-like interactions.
 * 
 * Features:
 * - PointerEvents based (works on Mouse + Touch)
 * - Multi-touch support (Pinch/Zoom)
 * - Gesture recognition (Tap, DoubleTap, LongPress, Pan, Pinch)
 * - Velocity tracking for inertia
 * - Configurable thresholds
 */

export type GestureType = 'tap' | 'doubleTap' | 'longPress' | 'pan' | 'pinch' | 'rotate';

export interface GestureEvent {
  type: GestureType;
  center: { x: number; y: number };
  deltaX?: number;
  deltaY?: number;
  scale?: number; // For pinch
  rotation?: number; // For rotate
  velocity?: { x: number; y: number };
  pointers: number; // Number of active pointers
  originalEvent: PointerEvent;
}

export interface TouchConfig {
  tapThresholdMs: number;
  doubleTapThresholdMs: number;
  longPressThresholdMs: number;
  movementThresholdPx: number; // Max movement allowed for a tap
  panThresholdPx: number; // Min movement to trigger pan
}

const DEFAULT_CONFIG: TouchConfig = {
  tapThresholdMs: 250,
  doubleTapThresholdMs: 300,
  longPressThresholdMs: 500,
  movementThresholdPx: 10,
  panThresholdPx: 10,
};

type GestureHandler = (event: GestureEvent) => void;

export class TouchGestureManager {
  private element: HTMLElement | null = null;
  private config: TouchConfig;
  private handlers: Map<GestureType, Set<GestureHandler>> = new Map();
  
  // State
  private activePointers: Map<number, PointerEvent> = new Map();
  private startPointers: Map<number, { x: number; y: number; time: number }> = new Map();
  private lastTapTime: number = 0;
  private longPressTimeout: NodeJS.Timeout | null = null;
  private isPanning: boolean = false;
  private isPinching: boolean = false;
  private initialPinchDistance: number = 0;
  // private initialPinchScale: number = 1; // Unused
  private lastPinchCenter: { x: number; y: number } | null = null;

  constructor(config: Partial<TouchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Attach listeners to an element
   */
  public attach(element: HTMLElement) {
    if (this.element) this.detach();
    this.element = element;
    
    // Use non-passive listener to allow preventing default (scrolling)
    this.element.addEventListener('pointerdown', this.handlePointerDown, { passive: false });
    this.element.addEventListener('pointermove', this.handlePointerMove, { passive: false });
    this.element.addEventListener('pointerup', this.handlePointerUp);
    this.element.addEventListener('pointercancel', this.handlePointerCancel);
    this.element.addEventListener('pointerleave', this.handlePointerUp);
    
    // Disable native touch actions
    this.element.style.touchAction = 'none';
  }

  /**
   * Remove listeners
   */
  public detach() {
    if (!this.element) return;
    
    this.element.removeEventListener('pointerdown', this.handlePointerDown);
    this.element.removeEventListener('pointermove', this.handlePointerMove);
    this.element.removeEventListener('pointerup', this.handlePointerUp);
    this.element.removeEventListener('pointercancel', this.handlePointerCancel);
    this.element.removeEventListener('pointerleave', this.handlePointerUp);
    
    this.element.style.touchAction = '';
    this.element = null;
  }

  /**
   * Register a handler
   */
  public on(type: GestureType, handler: GestureHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
  }

  /**
   * Unregister a handler
   */
  public off(type: GestureType, handler: GestureHandler) {
    this.handlers.get(type)?.delete(handler);
  }

  // --- Event Handlers ---

  private handlePointerDown = (e: PointerEvent) => {
    // Only capture primary buttons or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    this.activePointers.set(e.pointerId, e);
    this.startPointers.set(e.pointerId, { x: e.clientX, y: e.clientY, time: Date.now() });

    if (this.activePointers.size === 1) {
      // Possible Tap or Long Press
      this.longPressTimeout = setTimeout(() => {
        if (!this.isPanning && !this.isPinching && this.activePointers.size === 1) {
          this.emit('longPress', this.createEvent('longPress', e));
        }
      }, this.config.longPressThresholdMs);
    } else if (this.activePointers.size === 2) {
      // Start Pinch
      this.isPinching = true;
      this.initialPinchDistance = this.getDistance(this.getActivePointers());
      this.lastPinchCenter = this.getCenter(this.getActivePointers());
      
      // Cancel long press
      if (this.longPressTimeout) clearTimeout(this.longPressTimeout);
    }
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (!this.activePointers.has(e.pointerId)) return;
    
    this.activePointers.set(e.pointerId, e);

    if (this.isPinching && this.activePointers.size === 2) {
      const currentDistance = this.getDistance(this.getActivePointers());
      const scale = currentDistance / this.initialPinchDistance;
      
      const center = this.getCenter(this.getActivePointers());
      const deltaX = this.lastPinchCenter ? center.x - this.lastPinchCenter.x : 0;
      const deltaY = this.lastPinchCenter ? center.y - this.lastPinchCenter.y : 0;
      
      this.lastPinchCenter = center;
      
      this.emit('pinch', {
        type: 'pinch',
        center,
        deltaX,
        deltaY,
        scale,
        pointers: 2,
        originalEvent: e
      });
      return;
    }

    if (this.activePointers.size === 1) {
       const start = this.startPointers.get(e.pointerId)!;
       const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);

       // Check if moved enough to be a pan
       if (dist > this.config.panThresholdPx) {
         this.isPanning = true;
         if (this.longPressTimeout) clearTimeout(this.longPressTimeout);
         
         this.emit('pan', {
             type: 'pan',
             center: { x: e.clientX, y: e.clientY },
             deltaX: e.clientX - start.x,
             deltaY: e.clientY - start.y,
             pointers: 1,
             originalEvent: e
         });
       }
    }
  };

  private handlePointerUp = (e: PointerEvent) => {
    if (!this.activePointers.has(e.pointerId)) return;
    
    const start = this.startPointers.get(e.pointerId)!;
    const now = Date.now();
    const duration = now - start.time;
    const dist = Math.hypot(e.clientX - start.x, e.clientY - start.y);

    if (this.activePointers.size === 1 && !this.isPanning && !this.isPinching) {
       // Tap Detection
       if (duration < this.config.tapThresholdMs && dist < this.config.movementThresholdPx) {
           // Check Double Tap
           if (now - this.lastTapTime < this.config.doubleTapThresholdMs) {
               this.emit('doubleTap', this.createEvent('doubleTap', e));
               this.lastTapTime = 0; // Reset
           } else {
               this.emit('tap', this.createEvent('tap', e));
               this.lastTapTime = now;
           }
       }
    }

    this.cleanup(e.pointerId);
  };

  private handlePointerCancel = (e: PointerEvent) => {
      this.cleanup(e.pointerId);
  };

  // --- Helpers ---

  private cleanup(pointerId: number) {
    this.activePointers.delete(pointerId);
    this.startPointers.delete(pointerId);
    
    if (this.activePointers.size === 0) {
        this.isPanning = false;
        this.isPinching = false;
        this.lastPinchCenter = null;
        if (this.longPressTimeout) clearTimeout(this.longPressTimeout);
    } else if (this.activePointers.size < 2) {
        this.isPinching = false;
        this.lastPinchCenter = null;
    }
  }

  private getActivePointers(): PointerEvent[] {
      return Array.from(this.activePointers.values());
  }

  private getDistance(pointers: PointerEvent[]): number {
      const [p1, p2] = pointers;
      return Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
  }

  private getCenter(pointers: PointerEvent[]): { x: number; y: number } {
      if (pointers.length === 1) return { x: pointers[0].clientX, y: pointers[0].clientY };
      const [p1, p2] = pointers;
      return {
          x: (p1.clientX + p2.clientX) / 2,
          y: (p1.clientY + p2.clientY) / 2
      };
  }

  private createEvent(type: GestureType, originalEvent: PointerEvent): GestureEvent {
      return {
          type,
          center: { x: originalEvent.clientX, y: originalEvent.clientY },
          pointers: this.activePointers.size,
          originalEvent
      };
  }

  private emit(type: GestureType, event: GestureEvent) {
      const handlers = this.handlers.get(type);
      if (handlers) {
          handlers.forEach(h => h(event));
      }
  }
}
