import { useGLTF } from '@react-three/drei'

interface GLBViewerProps {
  modelPath: string
}

export function GLBViewer({ modelPath }: GLBViewerProps) {
  const { scene } = useGLTF(modelPath)
  return <primitive object={scene} />
}
