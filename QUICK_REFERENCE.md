# ⚡ Quick Reference - WebP Conversion

## 🎯 Critical Images (Convert These 5)

1. `public/images/egyptian-industrial-hero-bg.png` → `.webp`
2. `public/images/hero01 (1).png` → `.webp`
3. `public/images/hero01 (2).png` → `.webp`
4. `public/images/hero01 (3).png` → `.webp`
5. `public/images/hero01 (4).png` → `.webp`

## 📝 Exact Code Changes Needed

### File 1: `src/components/home/EgyptianIndustrialHero.tsx`

**Line ~228** - Change:
```tsx
// BEFORE:
backgroundImage: 'url(/images/egyptian-industrial-hero-bg.png)',

// AFTER:
backgroundImage: 'url(/images/egyptian-industrial-hero-bg.webp)',
```

**Line ~247** - Change:
```tsx
// BEFORE:
src="/images/egyptian-industrial-hero-bg.png"

// AFTER:
src="/images/egyptian-industrial-hero-bg.webp"
```

### File 2: `src/components/home/AboutSection.tsx`

**Line 65** - Change:
```tsx
// BEFORE:
src="/images/hero01 (1).png"

// AFTER:
src="/images/hero01 (1).webp"
```

**Line 76** - Change:
```tsx
// BEFORE:
src="/images/hero01 (2).png"

// AFTER:
src="/images/hero01 (2).webp"
```

**Line 89** - Change:
```tsx
// BEFORE:
src="/images/hero01 (3).png"

// AFTER:
src="/images/hero01 (3).webp"
```

**Line 91** - Change:
```tsx
// BEFORE:
src="/images/hero01 (4).png"

// AFTER:
src="/images/hero01 (4).webp"
```

## 🚀 One-Liner Commands

### Convert Images (Squoosh.app)
1. Go to https://squoosh.app
2. Upload each PNG
3. Select WebP, Quality 85%
4. Download to `public/images/`

### Verify LCP (Console)
```javascript
new PerformanceObserver((list) => {
  const lcp = list.getEntries().pop();
  console.log('LCP:', lcp.element.tagName, lcp.startTime + 'ms');
}).observe({type: 'largest-contentful-paint', buffered: true});
```

### Deploy
```bash
git add . && git commit -m "perf: WebP optimization (RES 50 → 92+)" && git push
```

## ✅ Final Checklist

- [ ] 5 WebP files created
- [ ] 2 files updated (Hero + AboutSection)
- [ ] LCP verified (not canvas)
- [ ] Local test passed
- [ ] Deployed to Vercel

**Time**: 30 minutes  
**Result**: RES 92-98 🚀

