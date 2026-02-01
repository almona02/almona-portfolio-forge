import { Environment, Grid, OrbitControls, Stage } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import React, { useMemo } from 'react';
import { ProfileRegistry } from '../services/ProfileRegistry';
import type { Rectangle } from '../types/drafting';

interface DraftingCanvas3DProps {
    rectangles: Rectangle[];
    systemId: string;
}

// Helper to create frame members (Top, Bottom, Left, Right)
const FrameMember3D = ({
    position,
    size,
    rotation = [0, 0, 0]
}: {
    position: [number, number, number],
    size: [number, number, number],
    rotation?: [number, number, number]
}) => {
    return (
        <mesh position={position} rotation={rotation as any}>
            <boxGeometry args={size} />
            <meshStandardMaterial
                color="#e2e8f0"
                roughness={0.3}
                metalness={0.8}
            />
            {/* Edge highlight could go here */}
        </mesh>
    );
};

// Component to render a single window/door unit in 3D
const WindowUnit3D = ({ rect, systemId }: { rect: Rectangle, systemId: string }) => {
    const profileSpec = useMemo(() => ProfileRegistry.getInstance().getSpecs(systemId) || {}, [systemId]);

    // Dimensions
    const width = rect.width;
    const height = rect.height;
    const frameWidth = (profileSpec as any).frameWidth || (profileSpec as any).profileDepth || 50; // default if missing (profileDepth is roughly frame width/depth depending on perspective, using depth as fallback)
    const frameDepth = (profileSpec as any).frameDepth || (profileSpec as any).profileDepth || 60;

    // Center the unit
    const x = rect.x + width / 2;
    const y = -(rect.y + height / 2); // Flip Y to match screen coords logic (Top-Down vs 3D Up)

    // Members
    // Top (Full width for simple box)
    // Left/Right (Height - 2*FrameWidth)

    // Actually, let's do simple overlapping boxes for V1 "Solid" look
    // Top Bar
    const topPos: [number, number, number] = [x, y + height / 2 - frameWidth / 2, 0];
    const topSize: [number, number, number] = [width, frameWidth, frameDepth];

    // Bottom Bar
    const botPos: [number, number, number] = [x, y - height / 2 + frameWidth / 2, 0];
    const botSize: [number, number, number] = [width, frameWidth, frameDepth];

    // Left Bar (Vertical, between top/bot)
    const leftPos: [number, number, number] = [x - width / 2 + frameWidth / 2, y, 0];
    // leftSize unused

    // Right Bar
    const rightPos: [number, number, number] = [x + width / 2 - frameWidth / 2, y, 0];

    return (
        <group>
            {/* Top */}
            <FrameMember3D position={topPos} size={topSize} />
            {/* Bottom */}
            <FrameMember3D position={botPos} size={botSize} />
            {/* Left - note size swap to make it vertical if we don't rotate */}
            <FrameMember3D position={leftPos} size={[frameWidth, height - 2 * frameWidth, frameDepth]} />
            {/* Right */}
            <FrameMember3D position={rightPos} size={[frameWidth, height - 2 * frameWidth, frameDepth]} />

            {/* Glass Panel */}
            <mesh position={[x, y, 0]}>
                <boxGeometry args={[width - 2 * frameWidth, height - 2 * frameWidth, 5]} />
                <meshPhysicalMaterial
                    color="#a5f3fc"
                    transparent
                    opacity={0.3}
                    transmission={0.9}
                    roughness={0}
                    metalness={0}
                    thickness={5}
                />
            </mesh>
        </group>
    );
};

export const DraftingCanvas3D: React.FC<DraftingCanvas3DProps> = ({
    rectangles,
    systemId
}) => {
    // Determine bounds to center camera
    // For now Stage handles centering

    return (
        <div className="w-full h-full bg-slate-900">
            <Canvas shadows camera={{ position: [0, 0, 2000], fov: 50 }}>
                <OrbitControls makeDefault />
                <Environment preset="city" />

                <Stage adjustCamera={1.2} intensity={0.5} shadows="contact">
                    {rectangles.map(rect => (
                        <WindowUnit3D key={rect.id} rect={rect} systemId={systemId} />
                    ))}
                </Stage>

                <Grid
                    infiniteGrid
                    fadeDistance={5000}
                    sectionSize={100}
                    cellSize={10}
                    sectionColor="#475569"
                    cellColor="#1e293b"
                />
            </Canvas>
            <div className="absolute bottom-4 left-4 bg-black/50 p-2 rounded text-xs text-white backdrop-blur">
                <p>Orbit: Left Click | Pan: Right Click | Zoom: Scroll</p>
                <p>Renderer: Three.js (Deterministic)</p>
            </div>
        </div>
    );
};
