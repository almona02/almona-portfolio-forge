import React, { useEffect, useRef, useState, Suspense } from 'react'
import { LazyThreeJS } from './LazyThreeJS'
import { initCompressedModelDecoders } from '@/lib/three-optimized'

// Props extended to support AR, scaling, positioning, and animation auto‑play
export interface OptimizedGLBViewerProps {
  modelPath: string
  scale?: number
  position?: [number, number, number]
  enableAR?: boolean
  /** Optional callback once model (and any animations) are ready */
  onReady?: () => void
  /** Scale factor applied only while in AR (defaults to 0.5 * scale) */
  arScaleMultiplier?: number
  /** Enable/disable shadows for better performance */
  enableShadows?: boolean
  /** Enable/disable animations for better performance */
  enableAnimations?: boolean
}

// Optimized model component
const OptimizedModel = ({
  modelPath,
  scale = 1,
  position = [0, 0, 0],
  enableAR = true,
  onReady,
  arScaleMultiplier = 0.5,
  enableShadows = false,
  enableAnimations = true,
  threeJS
}: OptimizedGLBViewerProps & { threeJS: any }) => {
  const groupRef = useRef<any>(null)
  const { gl, camera: _camera } = threeJS.useThree()

  // Always call hooks in the same order
  const gltfResult = threeJS.useGLTF(modelPath)
  const scene = gltfResult.scene
  const animations = gltfResult.animations || []

  // Always call useAnimations hook
  const { actions } = threeJS.useAnimations(animations, scene)

  const [arSupported, setArSupported] = useState(false)
  const [isARSession, setIsARSession] = useState(false)
  const checkingRef = useRef(false)

  // Detect AR support (once)
  useEffect(() => {
    if (checkingRef.current) return
    checkingRef.current = true
    ;(async () => {
      if ('xr' in navigator) {
        try {
          const navXR = (navigator as Navigator & { xr?: { isSessionSupported?: (mode: XRSessionMode) => Promise<boolean> } }).xr
          const supported = await navXR?.isSessionSupported?.('immersive-ar')
          setArSupported(!!supported)
        } catch (e) {
          console.warn('AR support check failed:', e)
        }
      }
    })()
  }, [])

  // Auto-play animations
  useEffect(() => {
    if (enableAnimations && actions && Object.keys(actions).length > 0) {
      try {
        Object.values(actions).forEach((action: any) => {
          if (action && typeof action.play === 'function') {
            action.play()
          }
        })
      } catch (error) {
        console.warn('Failed to play animations:', error);
      }
    }
  }, [actions, enableAnimations])

  // Handle AR session
  const handleAR = async () => {
    if (!arSupported || !gl.xr) return

    try {
      if (isARSession) {
        await gl.xr.getSession()?.end()
        setIsARSession(false)
      } else {
        const session = await gl.xr.requestSession('immersive-ar', {
          requiredFeatures: ['local'],
        })
        await gl.xr.setSession(session)
        setIsARSession(true)
      }
    } catch (e) {
      console.warn('AR session failed:', e)
    }
  }

  // Call onReady when model is loaded
  useEffect(() => {
    if (scene && onReady) {
      onReady()
    }
  }, [scene, onReady])

  // Apply shadows if enabled
  useEffect(() => {
    if (enableShadows && scene) {
      try {
        scene.traverse((child: any) => {
          if (child.isMesh) {
            child.castShadow = true
            child.receiveShadow = true
          }
        })
      } catch (error) {
        console.warn('Failed to apply shadows:', error);
      }
    }
  }, [scene, enableShadows])

  const currentScale = isARSession ? scale * arScaleMultiplier : scale

  return (
    <group ref={groupRef} scale={currentScale} position={position}>
      <primitive object={scene} />
      {enableAR && arSupported && (
        <mesh position={[0, -2, 0]}>
          <button
            onClick={handleAR}
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '10px 20px',
              backgroundColor: isARSession ? '#ff4444' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              zIndex: 1000
            }}
          >
            {isARSession ? 'Exit AR' : 'View in AR'}
          </button>
        </mesh>
      )}
    </group>
  )
}

// Loading fallback component
const ModelLoadingFallback = () => (
  <mesh>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="#666666" />
  </mesh>
)

/**
 * OptimizedGLBViewer
 * - Loads a GLB/GLTF model with optimized performance
 * - Plays included animations automatically (if enabled)
 * - Provides an optional WebXR (AR) session toggle button if device supports immersive-ar
 * - Includes performance optimizations for better loading times
 */
export function OptimizedGLBViewer(props: OptimizedGLBViewerProps) {
  return (
    <LazyThreeJS>
      {(threeJS) => {
        const canvasProps = threeJS.getOptimizedCanvasProps()
        const lightingProps = threeJS.getOptimizedLightingProps()
        const controlsProps = threeJS.getOptimizedControlsProps()

        const { Canvas, AmbientLight, DirectionalLight, PointLight, OrbitControls } = threeJS

        return (
          <Canvas {...canvasProps}>
            <AmbientLight {...lightingProps.ambientLight} />
            <DirectionalLight {...lightingProps.directionalLight} />
            <PointLight {...lightingProps.pointLight} />
            <Suspense fallback={<ModelLoadingFallback />}>
              <Initializer />
              <OptimizedModel {...props} threeJS={threeJS} />
            </Suspense>
            <OrbitControls {...controlsProps} />
          </Canvas>
        )
      }}
    </LazyThreeJS>
  )
}

// Small helper to ensure decoders are initialized once before model load
const Initializer: React.FC = () => {
  const initializedRef = useRef(false)
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true
    initCompressedModelDecoders('/').catch(() => {})
  }, [])
  return null
}

export default OptimizedGLBViewer