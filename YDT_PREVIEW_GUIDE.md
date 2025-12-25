# 🚀 YDT Prestige Agent - Local Preview Guide

## ✅ Route Added!

The YDT Prestige Agent is now accessible at:
- **`/prestige-agent`** - Main route
- **`/ydt`** - Short alias

## 🎯 How to Run Preview Locally

### Step 1: Start Preview Server

```bash
# Navigate to project root
cd /c/projects/almona-portfolio-forge

# Start preview (builds first, then serves)
npm run preview
```

**Expected Output:**
```
  ➜  Local:   http://localhost:4173/
  ➜  Network: use --host to expose
```

### Step 2: Open in Browser

Navigate to:
- **Main Route**: http://localhost:4173/prestige-agent
- **Short Alias**: http://localhost:4173/ydt

## 🎨 What You'll See

### Chatbot Interface Features:

1. **Persona Selector** (Top Row):
   - 🎓 **Professor** - Teaching & training mode
   - 🩺 **Doctor** - Diagnosis & troubleshooting
   - 🧭 **Tour Guide** - Navigation & exploration
   - 💻 **Code Master** - G-code programming expert
   - 🧠 **Nervous System** - Real-time monitoring

2. **Language Selector** (Top Right):
   - 🇹🇷 **TR** - Turkish
   - 🇬🇧 **EN** - English
   - 🇷🇺 **RU** - Russian
   - 🇸🇦 **AR** - Arabic (RTL support)

3. **Chat Interface**:
   - Message input at bottom
   - Conversation history in center
   - Confidence scores displayed
   - Knowledge sources shown

4. **Quick Actions**:
   - "Teach me operation"
   - "Diagnose a fault"
   - "Show G-code example"
   - "Explore applications"

5. **Knowledge Stats** (Footer):
   - Components: 1,193
   - Connections: 1,253
   - Spare Parts: 281
   - Accuracy: 95%

## 🧪 Test Examples

### Try These Questions:

**In Professor Mode (English):**
- "What is AIM 7510?"
- "How do I operate the machine?"
- "What are the power requirements?"

**In Doctor Mode:**
- "Machine won't start, what's wrong?"
- "Spindle error 0x1200"
- "How to fix pneumatic issues?"

**In Code Master Mode:**
- "Generate G-code for drilling"
- "Validate this G-code: G00 X100 Y100"
- "Teach me G-code programming"

**In Tour Guide Mode:**
- "Show me machine capabilities"
- "What applications can this machine do?"
- "Explore machine features"

## 🔗 Adding to Navigation

### Option 1: Add to Main Navigation

Edit your navigation component and add:

```typescript
<Link to="/prestige-agent">
  YDT Prestige Agent
</Link>
```

### Option 2: Add to Homepage

Import and add to homepage:

```typescript
import { AlmonaPrestigeChatbot } from '@/components/prestige-agent';

// In your homepage:
<section className="my-8">
  <h2>YDT Prestige Agent</h2>
  <AlmonaPrestigeChatbot />
</section>
```

### Option 3: Add to Services Page

Add to your services page for easy access.

## 📊 API Connection

The chatbot connects to:
- **Production**: `https://ydt-production.up.railway.app`
- **Health Check**: `/api/health`
- **Chat Endpoint**: `/api/v1/chat`

## 🐛 Troubleshooting

### If Preview Doesn't Start:
```bash
# Make sure dependencies are installed
npm install

# Try building first
npm run build

# Then preview
npm run preview
```

### If Chatbot Doesn't Load:
1. Check browser console (F12) for errors
2. Verify API URL in network tab
3. Check CORS settings in Railway
4. Test API directly: `curl https://ydt-production.up.railway.app/api/health`

### If API Calls Fail:
1. Open browser DevTools → Network tab
2. Check if requests are being sent
3. Verify `VITE_YDT_API_URL` is set (or uses default)
4. Check Railway service is online

## 🎯 Quick Test Checklist

- [ ] Preview server running on port 4173
- [ ] Navigate to `/prestige-agent`
- [ ] Chatbot interface loads
- [ ] Can switch personas
- [ ] Can switch languages
- [ ] Can send messages
- [ ] Receive responses from API
- [ ] Knowledge stats display
- [ ] Quick actions work

---

**🎉 Ready to test! Navigate to http://localhost:4173/prestige-agent** 🚀

