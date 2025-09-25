# Loading Components System

A comprehensive collection of featured loading components for pictures, 3D models, and pages throughout the application.

## 🚀 Features

- **Multiple Loading Animations**: Spinner, dots, pulse, and skeleton loading
- **Specialized Components**: Image loading, 3D model loading, and page loading
- **Responsive Design**: Works across all screen sizes
- **Accessibility**: Full ARIA support and screen reader compatibility
- **Customizable**: Multiple variants, sizes, and themes
- **Performance Optimized**: Lazy loading and intersection observer support

## 📦 Components

### Basic Loading Components

#### LoadingSpinner
A classic spinning loader with customizable size and color variants.

```tsx
import { LoadingSpinner } from '@/components/ui/loading';

<LoadingSpinner size="lg" variant="primary" />
```

**Props:**
- `size`: 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
- `variant`: 'default' | 'primary' | 'secondary' | 'accent' (default: 'default')
- `className`: Additional CSS classes

#### LoadingDots
Animated dots with staggered timing for a modern loading effect.

```tsx
import { LoadingDots } from '@/components/ui/loading';

<LoadingDots size="md" variant="primary" />
```

#### LoadingPulse
A pulsing circle animation for subtle loading states.

```tsx
import { LoadingPulse } from '@/components/ui/loading';

<LoadingPulse size="lg" variant="accent" />
```

#### LoadingSkeleton
Placeholder content with wave or pulse animations.

```tsx
import { LoadingSkeleton } from '@/components/ui/loading';

<LoadingSkeleton className="h-4 w-full" animation="wave" />
```

### Specialized Loading Components

#### ImageLoading
Enhanced loading component specifically for images with camera icon and loading message.

```tsx
import { ImageLoading } from '@/components/ui/loading';

<ImageLoading 
  aspectRatio="video"
  showIcon={true}
  message="Loading product image..."
/>
```

**Props:**
- `aspectRatio`: 'square' | 'video' | 'portrait' | 'landscape' (default: 'square')
- `showIcon`: boolean (default: true)
- `message`: string (default: 'Loading image...')

#### Model3DLoading
Specialized loading component for 3D models with 3D box icon and animated background.

```tsx
import { Model3DLoading } from '@/components/ui/loading';

<Model3DLoading 
  variant="detailed"
  message="Loading 3D model..."
  aspectRatio="square"
/>
```

**Props:**
- `variant`: 'default' | 'minimal' | 'detailed' (default: 'default')
- `aspectRatio`: 'square' | 'video' | 'portrait' | 'landscape' (default: 'square')
- `showIcon`: boolean (default: true)
- `message`: string (default: 'Loading 3D model...')

#### PageLoading
Full-page loading component with progress support and multiple variants.

```tsx
import { PageLoading } from '@/components/ui/loading';

<PageLoading 
  variant="fullscreen"
  message="Loading page..."
  showProgress={true}
  progress={75}
/>
```

**Props:**
- `variant`: 'default' | 'minimal' | 'fullscreen' (default: 'default')
- `message`: string (default: 'Loading page...')
- `showProgress`: boolean (default: false)
- `progress`: number (0-100, default: 0)

## 🎨 Enhanced Components

### EnhancedImage
A smart image component with built-in loading states, error handling, and lazy loading.

```tsx
import { EnhancedImage } from '@/components/ui/EnhancedImage';

<EnhancedImage
  src="/path/to/image.jpg"
  alt="Product image"
  aspectRatio="video"
  loading="lazy"
  loadingMessage="Loading product image..."
  onLoad={() => console.log('Image loaded')}
  onError={(error) => console.error('Image failed:', error)}
/>
```

**Features:**
- Automatic loading states
- Intersection Observer for lazy loading
- Error handling with fallback UI
- Customizable aspect ratios
- Loading messages

### PageLoadingWrapper
Wrapper component for lazy-loaded pages with built-in loading states.

```tsx
import { PageLoadingWrapper } from '@/components/ui/PageLoadingWrapper';

<PageLoadingWrapper 
  message="Loading products page..."
  variant="default"
>
  <ProductsPage />
</PageLoadingWrapper>
```

## 🔧 Usage Examples

### In Product Cards
```tsx
import { EnhancedImage } from '@/components/ui/EnhancedImage';

const ProductCard = ({ product }) => (
  <div className="product-card">
    <EnhancedImage
      src={product.imageUrl}
      alt={product.name}
      aspectRatio="video"
      loadingMessage="Loading product..."
    />
    <h3>{product.name}</h3>
  </div>
);
```

### In 3D Model Components
```tsx
import { LazyEnhancedGLBViewer } from '@/components/3d-model/LazyGLBViewer';

const ModelViewer = ({ modelPath }) => (
  <LazyEnhancedGLBViewer
    modelPath={modelPath}
    enableAR={true}
  />
);
```

### With Loading Context
```tsx
import { useComponentLoading } from '@/context/LoadingContext';
import { LoadingSpinner } from '@/components/ui/loading';

const MyComponent = () => {
  const { isLoading, setLoading } = useComponentLoading('MyComponent');
  
  const handleAction = async () => {
    setLoading(true, 'Processing...');
    try {
      await someAsyncOperation();
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      {isLoading && <LoadingSpinner />}
      <button onClick={handleAction}>Process</button>
    </div>
  );
};
```

## 🎯 Best Practices

1. **Use Appropriate Components**: Choose the right loading component for your use case
2. **Provide Meaningful Messages**: Always include descriptive loading messages
3. **Handle Errors Gracefully**: Use error boundaries and fallback UI
4. **Optimize Performance**: Use lazy loading for heavy components
5. **Accessibility**: Ensure all loading states are accessible to screen readers

## 🚀 Performance Benefits

- **Reduced Initial Bundle Size**: Lazy loading keeps the main bundle small
- **Better User Experience**: Smooth loading transitions and meaningful feedback
- **Optimized Loading**: Intersection Observer prevents unnecessary loading
- **Error Recovery**: Graceful fallbacks when loading fails

## 📱 Responsive Design

All loading components are fully responsive and work across:
- Desktop (1920px+)
- Tablet (768px - 1919px)
- Mobile (320px - 767px)

## ♿ Accessibility

- Full ARIA support with `role="status"` and `aria-label`
- Screen reader announcements for loading states
- Keyboard navigation support
- High contrast mode compatibility
