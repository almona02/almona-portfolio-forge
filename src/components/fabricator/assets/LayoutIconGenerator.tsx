import React, { forwardRef, useImperativeHandle, useMemo, useRef, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Center } from '@react-three/drei';
import * as THREE from 'three';
import { WindowUnit, WindowGrid, GridCell } from '@/types/fabricator';
import { SchematicIconGenerator, type SchematicIconHandle } from './SchematicIconGenerator';
import { Window3DModel } from '../Window3DGenerator';

export interface LayoutIconHandle {
  capture: () => Promise<string>;
}

interface LayoutIconGeneratorProps {
  windowUnit: WindowUnit;
  width?: number;
  height?: number;
  widthMm?: number;
  heightMm?: number;
  className?: string;
}

/**
 * LayoutIconGenerator: tries a high-fidelity 3D capture first, falls back to schematic SVG.
 */
export const LayoutIconGenerator = forwardRef<LayoutIconHandle, LayoutIconGeneratorProps>(
  ({ windowUnit, width = 512, height = 512, widthMm: _widthMm = 1200, heightMm: _heightMm = 1200, className }, ref) => {
    const schematicRef = useRef<SchematicIconHandle>(null);
    const glRef = useRef<THREE.WebGLRenderer | null>(null);

    const topology: WindowGrid = useMemo(() => {
      if (windowUnit.grid && windowUnit.grid.cells.length > 0) {
        return windowUnit.grid;
      }
      const cell: GridCell = {
        id: '0-0',
        row: 0,
        col: 0,
        type: 'fixed',
      };
      return { rows: 1, cols: 1, cells: [cell] };
    }, [windowUnit.grid]);

    const capture3D = async (): Promise<string> => {
      const MIN_VALID_SIZE = 20000; // ~20KB
      let attempts = 0;
      let dataUrl = '';

      while (attempts < 3) {
        await new Promise((res) => setTimeout(res, 500 * (attempts + 1)));
        if (glRef.current) {
          try {
            dataUrl = glRef.current.domElement.toDataURL('image/png', 1.0);
            if (dataUrl.length > MIN_VALID_SIZE) {
              console.info(`[LayoutIcon] Using 3D capture (attempt ${attempts + 1})`);
              return dataUrl;
            }
          } catch (err) {
            console.warn('3D capture failed on attempt', attempts + 1, err);
          }
        }
        console.warn(`[LayoutIcon] 3D capture attempt ${attempts + 1} too small; retrying...`);
        attempts++;
      }
      throw new Error('3D Capture failed validation');
    };

    useImperativeHandle(ref, () => ({
      capture: async () => {
        // Try 3D first
        const threeUrl = await capture3D();
        if (threeUrl && threeUrl.length > 1000) {
          if (typeof console !== 'undefined') console.info('[LayoutIcon] Using 3D capture');
          return threeUrl;
        }
        // Fallback to schematic SVG
        const svgUrl = (await schematicRef.current?.capture()) || '';
        if (svgUrl && typeof console !== 'undefined') console.info('[LayoutIcon] Using SVG fallback');
        return svgUrl;
      },
    }));

    return (
      <>
        {/* Hidden schematic fallback */}
        <div className={className} style={{ position: 'absolute', top: -9999, left: -9999, pointerEvents: 'none', opacity: 0 }}>
          <SchematicIconGenerator ref={schematicRef} topology={topology} width={width} height={height} />
        </div>

        {/* Hidden 3D capture canvas */}
        <div
          aria-hidden="true"
          style={{
            width,
            height,
            position: 'absolute',
            top: -9999,
            left: -9999,
            pointerEvents: 'none',
            visibility: 'hidden',
          }}
        >
          <Canvas
            gl={{
              preserveDrawingBuffer: true,
              antialias: true,
              alpha: true,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.5,
            }}
            dpr={[1, 2]}
            camera={{ position: [0, 0, 2500], fov: 45 }}
            onCreated={({ gl }) => {
              glRef.current = gl;
              gl.setSize(width, height, false);
              gl.setClearColor(0x000000, 0);
            }}
          >
            <Suspense fallback={null}>
              {/* Brighter lighting */}
              <ambientLight intensity={0.8} />
              <directionalLight position={[2000, 2000, 2000]} intensity={2} castShadow />
              <Environment preset="city" />
              <Center>
                <group>
                  {/* Darker frame backdrop for contrast */}
                  <mesh position={[0, 0, -0.01]}>
                    <planeGeometry args={[2.2, 2.2]} />
                    <meshBasicMaterial color="#0f172a" />
                  </mesh>
                  <Window3DModel
                    windowUnit={windowUnit}
                    isAnimating={false}
                    animationProgress={0}
                    enableShadows={true}
                    explodedView={false}
                    validationResult={undefined}
                  />
                </group>
              </Center>
            </Suspense>
          </Canvas>
        </div>
      </>
    );
  }
);

LayoutIconGenerator.displayName = 'LayoutIconGenerator';

