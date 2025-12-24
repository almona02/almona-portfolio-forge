# Vision AI Setup Guide - Real Wiring Diagram Extraction

**Status**: Ready to process actual PDF with Google Gemini Pro Vision  
**Current**: Demo mode (34 simulated components)  
**Target**: 50-100 real components from actual PDF

---

## Quick Setup (5 minutes)

### Step 1: Get Google Gemini API Key

1. Go to: https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key (starts with `AIza...`)

### Step 2: Configure API Key

**Option A: Environment Variable (Recommended)**
```bash
# Windows (PowerShell)
$env:GOOGLE_GEMINI_API_KEY="your_key_here"

# Windows (CMD)
set GOOGLE_GEMINI_API_KEY=your_key_here

# Linux/Mac
export GOOGLE_GEMINI_API_KEY=your_key_here
```

**Option B: .env File (Persistent)**
```bash
# Create file: ai_agents/ydt_agent/.env
echo GOOGLE_GEMINI_API_KEY=your_key_here > ai_agents/ydt_agent/.env
```

### Step 3: Run Vision AI Processor

```bash
cd ai_agents/ydt_agent
python vision_ai_processor.py
```

---

## What Will Happen

### Current State (Demo Mode)
- ✅ 34 components (simulated from known database)
- ✅ 17 connections (inferred)
- ✅ Basic knowledge graph

### After Vision AI Processing
- ✅ 50-100 components (extracted from actual PDF)
- ✅ 50-150 connections (actual wire numbers and colors)
- ✅ Component coordinates on diagram
- ✅ Full specifications (voltage, current, power)
- ✅ Wire routing information

---

## Expected Output

```
======================================================================
VISION AI WIRING DIAGRAM PROCESSOR - REAL EXTRACTION
======================================================================

[VISION AI] Converting PDF to images...
[VISION AI] Converted 15 pages to images (300 DPI)
[VISION AI] Processing page 1/15 with Gemini Pro Vision...
[VISION AI] Page 1: Extracted 8 components, 12 connections
[VISION AI] Processing page 2/15 with Gemini Pro Vision...
[VISION AI] Page 2: Extracted 6 components, 9 connections
...
[VISION AI] Extraction complete: 87 components, 134 connections, confidence: 92.3%

======================================================================
VISION AI EXTRACTION RESULTS
======================================================================

Machine: aim-7510
Diagram: 1-AIM 7410-7510 3P-v8.pdf
Pages Processed: 15
Components Extracted: 87
Connections Extracted: 134
Confidence: 92.3%
API Used: True

Sample Components:
  K1: Main control relay (relay) - 24V DC, 10A
  K2: Spindle control relay (relay) - 24V DC, 10A
  M1: Spindle motor (motor) - 8.7 kW, 20000 RPM
  Q1: Main power contactor (contactor) - 400V AC, 25A
  V1: Clamp 1 control valve (valve) - 6 bar, 250 L/min
  ...

Sample Connections:
  Q1 -> K1 (power) - Wire #1, Red
  K2 -> M1 (power) - Wire #13-14, Black
  V1 -> C1 (pneumatic) - Line #P1
  ...
```

---

## Cost Estimate

**Google Gemini Pro Vision Pricing** (as of 2025):
- First 15 requests/day: **FREE**
- After that: ~$0.001 per image

**For AIM 7510 wiring diagram** (estimated 15 pages):
- **Cost: $0.015** (less than 2 cents)
- **Time: ~2-3 minutes**

---

## Troubleshooting

### Issue: "API key not configured"
**Solution**: Check that `GOOGLE_GEMINI_API_KEY` is set correctly

### Issue: "PDF conversion failed"
**Solution**: Install poppler-utils:
```bash
# Windows: Download from https://github.com/oschwartz10612/poppler-windows/releases
# Linux: sudo apt-get install poppler-utils
# Mac: brew install poppler
```

### Issue: "ImportError: No module named 'pdf2image'"
**Solution**: Install dependencies:
```bash
pip install pdf2image Pillow
```

### Issue: "Rate limit exceeded"
**Solution**: Wait 60 seconds and retry, or upgrade API plan

---

## Next Steps After Extraction

1. **Review Extracted Components**
   - Check component IDs match manual references
   - Verify specifications are correct
   - Validate connections make sense

2. **Merge with Known Database**
   - Combine Vision AI extraction with manual knowledge
   - Cross-reference component IDs
   - Fill in missing specifications

3. **Build Complete Knowledge Graph**
   - Add fault paths
   - Map alarm codes to components
   - Create diagnostic decision trees

4. **Validate with Human Expert**
   - Technician reviews extracted components
   - Corrects any errors
   - Adds missing connections

---

## Files Created

- `vision_ai_processor.py` - Main Vision AI processor
- `vision_ai_extraction.json` - Extracted components and connections
- `VISION_AI_SETUP.md` - This guide

---

**Ready to extract the real components?** Just add your API key and run!

