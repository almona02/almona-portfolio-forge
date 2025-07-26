# 3D Model Viewer Components

This package provides a comprehensive 3D model viewer for React/TypeScript applications using Three.js and React Three Fiber.

## Quick Start

### Installation

The components are already included in your project. No additional installation is required.

### Basic Usage

```tsx
import { EnhancedGLBViewer } from '@/components/3d-model/EnhancedGLBViewer';

<EnhancedGLBViewer 
  modelPath="/models/model.glb" 
/>
```

### Advanced Usage

```tsx
<EnhancedGLBViewer 
  modelPath="/models/model.glb"
  scale={1.5}
  autoRotate={true}
  autoRotateSpeed={1}
  shadows={true}
  onLoad={() => console.log('Model loaded')}
  onError={(error) => console.error(error)}
/>
```

## Components

### EnhancedGLBViewer
The main 3D model viewer component with full TypeScript support.

**Props:**
- `modelPath`: Path to the .glb file
- `scale`: Scale factor for the model (default: 1)
- `position`: Position offset (default: [0,0,0])
- `autoRotate`: Enable auto-rotation (default: false)
- `autoRotateSpeed`: Rotation speed (default: 0.5)
- `shadows`: Enable shadows (default: true)
- `onLoad`: Callback when model loads
- `onError`: Error callback

### ModelTest
Test component for demonstrating the viewer.

### ModelViewerDemo
Complete demo page with interactive controls.

## File Structure

```
src/components/3d-model/
├── EnhancedGLBViewer.tsx    # Main 3D viewer component
├── ModelTest.tsx           # Test component
├── index.ts               # Export file
└── README.md             # This file
```

## Usage Examples

### Basic Implementation
```tsx
import { EnhancedGLBViewer } from '@/components/3d-model/EnhancedGLBViewer';

function MyComponent() {
  return (
    <div style={{ height: '500px' }}>
      <EnhancedGLBViewer 
        modelPath="/models/model.glb"
      />
    </div>
  );
}
```

### With Controls
```tsx
import { EnhancedGLBViewer } from '@/components/3d-model/EnhancedGLBViewer';

function MyComponent() {
  const [scale, setScale] = useState(1);
  
  return (
    <div>
      <EnhancedGLBViewer 
        modelPath="/models/model.glb"
        scale={scale}
        autoRotate={true}
        onLoad={() => console.log('Model loaded')}
      />
    </div>
  );
}
```

## Performance Tips

1. **Preload models**: Use `EnhancedGLBViewer.preload()` to preload models
2. **Optimize models**: Use compressed .glb files
3. **Lazy loading**: Use Suspense for better performance
4. **Responsive sizing**: Use relative units for responsive design

## Troubleshooting

### Common Issues

1. **Model not loading**: Check file path and ensure .glb file exists
2. **Performance issues**: Use compressed models and optimize textures
3. **TypeScript errors**: Ensure all dependencies are installed

### Support

For issues or questions, please refer to the documentation or create an issue in the repository.
