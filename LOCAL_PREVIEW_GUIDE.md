# 🚀 Local Preview Guide - YDT Prestige Agent

## 📋 Quick Start

### 1. Start the Frontend (Preview Mode)

```bash
# Navigate to project root
cd /c/projects/almona-portfolio-forge

# Start preview server
npm run preview
```

This will:
- Build the frontend in production mode
- Start a preview server (usually on port 4173)
- Open http://localhost:4173

### 2. Access the YDT Prestige Agent

**Option A: Direct Route (if added)**
- Navigate to: `http://localhost:4173/prestige-agent`
- Or: `http://localhost:4173/ydt`

**Option B: Add to Homepage**
- The chatbot can be added to the homepage
- Or create a dedicated services page

## 🔧 Adding the Chatbot to UI

### Step 1: Add Route in App.tsx

Add this route to `src/App.tsx`:

```typescript
import { AlmonaPrestigeChatbot } from '@/components/prestige-agent';

// In the Routes section, add:
<Route 
  path="/prestige-agent" 
  element={
    <Suspense fallback={getLoadingComponent('/prestige-agent')}>
      <AlmonaPrestigeChatbot />
    </Suspense>
  } 
/>
```

### Step 2: Add Navigation Link

Add to your navigation menu:

```typescript
<Link to="/prestige-agent">
  YDT Prestige Agent
</Link>
```

### Step 3: Or Add to Homepage

Import and add to homepage:

```typescript
import { AlmonaPrestigeChatbot } from '@/components/prestige-agent';

// In your homepage component:
<section>
  <AlmonaPrestigeChatbot />
</section>
```

## 🧪 Testing the Integration

### 1. Start Preview Server

```bash
npm run preview
```

### 2. Open Browser

Navigate to:
- `http://localhost:4173/prestige-agent` (if route added)
- Or wherever you integrated the component

### 3. Test Features

- **Persona Switching**: Click different persona buttons
- **Language Selection**: Switch between TR/EN/RU/AR
- **Send Messages**: Ask questions about AIM 7510
- **Quick Actions**: Use quick action buttons

## 📊 Expected Behavior

### Working Features:
- ✅ Persona selection (Professor, Doctor, Tour Guide, Code Master, Nervous System)
- ✅ Language switching (Turkish, English, Russian, Arabic)
- ✅ Message sending to backend API
- ✅ Response display with confidence scores
- ✅ Knowledge stats display
- ✅ Machine capabilities display

### API Connection:
- Backend: `https://ydt-production.up.railway.app`
- Health check: `/api/health`
- Chat endpoint: `/api/v1/chat`

## 🐛 Troubleshooting

### If Chatbot Doesn't Load:
1. Check browser console for errors
2. Verify API URL in `usePrestigeAgent.ts`
3. Check CORS settings in Railway
4. Verify backend is running

### If API Calls Fail:
1. Check network tab in browser DevTools
2. Verify `VITE_YDT_API_URL` environment variable
3. Check Railway service is online
4. Test API directly: `curl https://ydt-production.up.railway.app/api/health`

---

**Ready to test!** 🎯

