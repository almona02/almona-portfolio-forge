# YDT Scout Intelligence - Human-Augmented Data Collection

**Status:** ✅ **IMPLEMENTED** - Ready for Integration

---

## 🎯 Overview

The Scout Intelligence system implements a **human-augmented AI** approach to collect market intelligence. Instead of automated scraping (which faces API restrictions), this system empowers:

1. **Human Scouts** - Team members with browser extension/Telegram bot
2. **Crowdsourced Reports** - Workshop owners reporting prices (Waze model)
3. **OCR Processing** - Extract data from supplier price list images

This creates a **proprietary dataset** that competitors cannot scrape.

---

## 📁 Files Created

### **1. Scout Intelligence API**
**File:** `python_backend/apis/v2/scout_intelligence.py`

**Endpoints:**
- `POST /api/v2/ydt/scout-intelligence/report` - Submit scout report
- `POST /api/v2/ydt/scout-intelligence/report-price` - Submit price report
- `POST /api/v2/ydt/scout-intelligence/upload-image` - Upload price list image
- `GET /api/v2/ydt/scout-intelligence/street-prices` - Get verified prices
- `GET /api/v2/ydt/scout-intelligence/scout-stats` - Get scout statistics

### **2. Scout Intelligence Service**
**File:** `python_backend/services/scout_intelligence.py`

**Features:**
- Process scout reports with Maalem Social Analyst
- Consensus engine for price verification
- OCR image processing
- Street price index management

---

## 🚀 Implementation Phases

### **Phase 1: Maalem Scout Tool** ✅

**Browser Extension / Telegram Bot**

**Workflow:**
1. Scout sees post: "Aluminum 90,000 EGP today at El-Attal"
2. Highlights text → Right Click → "Send to YDT"
3. Extension sends JSON to backend
4. Backend processes with MaalemSocialAnalyst
5. Updates Industry Watchdog

**API Usage:**
```bash
curl -X POST http://localhost:8000/api/v2/ydt/scout-intelligence/report \
  -H "Content-Type: application/json" \
  -d '{
    "text": "الطن الألومنيوم وصل 90,000 جنيه في السوق السودة",
    "source_name": "Facebook Group: سوق الألومنيوم مصر",
    "source_url": "https://facebook.com/groups/...",
    "scout_id": "scout_001"
  }'
```

**Response:**
```json
{
  "status": "success",
  "message": "شكراً للمساعدة!",
  "insight_id": "uuid-here",
  "analysis": {
    "core_truth": "...",
    "impact": "...",
    "maalem_advice": "...",
    "category": "price_alert",
    "urgency": "high"
  }
}
```

---

### **Phase 2: Crowdsourced Intelligence (Waze Model)** ✅

**Mobile Dashboard Feature**

**Workflow:**
1. Workshop owner clicks "Report Price" button
2. Enters: "92,000 EGP/ton - Giza"
3. Backend verifies against other reports (consensus)
4. If verified, updates street price index
5. User unlocks "Premium Market Analysis" for free

**API Usage:**
```bash
curl -X POST http://localhost:8000/api/v2/ydt/scout-intelligence/report-price \
  -H "Content-Type: application/json" \
  -d '{
    "material": "aluminum",
    "price": 92000,
    "unit": "EGP/ton",
    "location": "Giza",
    "supplier_name": "El-Attal",
    "workshop_id": "workshop_123"
  }'
```

**Response:**
```json
{
  "status": "success",
  "message": "شكراً على التقرير!",
  "report_id": "uuid-here",
  "consensus_score": 0.85,
  "verified": true
}
```

**Consensus Engine:**
- Requires minimum 3 reports for verification
- Calculates price variance
- Verifies if within 10% of average
- Updates street price index when verified

---

### **Phase 3: OCR for Price Lists** ✅

**Image Recognition**

**Workflow:**
1. Scout uploads image of handwritten/printed price list
2. OCR extracts text (Tesseract or Google Cloud Vision)
3. Parser extracts material prices
4. Creates IndustryArticle with extracted data

**API Usage:**
```bash
curl -X POST http://localhost:8000/api/v2/ydt/scout-intelligence/upload-image \
  -F "file=@price_list.jpg" \
  -F "source_name=Facebook: Supplier Page" \
  -F "supplier_name=El-Attal" \
  -F "location=Cairo"
```

**Response:**
```json
{
  "status": "success",
  "message": "تم معالجة الصورة بنجاح",
  "insight_id": "uuid-here",
  "extracted_data": {
    "aluminum": 90000,
    "upvc": 120000,
    "steel": 15000
  },
  "confidence": 0.8
}
```

**OCR Support:**
- **Tesseract** (Free, local) - Recommended for Arabic + English
- **Google Cloud Vision** (Paid, cloud) - Fallback option

---

## 🔧 Setup & Configuration

### **Step 1: Install OCR Dependencies**

**Option A: Tesseract (Recommended)**
```bash
# Windows
# Download from: https://github.com/UB-Mannheim/tesseract/wiki

# Linux
sudo apt-get install tesseract-ocr tesseract-ocr-ara

# Python package
pip install pytesseract pillow
```

**Option B: Google Cloud Vision**
```bash
pip install google-cloud-vision
# Set GOOGLE_APPLICATION_CREDENTIALS environment variable
```

### **Step 2: Register API Router**

Already registered in `python_backend/apis/v2/routers/__init__.py`

### **Step 3: Test Endpoints**

```bash
# Test scout report
curl -X POST http://localhost:8000/api/v2/ydt/scout-intelligence/report \
  -H "Content-Type: application/json" \
  -d '{"text": "Test report", "source_name": "Test Source"}'

# Test price report
curl -X POST http://localhost:8000/api/v2/ydt/scout-intelligence/report-price \
  -H "Content-Type: application/json" \
  -d '{"material": "aluminum", "price": 90000, "unit": "EGP/ton", "location": "Cairo"}'

# Get street prices
curl http://localhost:8000/api/v2/ydt/scout-intelligence/street-prices?material=aluminum
```

---

## 📊 Consensus Engine

### **How It Works:**

1. **Price Report Received**
   - Store in database
   - Check for matching reports (same material + location, last 7 days)

2. **Consensus Calculation**
   - If < 3 reports: Mark as "insufficient data" (score: 0.5)
   - If ≥ 3 reports: Calculate average price
   - Calculate variance: `|reported_price - avg_price| / avg_price`

3. **Verification Thresholds:**
   - **≤ 5% variance**: Verified (score: 0.9)
   - **≤ 10% variance**: Verified (score: 0.7)
   - **≤ 20% variance**: Not verified (score: 0.5)
   - **> 20% variance**: Suspicious (score: 0.3)

4. **Street Price Index Update**
   - Only verified prices update the index
   - Index shows average of all verified reports
   - Updated in real-time

---

## 🎮 Gamification & Rewards

### **Scout Statistics**

```bash
GET /api/v2/ydt/scout-intelligence/scout-stats?scout_id=scout_001
```

**Response:**
```json
{
  "total_reports": 45,
  "verified_insights": 42,
  "high_urgency_reports": 12,
  "categories": {
    "price_alert": 20,
    "supplier_review": 10,
    "material_shortage": 8,
    "workshop_trick": 4
  }
}
```

**Reward System Ideas:**
- Top scouts get premium features
- Verified reports unlock "Market Analyst" badge
- Weekly leaderboard
- Monthly "Best Scout" recognition

---

## 🔄 Integration with Industry Watchdog

Scout reports automatically:
1. Processed by MaalemSocialAnalyst
2. Converted to IndustryArticle format
3. Added to IndustryWatchdog.stored_articles
4. Generate alerts if high urgency
5. Appear in Morning Brief

**Categories:**
- `scout_report` - Human scout reports
- `street_intelligence` - Street-level data
- `human_verified` - Verified by human scouts
- `ocr_extracted` - Extracted from images

---

## 📱 Frontend Integration

### **Mobile Dashboard: "Report Price" Button**

```tsx
// Add to FabricatorDashboard
<Button onClick={handleReportPrice}>
  Report Price
</Button>

// Modal form
const handleReportPrice = async () => {
  const response = await fetch('/api/v2/ydt/scout-intelligence/report-price', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      material: 'aluminum',
      price: 92000,
      unit: 'EGP/ton',
      location: 'Giza',
      workshop_id: user.id
    })
  });
  
  const result = await response.json();
  if (result.verified) {
    toast.success('Price verified! Premium unlocked for this week.');
  }
};
```

---

## 🎯 Next Steps

### **Immediate (Week 1-2)**
- [ ] Build browser extension (Chrome/Firefox)
- [ ] Create Telegram bot
- [ ] Add "Report Price" button to mobile dashboard
- [ ] Test OCR with real supplier images

### **Short Term (Month 1)**
- [ ] Implement database storage (replace in-memory)
- [ ] Build scout dashboard (view stats, leaderboard)
- [ ] Add reward system
- [ ] Improve OCR accuracy for Arabic handwriting

### **Medium Term (Months 2-3)**
- [ ] Mobile app integration
- [ ] Real-time price alerts
- [ ] Supplier reputation tracking
- [ ] Advanced consensus algorithms

---

## ✅ Status

- [x] Scout Intelligence API created
- [x] Scout Intelligence Service implemented
- [x] Consensus engine working
- [x] OCR integration ready
- [x] Integration with Industry Watchdog
- [ ] Browser extension (pending)
- [ ] Telegram bot (pending)
- [ ] Mobile dashboard integration (pending)
- [ ] Database storage (pending)

---

**Status:** ✅ **READY FOR FRONTEND INTEGRATION**  
**Critical:** Build browser extension and mobile "Report Price" feature to start collecting data.

