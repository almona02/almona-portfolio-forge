# Onboarding Video Content Guide

**Purpose**: Guide for creating and integrating video content for the Fabricator onboarding system

---

## 📹 Video Requirements

### Technical Specifications

- **Format**: MP4 (H.264 codec recommended)
- **Resolution**: 1920x1080 (Full HD) minimum
- **Aspect Ratio**: 16:9
- **Frame Rate**: 30fps
- **Audio**: Stereo, 44.1kHz or 48kHz
- **File Size**: Optimize for web (target: < 50MB per video)
- **Duration**: See step durations below

### Recommended Hosting

1. **Supabase Storage** (Recommended)
   - Create bucket: `onboarding-videos`
   - Public access for videos
   - CDN-enabled for fast delivery

2. **CDN** (Alternative)
   - Cloudflare, AWS CloudFront, or similar
   - Ensure CORS is configured

3. **Local Assets** (Development)
   - Place in `public/videos/onboarding/`
   - Use relative paths: `/videos/onboarding/measuring.mp4`

---

## 🎬 Video Content Structure

### Step 1: Smart Measuring (2:30)

**File**: `measuring.mp4`  
**Duration**: 2 minutes 30 seconds  
**Poster**: `measuring-poster.jpg` (1920x1080)

**Content Outline**:
1. Introduction (0:00 - 0:15)
   - Welcome message
   - Overview of measuring tools

2. Tool Selection (0:15 - 0:45)
   - How to access measuring interface
   - Tool selection options
   - Interface overview

3. Measurement Process (0:45 - 1:45)
   - Click to start measurement
   - Drag to measure dimensions
   - Real-time feedback
   - Confirming measurements

4. Best Practices (1:45 - 2:15)
   - Tips for accurate measurements
   - Common mistakes to avoid

5. Next Steps (2:15 - 2:30)
   - What to do after measuring
   - Transition to design phase

**Key Points to Highlight**:
- AI-powered assistance
- Real-time dimension feedback
- Easy correction of measurements

---

### Step 2: AI-Powered Design (3:45)

**File**: `design.mp4`  
**Duration**: 3 minutes 45 seconds  
**Poster**: `design-poster.jpg` (1920x1080)

**Content Outline**:
1. Introduction (0:00 - 0:20)
   - What is AI design assistant
   - Benefits of AI suggestions

2. Accessing Design Interface (0:20 - 0:50)
   - Navigation to design tab
   - Interface overview

3. AI Suggestions (0:50 - 2:00)
   - How AI analyzes measurements
   - Profile recommendations
   - Accessory suggestions
   - Layout optimization

4. Customization (2:00 - 3:00)
   - Modifying AI suggestions
   - Manual adjustments
   - Preview options

5. Finalizing Design (3:00 - 3:45)
   - Reviewing configuration
   - Saving design
   - Moving to optimization

**Key Points to Highlight**:
- AI learns from your preferences
- Suggestions based on measurements
- Easy customization options

---

### Step 3: Cutting Optimization (4:15)

**File**: `optimization.mp4`  
**Duration**: 4 minutes 15 seconds  
**Poster**: `optimization-poster.jpg` (1920x1080)

**Content Outline**:
1. Introduction (0:00 - 0:25)
   - What is cutting optimization
   - Benefits (waste reduction, efficiency)

2. Optimization Interface (0:25 - 1:00)
   - Accessing optimization engine
   - Parameter configuration
   - Inventory selection

3. Running Optimization (1:00 - 2:30)
   - Starting optimization
   - Progress indicators
   - Real-time calculations

4. Understanding Results (2:30 - 3:30)
   - Waste reduction percentage
   - Efficiency metrics
   - Cutting plan visualization
   - Material usage breakdown

5. Advanced Options (3:30 - 4:00)
   - Remnant-aware optimization
   - Batch optimization
   - Custom constraints

6. Next Steps (4:00 - 4:15)
   - Reviewing results
   - Exporting cutting plan

**Key Points to Highlight**:
- Automatic waste minimization
- Real-time optimization
- Visual cutting plans

---

### Step 4: CNC Export (2:45)

**File**: `export.mp4`  
**Duration**: 2 minutes 45 seconds  
**Poster**: `export-poster.jpg` (1920x1080)

**Content Outline**:
1. Introduction (0:00 - 0:15)
   - Export options overview
   - Supported formats

2. Export Formats (0:15 - 1:00)
   - DXF files (CNC machines)
   - CSV reports (cutting lists)
   - PDF documentation
   - When to use each format

3. Export Process (1:00 - 2:00)
   - Selecting export format
   - Configuration options
   - Generating files
   - Download process

4. Using Exported Files (2:00 - 2:30)
   - Loading DXF in CNC software
   - Reading CSV reports
   - Sharing PDF documentation

5. Summary (2:30 - 2:45)
   - Complete workflow recap
   - Next steps

**Key Points to Highlight**:
- Multiple export formats
- One-click generation
   - Production-ready files

---

## 📁 File Structure

```
public/
  videos/
    onboarding/
      measuring.mp4
      measuring-poster.jpg
      design.mp4
      design-poster.jpg
      optimization.mp4
      optimization-poster.jpg
      export.mp4
      export-poster.jpg
```

**OR** (if using Supabase Storage):

```
Supabase Storage Bucket: onboarding-videos
  - measuring.mp4
  - measuring-poster.jpg
  - design.mp4
  - design-poster.jpg
  - optimization.mp4
  - optimization-poster.jpg
  - export.mp4
  - export-poster.jpg
```

---

## 🔗 Integration

### Update Video URLs

Once videos are created and hosted, update the step configurations:

```typescript
// In FabricatorOnboarding.tsx or your step configuration
const steps: OnboardingStep[] = [
  {
    id: 'measuring',
    videoUrl: '/videos/onboarding/measuring.mp4', // Local
    // OR
    videoUrl: 'https://your-cdn.com/videos/measuring.mp4', // CDN
    // OR
    videoUrl: 'https://your-project.supabase.co/storage/v1/object/public/onboarding-videos/measuring.mp4', // Supabase
    posterUrl: '/videos/onboarding/measuring-poster.jpg',
    // ... other properties
  },
  // ... other steps
];
```

---

## 🎨 Poster Images

### Requirements
- **Format**: JPG or PNG
- **Resolution**: 1920x1080 (16:9)
- **File Size**: < 500KB (optimized)
- **Content**: Screenshot or keyframe from video

### Best Practices
- Use a frame that represents the step content
- Include text overlay with step title (optional)
- Ensure good contrast and readability
- Match video aspect ratio

---

## 📊 Video Analytics

Videos automatically track:
- Play events
- Completion events
- Duration watched
- Step completion rates

Analytics are sent to:
- Internal analytics system
- Google Analytics (if configured)
- Backend API (if configured)

---

## ✅ Checklist

### Pre-Production
- [ ] Script written for each step
- [ ] Screenshots/screen recordings prepared
- [ ] Voiceover script (if using narration)
- [ ] Graphics/assets prepared

### Production
- [ ] Record screen captures
- [ ] Add annotations/highlights
- [ ] Record/edit voiceover (if needed)
- [ ] Add background music (optional, keep subtle)
- [ ] Export in required format

### Post-Production
- [ ] Optimize file sizes
- [ ] Create poster images
- [ ] Upload to hosting/CDN
- [ ] Test video playback
- [ ] Update component with URLs
- [ ] Test on different devices/browsers

### Quality Assurance
- [ ] Videos play correctly
- [ ] Posters display properly
- [ ] Analytics tracking works
- [ ] Mobile responsive
- [ ] Loading states work
- [ ] Error handling works

---

## 🚀 Quick Start

1. **Create videos** using screen recording software (OBS, Camtasia, etc.)
2. **Optimize** using HandBrake or similar tool
3. **Upload** to your chosen hosting
4. **Update** video URLs in `FabricatorOnboarding.tsx`
5. **Test** the onboarding flow

---

## 📝 Notes

- Videos are optional - onboarding works without them
- Interactive demos provide fallback experience
- Consider creating shorter "quick tips" versions
- Update videos as features evolve
- Consider multiple language versions for i18n

---

**Last Updated**: 2025-01-XX  
**Status**: Ready for Video Production

