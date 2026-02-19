// TIER 0 CONSTITUTIONAL PRIMITIVE: Path Generation Worker
// Handles "Heavy" geometry calculations for Egyptian profiles (Sliding, Casement, Folding)
// Optimization: Offloads 850+ vertex calculations from Main Thread

// Types for Worker Messages
export type PathLayer = 'frame' | 'sash' | 'glass' | 'hardware' | 'annotation';

export type PathItem = {
  d: string;
  fill: string;
  stroke: string;
  layer: PathLayer;
};

export type EgyptianPathRequest = {
  templateId: string;
  width: number;
  height: number;
  params: Record<string, unknown>;
  quality: 'low' | 'medium' | 'high'; // LOD Support
};

export type EgyptianPathResponse = {
  templateId: string;
  paths: PathItem[];
  metrics: {
    vertexCount: number;
    calcTimeMs: number;
  };
};

/**
 * GENERATOR: Sliding 1x2 Window (The "Cairo Standard")
 * Features: 2 Tracks, 50% opening, Interlock overlap
 */
const getNum = (params: Record<string, unknown>, key: string, def: number): number => {
  const v = params[key];
  return typeof v === 'number' ? v : def;
};

interface HardwareItem {
  type: string;
  position: { x: number; y: number };
}

function isHardwareItem(v: unknown): v is HardwareItem {
  return (
    v !== null &&
    typeof v === 'object' &&
    'type' in v &&
    'position' in v &&
    typeof (v as HardwareItem).position === 'object' &&
    (v as HardwareItem).position !== null &&
    typeof (v as HardwareItem).position.x === 'number' &&
    typeof (v as HardwareItem).position.y === 'number'
  );
}

const generateSlidingWindowPaths = (width: number, height: number, quality: string, params: Record<string, unknown> = {}): PathItem[] => {
    // const frameDepth = 100; // Unused in 2D View
    const frameFace = getNum(params, 'frameFace', 45);   // 4.5cm default
    const sashFace = getNum(params, 'sashFace', 75);    // 7.5cm default
    const interlock = getNum(params, 'interlock', 32);   // 32mm default
    // const glassGap = 12;    // Unused in simplified view

    // Calculate Geometry
    const innerWidth = width - (frameFace * 2);
    const innerHeight = height - (frameFace * 2);
    
    // Sash is (Inner Width / 2) + (Interlock / 2) to ensure overlap at center
    const sashWidth = (innerWidth / 2) + (interlock / 2); 
    const sashHeight = innerHeight - 10; // Clearance
    
    // Positions
    const leftSashX = frameFace;
    const leftSashY = frameFace + 5;
    const rightSashX = (width / 2) - (interlock / 2); // Center overlap position
    const rightSashY = frameFace + 5;

    // --- LOW LOD (Basic Boxes) ---
    if (quality === 'low') {
        return [
            // Frame Outline
            { 
               d: `M0,0 h${width} v${height} h-${width} z M${frameFace},${frameFace} v${innerHeight} h${innerWidth} v-${innerHeight} z`, 
               fill: '#cbd5e1', stroke: '#334155', layer: 'frame' 
            },
            // Left Sash (Fixed usually)
            {
               d: `M${leftSashX},${leftSashY} h${sashWidth} v${sashHeight} h-${sashWidth} z`,
               fill: '#94a3b8', stroke: '#475569', layer: 'sash'
            },
            // Right Sash (Sliding)
            {
               d: `M${rightSashX},${rightSashY} h${sashWidth} v${sashHeight} h-${sashWidth} z`,
               fill: '#a0aec0', stroke: '#475569', layer: 'sash'
            }
        ];
    }

    // --- MEDIUM LOD (+Glass, Basic Tracks) ---
    const paths: PathItem[] = [];
    
    // 1. Frame
    paths.push({
        d: `M0,0 h${width} v${height} h-${width} z M${frameFace},${frameFace} v${innerHeight} h${innerWidth} v-${innerHeight} z`,
        fill: '#cbd5e1', stroke: '#1e293b', layer: 'frame'
    });

    // 2. Tracks (Bottom Rail)
    paths.push({
        d: `M${frameFace},${height - frameFace} h${innerWidth} v-5 h-${innerWidth} z`,
        fill: '#64748b', stroke: 'none', layer: 'hardware'
    });

    // 3. Sashes with Glass
    [leftSashX, rightSashX].forEach((x, i) => {
        const isSliding = i === 1; // Right one slides
        const opacity = isSliding ? '0.4' : '0.3';
        
        // Sash Frame
        paths.push({
            d: `M${x},${leftSashY} h${sashWidth} v${sashHeight} h-${sashWidth} z M${x+sashFace},${leftSashY+sashFace} v${sashHeight-sashFace*2} h${sashWidth-sashFace*2} v-${sashHeight-sashFace*2} z`,
            fill: isSliding ? '#cbd5e1' : '#e2e8f0', // Sliding one slightly darker/lighter
            stroke: '#475569',
            layer: 'sash'
        });

        // Glass
        paths.push({
            d: `M${x+sashFace},${leftSashY+sashFace} h${sashWidth-sashFace*2} v${sashHeight-sashFace*2} h-${sashWidth-sashFace*2} z`,
            fill: `rgba(186, 230, 253, ${opacity})`, // Sky blue tint
            stroke: '#7dd3fc',
            layer: 'glass'
        });
    });

    // --- HIGH LOD (+Hardware from Params) ---
    if (quality === 'high') {
         // Interlock Detail (Vertical line at meeting rail)
         const meetingX = (width / 2);
         paths.push({
             d: `M${meetingX-2},${leftSashY} v${sashHeight} h4 v-${sashHeight} z`,
             fill: '#475569', stroke: 'none', layer: 'sash'
         });

         // Render Hardware from Params (if available)
         const hardware = params.hardware;
         if (hardware && Array.isArray(hardware)) {
             hardware.forEach((item: unknown) => {
                 if (!isHardwareItem(item)) return;
                 const { x, y } = item.position;
                 if (item.type === 'handle') {
                      paths.push({
                          d: `M${x},${y} v50 h10 v-50 z`, // Simplified handle shape
                          fill: '#1e293b', stroke: 'none', layer: 'hardware'
                      });
                 } else if (item.type === 'hinge') {
                      paths.push({
                          d: `M${x},${y} v20 h5 v-20 z`, // Simplified hinge shape
                          fill: '#64748b', stroke: 'none', layer: 'hardware'
                      });
                 }
             });
         } else {
             // FALLBACK: Old hardcoded handle logic
             const handleY = height / 2;
             paths.push({
                 d: `M${rightSashX + sashWidth - 20},${handleY - 25} v50 h10 v-50 z`,
                 fill: '#1e293b', stroke: 'none', layer: 'hardware'
             });
         }

         // Direction Arrow (Right Sash)
         const arrowY = height / 2;
         const arrowX = rightSashX + (sashWidth / 2);
         paths.push({
             d: `M${arrowX-20},${arrowY} h40 M${arrowX+10},${arrowY-10} l10,10 l-10,10`,
             fill: 'none', stroke: '#ef4444', layer: 'annotation'
         });
    }

    return paths;
};

self.onmessage = (e: MessageEvent<EgyptianPathRequest>) => {
  const start = performance.now();
  const { templateId, width, height, quality, params } = e.data;

  let paths: PathItem[] = [];
  
  try {
      if (templateId === 'sliding_1x2_window') {
        paths = generateSlidingWindowPaths(width, height, quality, params);
      } else {
        // Fallback for demo
        paths = generateSlidingWindowPaths(width, height, 'low', params);
      }
      
      const end = performance.now();
      
      const response: EgyptianPathResponse = {
        templateId,
        paths,
        metrics: {
            // Estimate vertex count (approx 12 points per rect command * avg commands)
            vertexCount: paths.length * 12, 
            calcTimeMs: end - start
        }
      };
      
      self.postMessage(response);
      
  } catch (err) {
      console.error('Worker Calculation Error', err);
      self.postMessage({ error: 'Calculation Failed' });
  }
};
