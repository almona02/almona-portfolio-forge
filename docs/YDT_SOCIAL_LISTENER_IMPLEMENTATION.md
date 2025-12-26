# YDT Social Listener - Facebook Groups Integration

**Status:** ✅ **IMPLEMENTED** - Ready for Testing

---

## 🎯 Overview

The Social Listener captures **real, unfiltered Egyptian fabrication market intelligence** from Facebook groups. This gives YDT an unbeatable competitive edge by accessing:

- **Street prices** (2-3 days before formal channels)
- **Supplier reputation** (real workshop experiences)
- **Material shortages** (early warning system)
- **Workshop tricks** (trade secrets)
- **Common problems** (recurring issues)
- **Regulation changes** (compliance alerts)

---

## 📁 Files Created

### **1. Social Listener Agent**
**File:** `python_backend/agents/social_listener.py`

**Features:**
- Monitors 5+ Egyptian fabrication Facebook groups
- Uses Facebook Graph API (NO scraping - compliant)
- Filters posts by relevance and credibility
- Extracts keywords and engagement metrics

**Key Methods:**
- `monitor_groups()` - Main monitoring function
- `fetch_group_posts_via_api()` - Fetches posts via Graph API
- `is_relevant_post()` - Filters for relevant content
- `categorize_post()` - Categorizes by type
- `calculate_credibility_score()` - Scores post credibility

### **2. Maalem Social Analyst**
**File:** `python_backend/agents/maalem_social_analyst.py`

**Features:**
- Transforms raw social chatter into actionable Maalem wisdom
- Understands Egyptian workshop slang and dialect
- Assesses credibility and urgency
- Extracts actionable advice

**Key Methods:**
- `analyze_social_insight()` - Analyzes single insight
- `analyze_batch()` - Batch analysis
- `apply_egyptian_reality_filter()` - Filters unrealistic claims

### **3. Industry Watchdog Integration**
**File:** `python_backend/services/industry_watchdog.py`

**Changes:**
- Added `enable_social_listener` parameter
- Integrated social scanning into `daily_scan()`
- Converts social insights to `IndustryArticle` format
- Combines RSS + Social articles for alerts

---

## 🔧 Setup & Configuration

### **Step 1: Facebook Graph API Access**

**Option A: Use Mock Data (Testing)**
```python
# No setup needed - uses mock_social_insights() for testing
listener = FacebookGroupListener(facebook_access_token=None)
insights = listener.mock_social_insights()
```

**Option B: Real API Access (Production)**
1. Create Facebook App: https://developers.facebook.com/
2. Get Access Token with `groups_read` permission
3. Add to environment:
   ```env
   FACEBOOK_ACCESS_TOKEN=your_access_token_here
   ```

### **Step 2: Configure Target Groups**

Edit `python_backend/agents/social_listener.py`:

```python
self.target_groups = {
    'souq_al_aluminum': {
        'id': 'YOUR_GROUP_ID',  # Get from Facebook Graph API Explorer
        'name': 'سوق الألومنيوم مصر',
        'keywords': ['سعر', 'الطن', 'ألومنيوم']
    },
    # Add more groups...
}
```

**To Get Group IDs:**
1. Visit: https://developers.facebook.com/tools/explorer/
2. Use Graph API: `GET /me/groups`
3. Find group IDs from response

### **Step 3: Enable in Industry Watchdog**

```python
# Enable social listener (default: True)
watchdog = IndustryWatchdog(enable_social_listener=True)
```

---

## 🧪 Testing

### **Test Social Listener**

```python
from agents.social_listener import FacebookGroupListener

listener = FacebookGroupListener()
insights = listener.mock_social_insights()

print(f"Found {len(insights)} insights:")
for insight in insights:
    print(f"\n[{insight.type}] {insight.group}")
    print(f"  {insight.text[:100]}...")
    print(f"  Credibility: {insight.credibility_score:.2f}")
```

### **Test Social Analyst**

```python
from agents.social_listener import FacebookGroupListener
from agents.maalem_social_analyst import MaalemSocialAnalyst

listener = FacebookGroupListener()
insights = listener.mock_social_insights()

analyst = MaalemSocialAnalyst()
analyses = await analyst.analyze_batch(insights[:2], use_llm=False)

for analysis in analyses:
    print(f"\n[{analysis.category}] Urgency: {analysis.urgency}")
    print(f"  Truth: {analysis.core_truth[:100]}...")
    print(f"  Advice: {analysis.maalem_advice}")
```

### **Test Full Integration**

```python
from services.industry_watchdog import IndustryWatchdog

watchdog = IndustryWatchdog(enable_social_listener=True)
articles = await watchdog.daily_scan()

# Filter for social insights
social_articles = [a for a in articles if 'social_media' in a.categories]

print(f"Found {len(social_articles)} social insights:")
for article in social_articles:
    print(f"\n{article.title}")
    print(f"  {article.maalem_summary}")
    print(f"  Advice: {article.actionable_advice}")
```

---

## 📊 What YDT Learns

| Type | Example (Egyptian Arabic) | Business Value |
|------|---------------------------|----------------|
| **Street Prices** | "الطن الألومنيوم وصل 90,000 جنيه" | Real pricing 2-3 days before formal channels |
| **Supplier Reviews** | "ابتعوا عن ورشة محمد في العتبة" | Blacklist/whitelist suppliers |
| **Material Shortages** | "مفيش حديد تسليح 12 ملي من أسبوع" | Predict delays, suggest alternatives |
| **Workshop Tricks** | "حطوا نقطة سولار على المنشار" | Add to "Tricks of the Trade" knowledge |
| **Common Problems** | "الشباك الجديد بيقطر مية" | Identify recurring flaws to warn users |
| **Regulations** | "البلدية بدأت تمنع الشبابيك الزجاجية" | Alert to compliance risks |

---

## ⚠️ Compliance & Ethics

### **CRITICAL Guidelines:**

1. **NO Scraping** - Use Facebook Graph API only
2. **Respect Privacy** - Anonymize all data
3. **Terms of Service** - Follow Facebook's ToS
4. **Group Privacy** - Only access public/open groups
5. **Add Value** - Consider contributing helpful advice back

### **Best Practices:**

- Join groups as human team members (not bots)
- Understand context before automating
- Build goodwill by contributing value
- Never store personal names/numbers (unless aggregated)

---

## 🚀 Implementation Roadmap

### **Week 1-2: Manual Intelligence**
- [ ] Identify 5 key Egyptian fabrication Facebook groups
- [ ] Manually monitor and document slang, suppliers, complaints
- [ ] Use examples to train MaalemSocialAnalyst prompt

### **Week 3-4: Build the Listener**
- [x] Create FacebookGroupListener agent
- [x] Create MaalemSocialAnalyst agent
- [x] Integrate with IndustryWatchdog
- [ ] Set up Facebook App and get API access
- [ ] Configure target groups

### **Week 5-6: Connect to YDT**
- [x] Pipe social insights into IndustryWatchdog
- [ ] Create new alert type: "من الشارع" (From the Streets)
- [ ] Add to Morning Brief widget
- [ ] Test with real groups

### **Ongoing: The Trust Loop**
- [ ] Add feedback button: "هل الخبر ده كان صح؟"
- [ ] Use confirmed insights to improve accuracy
- [ ] Continuously refine credibility scoring

---

## 📝 Example Alert

**Type:** `من الشارع` (From the Streets)

**Title:** "تحذير من الشارع: نقص في حديد التسليح 12 ملي"

**Message (Arabic):** "ناس بتشكي من عدم توفر حديد تسليح 12 ملي. المشاريع بتتأخر. ابحث عن بدائل أو استخدم 10 ملي."

**Message (English):** "Workshops reporting shortage of 12mm rebar. Projects delayed. Find alternatives or use 10mm."

**Actionable:** "ابحث عن مورد بديل أو استخدم 10 ملي كبديل مؤقت"

**Credibility:** High (45+ reactions, detailed post)

---

## ✅ Status

- [x] Social Listener agent created
- [x] Maalem Social Analyst created
- [x] Industry Watchdog integration
- [x] Mock data for testing
- [ ] Facebook API access (pending)
- [ ] Real group IDs configuration (pending)
- [ ] Production testing (pending)

---

## 🎯 Next Steps

1. **Identify Target Groups:**
   - Find 5 most active Egyptian fabrication Facebook groups
   - Get group IDs from Facebook Graph API Explorer

2. **Get API Access:**
   - Create Facebook App
   - Request `groups_read` permission
   - Get access token

3. **Test with Real Data:**
   - Configure group IDs
   - Test monitoring
   - Verify credibility scoring

4. **Deploy:**
   - Enable in production
   - Monitor performance
   - Gather user feedback

---

**Status:** ✅ **READY FOR TESTING**  
**Critical:** Configure Facebook API access and group IDs before production use.

