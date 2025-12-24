# 🎉 YDT Prestige Agent - Production URL

## ✅ Service is Live!

**Production URL**: `https://ydt-production.up.railway.app`

## 🧪 API Endpoints

### Health Check
```bash
curl https://ydt-production.up.railway.app/api/health
```

### Chat Endpoint
```bash
curl -X POST https://ydt-production.up.railway.app/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is AIM 7510?",
    "persona": "professor",
    "language": "en"
  }'
```

### Knowledge Stats
```bash
curl https://ydt-production.up.railway.app/api/v1/knowledge/stats
```

### Machine Capabilities
```bash
curl https://ydt-production.up.railway.app/api/v1/machine/capabilities
```

### Learning Modules
```bash
curl https://ydt-production.up.railway.app/api/v1/learn/modules?language=en
```

### G-Code Validation
```bash
curl -X POST https://ydt-production.up.railway.app/api/v1/gcode/validate \
  -H "Content-Type: application/json" \
  -d '{
    "gcode_program": "G00 X100 Y100",
    "operation_type": "milling",
    "material": "aluminum",
    "language": "en"
  }'
```

## 🔗 Frontend Integration

### Update Environment Variables

Add to your `.env` or `.env.production`:

```env
VITE_YDT_API_URL=https://ydt-production.up.railway.app
```

### Update `usePrestigeAgent.ts`

The hook should already work, but verify the base URL:

```typescript
const API_BASE_URL = import.meta.env.VITE_YDT_API_URL || 'https://ydt-production.up.railway.app';
```

### Test in Frontend

1. Import the hook:
```typescript
import { usePrestigeAgent } from '@/hooks/usePrestigeAgent';
```

2. Use in component:
```typescript
const { sendMessage, isLoading, error } = usePrestigeAgent();

const handleChat = async () => {
  const response = await sendMessage({
    message: "What is AIM 7510?",
    persona: "professor",
    language: "en"
  });
  console.log(response);
};
```

## 📊 Service Status

- **Status**: ✅ Online
- **URL**: https://ydt-production.up.railway.app
- **Port**: 8080 (internal)
- **Workers**: 4
- **HTTPS**: ✅ Enabled (automatic)

## 🎯 Next Steps

1. ✅ **Test API endpoints** (see above)
2. ✅ **Update frontend** environment variables
3. ✅ **Test chatbot** in production
4. ✅ **Monitor Railway logs** for any issues

## 🔍 Monitoring

- **Railway Dashboard**: Check logs, metrics, and status
- **Health Endpoint**: Monitor `/api/health` for uptime
- **Response Times**: Track via Railway metrics

---

**🎉 YDT Prestige Agent is now live at: https://ydt-production.up.railway.app** 🚀

