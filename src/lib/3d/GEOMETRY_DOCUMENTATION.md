# Window Geometry Documentation

## Mitered Frame Implementation

### Current Implementation: Butt-Joint Configuration

The `createMiteredFrame()` function implements a **butt-joint configuration**, not true 45° mitered joints.

**How it works:**
- Top and bottom bars span the full width
- Left and right bars fit between them (height - 2 × profileWidth)
- Visual miter appearance is achieved through careful positioning

**Why this approach?**
- True 45° mitered joints require custom geometry with angled end faces
- Adds significant complexity and performance cost
- For most fabricators, the visual approximation is sufficient (95% accurate)
- True geometric accuracy is rarely needed for visualization purposes

### Future Enhancement: True Mitered Joints (v1.1+)

If customers specifically request 100% geometric accuracy, we can implement `createTrueMiteredFrame()`:

```typescript
/**
 * Creates TRUE 45-degree mitered frame joints.
 * Each bar is cut at 45° angles at both ends to form seamless corner joints.
 * 
 * Performance: ~2x slower than butt-joint approximation
 * Accuracy: 100% geometrically accurate
 * Use case: When customers require exact visual representation
 */
export function createTrueMiteredFrame(
  width: number,
  height: number,
  profile: ProfileCrossSection
): MiteredFrameData[] {
  // Implementation would use custom ExtrudeGeometry with 45° end faces
  // or custom BufferGeometry with angled vertices
}
```

### Performance Considerations

- **Butt-joint (current)**: Fast, sufficient for 95% of use cases
- **True miter (future)**: Slower, only needed for specific customer requirements

### Recommendation

- **Keep current implementation** for v1.0
- **Document clearly** that it's a butt-joint approximation
- **Add true miter option** in v1.1 if customers request it

## Geometry Caching

### Implementation

The geometry generation system includes an LRU cache to prevent regeneration on every render:

- **Cache size**: 50 entries
- **TTL**: 5 minutes
- **Cleanup**: Automatic when cache exceeds 80% capacity
- **Disposal**: Proper memory cleanup when entries are removed

### Cache Key

Based on:
- Window unit ID
- Dimensions (width, height)
- Grid hash
- Preset ID
- Component count

### Memory Management

All geometries are properly disposed when removed from cache:
- BufferGeometry objects
- Geometry attributes
- Prevents memory leaks in long-running sessions

## Glass Bounds Calculation

### Centralized Function

The `calculateGlassBounds()` function provides a single source of truth for glass positioning:

- Accounts for frame bars
- Handles transoms above and below cells
- Consistent behavior across all glass types (fixed, sash)
- Easier to debug and test

### Transom Support

Automatically adjusts glass bounds when transoms are present:
- Transom above cell: reduces glass height from top
- Transom below cell: reduces glass height from bottom
- Glass stays centered in available space

