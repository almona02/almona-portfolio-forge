# 🔑 Environment Variables Guide

## Required Variables

### 1. GOOGLE_GEMINI_API_KEY ✅
**Status**: You already have this!

**What it is**: Your Google Gemini API key for Vision AI processing

**Where to get it**: https://makersuite.google.com/app/apikey

---

### 2. SECRET_KEY 🔐

**What it is**: A secret key used for:
- Session management
- Security tokens
- CSRF protection
- Cryptographic operations

**How to generate**:

**Option A: Python (Recommended)**
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Option B: OpenSSL**
```bash
openssl rand -hex 32
```

**Option C: Online Generator**
- Go to: https://randomkeygen.com/
- Use "CodeIgniter Encryption Keys" (256-bit)

**Example generated key**:
```
xK9mP2qR8vL5nT7wY3zA6bC1dE4fG9hI0jK2lM5oP8qR1sT4uV7wX0yZ3aB6cD9eF
```

**Important**: 
- Keep it secret! Never commit to Git
- Use a different key for production vs development
- Make it at least 32 characters long

---

### 3. ALLOWED_ORIGINS 🌐

**What it is**: List of allowed origins for CORS (Cross-Origin Resource Sharing)

**For your project (almona02.com)**:
```
ALLOWED_ORIGINS=https://almona02.com,https://www.almona02.com,http://localhost:3000,http://localhost:5173
```

**Breakdown**:
- `https://almona02.com` - Your production domain
- `https://www.almona02.com` - WWW version (if you use it)
- `http://localhost:3000` - Local development
- `http://localhost:5173` - Vite dev server (if used)

---

### 4. API_WORKERS (Optional)

**What it is**: Number of Uvicorn worker processes

**Recommended**: `4` (good balance of performance and resource usage)

**Options**:
- `1` - Single worker (development)
- `2` - Light load
- `4` - Recommended for production
- `8` - High traffic

---

## 🚂 Setting in Railway

### Step 1: Go to Your Service
1. Railway Dashboard → Your Project
2. Click on `ydt-prestige-api` service
3. Go to "Variables" tab

### Step 2: Add Variables

Click "New Variable" for each:

**Variable 1:**
- Name: `SECRET_KEY`
- Value: `[paste your generated key]`

**Variable 2:**
- Name: `ALLOWED_ORIGINS`
- Value: `https://almona02.com,https://www.almona02.com,http://localhost:3000,http://localhost:5173`

**Variable 3:**
- Name: `API_WORKERS`
- Value: `4`

**Variable 4:**
- Name: `GOOGLE_GEMINI_API_KEY`
- Value: `[your existing key]` ✅

---

## ✅ Complete Configuration

Your Railway environment variables should look like:

```
GOOGLE_GEMINI_API_KEY=your-existing-key ✅
SECRET_KEY=xK9mP2qR8vL5nT7wY3zA6bC1dE4fG9hI0jK2lM5oP8qR1sT4uV7wX0yZ3aB6cD9eF
ALLOWED_ORIGINS=https://almona02.com,https://www.almona02.com,http://localhost:3000,http://localhost:5173
API_WORKERS=4
LOG_LEVEL=INFO
```

---

## 🔒 Security Best Practices

1. **Never commit secrets to Git**
   - Use `.env` files locally (already in `.gitignore`)
   - Use Railway environment variables for production

2. **Use different keys for different environments**
   - Development: One key
   - Production: Different key

3. **Rotate keys periodically**
   - Change SECRET_KEY every 6-12 months
   - Update GOOGLE_GEMINI_API_KEY if compromised

4. **Keep keys long and random**
   - Minimum 32 characters
   - Use cryptographically secure random generators

---

## 🧪 Test Your Configuration

After setting variables, test:

```bash
# Test health (should work)
curl https://your-ydt-service.railway.app/api/health

# Test chat (should work with CORS)
curl -X POST https://your-ydt-service.railway.app/api/v1/chat \
  -H "Content-Type: application/json" \
  -H "Origin: https://almona02.com" \
  -d '{"message":"Hello","persona":"professor","language":"en"}'
```

---

## 📝 Quick Reference

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| `GOOGLE_GEMINI_API_KEY` | ✅ Yes | `AIza...` | Your Gemini API key |
| `SECRET_KEY` | ✅ Yes | `xK9mP2...` | Generate with Python/OpenSSL |
| `ALLOWED_ORIGINS` | ✅ Yes | `https://almona02.com,...` | Your domains + localhost |
| `API_WORKERS` | ⚪ Optional | `4` | Number of workers |
| `LOG_LEVEL` | ⚪ Optional | `INFO` | Logging level |
| `PORT` | ⚪ Auto-set | `8000` | Railway sets this automatically |

---

**Need help?** Check Railway logs if something doesn't work!

