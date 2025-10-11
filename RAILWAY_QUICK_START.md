# 🚀 Railway Quick Start Guide

## Get Your App Deployed in 5 Minutes!

This guide will get your Almona Portfolio Forge application deployed to Railway with all the necessary environment variables.

## ⚡ Quick Setup

### 1. Generate Environment Variables
```bash
npm run railway:env
```
This interactive script will guide you through setting up all required environment variables.

### 2. Deploy to Railway
1. Go to [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Add the environment variables from the generated `railway.env` file
4. Deploy!

## 🔑 Essential Environment Variables

**Minimum Required:**
```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_KEY=your-supabase-anon-key
NODE_ENV=production
NODE_VERSION=20
```

## 📋 Step-by-Step

### Step 1: Run the Environment Generator
```bash
npm run railway:env
```

Follow the prompts to:
- ✅ Set up Supabase connection
- ✅ Add AI services (optional)
- ✅ Configure maps (optional)
- ✅ Set up analytics (optional)

### Step 2: Railway Setup
1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign in with GitHub

2. **Deploy Repository**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Add Environment Variables**
   - Go to Variables tab
   - Copy variables from generated `railway.env` file
   - Paste each variable

### Step 3: Deploy
- Railway will automatically build and deploy
- Monitor the build logs
- Your app will be live at the Railway URL!

## 🎯 Success Indicators

Your deployment is successful when you see:
- ✅ Build completes without errors
- ✅ Node.js 20.x being used
- ✅ No Vite compatibility warnings
- ✅ PWA files generated successfully
- ✅ Application loads at Railway URL

## 🆘 Need Help?

### Common Issues:
1. **Build Fails**: Check Node.js version is 20+
2. **White Screen**: Verify Supabase environment variables
3. **Missing Features**: Check optional environment variables

### Debug Commands:
```bash
# Check Railway logs
npm run railway:logs

# Test build locally
npm run build

# Generate new environment variables
npm run railway:env
```

## 📚 Full Documentation

For complete setup instructions, see:
- `RAILWAY_DEPLOYMENT_GUIDE.md` - Complete deployment guide
- `RAILWAY_ENVIRONMENT_VARIABLES.md` - All environment variables reference

## 🎉 You're Done!

Your Almona Portfolio Forge application should now be successfully deployed on Railway with all the necessary environment variables configured!

---

**Need more help?** Check the full documentation or run `npm run railway:env` to regenerate your environment variables.
