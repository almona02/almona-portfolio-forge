import React, { useEffect, useRef, useState, Suspense } from 'react'
import { 
  useFrame, 
  useThree,
  Canvas,
  OrbitControls,
  useGLTF,
  useAnimations,
  getOptimizedCanvasProps,
  getOptimizedLightingProps,
  getOptimizedControlsProps,
  type Group
} from '@/lib/three-optimized'

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
  enableAnimations = true
}: OptimizedGLBViewerProps) => {
  const groupRef = useRef<Group>(null)
  const { gl, camera } = useThree()
  const { scene, animations } = useGLTF(modelPath)
  const { actions } = useAnimations(animations, scene)

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
    if (enableAnimations && actions) {
      Object.values(actions).forEach((action) => {
        if (action) {
          action.play()
        }
      })
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
      scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
        }
      })
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
  const canvasProps = getOptimizedCanvasProps()
  const lightingProps = getOptimizedLightingProps()
  const controlsProps = getOptimizedControlsProps()

  return (
    <Canvas {...canvasProps}>
      <ambientLight {...lightingProps.ambientLight} />
      <directionalLight {...lightingProps.directionalLight} />
      <pointLight {...lightingProps.pointLight} />
      <Suspense fallback={<ModelLoadingFallback />}>
        <OptimizedModel {...props} />
      </Suspense>
      <OrbitControls {...controlsProps} />
    </Canvas>
  )
}

export default OptimizedGLBViewer