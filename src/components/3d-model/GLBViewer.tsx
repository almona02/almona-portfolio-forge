import React, { useEffect, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useAnimations } from '@react-three/drei'
import type { Group } from 'three'
import './SwiftXR.css'

// Props extended to support AR, scaling, positioning, and animation auto‑play
export interface GLBViewerProps {
  modelPath: string
  scale?: number
  position?: [number, number, number]
  enableAR?: boolean
  /** Optional callback once model (and any animations) are ready */
  onReady?: () => void
  /** Scale factor applied only while in AR (defaults to 0.5 * scale) */
  arScaleMultiplier?: number
}

/**
 * GLBViewer
 * - Loads a GLB/GLTF model
 * - Plays included animations automatically
 * - Provides an optional WebXR (AR) session toggle button if device supports immersive-ar
 * - Does NOT create its own <Canvas>; embed this inside an existing <Canvas>.
 */
export function GLBViewer({
  modelPath,
  scale = 1,
  position = [0, 0, 0],
  enableAR = true,
  onReady,
  arScaleMultiplier = 0.5
}: GLBViewerProps) {
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
        } catch (err) {
          console.warn('[GLBViewer] AR support check failed', err)
          setArSupported(false)
        }
      }
    })()
  }, [])

  // Autoplay any animations
  useEffect(() => {
    if (animations?.length) {
      Object.values(actions).forEach(a => a?.play())
    }
    onReady?.()
  }, [actions, animations, onReady])

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
      if (groupRef.current) {
        const s = scale * arScaleMultiplier
        groupRef.current.scale.set(s, s, s)
      }
      session.addEventListener('end', () => {
        setIsARSession(false)
        if (groupRef.current) groupRef.current.scale.set(scale, scale, scale)
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
    }
  }

  // Inline button; caller can also hide via enableAR
  const showButton = enableAR && arSupported

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
      <group ref={groupRef} scale={[scale, scale, scale]} position={position}>
        <primitive object={scene} />
      </group>
    </>
  )
}

export default GLBViewer
