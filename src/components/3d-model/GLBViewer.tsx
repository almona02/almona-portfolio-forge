import { Window3DModel } from '@/components/fabricator/Window3DGenerator'
import { WindowUnit } from '@/types/fabricator'
import { useAnimations, useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Group } from 'three'
import * as THREE from 'three'
import './SwiftXR.css'

// Props extended to support AR, scaling, positioning, animation auto‑play, and window models
export interface GLBViewerProps {
  // Model source - either GLB path or WindowUnit
  modelPath?: string
  windowUnit?: WindowUnit
  
  scale?: number
  position?: [number, number, number]
  enableAR?: boolean
  /** Optional callback once model (and any animations) are ready */
  onReady?: () => void
  /** Scale factor applied only while in AR (defaults to 0.5 * scale) */
  arScaleMultiplier?: number
  
  // Window-specific features
  enableWindowControls?: boolean
  windowAnimationSpeed?: number
  showMeasurements?: boolean
  isWindowAnimating?: boolean
  windowAnimationProgress?: number
  onWindowModelUpdate?: (model: THREE.Group) => void
}

/**
 * GLBViewer
 * - Loads a GLB/GLTF model or WindowUnit
 * - Plays included animations automatically
 * - Provides an optional WebXR (AR) session toggle button if device supports immersive-ar
 * - Does NOT create its own <Canvas>; embed this inside an existing <Canvas>.
 * - Supports window-specific controls and animations
 */
export function GLBViewer({
  modelPath,
  windowUnit,
  scale = 1,
  position = [0, 0, 0],
  enableAR = true,
  onReady,
  arScaleMultiplier = 0.5,
  enableWindowControls: _enableWindowControls = true,
  windowAnimationSpeed: _windowAnimationSpeed = 1,
  showMeasurements: _showMeasurements = true,
  isWindowAnimating = false,
  windowAnimationProgress = 0,
  onWindowModelUpdate
}: GLBViewerProps) {
  const groupRef = useRef<Group>(null)
  const windowModelRef = useRef<THREE.Group | null>(null)
  const { gl, camera } = useThree()
  
  // Determine viewer mode
  const isWindowMode = !!windowUnit
  const isGLBMode = !!modelPath && !windowUnit

  // GLB mode: Load GLTF model (always call hooks, conditionally use)
  const gltfResult = useGLTF(isGLBMode && modelPath ? modelPath : '')
  const scene = isGLBMode ? gltfResult.scene : null
  const animations = useMemo(() => isGLBMode ? gltfResult.animations : [], [isGLBMode, gltfResult.animations])
  const { actions } = useAnimations(animations, scene ?? groupRef.current ?? (null as unknown as THREE.Object3D))

  const [arSupported, setArSupported] = useState(false)
  const [isARSession, setIsARSession] = useState(false)
  const checkingRef = useRef(false)

  // Detect AR support (once)
  useEffect(() => {
    if (checkingRef.current) return
    checkingRef.current = true
    void (async () => {
      if ('xr' in navigator) {
        try {
          const navXR = (navigator as Navigator & { xr?: { isSessionSupported?: (mode: XRSessionMode) => Promise<boolean> } }).xr
          const supported = await navXR?.isSessionSupported?.('immersive-ar')
          setArSupported(!!supported)
        } catch (err) {
          console.warn('[GLBViewer] AR support check failed', err)
          setArSupported(false)
        }
      }
    })()
  }, [])

  // Autoplay any animations (GLB mode only)
  useEffect(() => {
    if (isGLBMode && animations?.length) {
      Object.values(actions).forEach(a => a?.play())
    }
    if ((isGLBMode && scene) || (isWindowMode && windowUnit)) {
      onReady?.()
    }
  }, [actions, animations, onReady, isGLBMode, isWindowMode, scene, windowUnit])
  
  // Handle window model update
  const handleWindowModelUpdate = useCallback((model: THREE.Group) => {
    windowModelRef.current = model
    if (onWindowModelUpdate) {
      onWindowModelUpdate(model)
    }
  }, [onWindowModelUpdate])

  // Frame loop placeholder (custom per‑frame logic could go here)
  useFrame(() => {
    // e.g. subtle rotation while not in AR
    if (!isARSession && groupRef.current) {
      // groupRef.current.rotation.y += 0.0005
    }
  })

  const enterAR = async () => {
    if (!arSupported) {
      // Fallback guard
      alert('AR not supported on this device/browser.')
      return
    }
    try {
      const sessionInit: XRSessionInit & { domOverlay?: { root: HTMLElement } } = {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay', 'local-floor', 'bounded-floor'],
        domOverlay: { root: document.body }
      }
      const navXR = (navigator as Navigator & { xr?: { requestSession?: (mode: XRSessionMode, init?: XRSessionInit) => Promise<XRSession> } }).xr
      const session: XRSession | undefined = await navXR?.requestSession?.('immersive-ar', sessionInit)
      if (!session) throw new Error('XR session unavailable')
      await gl.xr.setSession(session)
      setIsARSession(true)
      // Reset camera for AR (renderer/AR will control pose)
      camera.position.set(0, 0, 0)
      // Scale down for AR
      const arScale = scale * arScaleMultiplier
      if (groupRef.current) {
        groupRef.current.scale.set(arScale, arScale, arScale)
      }
      if (windowModelRef.current) {
        windowModelRef.current.scale.set(arScale, arScale, arScale)
      }
      session.addEventListener('end', () => {
        setIsARSession(false)
        if (groupRef.current) groupRef.current.scale.set(scale, scale, scale)
        if (windowModelRef.current) windowModelRef.current.scale.set(scale, scale, scale)
      })
    } catch (err) {
      console.error('[GLBViewer] Failed to start AR session', err)
      alert('Unable to start AR session.')
    }
  }

  const exitAR = async () => {
    try {
      const session = gl.xr.getSession?.()
      if (session) await session.end()
    } catch (err) {
      console.warn('[GLBViewer] Error ending AR session', err)
    } finally {
      setIsARSession(false)
      if (groupRef.current) groupRef.current.scale.set(scale, scale, scale)
      if (windowModelRef.current) windowModelRef.current.scale.set(scale, scale, scale)
    }
  }

  // Inline button; caller can also hide via enableAR
  const showButton = enableAR && arSupported

  // Validate props
  if (!modelPath && !windowUnit) {
    console.warn('[GLBViewer] Either modelPath or windowUnit must be provided')
    return null
  }

  return (
    <>
      {showButton && (
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 30,
            pointerEvents: 'auto'
          }}
        >
          {!isARSession ? (
            <button
              type="button"
              onClick={enterAR}
              className="swiftxr-ar-button"
            >
              SwiftXR AR
            </button>
          ) : (
            <button
              type="button"
              onClick={exitAR}
              className="swiftxr-ar-button"
              style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' }}
            >
              Exit SwiftXR
            </button>
          )}
        </div>
      )}
      {isWindowMode && windowUnit ? (
        <group ref={windowModelRef as unknown as React.Ref<THREE.Group>} scale={[scale, scale, scale]} position={position}>
          <Window3DModel
            windowUnit={windowUnit}
            isAnimating={isWindowAnimating}
            animationProgress={windowAnimationProgress}
            onModelReady={handleWindowModelUpdate}
          />
          {/* Measurement overlay removed - component doesn't exist */}
        </group>
      ) : isGLBMode && scene ? (
        <group ref={groupRef} scale={[scale, scale, scale]} position={position}>
          <primitive object={scene} />
        </group>
      ) : null}
    </>
  )
}

export default GLBViewer
