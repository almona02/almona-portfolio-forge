
import { bench, describe, expect, it } from 'vitest';
import { OptimizedCanvasManager } from '../OptimizedCanvasManager';

// Mock Worker environment if needed, or rely on setup files
// For benchmarks, we care about the main thread overhead even if workers are mocked

describe('Drafting Pipeline Performance (Tier 0)', () => {
  let container: HTMLDivElement;
  let manager: OptimizedCanvasManager;

  const createMockContainer = () => {
    const div = document.createElement('div');
    div.style.width = '1000px';
    div.style.height = '800px';
    document.body.appendChild(div);
    return div;
  };

  // cleanup unused

  it('setup', () => {
     container = createMockContainer();
     manager = new OptimizedCanvasManager(container, {
       x: 0, y: 0, scale: 1, width: 1000, height: 800
     });
     expect(manager).toBeDefined();
  });

  // Benchmark 1: Full Render Cycle
  // Target: <16ms (60fps)
  bench('Render Cycle (Pan)', () => {
    manager.setViewport({ x: Math.random() * 100, y: Math.random() * 100, scale: 1, width: 1000, height: 800 });
  }, { time: 100 }); // Run for 100ms

  bench('Render Cycle (Zoom)', () => {
    manager.setViewport({ x: 0, y: 0, scale: Math.random() + 0.5, width: 1000, height: 800 });
  }, { time: 100 });

  // Benchmark 2: Egyptian Template Preloading
  // Target: <50ms overhead
  bench('Template Preload Dispatch', () => {
    manager.setEgyptianTemplate('casement_2x2');
    manager.preloadTemplate('HIGH');
  }, { time: 100 });
  
  // Benchmark 3: Large Grid Performance
  // Simulate 100 update cycles
  bench('Rapid Grid Updates', () => {
      for(let i=0; i<100; i++) {
          manager.updateDimensions(1000+i, 800+i);
      }
  }, { time: 100 });

});
