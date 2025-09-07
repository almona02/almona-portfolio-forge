import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { GLBViewer } from './GLBViewer'

interface ModelTestProps {
  modelPath?: string
}

export function ModelTest({ modelPath = "/models/AR-Code-Object-Capture-app-1752786892 (1).glb" }: ModelTestProps) {
  return (
    <div className="w-full h-[600px] bg-gray-100 rounded-lg overflow-hidden">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        
        <GLBViewer modelPath={modelPath} />
        
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={1}
          maxDistance={20}
        />
        
        <Environment preset="studio" />
      </Canvas>
    </div>
  )
}
