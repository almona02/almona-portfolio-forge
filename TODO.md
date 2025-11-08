# TODO: Performance Optimization and 3D Gallery Improvements

## Caching for getProfileById
- [ ] Add in-memory cache with TTL to src/lib/data/profilesClient.ts for getProfileById
- [ ] Modify getProfileById to check cache before DB query
- [ ] Add cache invalidation in updateProfile function

## 3D Model Gallery Auto-Rotation
- [x] Read and analyze src/components/3d-model/Model3DGallery.tsx for thumbnail rendering
- [x] Read and analyze src/components/3d-model/EnhancedGLBViewer.tsx for full model viewer
- [x] Read and analyze src/pages/Model3DGallery.tsx for page structure
- [x] Implement auto-rotation in EnhancedGLBViewer.tsx for full model view
- [x] Enable auto-rotation in Model3DGallery.tsx for thumbnail models
- [x] Ensure models load and auto-rotate in main gallery page thumbnails
- [x] Set auto-rotation enabled by default for thumbnails (no manual toggle required)

## Testing and Verification
- [ ] Test caching reduces DB calls and maintains data freshness
- [ ] Test 3D gallery auto-rotation on different devices and browsers
- [x] Run linting, type-checking, and tests per project guidelines
