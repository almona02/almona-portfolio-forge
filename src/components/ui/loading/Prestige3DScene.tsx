import { Environment, Float, OrbitControls } from '@react-three/drei';
import { Canvas, useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { MathUtils, MeshStandardMaterial } from 'three';

// Materials
const frameMaterial = new MeshStandardMaterial({
    color: 0xE8D5B7, // Shiny beige/champagne
    metalness: 0.9,
    roughness: 0.15,
    emissive: 0xD4B483,
    emissiveIntensity: 0.1,
});

const glassMaterial = new MeshStandardMaterial({
    color: 0xA5D8FF,
    transparent: true,
    opacity: 0.25,
    metalness: 0.8,
    roughness: 0.05,
});

const hardwareMaterial = new MeshStandardMaterial({
    color: 0xF59E0B, // Gold
    metalness: 1.0,
    roughness: 0.2,
});

// Self-Assembling Window
const WindowFrame3D = ({ progress }: { progress: number }) => {
    // Animation Refs
    const groupRef = useRef<any>(null);
    // We use a ref for the smoothed progress to decouple render loop from state updates
    const smoothedProgress = useRef(0);

    // Frame Dimensions - Defined at top level scale
    const W = 2; // Width
    const H = 3; // Height
    const T = 0.15; // Frame Thickness
    // Sash Dimensions (Inner frame)
    const sW = W - T * 2;
    const sH = H - T * 2;
    const sT = 0.08; // Sash Thickness

    const explodeDist = 2; // Defined but used in calculations

    useFrame((state, delta) => {
        // Smoothly interpolate progress
        smoothedProgress.current = MathUtils.damp(smoothedProgress.current, progress, 2, delta);

        // Use smoothed progress for rotation
        const p = Math.min(1, Math.max(0, smoothedProgress.current / 100));

        if (groupRef.current) {
            // Smooth Rotation: Continuous slow spin + smoothed progress spin
            // Increased rotation speed slightly for better 3D perception
            groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.15 + (p * Math.PI * 2);
        }
    });

    // Calculate positions based on RAW progress for now
    const p = Math.min(1, Math.max(0, progress / 100));

    // Assembly timings
    const frameAssembly = MathUtils.smoothstep(p, 0.1, 0.4);
    const sashAssembly = MathUtils.smoothstep(p, 0.3, 0.6);
    const glassAssembly = MathUtils.smoothstep(p, 0.5, 0.8);
    const hardwareAssembly = MathUtils.smoothstep(p, 0.7, 0.9);

    // Outer Frame Positions
    const topY = MathUtils.lerp(H / 2 + explodeDist, H / 2, frameAssembly);
    const botY = MathUtils.lerp(-H / 2 - explodeDist, -H / 2, frameAssembly);
    const leftX = MathUtils.lerp(-W / 2 - explodeDist, -W / 2, frameAssembly);
    const rightX = MathUtils.lerp(W / 2 + explodeDist, W / 2, frameAssembly);

    // Sash Frame Positions (Relative to center, scaled by assembly)
    const sashScale = sashAssembly;

    // Glass Scale
    const glassScale = glassAssembly;

    return (
        <group ref={groupRef} rotation={[0, -0.5, 0]}>
            <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
                {/* --- OUTER FRAME --- */}
                {/* Top Frame */}
                <mesh position={[0, topY, 0]} material={frameMaterial}>
                    <boxGeometry args={[W + T, T, T]} />
                </mesh>
                {/* Bottom Frame */}
                <mesh position={[0, botY, 0]} material={frameMaterial}>
                    <boxGeometry args={[W + T, T, T]} />
                </mesh>
                {/* Left Frame */}
                <mesh position={[leftX, 0, 0]} material={frameMaterial}>
                    <boxGeometry args={[T, H, T]} />
                </mesh>
                {/* Right Frame */}
                <mesh position={[rightX, 0, 0]} material={frameMaterial}>
                    <boxGeometry args={[T, H, T]} />
                </mesh>

                {/* --- SASH FRAME (Inner moving part) --- */}
                <group scale={[sashScale, sashScale, 1]}>
                    {/* Top Sash */}
                    <mesh position={[0, (sH - sT) / 2, 0]} material={frameMaterial}>
                        <boxGeometry args={[sW, sT, sT]} />
                    </mesh>
                    {/* Bottom Sash */}
                    <mesh position={[0, -(sH - sT) / 2, 0]} material={frameMaterial}>
                        <boxGeometry args={[sW, sT, sT]} />
                    </mesh>
                    {/* Left Sash */}
                    <mesh position={[-(sW - sT) / 2, 0, 0]} material={frameMaterial}>
                        <boxGeometry args={[sT, sH, sT]} />
                    </mesh>
                    {/* Right Sash */}
                    <mesh position={[(sW - sT) / 2, 0, 0]} material={frameMaterial}>
                        <boxGeometry args={[sT, sH, sT]} />
                    </mesh>
                </group>

                {/* --- GLASS PANEL --- */}
                <group scale={[glassScale, glassScale, 1]}>
                    <mesh material={glassMaterial}>
                        {/* Slightly thinner than sash */}
                        <boxGeometry args={[sW - sT, sH - sT, 0.02]} />
                    </mesh>
                </group>

                {/* --- HARDWARE (Handle) --- */}
                <group visible={progress > 60} scale={[hardwareAssembly, hardwareAssembly, hardwareAssembly]}>
                    {/* Base plate on sash */}
                    <mesh position={[rightX - T - 0.1, 0, 0.08]} rotation={[0, 0, 0]} material={hardwareMaterial}>
                        <boxGeometry args={[0.06, 0.18, 0.02]} />
                    </mesh>
                    {/* Handle Shaft */}
                    <mesh position={[rightX - T - 0.1, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]} material={hardwareMaterial}>
                        <cylinderGeometry args={[0.02, 0.02, 0.1]} />
                    </mesh>
                    {/* Handle Grip */}
                    <mesh position={[rightX - T - 0.1, -0.08, 0.16]} rotation={[0, 0, 0]} material={hardwareMaterial}>
                        <capsuleGeometry args={[0.025, 0.15, 4, 8]} />
                    </mesh>
                </group>

            </Float>
        </group>
    );
};

// Scene
const Standard3DScene = ({ progress, onReady }: { progress: number, onReady?: () => void }) => {
    useEffect(() => {
        onReady?.();
    }, [onReady]);

    return (
        <Canvas
            camera={{ position: [0, 0, 6], fov: 45 }}
            gl={{ antialias: true, alpha: true }}
            dpr={[1, 2]}
        >
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
            <pointLight position={[-10, -10, -10]} intensity={0.5} />
            <Environment preset="city" />

            <WindowFrame3D progress={progress} />

            <OrbitControls
                enableZoom={false}
                enablePan={false}
                autoRotate
                autoRotateSpeed={0.5}
                makeDefault
                enableDamping
            />
        </Canvas>
    );
};

// Default export for lazy loading
export default Standard3DScene;
