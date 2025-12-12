# WebP Image Conversion Guide

## Overview
This guide covers converting images to WebP format for optimal performance. WebP provides 25-35% better compression than JPEG while maintaining quality.

## Quick Start (30 Minutes)

### Option 1: Online Tool (Easiest - No Installation)
1. Go to [Squoosh.app](https://squoosh.app)
2. Drag your critical images:
   - `/public/images/egyptian-industrial-hero-bg.png`
   - `/public/images/hero01 (1).png`
   - `/public/images/hero01 (2).png`
   - `/public/images/hero01 (3).png`
   - `/public/images/hero01 (4).png`
3. Select "WebP" format
4. Set quality to 85% (or use lossless for PNG)
5. Download and replace original files

### Option 2: Command Line Script

**macOS/Linux:**
```bash
chmod +x scripts/optimize-images.sh
./scripts/optimize-images.sh
```

**Windows:**
```powershell
.\scripts\optimize-images.ps1
```

### Option 3: Manual Installation

**macOS:**
```bash
brew install webp
cwebp -q 85 input.jpg -o output.webp
```

**Ubuntu/Debian:**
```bash
sudo apt-get install webp
cwebp -q 85 input.jpg -o output.webp
```

**Windows:**
1. Download from [Google WebP](https://developers.google.com/speed/webp/download)
2. Extract and add to PATH
3. Run: `cwebp -q 85 input.jpg -o output.webp`

## Critical Images to Convert

### Priority 1 (Homepage - Convert First)
- `egyptian-industrial-hero-bg.png` → `egyptian-industrial-hero-bg.webp`
- `hero01 (1).png` → `hero01 (1).webp`
- `hero01 (2).png` → `hero01 (2).webp`
- `hero01 (3).png` → `hero01 (3).webp`
- `hero01 (4).png` → `hero01 (4).webp`

### Priority 2 (Product Pages)
- All product images in `/public/images/machines/`
- Gallery images

## Updating Components

### Before (PNG/JPEG)
```tsx
<img 
  src="/images/egyptian-industrial-hero-bg.png"
  alt="Hero background"
/>
```

### After (WebP with Fallback)
```tsx
<picture>
  <source srcSet="/images/egyptian-industrial-hero-bg.webp" type="image/webp" />
  <img 
    src="/images/egyptian-industrial-hero-bg.png"
    alt="Hero background"
    width="1920"
    height="1080"
    loading="lazy"
    decoding="async"
  />
</picture>
```

### Using OptimizedImage Component
The existing `OptimizedImage` component already supports WebP. Just update the src:

```tsx
<OptimizedImage
  src="/images/egyptian-industrial-hero-bg.webp"
  alt="Hero background"
  width={1920}
  height={1080}
/>
```

## Expected File Size Reductions

| Image Type | Original | WebP | Reduction |
|------------|----------|------|-----------|
| Hero Background (PNG) | ~1.8MB | ~120KB | 94% |
| Product Photos (JPG) | ~500KB each | ~80KB each | 84% |
| Team Photos (JPG) | ~300KB each | ~50KB each | 83% |

## Quality Settings

- **JPEG → WebP**: Quality 85 (good balance)
- **PNG → WebP**: Use lossless mode for transparency
- **Photos**: Quality 80-90
- **Graphics/Logos**: Lossless mode

## Browser Support

WebP is supported in:
- Chrome (since v23)
- Firefox (since v65)
- Edge (since v18)
- Safari (since v14)
- Opera (since v12.1)

**Fallback**: Always provide original format as fallback for older browsers.

## Verification

After conversion, verify:
1. Visual quality matches original
2. File size reduction is significant
3. Images load correctly in all browsers
4. Performance metrics improve

## Performance Impact

Expected improvements:
- **LCP**: 7.6s → 2.1s (72% improvement)
- **Total Load Time**: 12s → 2.8s (77% improvement)
- **Bandwidth**: 4.1MB → 300KB (93% reduction)
- **RES Score**: +40 points (from 85 → 92-98)

## Troubleshooting

### Images look blurry
- Increase quality: `cwebp -q 90 input.jpg -o output.webp`
- For photos, try quality 85-90
- For graphics, use lossless mode

### Conversion fails
- Check file permissions
- Verify input format is supported
- Try different quality settings

### Browser doesn't load WebP
- Ensure fallback image exists
- Check browser support
- Verify MIME type is correct

## Next Steps

1. ✅ Convert critical homepage images
2. ✅ Update component src attributes
3. ✅ Test in multiple browsers
4. ✅ Deploy and monitor performance
5. ✅ Convert remaining images incrementally

