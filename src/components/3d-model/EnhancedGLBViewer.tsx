import React, { Suspense } from 'react';
import { useGLTF } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

// A simple error boundary that will catch errors in the Canvas
class CanvasErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Canvas Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', backgroundColor: 'red', color: 'white' }}>
          <h1>3D Viewer Crashed</h1>
          <pre>{this.state.error.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function Model({ modelPath }) {
  const { scene } = useGLTF(modelPath);
  // The simplest possible model rendering
  return <primitive object={scene} />;
}

export function EnhancedGLBViewer({ modelPath }) {
  return (
    <CanvasErrorBoundary>
      <Canvas style={{ background: '#222' }} camera={{ position: [2, 2, 2], fov: 50 }}>
        <ambientLight intensity={3} />
        <pointLight position={[10, 10, 10]} />
        <Suspense fallback={null}>
          <Model modelPath={modelPath} />
        </Suspense>
        <OrbitControls />
      </Canvas>
    </CanvasErrorBoundary>
  );
}

export default EnhancedGLBViewer;