# Mobile Optimization Checklist — Enterprise Mobile Support
Version: 1.0.0
Updated: 2026-01-07
Owners: FE Lead, Design Lead, QA Lead

Objective
Provide a comprehensive checklist for mobile optimization including touch gestures, hit target sizes, responsive breakpoints, orientation handling, performance budgets, and off-main-thread optimizations. Ensures ALMONA platform works seamlessly on mobile devices with 80-85% parity target.

Non-Functional Requirements
- Performance: Mobile load < 2s on 4G; smooth 60fps interactions; efficient battery usage.
- UX: Touch-friendly controls; gesture support; responsive layouts; orientation handling.
- Accessibility: WCAG 2.1 AA on mobile; touch target sizes; screen reader support.
- Compatibility: iOS Safari, Android Chrome, Tablet modes (iPad, Android tablets).

Touch Gestures

Pinch-to-Zoom
- Canvas/Viewport: Pinch to zoom in/out (canvas views, images, 3D models)
- Min zoom: 0.5x (50%)
- Max zoom: 5x (500%)
- Smooth animation: 300ms ease-out
- Constraints: Limit zoom bounds to prevent UI breakage
- Accessibility: Double-tap to zoom (alternative)

Two-Finger Pan
- Canvas/Viewport: Two-finger drag to pan (when zoomed)
- Smooth scrolling: 60fps
- Momentum scrolling: Natural deceleration
- Boundaries: Constrain pan to content bounds
- Alternative: Single-finger drag with pan tool active

Swipe Gestures
- Navigation: Swipe left/right to navigate (optional, mobile-specific)
- Cards/Lists: Swipe to reveal actions (delete, edit, etc.)
- Gesture zones: Clear gesture zones (avoid conflicts with scrolling)
- Feedback: Visual feedback during swipe (e.g., card moves)

Long Press
- Context menu: Long press (500ms) to open context menu
- Selection: Long press to select (multi-select mode)
- Feedback: Haptic feedback (if supported)
- Cancel: Move finger to cancel (within threshold)

Tap Gestures
- Single tap: Primary action (select, activate)
- Double tap: Zoom to fit (canvas views)
- Two-finger tap: Alternative action (context menu, optional)
- Tap delay: Remove 300ms delay (touch-action CSS)

Hit Target Sizes

Minimum Touch Targets
- Buttons: 44×44px (iOS HIG) or 48×48dp (Material Design)
- Links: 44×44px minimum
- Icons: 44×44px (with padding if icon is smaller)
- Input fields: 44px minimum height
- Checkboxes/Radio: 44×44px clickable area
- List items: 48px minimum height

Spacing
- Between targets: 8px minimum spacing (prevents mis-taps)
- Edge spacing: 16px from screen edges
- Group spacing: 24px between groups

Visual Feedback
- Touch feedback: Visual state on touch (scale, color change)
- Active state: Clear active/pressed state
- Disabled state: Visual distinction (opacity, cursor)

Responsive Breakpoints

Mobile Breakpoints
- Small mobile: < 480px (phones in portrait)
- Medium mobile: 480px - 768px (large phones, small tablets)
- Tablet: 768px - 1024px (tablets in portrait)
- Desktop: > 1024px (tablets in landscape, desktops)

Tailwind Breakpoints (Recommended)
- sm: 640px
- md: 768px
- lg: 1024px
- xl: 1280px
- 2xl: 1536px

Layout Adaptations

Mobile (< 768px)
- Single column layout
- Bottom navigation (instead of sidebar)
- Collapsible sections
- Stack-based navigation
- Full-screen modals
- Simplified toolbars

Tablet (768px - 1024px)
- Two-column layout (optional)
- Collapsible sidebar
- Side-by-side panels (optional)
- Adaptive grid (2-3 columns)
- Touch-optimized controls

Desktop (> 1024px)
- Multi-column layouts
- Persistent sidebar
- Multi-panel views
- Desktop-optimized controls

Orientation Handling

Portrait Mode
- Vertical layout optimization
- Bottom navigation visible
- Stack-based content
- Optimized toolbar placement

Landscape Mode
- Horizontal layout optimization
- Side navigation (if space allows)
- Side-by-side panels
- Optimized toolbar placement

Orientation Lock
- Optional: Allow orientation lock (user preference)
- Default: Allow rotation (auto-adapt)
- Canvas views: Consider orientation lock for drawing/canvas

Responsive Behavior
- Media queries: Use CSS media queries for orientation
- JavaScript: Detect orientation changes (if needed)
- Reflow: Smooth layout reflow on orientation change
- Performance: Avoid layout thrash on rotation

Performance Budgets

Load Time
- Initial load: < 2s on 4G (First Contentful Paint)
- Time to Interactive: < 3s on 4G
- Total page weight: < 1MB (initial load)
- Bundle size: < 200KB (JavaScript, gzipped)

Runtime Performance
- FPS: 60fps for interactions (scrolling, animations)
- Frame budget: < 16ms per frame
- Memory: < 100MB typical usage (mobile devices)
- Battery: Efficient rendering (avoid continuous animations)

Optimization Strategies

Code Splitting
- Lazy load: Lazy load heavy features (canvas, 3D, reports)
- Route-based: Split by route/page
- Feature-based: Split by feature (mobile-specific code)
- Dynamic imports: Use dynamic imports for mobile optimizations

Asset Optimization
- Images: Optimize images (WebP, responsive images)
- Compression: Compress assets (gzip, brotli)
- CDN: Use CDN for assets
- Caching: Cache static assets aggressively

Off-Main-Thread Operations
- Web Workers: Use workers for heavy computations
- RequestIdleCallback: Defer non-critical work
- requestAnimationFrame: Use for animations
- Intersection Observer: Lazy load content

Rendering Optimization
- Virtual scrolling: Virtualize long lists
- Lazy rendering: Render only visible content
- Debounce/Throttle: Debounce scroll/resize handlers
- CSS containment: Use CSS containment for performance

Mobile-Specific Optimizations

Touch Action
- CSS touch-action: Use touch-action property
- Pan: touch-action: pan-x pan-y (allow panning)
- Zoom: touch-action: manipulation (remove double-tap delay)
- None: touch-action: none (disable gestures, if needed)

Viewport Meta Tag
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
```

Safe Areas (iOS)
- Safe area insets: Support iOS safe areas (notch, home indicator)
- Padding: Use env(safe-area-inset-*) for padding
- Full screen: Consider full-screen mode (optional)

PWA Support (Optional)
- Service Worker: Offline support
- Manifest: Add to home screen
- Install prompt: Allow installation
- Offline fallback: Offline page/functionality

Accessibility on Mobile

Touch Accessibility
- Touch targets: 44×44px minimum
- Spacing: 8px minimum between targets
- Visual feedback: Clear touch feedback
- Error prevention: Confirm destructive actions

Screen Reader Support
- ARIA labels: Proper ARIA labels
- Touch navigation: Screen reader navigation works
- Focus management: Proper focus handling
- Announcements: Important updates announced

Keyboard Support (External Keyboards)
- Physical keyboards: Support external keyboards
- Tab navigation: Tab order works correctly
- Shortcuts: Keyboard shortcuts work (if applicable)

Testing Checklist

Device Testing
- iOS Safari: iPhone (latest 2 versions)
- Android Chrome: Android (latest 2 versions)
- Tablets: iPad, Android tablets
- Orientation: Portrait and landscape
- Network: 4G, 3G, WiFi

Performance Testing
- Load time: < 2s on 4G
- FPS: 60fps during interactions
- Memory: Check memory usage
- Battery: Monitor battery impact (optional)

Usability Testing
- Touch targets: All targets easily tappable
- Gestures: Gestures work smoothly
- Navigation: Navigation is intuitive
- Forms: Forms are usable
- Errors: Error handling works

Accessibility Testing
- Screen readers: Test with VoiceOver (iOS), TalkBack (Android)
- Touch navigation: Verify touch navigation
- Focus: Verify focus management
- Contrast: Verify color contrast

Implementation Guidelines

CSS Recommendations
```css
/* Touch-friendly button */
.button-mobile {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 16px;
  touch-action: manipulation; /* Remove double-tap delay */
}

/* Safe area support (iOS) */
.container {
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  padding-bottom: env(safe-area-inset-bottom);
}

/* Responsive breakpoints */
@media (max-width: 768px) {
  .sidebar {
    display: none; /* Hide sidebar on mobile */
  }
  .bottom-nav {
    display: flex; /* Show bottom nav on mobile */
  }
}

/* Orientation handling */
@media (orientation: portrait) {
  .layout {
    flex-direction: column;
  }
}

@media (orientation: landscape) {
  .layout {
    flex-direction: row;
  }
}
```

JavaScript Recommendations
```typescript
// Detect mobile
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Detect orientation
const isPortrait = window.innerHeight > window.innerWidth;

// Handle orientation change
window.addEventListener('orientationchange', () => {
  // Update layout
  updateLayout();
});

// Touch event handling
element.addEventListener('touchstart', (e) => {
  // Handle touch start
}, { passive: true });

// Remove 300ms tap delay
element.style.touchAction = 'manipulation';
```

Acceptance Criteria

Performance
- ✅ Mobile load < 2s on 4G
- ✅ 60fps during interactions
- ✅ Smooth scrolling and animations
- ✅ Efficient memory usage

Usability
- ✅ Touch targets ≥ 44×44px
- ✅ Gestures work smoothly
- ✅ Navigation is intuitive
- ✅ Forms are usable

Accessibility
- ✅ WCAG 2.1 AA compliant
- ✅ Screen reader support
- ✅ Keyboard navigation works
- ✅ Touch targets accessible

Compatibility
- ✅ iOS Safari tested and working
- ✅ Android Chrome tested and working
- ✅ Tablet modes tested
- ✅ Orientation handling works
