# ALMONA Dark Gold Prestige - Visual Reference Guide
## Quick Implementation Reference

**Status:** ✅ COMPLETE  
**Date:** January 2026  
**Purpose:** Quick visual reference for developers

---

## 🎨 Color Palette Quick Reference

### Primary Backgrounds
```
Slate 900:  #0f172a  ████████████████████ (Primary BG)
Slate 800:  #1e293b  ████████████████████ (Secondary BG)
Slate 700:  #334155  ████████████████████ (Tertiary BG)
Slate 950:  #020617  ████████████████████ (Deep BG)
```

### Prestige Accents (Gold/Amber)
```
Amber 300:  #fcd34d  ████████████████████ (Light Gold)
Amber 400:  #fbbf24  ████████████████████ (Primary Gold)
Amber 500:  #f59e0b  ████████████████████ (Secondary Gold)
Amber 600:  #d97706  ██████████���█████████ (Dark Gold)
```

### Technology & Status
```
Cyan 400:   #22d3ee  ████████████████████ (Technology)
Emerald 400:#4ade80  ████████████████████ (Success)
Red 500:    #ef4444  ████████████████████ (Error)
```

---

## 📝 Typography Quick Reference

### Headers
```
H1: 32px, 700 weight, 0.05em tracking, UPPERCASE
   Example: "ALMONA FABRICATOR PRO"

H2: 24px, 700 weight, 0.05em tracking, UPPERCASE
   Example: "ENGINEERING BAY"

H3: 18px, 600 weight, 0.03em tracking, UPPERCASE
   Example: "System Configuration"

H4: 14px, 600 weight, 0.02em tracking, UPPERCASE
   Example: "Profile Matrix"
```

### Body Text
```
Body:       14px, 400 weight, 1.5 line-height
Body Med:   14px, 500 weight, 1.5 line-height
Body Small: 12px, 400 weight, 1.4 line-height
```

### Labels
```
Label:      12px, 500 weight, 0.05em tracking, UPPERCASE
Label Comp: 11px, 500 weight, 0.05em tracking, UPPERCASE
```

---

## 🔘 Button Styles Quick Reference

### Primary Button (Gold)
```
Background: Amber 500 (#f59e0b)
Text:       Slate 900 (#0f172a)
Hover:      Amber 400 (#fbbf24) + Scale 1.05 + Glow
Active:     Scale 0.98
```

### Secondary Button (Slate)
```
Background: Slate 700 (#334155)
Text:       Slate 100 (#f1f5f9)
Border:     Slate 600 (#475569)
Hover:      Slate 600 (#475569)
```

### Accent Button (Cyan)
```
Background: Cyan 400 (#22d3ee)
Text:       Slate 900 (#0f172a)
Hover:      Cyan 500 (#06b6d4) + Scale 1.05
```

### Danger Button (Red)
```
Background: Red 500 (#ef4444)
Text:       White (#ffffff)
Hover:      Red 600 (#dc2626) + Scale 1.05
```

---

## 🎴 Card Styles Quick Reference

### Standard Card
```
Background: Slate 800 (#1e293b)
Border:     Slate 700 (#334155)
Hover:      Border → Amber 500 + Shadow elevated
Shadow:     Card (0 4px 6px rgba(245, 158, 11, 0.1))
```

### Premium Card (Gold Border)
```
Background: Slate 800 (#1e293b) with gradient overlay
Border:     Amber 500 (#f59e0b) - 2px
Shadow:     Premium (0 25px 50px rgba(245, 158, 11, 0.25))
Gradient:   135deg, rgba(30, 41, 59, 0.9) → rgba(15, 23, 42, 0.9)
```

### Glass Morphism Card
```
Background: rgba(15, 23, 42, 0.6)
Backdrop:   blur(20px)
Border:     rgba(245, 158, 11, 0.2)
Shadow:     Elevated (0 10px 15px rgba(245, 158, 11, 0.15))
```

---

## ✓ Status Indicators Quick Reference

### Valid (Emerald)
```
Icon:   ✓
Color:  Emerald 400 (#4ade80)
Usage:  Successful validation, passed checks
```

### Warning (Amber)
```
Icon:   ⚠
Color:  Amber 500 (#f59e0b)
Border: Left 3px solid
Usage:  Attention needed, review required
```

### Error (Red)
```
Icon:   ✕
Color:  Red 500 (#ef4444)
Border: Left 3px solid
Usage:  Failed validation, action required
```

### Loading (Cyan)
```
Icon:   ◐ (spinning)
Color:  Cyan 400 (#22d3ee)
Usage:  Processing, please wait
```

### Active (Gold)
```
Icon:   ●
Color:  Amber 400 (#fbbf24)
Usage:  Currently active, selected
```

---

## 🎬 Animation Quick Reference

### Slide In Left (0.5s)
```
From:   opacity: 0, translateX(-100%)
To:     opacity: 1, translateX(0)
Easing: cubic-bezier(0.4, 0, 0.2, 1)
Usage:  Panel opening from left
```

### Slide In Right (0.5s)
```
From:   opacity: 0, translateX(100%)
To:     opacity: 1, translateX(0)
Easing: cubic-bezier(0.4, 0, 0.2, 1)
Usage:  Panel opening from right
```

### Button Hover (0.2s)
```
Transform: scale(1.05)
Shadow:    Glow (0 0 20px rgba(245, 158, 11, 0.3))
Easing:    cubic-bezier(0.4, 0, 0.2, 1)
Usage:     Button hover effect
```

### Validation Pulse (2s, infinite)
```
Opacity:   1 → 0.5 → 1
Duration:  2s
Easing:    cubic-bezier(0.4, 0, 0.6, 1)
Usage:     Validation status indicator
```

### Glow Effect (2s, infinite)
```
Shadow:    Card → Glow → Card
Duration:  2s
Easing:    cubic-bezier(0.4, 0, 0.6, 1)
Usage:     Active element highlight
```

---

## 📐 Spacing Quick Reference

```
XS:   4px   (Minimal spacing)
SM:   8px   (Small spacing)
MD:   16px  (Medium spacing)
LG:   24px  (Large spacing)
XL:   32px  (Extra large)
2XL:  48px  (Double extra large)
3XL:  64px  (Triple extra large)
```

---

## 🎯 Shadow System Quick Reference

```
Subtle:    0 1px 2px rgba(245, 158, 11, 0.05)
           (Minimal elevation)

Card:      0 4px 6px rgba(245, 158, 11, 0.1)
           (Standard card shadow)

Elevated:  0 10px 15px rgba(245, 158, 11, 0.15)
           (Elevated panel shadow)

Premium:   0 25px 50px rgba(245, 158, 11, 0.25)
           (Premium card shadow)

Glow:      0 0 20px rgba(245, 158, 11, 0.3)
           (Glowing effect)
```

---

## 🏗️ Layout Quick Reference

### Master Layout Structure
```
┌─────────────────────────────────────────────────────┐
│ HEADER BAR (64px)                                   │
│ Logo | Breadcrumb | User Menu                       │
├─────────────────────────────────────────────────────┤
│ PROGRESS STEPPER (80px)                             │
│ Phase 1 ─ Phase 2 ─ Phase 3 ─ Phase 4 ─ Phase 5    │
├──────────┬──────────────────────┬──────────────────┤
│ SIDEBAR  │ MAIN CANVAS          │ RIGHT PANEL      │
│ (280px)  │ (Flex)               │ (400px)          │
│          │                      │                  │
│ Config   │ SmartDraw Canvas     │ 3D Preview       │
│ Profiles │ Floating Algorithm   │ Validation       │
│ Hardware │                      │ BOM Cards        │
│ Validation│                     │ Export Grid      │
├──────────┴──────────────────────┴──────────────────┤
│ FOOTER BAR (48px)                                   │
│ Constitutional Badge | Live Metrics | Status        │
└─────────────────────────────────────────────────────┘
```

### Responsive Breakpoints
```
Desktop (1440px+):
├─ 3-column layout (280 | flex | 400)
├─ All panels visible
└─ Full feature set

Laptop (1280-1439px):
├─ 3-column layout (collapsible sidebar)
├─ Right panel sticky
└─ Floating algorithm panel

Tablet (768-1279px):
├─ 2-column layout (left drawer | center)
├��� Right panel as bottom sheet
└─ Simplified controls

Mobile (<768px):
├─ 1-column layout
├─ Bottom sheet navigation
└─ Stepwise workflow
```

---

## 🎨 Prestige Elements Quick Reference

### Corner Luxury Frames
```
Top-Left:
┌─────
│
│

Bottom-Right:
        ─────┐
            │
            │

Color:  Amber 500 (#f59e0b)
Width:  3px
Size:   40×40px
```

### Animated Background Grid
```
Pattern:    Radial gradient dots
Color:      Amber 500 (#f59e0b)
Size:       40×40px
Animation:  Subtle shift (20s linear)
Opacity:    10-20%
```

### Constitutional Badge
```
Background: Gradient (Emerald → Cyan)
Text:       Slate 900 (#0f172a)
Icon:       🛡️
Padding:    8px 16px
Border-Radius: 20px
Shadow:     Glow
```

### Tier 3 Badge
```
Background: Gradient (Amber 500 → Amber 400)
Text:       Slate 900 (#0f172a)
Icon:       ⭐
Padding:    6px 12px
Border-Radius: 16px
Shadow:     Card
```

---

## 🔄 Gradient Quick Reference

### Gold Gradient
```
linear-gradient(135deg, #fbbf24, #f59e0b)
(Light Gold → Dark Gold)
```

### Gold Dark Gradient
```
linear-gradient(135deg, #f59e0b, #d97706)
(Dark Gold → Darker Gold)
```

### Gold Light Gradient
```
linear-gradient(135deg, #fcd34d, #fbbf24)
(Light Gold → Primary Gold)
```

### Cyan-Gold Gradient
```
linear-gradient(135deg, #22d3ee, #fbbf24)
(Technology → Prestige)
```

### Emerald-Cyan Gradient
```
linear-gradient(135deg, #4ade80, #22d3ee)
(Success → Technology)
```

---

## 📋 CSS Class Quick Reference

### Typography Classes
```
.typography-h1          H1 style
.typography-h2          H2 style
.typography-h3          H3 style
.typography-h4          H4 style
.typography-body        Body text
.typography-body-medium Body medium
.typography-body-small  Body small
.typography-label       Label text
.typography-label-compact Compact label
```

### Button Classes
```
.btn-primary            Primary button
.btn-secondary          Secondary button
.btn-accent             Accent button
.btn-danger             Danger button
```

### Card Classes
```
.card                   Standard card
.card-premium           Premium card (gold border)
.card-glass             Glass morphism card
```

### Status Classes
```
.status-valid           Valid status
.status-warning         Warning status
.status-error           Error status
.status-loading         Loading status
.status-active          Active status
```

### Shadow Classes
```
.shadow-subtle          Subtle shadow
.shadow-card            Card shadow
.shadow-elevated        Elevated shadow
.shadow-premium         Premium shadow
.shadow-glow            Glow shadow
```

### Animation Classes
```
.animate-slide-in-left  Slide in from left
.animate-slide-in-right Slide in from right
.animate-slide-in-up    Slide in from bottom
.animate-button-hover   Button hover effect
.animate-validation-pulse Validation pulse
.animate-glow           Glow effect
```

### Utility Classes
```
.text-primary           Primary text color
.text-secondary         Secondary text color
.text-gold              Gold text color
.text-cyan              Cyan text color
.bg-primary             Primary background
.bg-secondary           Secondary background
.bg-gold                Gold background
.border-gold            Gold border
.border-gold-subtle     Subtle gold border
.gradient-gold          Gold gradient
.gradient-cyan-gold     Cyan-gold gradient
```

---

## ✅ Implementation Checklist

### Before Starting
- [ ] Review this visual reference
- [ ] Understand color palette
- [ ] Understand typography system
- [ ] Understand layout structure
- [ ] Understand responsive breakpoints

### During Implementation
- [ ] Use correct color values
- [ ] Apply typography classes
- [ ] Use prestige button styles
- [ ] Use prestige card styles
- [ ] Apply correct shadows
- [ ] Use correct animations
- [ ] Test responsive behavior

### After Implementation
- [ ] Verify all colors correct
- [ ] Verify typography correct
- [ ] Verify buttons styled
- [ ] Verify cards styled
- [ ] Verify animations smooth
- [ ] Verify responsive works
- [ ] Test on all browsers
- [ ] Test accessibility

---

## 🎓 Quick Start Example

### Creating a Prestige Button
```html
<button class="btn-primary animate-button-hover">
  Primary Action
</button>
```

### Creating a Prestige Card
```html
<div class="card-premium shadow-premium">
  <h3 class="typography-h3">Premium Card</h3>
  <p class="typography-body">Card content here</p>
</div>
```

### Creating a Status Indicator
```html
<div class="status-valid">
  Design validated
</div>
```

### Creating a Prestige Layout
```html
<div class="layout-desktop">
  <aside class="sidebar">Sidebar</aside>
  <main class="canvas">Canvas</main>
  <aside class="right-panel">Panel</aside>
</div>
```

---

**Quick Reference Complete**  
**Ready for Development**  
**Print or Bookmark This Guide**

