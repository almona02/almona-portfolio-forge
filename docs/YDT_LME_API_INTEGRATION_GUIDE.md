# LME API Integration Guide

**Purpose:** Connect Industry Watchdog to real-time aluminum pricing data

---

## 🎯 Why LME Integration Matters

The London Metal Exchange (LME) is the global standard for aluminum pricing. Connecting to LME data enables:

- **Real-time price alerts**: "Aluminum up 2% - Buy now!"
- **Trend prediction**: "Prices trending up - Stock up this week"
- **Level 3 (Strategist) capabilities**: Actionable financial advice

**Current Status:** LME website blocks scraping (403 Forbidden) - Need API access

---

## 🔑 Option 1: LME Official API (Recommended)

### **Getting API Access**

1. **Register for LME Data Services**
   - Visit: https://www.lme.com/en/data-services
   - Choose subscription tier (Basic/Professional/Enterprise)
   - Get API credentials

2. **API Endpoints**
   ```
   https://api.lme.com/v1/metals/aluminum/cash
   https://api.lme.com/v1/metals/aluminum/3month
   ```

### **Implementation**

Create `python_backend/agents/lme_price_agent.py`:

```python
import httpx
from datetime import datetime, timezone
from typing import Dict, Any, Optional

class LMEPriceAgent:
    """Fetches real-time aluminum prices from LME API"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.lme.com/v1"
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json"
        }
    
    async def get_current_price(self) -> Optional[Dict[str, Any]]:
        """Get current aluminum cash price"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.base_url}/metals/aluminum/cash",
                    headers=self.headers,
                    timeout=10.0
                )
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error fetching LME price: {e}")
            return None
    
    async def get_price_change(self, days: int = 1) -> Optional[float]:
        """Get price change percentage over N days"""
        try:
            # Get current and historical prices
            current = await self.get_current_price()
            # Calculate change
            # Return percentage change
            return 0.0  # Placeholder
        except Exception as e:
            logger.error(f"Error calculating price change: {e}")
            return None
```

### **Integration with Industry Watchdog**

Update `python_backend/services/industry_watchdog.py`:

```python
from agents.lme_price_agent import LMEPriceAgent

class IndustryWatchdog:
    def __init__(self):
        # ... existing code ...
        self.lme_agent = None
        if settings.LME_API_KEY:
            self.lme_agent = LMEPriceAgent(settings.LME_API_KEY)
    
    async def _check_price_alerts(self):
        """Check for significant price changes"""
        if not self.lme_agent:
            return []
        
        price_change = await self.lme_agent.get_price_change(days=1)
        
        if price_change and abs(price_change) > 2.0:  # 2% threshold
            direction = "increase" if price_change > 0 else "decrease"
            alert = MarketAlert(
                alert_type="price_change",
                severity="high" if abs(price_change) > 5 else "medium",
                title=f"Aluminum Price {direction.capitalize()} {abs(price_change):.1f}%",
                message_arabic=f"سعر الألومنيوم {'زاد' if price_change > 0 else 'قل'} {abs(price_change):.1f}%",
                message_english=f"LME Aluminum {direction}d {abs(price_change):.1f}% today",
                actionable="اشتري النهاردة" if price_change > 0 else "استنى شوية",
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=1)
            )
            return [alert]
        
        return []
```

---

## 🔑 Option 2: Alternative Price APIs (Free/Cheaper)

### **Alpha Vantage (Free Tier)**

```python
class AlphaVantagePriceAgent:
    """Free alternative for commodity prices"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://www.alphavantage.co/query"
    
    async def get_aluminum_price(self):
        """Get aluminum futures price"""
        params = {
            "function": "COMMODITY_PRICES",
            "symbol": "ALUMINUM",
            "apikey": self.api_key
        }
        # Fetch and parse
```

### **Yahoo Finance API (Free)**

```python
import yfinance as yf

class YahooFinancePriceAgent:
    """Free alternative using yfinance"""
    
    async def get_aluminum_price(self):
        """Get aluminum futures from Yahoo Finance"""
        # ALI=F is aluminum futures ticker
        ticker = yf.Ticker("ALI=F")
        data = ticker.history(period="1d")
        return data['Close'].iloc[-1]
```

### **Metal.com API**

```python
class MetalComPriceAgent:
    """Alternative metal price API"""
    
    async def get_aluminum_price(self):
        # Metal.com provides free API for basic prices
        # Check: https://www.metal.com/api
```

---

## 🔑 Option 3: Web Scraping with Better Headers (Fallback)

If API access is not available, improve scraping:

```python
async def _scrape_lme_with_headers(self, source: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Scrape LME with proper headers to avoid 403"""
    try:
        import httpx
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.lme.com/",
        }
        
        async with httpx.AsyncClient(
            timeout=10.0,
            follow_redirects=True,
            headers=headers
        ) as client:
            response = await client.get(source['url'])
            # Parse price from HTML
            # Use BeautifulSoup to extract price data
            return []
    except Exception as e:
        logger.debug(f"Could not scrape LME: {e}")
        return []
```

---

## 📊 Recommended Approach

### **Phase 1: Free Alternative (Immediate)**
- Use Yahoo Finance API (free, reliable)
- Implement `YahooFinancePriceAgent`
- Get basic price tracking working

### **Phase 2: LME Official API (Month 1)**
- Subscribe to LME Data Services (Basic tier)
- Implement `LMEPriceAgent`
- Get official, real-time data

### **Phase 3: Enhanced Features (Quarter 1)**
- Add price history tracking
- Implement trend prediction
- Create price alerts with thresholds

---

## 🔧 Implementation Steps

### **Step 1: Choose API Provider**

**For Quick Start (Free):**
```bash
pip install yfinance
```

**For Production (Paid):**
- Subscribe to LME Data Services
- Get API credentials

### **Step 2: Create Price Agent**

```bash
# Create file
touch python_backend/agents/lme_price_agent.py
```

Implement one of the agents above.

### **Step 3: Add to Environment**

```env
# Option 1: LME Official API
LME_API_KEY=your_lme_api_key

# Option 2: Alpha Vantage (free)
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key

# Option 3: Yahoo Finance (no key needed)
USE_YAHOO_FINANCE=true
```

### **Step 4: Integrate with Watchdog**

Update `IndustryWatchdog` to use price agent (see code above).

### **Step 5: Test**

```python
# Test price fetching
from agents.lme_price_agent import LMEPriceAgent

agent = LMEPriceAgent(api_key="your_key")
price = await agent.get_current_price()
print(f"Current aluminum price: ${price}")
```

---

## 📈 Expected Results

### **With Price Integration:**

**Before:**
- Generic market news
- No price-specific alerts

**After:**
- "Aluminum up 2.5% - Buy stock today"
- "Price drop expected - Wait to purchase"
- Real-time price tracking
- Level 3 (Strategist) capabilities

---

## 💰 Cost Comparison

| Provider | Cost | Data Quality | Update Frequency |
|----------|------|--------------|------------------|
| **LME Official** | $500-2000/month | Excellent | Real-time |
| **Alpha Vantage** | Free (limited) | Good | 15-min delay |
| **Yahoo Finance** | Free | Good | 15-min delay |
| **Metal.com** | Free (basic) | Fair | Daily |

**Recommendation:** Start with Yahoo Finance (free), upgrade to LME when revenue justifies it.

---

## ✅ Integration Checklist

- [ ] Choose API provider
- [ ] Create price agent
- [ ] Add API key to environment
- [ ] Integrate with IndustryWatchdog
- [ ] Test price fetching
- [ ] Test price alerts
- [ ] Deploy to staging
- [ ] Monitor price accuracy

---

## 🚀 Quick Start (Yahoo Finance - Free)

```bash
# Install
pip install yfinance

# Test
python -c "import yfinance as yf; print(yf.Ticker('ALI=F').info['regularMarketPrice'])"
```

**Status:** ✅ Ready to implement  
**Time to first price alert:** ~2 hours

