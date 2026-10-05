# 🎯 Frontend YDT Integration - Production Ready

## ✅ API Status: LIVE

**Production URL**: `https://ydt-production.up.railway.app`

All endpoints tested and working:
- ✅ Health Check: `/api/health`
- ✅ Chat: `/api/v1/chat`
- ✅ Knowledge Stats: `/api/v1/knowledge/stats`

## 🔧 Frontend Configuration

### Environment Variables

Add to your `.env` or `.env.production`:

```env
# YDT Prestige Agent API
VITE_YDT_API_URL=https://ydt-production.up.railway.app
```

### Updated Hook

The `usePrestigeAgent` hook has been updated to use:
1. `VITE_YDT_API_URL` (preferred for YDT)
2. `VITE_API_URL` (fallback)
3. Production URL (final fallback)

### Usage in Components

```typescript
import { usePrestigeAgent } from '@/hooks/usePrestigeAgent';

function MyComponent() {
  const { sendMessage, isLoading, error } = usePrestigeAgent();

  const handleChat = async () => {
    const response = await sendMessage(
      "What is AIM 7510?",
      "professor",
      "en"
    );
    
    if (response.success && response.data) {
      console.log('Response:', response.data.response);
      console.log('Confidence:', response.data.confidence);
    }
  };

  return (
    <button onClick={handleChat} disabled={isLoading}>
      {isLoading ? 'Loading...' : 'Ask YDT'}
    </button>
  );
}
```

## 🧪 Test the Integration

### 1. Health Check
```bash
curl https://ydt-production.up.railway.app/api/health
```

### 2. Chat Test
```bash
curl -X POST https://ydt-production.up.railway.app/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is AIM 7510?",
    "persona": "professor",
    "language": "en"
  }'
```

### 3. Frontend Test
1. Start your frontend: `npm run dev`
2. Open browser console
3. Use the `usePrestigeAgent` hook in a component
4. Send a test message

## 📊 API Response Example

```json
{
  "success": true,
  "data": {
    "response": "Based on the YDT knowledge base...",
    "confidence": 95.0,
    "persona": "professor",
    "language": "en",
    "response_time": 0.0,
    "knowledge_sources": ["AIM 7510 Manual", "Wiring Diagram"],
    "suggested_actions": ["Learn more", "View diagram"],
    "visual_elements": {},
    "extras": {
      "has_examples": true,
      "has_diagrams": true,
      "has_exercises": false,
      "difficulty_level": "intermediate"
    }
  },
  "metadata": {
    "timestamp": "2025-12-24T23:39:58.365410",
    "session_id": null,
    "engine_version": "2.0.0",
    "knowledge_base": {
      "components": 1193,
      "connections": 1253,
      "spare_parts": 281,
      "accuracy": 95.0
    }
  }
}
```

## 🎯 Next Steps

1. ✅ **API is live** at `https://ydt-production.up.railway.app`
2. ✅ **Frontend hook updated** to use production URL
3. ⏳ **Add environment variable** to your `.env` file
4. ⏳ **Test in frontend** using `usePrestigeAgent` hook
5. ⏳ **Integrate into chatbot component** (`AlmonaPrestigeChatbot.tsx`)

## 🔗 Integration Points

### AlmonaPrestigeChatbot Component

The chatbot component should already use `usePrestigeAgent`. Verify:

```typescript
// In AlmonaPrestigeChatbot.tsx
import { usePrestigeAgent } from '@/hooks/usePrestigeAgent';

// The hook will automatically use the production URL
const { sendMessage, isLoading } = usePrestigeAgent();
```

## 🚨 CORS Configuration

Railway should handle CORS automatically. If you encounter CORS issues:

1. Check Railway environment variables:
   - `ALLOWED_ORIGINS` should include your frontend domain
   - Example: `https://almona02.com,http://localhost:3000`

2. Verify in `prestige_endpoints.py`:
   ```python
   allow_origins=["https://almona02.com", "http://localhost:3000"]
   ```

---

**🎉 YDT Prestige Agent is ready for frontend integration!** 🚀

