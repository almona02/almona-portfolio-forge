# 🚂 Railway Variables Setup for YDT Prestige Agent

## ✅ Required Variables (Set These)

### 1. GOOGLE_GEMINI_API_KEY
**Value**: Your Gemini API key
**Status**: ✅ You already have this

### 2. SECRET_KEY
**Value**: Use Railway's secret generator or your own
**Options**:
- **Option A**: Use Railway's secret function (recommended)
  ```
  ${{ secret(32, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?") }}
  ```
- **Option B**: Use the generated key
  ```
  OChWDNt_MUVRNNs6Uiq2aRDqvDDoiwms-tU_xP_dQ3A
  ```

### 3. ALLOWED_ORIGINS
**Value**: Your production domain + localhost
```
https://almona02.com,https://www.almona02.com,http://localhost:3000,http://localhost:5173
```

### 4. API_WORKERS (Optional but Recommended)
**Value**: 
```
4
```

### 5. LOG_LEVEL (Optional)
**Value**: 
```
INFO
```
(Or use `WARNING` if you want less verbose logs)

---

## ⚪ Optional Variables (Only if Needed)

These are from your existing services. **Only set them if you want to integrate:**

### Redis Integration (Optional)
If you want to use your existing Redis for session management:
```
REDIS_HOST=${{Redis.REDISHOST}}
```

### Supabase Integration (Optional)
If you want to connect to Supabase:
```
SUPABASE_SERVICE_ROLE_KEY=${{Postgres.SUPABASE_SERVICE_ROLE_KEY}}
SUPABASE_MAX_CONNECTIONS=20
SUPABASE_MAX_RETRIES=3
```

### Rate Limiting (Optional)
If you want rate limiting:
```
RATE_LIMIT=100/minute
RATE_LIMIT_ANONYMOUS_PER_MINUTE=10
RATE_LIMIT_AUTHENTICATED_PER_MINUTE=100
```

---

## ❌ Ignore These Variables

These are from other services and **NOT needed** for YDT Prestige Agent:

- `FACEBOOK_APP_ID` - Not used
- `TWILIO_ACCOUNT_SID` - Not used
- `TWILIO_AUTH_TOKEN` - Not used
- `RESEND_API_KEY` - Not used
- `SENDGRID_FROM_EMAIL` - Not used
- `ADMIN_EMAILS` - Not used
- `ERP_BACKEND` - Not used
- `FRONTEND_URL` - Not needed (use ALLOWED_ORIGINS instead)
- `JAEGER_ENDPOINT` - Not used
- `WORKERS` - Use `API_WORKERS` instead

---

## 🎯 Minimal Setup (Recommended)

For the YDT Prestige Agent to work, you only need **4 variables**:

```
✅ GOOGLE_GEMINI_API_KEY=[your existing key]
✅ SECRET_KEY=${{ secret(32, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?") }}
✅ ALLOWED_ORIGINS=https://almona02.com,https://www.almona02.com,http://localhost:3000,http://localhost:5173
✅ API_WORKERS=4
```

**Optional but recommended:**
```
LOG_LEVEL=INFO
```

---

## 📝 Step-by-Step Setup

### In Railway Dashboard:

1. **Go to your YDT service** → "Variables" tab

2. **Click "New Variable"** for each required variable:

   **Variable 1:**
   - Name: `GOOGLE_GEMINI_API_KEY`
   - Value: `[paste your existing key]`

   **Variable 2:**
   - Name: `SECRET_KEY`
   - Value: `${{ secret(32, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?") }}`
   - Or use: `OChWDNt_MUVRNNs6Uiq2aRDqvDDoiwms-tU_xP_dQ3A`

   **Variable 3:**
   - Name: `ALLOWED_ORIGINS`
   - Value: `https://almona02.com,https://www.almona02.com,http://localhost:3000,http://localhost:5173`

   **Variable 4:**
   - Name: `API_WORKERS`
   - Value: `4`

   **Variable 5 (Optional):**
   - Name: `LOG_LEVEL`
   - Value: `INFO`

3. **Ignore all other suggested variables** - They're from other services

4. **Save and redeploy** if needed

---

## ✅ Verification

After setting variables, test:

```bash
# Health check
curl https://your-ydt-service.railway.app/api/health

# Chat endpoint
curl -X POST https://your-ydt-service.railway.app/api/v1/chat \
  -H "Content-Type: application/json" \
  -H "Origin: https://almona02.com" \
  -d '{"message":"Hello","persona":"professor","language":"en"}'
```

---

## 🔍 Troubleshooting

### If you see CORS errors:
- Check `ALLOWED_ORIGINS` includes your domain
- Make sure there are no spaces in the value
- Use `https://` for production, not `http://`

### If you see authentication errors:
- Verify `SECRET_KEY` is set correctly
- Check it's not empty

### If you see API errors:
- Verify `GOOGLE_GEMINI_API_KEY` is correct
- Check Railway logs for specific errors

---

## 📊 Summary

**Minimum Required**: 4 variables
**Recommended**: 5 variables (add LOG_LEVEL)
**Optional Integration**: Add Redis/Supabase variables if needed

**Everything else can be ignored!** 🎉

