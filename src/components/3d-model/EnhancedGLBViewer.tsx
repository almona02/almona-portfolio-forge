import React, { Suspense, useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Environment, OrbitControls, Bounds, useBounds, useAnimations } from '@react-three/drei';
import { initCompressedModelDecoders } from '@/lib/three-optimized';

interface EnhancedGLBViewerProps {
  modelPath: string;           // .glb path (public served)
  usdzPath?: string;           // optional .usdz for iOS Quick Look
  enableAR?: boolean;          // show AR button(s)
  backgroundColor?: string;    // canvas background color
  onLoaded?: () => void;       // callback after model fits
  onError?: (error: Error) => void; // callback for errors
  title?: string;              // AR title (for Android Scene Viewer)
  enableWebXR?: boolean;       // enable in-browser WebXR immersive-ar (desktop or supported mobile)
  webXRHitTest?: boolean;      // request hit-test feature when entering WebXR
  autoPlayAnimations?: boolean;// if true, play all GLTF animations on load
  autoRotate?: boolean;        // enable auto-rotation of the model
  webXRScaleFactor?: number;   // scale factor to apply in AR session (e.g., 0.5)
  cameraState?: { position: [number, number, number]; target: [number, number, number] };
  onCameraChange?: (state: { position: [number, number, number]; target: [number, number, number] }) => void;
}

interface CanvasErrorState { hasError: boolean; error: Error | null }
class CanvasErrorBoundary extends React.Component<React.PropsWithChildren, CanvasErrorState> {
  state: CanvasErrorState = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  componentDidCatch(error: Error, info: unknown) { console.error('3D Viewer Error', error, info); }
  render() { if (this.state.hasError && this.state.error) { return <div className="p-4 text-sm bg-red-600 text-white">3D Viewer crashed: {this.state.error.message}</div>; } return this.props.children; }
}

function FittedModel({ modelPath, onLoaded, onError, autoPlayAnimations = true }: { modelPath: string; onLoaded?: () => void; onError?: (error: Error) => void; autoPlayAnimations?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const fired = useRef(false);

  // Always call hooks in the same order
  const gltf = useGLTF(modelPath) as unknown as { scene?: THREE.Object3D; animations?: THREE.AnimationClip[] };
  const scene = gltf.scene;

  // Always call useAnimations, even if there are no animations
  const { actions } = useAnimations(gltf.animations || [], scene as unknown as THREE.Object3D);

  const bounds = useBounds();

  useEffect(() => {
    if (groupRef.current && scene) {
      bounds.refresh(groupRef.current).fit();
      if (!fired.current) {
        fired.current = true;
        onLoaded?.();
      }
    }
  }, [scene, bounds, onLoaded]);

  useEffect(() => {
    if (autoPlayAnimations && actions && Object.keys(actions).length > 0) {
      try {
        Object.values(actions).forEach((a: any) => {
          if (a && typeof a.play === 'function') {
            a.play();
          }
        });
      } catch (error) {
        console.warn('Failed to play animations:', error);
      }
    }
    return () => {
      if (actions && Object.keys(actions).length > 0) {
        try {
          Object.values(actions).forEach((a: any) => {
            if (a && typeof a.stop === 'function') {
              a.stop();
            }
          });
        } catch (error) {
          console.warn('Failed to stop animations:', error);
        }
      }
    };
  }, [actions, autoPlayAnimations]);

  if (!scene) return null;
  return <group ref={groupRef}><primitive object={scene} /></group>;
}

export const EnhancedGLBViewer = forwardRef<any, EnhancedGLBViewerProps>(({
  modelPath,
  usdzPath = '/models/model.usdz',
  enableAR = true,
  backgroundColor = '#111',
  onLoaded,
  onError,
  title = 'Model',
  enableWebXR = true,
  webXRHitTest = true,
  autoPlayAnimations = true,
  autoRotate = false,
  webXRScaleFactor = 0.6,
  cameraState,
  onCameraChange
}, ref) => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS = /iPad|iPhone|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  // WebXR AR support state
  const [xrSupported, setXrSupported] = useState(false);
  const [isXRSession, setIsXRSession] = useState(false);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const controlsRef = useRef<any>(null);
  // Propagate camera changes for synchronization
  React.useEffect(() => {
    if (!controlsRef.current || !onCameraChange) return;
    const controls = controlsRef.current;
    const handler = () => {
      try {
        const cam = controls.object;
        const pos: [number, number, number] = [cam.position.x, cam.position.y, cam.position.z];
        const tgt = controls.target;
        const target: [number, number, number] = [tgt.x, tgt.y, tgt.z];
        onCameraChange({ position: pos, target });
      } catch {}
    };
    controls.addEventListener('change', handler);
    return () => { try { controls.removeEventListener('change', handler); } catch {} };
  }, [onCameraChange]);

  // Apply external camera state
  React.useEffect(() => {
    if (!controlsRef.current || !cameraState) return;
    const controls = controlsRef.current;
    try {
      const cam = controls.object;
      const [px, py, pz] = cameraState.position;
      const [tx, ty, tz] = cameraState.target;
      cam.position.set(px, py, pz);
      controls.target.set(tx, ty, tz);
      controls.update();
    } catch {}
  }, [cameraState]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    resetCamera: () => {
      if (controlsRef.current) {
        controlsRef.current.reset();
      }
    }
  }));

  useEffect(() => {
    let cancelled = false;
    if (enableWebXR && 'xr' in navigator) {
      (async () => {
        try {
          const navXR = (navigator as Navigator & { xr?: { isSessionSupported?: (mode: XRSessionMode) => Promise<boolean> } }).xr;
          const supported = await navXR?.isSessionSupported?.('immersive-ar');
          if (!cancelled) setXrSupported(!!supported);
        } catch (err) {
          if (!cancelled) setXrSupported(false);
          console.warn('[EnhancedGLBViewer] WebXR AR support check failed', err);
        }
      })();
    }
    return () => { cancelled = true; };
  }, [enableWebXR]);

  const handleAndroidAR = () => {
    try {
      const url = new URL(modelPath, window.location.origin).toString();
      const sceneViewer = `https://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(url)}&mode=ar_preferred&title=${encodeURIComponent(title)}`;
      window.location.href = sceneViewer;
    } catch (e) {
      console.warn('Android AR launch failed', e);
    }
  };

  const enterWebXR = async () => {
    if (!rendererRef.current) return;
    try {
      const navXR = (navigator as Navigator & { xr?: { requestSession?: (mode: XRSessionMode, init?: XRSessionInit) => Promise<XRSession> } }).xr;
      const sessionInit: XRSessionInit & { domOverlay?: { root: HTMLElement } } = {
        requiredFeatures: webXRHitTest ? ['hit-test'] : [],
        optionalFeatures: ['dom-overlay', 'local-floor', 'bounded-floor'],
        domOverlay: { root: document.body }
      };
      const session = await navXR?.requestSession?.('immersive-ar', sessionInit);
      if (!session) throw new Error('XR session unavailable');
      await rendererRef.current.xr.setSession(session);
      setIsXRSession(true);
      session.addEventListener('end', () => setIsXRSession(false));
      // scale down model in AR for usability
      if (modelGroupRef.current) {
        modelGroupRef.current.scale.setScalar(webXRScaleFactor);
      }
    } catch (err) {
      console.error('[EnhancedGLBViewer] Failed to start WebXR AR session', err);
      alert('Unable to start AR session in this browser.');
    }
  };

  const exitWebXR = async () => {
    try {
      const session = rendererRef.current?.xr.getSession?.();
      if (session) await session.end();
    } catch (err) {
      console.warn('[EnhancedGLBViewer] Error ending XR session', err);
    } finally {
      setIsXRSession(false);
      // restore scale when leaving AR
      if (modelGroupRef.current) {
        modelGroupRef.current.scale.setScalar(1);
      }
    }
  };

  return (
    <CanvasErrorBoundary>
      <div className="relative w-full h-full">
        {enableAR && (
          <div className="absolute top-3 left-3 z-10 flex flex-col gap-2">
            <div className="flex gap-2">
              {isIOS && (
                <a
                  href={usdzPath}
                  rel="ar"
                  className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-medium shadow hover:bg-emerald-500 transition"
                >Quick Look</a>
              )}
              {isAndroid && (
                <button
                  onClick={handleAndroidAR}
                  className="px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-medium shadow hover:bg-emerald-500 transition"
                >SceneViewer</button>
              )}
              {enableWebXR && xrSupported && (
                !isXRSession ? (
                  <button
                    onClick={enterWebXR}
                    className="px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-medium shadow hover:bg-indigo-500 transition"
                  >WebXR AR</button>
                ) : (
                  <button
                    onClick={exitWebXR}
                    className="px-3 py-1.5 rounded-md bg-rose-600 text-white text-xs font-medium shadow hover:bg-rose-500 transition"
                  >Exit AR</button>
                )
              )}
              {!isIOS && !isAndroid && !(enableWebXR && xrSupported) && (
                <button
                  disabled
                  title="AR not supported on this device/browser"
                  className="px-3 py-1.5 rounded-md bg-gray-500 text-white text-xs font-medium cursor-not-allowed"
                >AR</button>
              )}
            </div>
            {enableWebXR && !xrSupported && (
              <span className="text-[10px] text-gray-400">WebXR AR not supported</span>
            )}
          </div>
        )}
        <Canvas
          style={{ background: backgroundColor, backgroundImage: 'radial-gradient(circle at 35% 30%, #222 0%, #0b0b0b 80%)' }}
          camera={{ position: [2, 2, 2], fov: 45 }}
          dpr={[1, 2]}
          onCreated={({ gl }) => {
            rendererRef.current = gl;
            if (enableWebXR) {
              gl.xr.enabled = true; // allow entering immersive sessions
            }
          }}
        >
          {/* Initialize Draco/KTX2 decoders once */}
          <DecoderInitializer />
          <ambientLight intensity={1.15} />
          <directionalLight position={[5, 5, 5]} intensity={1.6} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
          <directionalLight position={[-5, -3, -5]} intensity={0.45} />
          <Suspense fallback={null}>
            <Bounds fit clip observe margin={1.15}>
              <group ref={modelGroupRef as unknown as React.Ref<THREE.Group>}>
                <FittedModel modelPath={modelPath} onLoaded={onLoaded} onError={onError} autoPlayAnimations={autoPlayAnimations} />
              </group>
            </Bounds>
            <Environment preset="warehouse" />
          </Suspense>
          {!isXRSession && (
            <OrbitControls 
              ref={controlsRef} 
              makeDefault 
              enableDamping 
              dampingFactor={0.08} 
              rotateSpeed={0.7}
              autoRotate={autoRotate}
              autoRotateSpeed={1.0}
            />
          )}
        </Canvas>
      </div>
    </CanvasErrorBoundary>
  );
});

export default EnhancedGLBViewer;

const DecoderInitializer: React.FC = () => {
  const initializedRef = React.useRef(false);
  React.useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initCompressedModelDecoders('/').catch(() => {});
  }, []);
  return null;
};