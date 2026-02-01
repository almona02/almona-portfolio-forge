# Network Performance Optimization Guide

Complete guide for optimizing network performance in workshop environments.

**Status:** Production-Ready  
**Last Updated:** January 2026  
**Target:** Optimize for intermittent 3G/4G connectivity and shared networks

---

## Overview

This guide covers network performance optimization for workshop environments:
- Intermittent 3G/4G connectivity
- Shared network with CNC machines
- Large file transfers (DXF, images)

---

## 1. Bundle Size Analysis

### Current Bundle Analysis

**Tools:**
- `npm run analyze:bundle` - Analyze build output
- `npm run build:analyze` - Build with analysis (requires rollup-plugin-visualizer)
- Chrome DevTools Network tab - Runtime analysis

**Targets:**
- Initial bundle: <200KB (gzipped)
- Total JavaScript: <3MB (gzipped)
- Largest chunk: <500KB (gzipped)
- CSS: <100KB (gzipped)

### Running Bundle Analysis

```bash
# Build the project first
npm run build

# Analyze bundle sizes
npm run analyze:bundle

# Build with detailed analysis (if plugin installed)
npm run build:analyze
```

### Analyzing Results

**What to Look For:**
1. **Large chunks (>500KB):**
   - Identify which libraries are largest
   - Consider code splitting or lazy loading
   - Check for duplicate dependencies

2. **Entry chunk size:**
   - Should be <200KB (gzipped)
   - Split if larger

3. **Vendor chunks:**
   - Large vendor chunks (>300KB) should be split
   - Consider lazy loading heavy dependencies

4. **Total bundle size:**
   - Should be <3MB (gzipped) for 3G/4G networks
   - Target: <2MB for optimal performance

### Tree-Shaking Effectiveness

**Check:**
- Unused exports in dependencies
- Side effects in package.json
- Proper ESM imports (not CommonJS)

**Tools:**
- Bundle analyzer visualizations
- Check for large dependency footprints
- Verify tree-shaking is working

### Code Splitting Opportunities

**Opportunities:**
1. **Route-based splitting:**
   - Split by route (already done with React Router)
   - Verify chunks load on-demand

2. **Feature-based splitting:**
   - Split heavy features (3D viewer, PDF export)
   - Use dynamic imports for conditional features

3. **Vendor splitting:**
   - Split large vendors (Three.js, TensorFlow.js)
   - Lazy load when needed

---

## 2. Asset Optimization

### Image Compression

**DXF Previews:**
- Generate optimized preview images (WebP/AVIF)
- Use thumbnail sizes for previews
- Lazy load full-size images

**Implementation:**
```typescript
import { OptimizedImage } from '@/components/ui/OptimizedImage';

// Use optimized image component
<OptimizedImage
  src={dxfPreviewUrl}
  width={800}
  height={600}
  quality={80}
  format="webp"
  lazy={true}
/>
```

**Targets:**
- Preview images: <100KB
- Full-size images: <500KB
- Use WebP/AVIF when available

### Lazy Loading for 3D Components

**Implementation:**
```typescript
import { lazy, Suspense } from 'react';
import { Lazy3DWrapper } from '@/components/Lazy3DWrapper';

// Lazy load 3D components
const Window3DGenerator = lazy(() => import('./Window3DGenerator'));

// Use with Suspense
<Suspense fallback={<Loading3D />}>
  <Window3DGenerator {...props} />
</Suspense>
```

**Benefits:**
- Reduces initial bundle size
- Loads 3D libraries only when needed
- Improves initial page load time

### Progressive Loading for Large Designs

**Strategy:**
1. Load critical data first (design metadata)
2. Load geometry data progressively
3. Load textures and materials last

**Implementation:**
```typescript
// Load design metadata first
const metadata = await fetchDesignMetadata(designId);

// Then load geometry (lazy)
const geometry = await lazy(() => import('./geometry-loader'));

// Finally load textures (when needed)
const textures = await loadTextures(designId);
```

---

## 3. API Optimization

### Request Batching

**Use Case:** Multiple validation calls that can be batched

**Implementation:**
```typescript
import { getAPIOptimizer } from '@/lib/network/APIOptimizer';

const optimizer = getAPIOptimizer({
  maxBatchSize: 10,
  batchDelayMs: 100,
  maxWaitTimeMs: 500,
});

// Batch GET requests
const results = await Promise.all([
  optimizer.batchRequest('/api/validate/1'),
  optimizer.batchRequest('/api/validate/2'),
  optimizer.batchRequest('/api/validate/3'),
]);
```

**Benefits:**
- Reduces number of HTTP requests
- Improves connection efficiency
- Better for intermittent connectivity

### Response Compression

**Server-side:**
- Enable gzip/brotli compression
- Compress JSON responses
- Compress large file downloads

**Client-side:**
- Request compression: `Accept-Encoding: gzip, deflate, br`
- Verify server supports compression

**Check:**
- Response headers include `Content-Encoding: gzip`
- Reduced response sizes

### Connection Pooling

**Browser:**
- Browser handles connection pooling automatically
- Limit concurrent requests to 6 per domain

**Optimization:**
- Use request deduplication
- Cache responses when appropriate
- Reuse connections (browser handles this)

### Smart Retry Logic

**Implementation:**
```typescript
import { getAPIOptimizer } from '@/lib/network/APIOptimizer';

const optimizer = getAPIOptimizer({
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableStatusCodes: [429, 500, 502, 503, 504],
});

// Retry logic is automatic
const result = await optimizer.executeRequest(request);
```

**Retry Strategy:**
- Exponential backoff
- Retry only on retryable errors
- Don't retry on 4xx errors (except 429)
- Retry on network errors

---

## 4. Network Performance Monitoring

### Monitoring API Calls

**Implementation:**
```typescript
import { getNetworkPerformanceMonitor } from '@/lib/network/NetworkPerformanceMonitor';

const monitor = getNetworkPerformanceMonitor();

// Get performance summary
const summary = monitor.getSummary();
console.log('Connection quality:', summary.connectionQuality);
console.log('Average duration:', summary.averageDuration);
console.log('Recommendations:', summary.recommendations);
```

**Metrics Tracked:**
- Request duration
- Response size
- Success/failure rate
- Connection quality assessment

### Network Throttling Testing

**Chrome DevTools:**
1. Open DevTools → **Network** tab
2. Select throttling dropdown
3. Test with:
   - **Fast 3G**: 750 Kbps, 100ms RTT
   - **Slow 4G**: 400 Kbps, 400ms RTT
   - **Custom**: Simulate workshop conditions

**Testing Checklist:**
- [ ] App loads in <10 seconds on Fast 3G
- [ ] Critical features work on Slow 4G
- [ ] Large file downloads don't timeout
- [ ] Retry logic handles intermittent connectivity

---

## 5. Tools & Setup

### Webpack Bundle Analyzer (Vite Alternative)

**Installation:**
```bash
npm install --save-dev rollup-plugin-visualizer
```

**Configuration (vite.config.ts):**
```typescript
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
    }),
  ],
});
```

**Usage:**
```bash
npm run build:analyze
```

### Lighthouse Performance Audit

**Usage:**
```bash
# Install Lighthouse
npm install -g lighthouse

# Run audit
lighthouse http://localhost:3000 --output=html --output-path=./lighthouse-report.html

# Or use npm script
npm run performance:audit
```

**Key Metrics:**
- **Time to Interactive (TTI)**: <3.8s
- **First Contentful Paint (FCP)**: <1.8s
- **Total Blocking Time (TBT)**: <200ms
- **Cumulative Layout Shift (CLS)**: <0.1

### Network Throttling in DevTools

**Steps:**
1. Open Chrome DevTools (F12)
2. Go to **Network** tab
3. Click throttling dropdown
4. Select network condition:
   - **Fast 3G**: 750 Kbps down, 250 Kbps up, 100ms RTT
   - **Slow 4G**: 400 Kbps down, 400 Kbps up, 400ms RTT
   - **Custom**: Define your own

**Workshop Conditions:**
- **Intermittent 3G/4G**: Use custom throttling with packet loss
- **Shared Network**: Reduce bandwidth further (200-300 Kbps)
- **CNC Machine Interference**: Add latency spikes

---

## 6. Optimization Checklist

### Bundle Optimization
- [ ] Initial bundle <200KB (gzipped)
- [ ] Total JavaScript <3MB (gzipped)
- [ ] Largest chunk <500KB (gzipped)
- [ ] Code splitting enabled for routes
- [ ] Heavy features lazy-loaded
- [ ] Vendor chunks optimized

### Asset Optimization
- [ ] Images compressed (WebP/AVIF)
- [ ] DXF previews optimized
- [ ] 3D components lazy-loaded
- [ ] Progressive loading for large designs
- [ ] Image lazy loading enabled

### API Optimization
- [ ] Request batching implemented
- [ ] Response compression enabled
- [ ] Retry logic implemented
- [ ] Request deduplication enabled
- [ ] Connection pooling optimized

### Performance Monitoring
- [ ] Network monitoring enabled
- [ ] Performance metrics tracked
- [ ] Slow requests identified
- [ ] Connection quality assessed

---

## 7. Workshop-Specific Optimizations

### Intermittent Connectivity

**Strategies:**
1. **Offline-first approach:**
   - Cache critical data
   - Queue operations when offline
   - Sync when connectivity restored

2. **Request queuing:**
   - Queue non-critical requests
   - Prioritize critical requests
   - Batch when connectivity improves

3. **Progressive enhancement:**
   - Core features work offline
   - Enhanced features require connectivity
   - Graceful degradation

### Shared Network with CNC Machines

**Strategies:**
1. **Bandwidth management:**
   - Prioritize critical requests
   - Defer non-critical requests
   - Use compression for all requests

2. **Connection limits:**
   - Limit concurrent requests
   - Use request batching
   - Implement request queuing

3. **Adaptive quality:**
   - Reduce image quality on slow connections
   - Skip non-essential features
   - Use cached data when possible

### Large File Transfers

**Strategies:**
1. **Chunked uploads:**
   - Split large files into chunks
   - Upload chunks in parallel (when bandwidth allows)
   - Resume failed uploads

2. **Compression:**
   - Compress files before upload
   - Use appropriate compression (gzip for text, etc.)
   - Stream compression for large files

3. **Progress feedback:**
   - Show upload progress
   - Allow cancellation
   - Retry failed chunks

---

## 8. Performance Targets

| Metric | Target | Workshop Target |
|--------|--------|-----------------|
| Initial Bundle | <200KB | <150KB |
| Total JavaScript | <3MB | <2MB |
| Time to Interactive | <3.8s | <5s (on 3G) |
| API Response Time | <500ms | <2s (on 3G) |
| Image Load Time | <1s | <3s (on 3G) |
| File Upload Time | N/A | <30s per MB (on 3G) |

---

## References

- [Vite Build Optimization](https://vitejs.dev/guide/build.html)
- [Chrome DevTools Network Analysis](https://developer.chrome.com/docs/devtools/network/)
- [Lighthouse Performance](https://developer.chrome.com/docs/lighthouse/performance/)
- [Web Performance Best Practices](https://web.dev/performance/)
