# 🚀 Railway Environment Variables Setup Guide

## Required Environment Variables for Railway Deployment

Based on your codebase analysis, here are all the environment variables you need to configure in Railway:

### 🔑 **CRITICAL - Required for Basic Functionality**

```bash
# Supabase Configuration (REQUIRED)
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_KEY=your-supabase-anon-key
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key  # Alternative name used in some places

# Node.js Configuration
NODE_ENV=production
NODE_VERSION=20
```

### 🤖 **AI Services (Optional but Recommended)**

```bash
# Google Gemini AI
VITE_GEMINI_KEY=your-google-gemini-api-key

# OpenAI (if used)
VITE_OPENAI_API_KEY=your-openai-api-key

# AI API Endpoint
VITE_AI_API_ENDPOINT=https://your-ai-api-endpoint.com
VITE_TFJS_MODEL_URL=https://your-tensorflow-model-url.com
```

### 🌐 **IoT Integration (Optional)**

```bash
# IoT Platform
VITE_IOT_WEBSOCKET_URL=wss://your-iot-platform.com/ws
VITE_IOT_API_URL=https://your-iot-api.com/v1
VITE_IOT_API_KEY=your-iot-platform-api-key
VITE_IOT_DASHBOARD_URL=https://iot-dashboard.almona.com
```

### 📱 **Social Media & Analytics (Optional)**

```bash
# Social Media
VITE_FACEBOOK_APP_ID=your-facebook-app-id
VITE_FACEBOOK_URL=https://facebook.com/your-page
VITE_LINKEDIN_URL=https://linkedin.com/company/your-company
VITE_INSTAGRAM_URL=https://instagram.com/your-account

# Analytics
VITE_GOOGLE_ANALYTICS_ID=your-ga4-measurement-id
VITE_ENABLE_ANALYTICS=true
VITE_SENTRY_DSN=your-sentry-production-dsn
VITE_HOTJAR_ID=your-hotjar-production-id
```

### 🗺️ **Maps & Location Services (Optional)**

```bash
# Google Maps
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Mapbox (alternative)
VITE_MAPBOX_ACCESS_TOKEN=your-mapbox-token

# Exchange Rates & Geolocation
VITE_EXCHANGE_RATE_API_KEY=your-exchange-rate-api-key
VITE_IP_GEOLOCATION_API=your-geolocation-api-key
```

### 📧 **Communication Services (Optional)**

```bash
# SMS Service
VITE_SMS_API_URL=https://your-sms-api.com
VITE_SMS_API_KEY=your-sms-api-key

# Contact Information
VITE_CONTACT_EMAIL=info@almona.eg
VITE_APP_URL=https://almona.eg
```

### 🔧 **Development & Debugging (Optional)**

```bash
# API Configuration
VITE_API_BASE_URL=https://api.almona-egypt.com
VITE_API_BASE=https://api.almona-egypt.com
VITE_PYTHON_API_URL=https://your-python-backend.com

# Feature Flags
VITE_ENABLE_V2_TICKETS=true
VITE_ENABLE_SW=true
VITE_DEBUG_MODE=false
VITE_TRACK_ERROR_BOUNDARY_PERFORMANCE=true

# PWA Configuration
VITE_VAPID_PUBLIC_KEY=your-vapid-public-key
VITE_FIREBASE_CONFIG=your-firebase-config-json
```

## 🎯 **Quick Setup for Railway**

### Step 1: Essential Variables (Minimum Required)
Add these to your Railway project environment variables:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_KEY=your-supabase-anon-key
NODE_ENV=production
NODE_VERSION=20
```

### Step 2: Enhanced Features (Recommended)
Add these for full functionality:

```bash
VITE_GEMINI_KEY=your-google-gemini-api-key
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
VITE_CONTACT_EMAIL=info@almona.eg
VITE_APP_URL=https://almona.eg
```

### Step 3: Production Monitoring (Optional)
Add these for production monitoring:

```bash
VITE_GOOGLE_ANALYTICS_ID=your-ga4-measurement-id
VITE_SENTRY_DSN=your-sentry-production-dsn
VITE_ENABLE_ANALYTICS=true
```

## 🔐 **How to Generate API Keys**

### 1. **Supabase Keys**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy:
   - Project URL → `VITE_SUPABASE_URL`
   - anon/public key → `VITE_SUPABASE_KEY`

### 2. **Google Gemini API Key**
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key → `VITE_GEMINI_KEY`

### 3. **Google Maps API Key**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Maps JavaScript API
3. Create credentials → API Key
4. Copy the key → `VITE_GOOGLE_MAPS_API_KEY`

### 4. **Google Analytics**
1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a GA4 property
3. Get Measurement ID → `VITE_GOOGLE_ANALYTICS_ID`

## 🚀 **Railway Deployment Steps**

1. **Connect Repository**
   - Connect your GitHub repository to Railway
   - Railway will auto-detect it's a Node.js project

2. **Set Environment Variables**
   - Go to your Railway project dashboard
   - Navigate to Variables tab
   - Add all required environment variables

3. **Deploy**
   - Railway will automatically build and deploy
   - Monitor the build logs for any issues

## ✅ **Verification Checklist**

After deployment, verify these work:
- [ ] Application loads without errors
- [ ] Supabase connection works (check browser console)
- [ ] AI features work (if Gemini key provided)
- [ ] Maps display correctly (if Maps key provided)
- [ ] Analytics tracking works (if Analytics ID provided)

## 🆘 **Troubleshooting**

### Common Issues:
1. **Build Fails**: Check Node.js version is 20+
2. **White Screen**: Verify Supabase environment variables
3. **AI Features Don't Work**: Check Gemini API key
4. **Maps Don't Load**: Verify Google Maps API key

### Debug Commands:
```bash
# Check environment variables in Railway logs
railway logs

# Verify build process
railway run npm run build
```

## 📝 **Environment Variables Template**

Copy this template and fill in your values:

```bash
# ===========================================
# RAILWAY ENVIRONMENT VARIABLES TEMPLATE
# ===========================================

# REQUIRED - Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_KEY=

# REQUIRED - Node.js
NODE_ENV=production
NODE_VERSION=20

# OPTIONAL - AI Services
VITE_GEMINI_KEY=
VITE_OPENAI_API_KEY=

# OPTIONAL - Maps
VITE_GOOGLE_MAPS_API_KEY=

# OPTIONAL - Analytics
VITE_GOOGLE_ANALYTICS_ID=
VITE_ENABLE_ANALYTICS=true

# OPTIONAL - Contact
VITE_CONTACT_EMAIL=info@almona.eg
VITE_APP_URL=https://almona.eg

# OPTIONAL - Social Media
VITE_FACEBOOK_URL=
VITE_LINKEDIN_URL=
VITE_INSTAGRAM_URL=
```

---

**🎉 Your Railway deployment should work perfectly with these environment variables!**
