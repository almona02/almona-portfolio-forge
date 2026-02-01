/**
 * ALMONA Optimized Canvas Manager
 * @tier Tier 0 (Visual Only)
 * @constitutional_compliance AICS-001 §5.10 (No execution logic)
 * @market_focus Egyptian/MENA Standards
 */


import type { EgyptianPathResponse } from '@/workers/egyptian-path-generator.worker';
import { HardwareLogic } from './services/HardwareLogic';
import { ProfileRegistry } from './services/ProfileRegistry';
import { SmartMeasureLogic, type MeasureMode } from './tools/SmartMeasureLogic';
import type { Geometry2D, Rectangle } from './types/drafting';
import { PathWorkerPool } from './workers/PathWorkerPool';

// ...



export type CanvasLayer = 'background' | 'geometry' | 'selection' | 'interactive';
export type LODLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface Viewport {
  x: number;
  y: number;
  scale: number;
  width: number;
  height: number;
}

export class OptimizedCanvasManager {
  private layers: Record<CanvasLayer, HTMLCanvasElement>;
  private contexts: Record<CanvasLayer, CanvasRenderingContext2D>;
  private viewport: Viewport;
  private currentLOD: LODLevel = 'HIGH';
  
  // Optimization: Dirty Flags
  private isDirty: Record<CanvasLayer, boolean> = {
    background: true,
    geometry: true,
    selection: true,
    interactive: true
  };
  
  // Optimization: Animation Loop
  private animationFrameId: number | null = null;

  // Scene Graph
  private geometry: Geometry2D | null = null;
  
  // Egyptian Market "Realism" Flags
  private templateId: string | null = null;
  private isEgyptianStandard: boolean = false;
  
  // System Pack
  private activeSystemId: string = 'alumil_m9660';

  // Cache for worker responses to prevent duplicate requests and enable preloading
  private geometryCache: Map<string, Promise<EgyptianPathResponse>> = new Map();

  constructor(
    container: HTMLDivElement,
    initialViewport: Viewport
  ) {
    this.viewport = initialViewport;
    
    // Create layers in specific Z-order
    this.layers = {
      background: this.createLayer(container, 0, 'background'),
      geometry: this.createLayer(container, 1, 'geometry'),
      selection: this.createLayer(container, 2, 'selection'),
      interactive: this.createLayer(container, 3, 'interactive'),
    };
    
    // Cache contexts for 60fps performance
    this.contexts = {
      background: this.layers.background.getContext('2d', { alpha: false })!, // Optimization: No alpha on BG
      geometry: this.layers.geometry.getContext('2d', { alpha: true })!,
      selection: this.layers.selection.getContext('2d', { alpha: true })!,
      interactive: this.layers.interactive.getContext('2d', { alpha: true })!,
    };

    // Initial sizing
    this.updateDimensions(initialViewport.width, initialViewport.height);
    
    // Start Render Loop
    this.startLoop();
  }
  
  public destroy() {
    this.stopLoop();
  }
  
  private startLoop() {
    const loop = () => {
      this.renderLoop();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }
  
  private stopLoop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  // Main Render Loop - Batches updates for 60fps
  private renderLoop() {
    // Only render layers that are dirty
    if (this.isDirty.background) {
      this.clearLayer('background');
      this.renderBackground();
      this.isDirty.background = false;
    }
    
    if (this.isDirty.geometry) {
      this.clearLayer('geometry');
      this.renderGeometry();
      this.isDirty.geometry = false;
    }
    
    if (this.isDirty.selection) {
        this.clearLayer('selection');
        this.renderSelection(); // Selection often overlays geometry
        this.isDirty.selection = false;
    }
    
    if (this.isDirty.interactive) {
        this.clearLayer('interactive');
        this.renderInteractive();
        this.isDirty.interactive = false;
    }
  }

  private createLayer(container: HTMLElement, zIndex: number, id: string): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.zIndex = zIndex.toString();
    canvas.style.pointerEvents = 'none'; // Passthrough events to container
    canvas.dataset.layer = id;
    container.appendChild(canvas);
    return canvas;
  }

  public updateDimensions(width: number, height: number, dpr: number = window.devicePixelRatio || 1) {
    this.viewport.width = width;
    this.viewport.height = height;

    Object.values(this.layers).forEach(canvas => {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      
      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);
    });

    // Dimensions changed, full redraw needed
    this.requestRender('ZOOM');
  }

  public setViewport(newViewport: Viewport) {
    // Determine type of change for optimization
    const isPan = newViewport.scale === this.viewport.scale;
    const isZoom = newViewport.scale !== this.viewport.scale;

    this.viewport = newViewport;

    if (isPan) {
        this.requestRender('PAN');
    } else if (isZoom) {
        this.requestRender('ZOOM');
    }
  }

  public setGeometry(geometry: Geometry2D) {
      this.geometry = geometry;
      this.requestRender('GEOMETRY_UPDATE');
  }

  public setEgyptianTemplate(templateId: string | null) {
      if (this.templateId !== templateId) {
          this.templateId = templateId;
          this.isEgyptianStandard = !!templateId;
          this.requestRender('GEOMETRY_UPDATE');
      }
  }

  /**
   * Smart Render Controller
   * Only marks layers as dirty. Actual rendering happens in renderLoop.
   */
  public requestRender(type: 'PAN' | 'ZOOM' | 'GEOMETRY_UPDATE' | 'SELECTION' | 'CURSOR') {
    // Calculate LOD based on zoom level (Egyptian profiles are detailed)
    this.calculateLOD();

    switch (type) {
      case 'CURSOR':
        this.isDirty.interactive = true;
        break;
      
      case 'SELECTION':
        this.isDirty.selection = true;
        break;

      case 'GEOMETRY_UPDATE':
        this.isDirty.geometry = true;
        this.isDirty.selection = true; // Selection usually tied to geometry
        break;

      case 'PAN':
        // All layers move on Pan
        this.isDirty.background = true;
        this.isDirty.geometry = true;
        this.isDirty.selection = true;
        this.isDirty.interactive = true;
        break;

      case 'ZOOM':
        // Everything changes on zoom
        this.isDirty.background = true;
        this.isDirty.geometry = true;
        this.isDirty.selection = true;
        this.isDirty.interactive = true;
        break;
    }
  }

  /**
   * Egyptian Template-Aware LOD Calculation
   * High zoom (>1.0): Render full profile extrusions (PS/Alumil details)
   * Mid zoom (0.5-1.0): Render simplified blocks
   * Low zoom (<0.5): Render bounding boxes only
   */
  private calculateLOD() {
    if (this.viewport.scale > 1.0) this.currentLOD = 'HIGH';
    else if (this.viewport.scale > 0.4) this.currentLOD = 'MEDIUM';
    else this.currentLOD = 'LOW';
  }

  // --- Rendering Implementations ---

  private renderBackground() {
    const ctx = this.contexts.background;
    ctx.save();
    
    // Draw Grid (Infinite)
    this.drawGrid(ctx);

    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D) {
      const { x, y, scale, width, height } = this.viewport;
      const gridSize = 100 * scale; // 100mm grid
      
      // Optimization: Skip grid if too dense (sub-pixel or barely visible)
      if (gridSize < 4) return;

      // Ensure positive offset only
      const offsetX = (x % gridSize + gridSize) % gridSize;
      const offsetY = (y % gridSize + gridSize) % gridSize;

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; // Blender-like subtle grid
      ctx.lineWidth = 1;

      for (let i = offsetX; i < width; i += gridSize) {
          ctx.moveTo(i, 0);
          ctx.lineTo(i, height);
      }
      for (let j = offsetY; j < height; j += gridSize) {
          ctx.moveTo(0, j);
          ctx.lineTo(width, j);
      }
      ctx.stroke();

      // Axis lines
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; // Slightly brighter axis
      ctx.lineWidth = 2;
      
      // Draw axis lines only if they are visible in the viewport
      // The axis is at world (0,0).
      // Screen X of world 0 = x
      // Screen Y of world 0 = y
      if (x >= 0 && x <= width) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
      }
      if (y >= 0 && y <= height) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
      }
      ctx.stroke();
  }

  private renderGeometry() {
    const ctx = this.contexts.geometry;
    ctx.save();
    this.applyTransform(ctx);

    if (!this.geometry) {
        // Legacy/Fallback mode if no geometry set but templateId exists (for benchmarks)
        if (this.templateId && this.isEgyptianStandard) {
             // Use a default mock rect for benchmarking
             const mockRect: Rectangle = { x: 0, y: 0, width: 1200, height: 1200, type: 'casement' };
             // Check visibility (Culling)
             if (this.isVisible(mockRect)) {
                 this.renderEgyptianTemplate(ctx, this.templateId, mockRect, this.currentLOD);
             }
        }
    } else {
        // Iterate Scene Graph
        const { rectangles } = this.geometry;
        
        // 1. Render Rectangles (Egyptian Windows/Doors)
        rectangles.forEach(rect => {
            // Viewport Culling: Skip if not visible
            if (!this.isVisible(rect)) return;

            // Egyptian Template Rendering
            if (this.isEgyptianStandard && this.templateId && rect.type) {
                 // Use global template for now, but in future use rect.type mapping
                 this.renderEgyptianTemplate(ctx, this.templateId, rect, this.currentLOD);
            } else {
                // Standard CAD Rendering (Simple Lines)
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
            }
        });
    }

    ctx.restore();
  }
  
  /**
   * Viewport Culling Check
   * Returns true if rectangle intersects with current visible viewport area
   */
  private isVisible(rect: Rectangle): boolean {
      // Calculate viewport bounds in world space
      const vX = -this.viewport.x / this.viewport.scale;
      const vY = -this.viewport.y / this.viewport.scale;
      const vW = this.viewport.width / this.viewport.scale;
      const vH = this.viewport.height / this.viewport.scale;
      
      return (
          rect.x < vX + vW &&
          rect.x + rect.width > vX &&
          rect.y < vY + vH &&
          rect.y + rect.height > vY
      );
  }

  private getCacheKey(id: string, width: number, height: number, lod: string): string {
      return `${id}-${width}-${height}-${lod}`;
  }

  /**
   * Predictive Loading: Pre-fetch a specific LOD for the current template
   * Call this when we anticipate a zoom change.
   */
  public preloadTemplate(lod: LODLevel) {
      if (!this.templateId) return;
      // Hardcoded dims for Phase 1 demo
      const width = 1200;
      const height = 1200;
      const quality = lod === 'HIGH' ? 'high' : lod === 'MEDIUM' ? 'medium' : 'low';
      
      const key = this.getCacheKey(this.templateId, width, height, quality);
      
      if (!this.geometryCache.has(key)) {
          const pool = PathWorkerPool.getInstance();
          const promise = pool.requestPathGeneration(this.templateId, width, height, quality);
          this.geometryCache.set(key, promise);
      }
  }

  private async renderEgyptianTemplate(ctx: CanvasRenderingContext2D, id: string, rect: Rectangle, lod: LODLevel) {
      if (!this.templateId) return;

      try {
          const width = rect.width;
          const height = rect.height;
          const quality = lod === 'HIGH' ? 'high' : lod === 'MEDIUM' ? 'medium' : 'low';
          
          // Fetch real specs from registry (mock access for now until property added)
          const systemId = this.activeSystemId; 
          const specs = ProfileRegistry.getInstance().getSpecs(systemId);
          
          // Calculate Hardware
          const hardware = HardwareLogic.calculateHardware(rect, rect.type || 'casement');

          // Pass specs as params
          const params = specs ? { 
              frameFace: specs.profileDepth, 
              sashFace: specs.profileDepth + 20,
              hardware: hardware // Pass calculated hardware positions
          } : {};

          const key = this.getCacheKey(id, width, height, quality + systemId);

          let responsePromise = this.geometryCache.get(key);

          if (!responsePromise) {
              const pool = PathWorkerPool.getInstance();
              responsePromise = pool.requestPathGeneration(
                  this.templateId, 
                  width, 
                  height, 
                  quality,
                  params
              );
              this.geometryCache.set(key, responsePromise);
          }
          
          const response = await responsePromise;

          // Render at rectangle position
          ctx.save();
          ctx.translate(rect.x, rect.y);

          // Render the paths returned by the worker
          response.paths.forEach((path: { d: string; fill?: string; stroke?: string }) => {
              const p = new Path2D(path.d);
              
              // Fill
              if (path.fill && path.fill !== 'none') {
                  ctx.fillStyle = path.fill;
                  ctx.fill(p);
              }
              
              // Stroke
              if (path.stroke && path.stroke !== 'none') {
                  ctx.strokeStyle = path.stroke;
                  ctx.stroke(p);
              }
          });
          
          ctx.restore();

          // Metrics Tracking (Tier 0)
          if (response.metrics.calcTimeMs > 16) {
              console.warn(`[Performance] Heavy Template Render: ${response.metrics.calcTimeMs.toFixed(1)}ms`);
          }

      } catch (err) {
          console.error('Failed to render Egyptian template:', err);
          // Fallback simple box
          ctx.strokeStyle = 'red';
          ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
      }
  }

  private renderSelection() {
     // Selection logic (overlay)
  }

    
// ... (inside class)

  // Smart Measuring
  private measureMode: MeasureMode | 'none' = 'none';

  public setMeasureMode(mode: MeasureMode | 'none') {
      this.measureMode = mode;
      this.requestRender('CURSOR');
  }

  // ...

  private renderInteractive() {
    const ctx = this.contexts.interactive;
    ctx.save();
    this.applyTransform(ctx);

    // If Smart Measure is active, show snap points
    if (this.measureMode !== 'none' && this.geometry) {
         ctx.fillStyle = '#3b82f6'; // blue-500
         ctx.strokeStyle = '#3b82f6';
         ctx.lineWidth = 1 / this.viewport.scale; // maintain 1px line width
         
         const pointRadius = 4 / this.viewport.scale;

         this.geometry.rectangles.forEach(rect => {
             // Skip measuring if too small (LOD)
             if (rect.width * this.viewport.scale < 10) return;

             const points = SmartMeasureLogic.getSnapPoints(rect, this.measureMode as MeasureMode, this.activeSystemId);
             
             // Draw Points
             points.forEach(p => {
                 ctx.beginPath();
                 ctx.arc(p.x, p.y, pointRadius, 0, Math.PI * 2);
                 ctx.fill();
             });
             
             // Draw Guide Lines (Box) based on points
             if (points.length >= 4) {
                 ctx.beginPath();
                 ctx.moveTo(points[0].x, points[0].y); // Top-Left
                 ctx.lineTo(points[1].x, points[1].y); // Top-Right
                 ctx.lineTo(points[2].x, points[2].y); // Bottom-Right
                 ctx.lineTo(points[3].x, points[3].y); // Bottom-Left
                 ctx.closePath();
                 ctx.stroke();
             }
         });
    }

    ctx.restore();
  }

  private applyTransform(ctx: CanvasRenderingContext2D) {
    ctx.translate(this.viewport.x, this.viewport.y);
    ctx.scale(this.viewport.scale, this.viewport.scale);
  }
  
  private clearLayer(layer: CanvasLayer) {
    const canvas = this.layers[layer];
    this.contexts[layer].clearRect(0, 0, canvas.width, canvas.height); // Use actual canvas dims
  }
}
