import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface SmartDrawProps {
  width: number;
  height: number;
  divisions: number[]; // Array of x-positions for vertical mullions (in mm)
  onDivisionChange?: (divisions: number[]) => void;
}

function DraggableMullion({ position, height }: { position: number; height: number }) {
  // This would contain drag logic using @use-gesture/react in a full implementation
  return (
    <group position={[position, 0, 0]}>
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([
              0, -height / 2000, 0,
              0, height / 2000, 0
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial attach="material" color="#f97316" linewidth={2} />
      </line>
      <mesh position={[0, 0, 0.01]}>
        <circleGeometry args={[0.05, 32]} />
        <meshBasicMaterial color="#f97316" />
      </mesh>
    </group>
  );
}

export const SmartDrawCanvas: React.FC<SmartDrawProps> = ({ 
  width, 
  height, 
  divisions,
  onDivisionChange 
}) => {
  const widthM = width / 1000; // Convert mm to meters
  const heightM = height / 1000;

  return (
    <div className="w-full h-64 bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <Canvas orthographic camera={{ zoom: 50, position: [0, 0, 10] }}>
        {/* Window Outline */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[widthM, heightM]} />
          <meshBasicMaterial color="#1f2937" transparent opacity={0.8} />
        </mesh>

        {/* Window Border */}
        <lineSegments>
          <edgesGeometry args={[new THREE.PlaneGeometry(widthM, heightM)]} />
          <lineBasicMaterial color="#4b5563" />
        </lineSegments>

        {/* Render Divisions */}
        {divisions.map((pos, i) => (
          <DraggableMullion 
            key={`mullion-${i}`}
            position={(pos / 1000) - (widthM / 2)} 
            height={height} 
          />
        ))}

        {/* Label */}
        <Html position={[0, -heightM / 2 - 0.2, 0]} center>
          <div className="text-xs text-gray-500 font-mono">Schematic View</div>
        </Html>
      </Canvas>
    </div>
  );
};
