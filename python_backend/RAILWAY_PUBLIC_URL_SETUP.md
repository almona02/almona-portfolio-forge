# 🌐 Railway Public URL Setup Guide

## 🔧 Port Configuration

When Railway asks about the port, here's what to do:

### Option 1: Use PORT Environment Variable (Recommended)
- **Port**: Leave empty or use `${PORT}`
- Railway automatically sets the `PORT` environment variable
- Your app should use `PORT` (which Railway provides)

### Option 2: Use Specific Port
- **Port**: `8080` (if Railway doesn't auto-detect)
- This matches what your logs show: `Uvicorn running on http://0.0.0.0:8080`

## 📋 Step-by-Step Setup

### 1. Go to Networking Section
- Railway Dashboard → YDT Service
- Click **"Networking"** tab (or scroll to Networking section)

### 2. Enable Public Networking
- Find **"Public Networking"** section
- Toggle it **ON** (if not already enabled)

### 3. Generate Domain
- Click **"Generate Domain"** button
- Railway will create a URL like: `ydt-production-xxxx.up.railway.app`

### 4. Port Configuration (If Asked)
When Railway asks for port:
- **If it asks for "Port"**: Enter `8080` or leave empty
- **If it asks for "Target Port"**: Enter `8080`
- **If it asks for "Service Port"**: Enter `8080`

### 5. Save/Apply
- Click **"Update"** or **"Save"**
- Railway will configure the domain

## 🔍 Verify Your Dockerfile Uses PORT

Your Dockerfile should use the `PORT` environment variable (which it does):

```dockerfile
CMD sh -c "uvicorn api.prestige_endpoints:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${API_WORKERS:-4}"
```

This means:
- Railway sets `PORT` automatically
- Your app uses `${PORT}` (or defaults to 8000)
- Railway maps the public domain to this port

## 🎯 Common Port Scenarios

### Scenario 1: Railway Auto-Detects Port
- Railway reads your Dockerfile/start command
- Automatically detects port from `PORT` env var
- **Action**: Leave port field empty or use `${PORT}`

### Scenario 2: Railway Asks for Port
- Railway needs explicit port configuration
- **Action**: Enter `8080` (or whatever port your logs show)

### Scenario 3: Custom Port Mapping
- If you want to use a different external port
- **Action**: Configure port mapping in Railway settings

## 📊 Check Your Current Port

From your logs, the service is running on:
```
Uvicorn running on http://0.0.0.0:8080
```

So Railway likely set `PORT=8080` automatically.

## ✅ After Setup

Once the domain is generated:
1. **Test the URL**: `https://your-domain.up.railway.app/api/health`
2. **Check HTTPS**: Railway automatically provides HTTPS
3. **Update Frontend**: Use this URL in your frontend config

## 🚨 Troubleshooting

### If Port Configuration Fails:
1. Check Railway logs for the actual port being used
2. Verify your Dockerfile uses `${PORT}` environment variable
3. Make sure Railway's `PORT` env var is set (it should be automatic)

### If Domain Doesn't Work:
1. Wait 1-2 minutes for DNS propagation
2. Check Railway service logs for errors
3. Verify the service is "Online" in Railway dashboard

---

**Quick Answer**: When Railway asks for port, enter `8080` or leave it empty if Railway auto-detects it. 🎯

