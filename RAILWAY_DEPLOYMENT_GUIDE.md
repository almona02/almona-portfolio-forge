# 🚀 Complete Railway Deployment Guide

## Overview
This guide will help you deploy your Almona Portfolio Forge application to Railway with all necessary environment variables and configurations.

## 📋 Prerequisites

- [ ] Railway account ([railway.app](https://railway.app))
- [ ] GitHub repository connected to Railway
- [ ] Supabase project set up
- [ ] Required API keys (see environment variables guide)

## 🎯 Step-by-Step Deployment

### Step 1: Connect Repository to Railway

1. **Login to Railway**
   - Go to [railway.app](https://railway.app)
   - Sign in with your GitHub account

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `almona-portfolio-forge` repository

3. **Configure Build Settings**
   - Railway will auto-detect Node.js
   - Ensure Node.js version is set to 20.x
   - Build command: `npm run build`
   - Output directory: `dist`

### Step 2: Set Environment Variables

1. **Navigate to Variables Tab**
   - In your Railway project dashboard
   - Click on "Variables" tab

2. **Add Required Variables**
   Copy and paste these essential variables:

```bash
# CRITICAL - Required for basic functionality
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_KEY=your-supabase-anon-key
NODE_ENV=production
NODE_VERSION=20
```

3. **Add Optional Variables** (for enhanced features)
```bash
# AI Services
VITE_GEMINI_KEY=your-google-gemini-api-key

# Maps
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# Analytics
VITE_GOOGLE_ANALYTICS_ID=your-ga4-measurement-id
VITE_ENABLE_ANALYTICS=true

# Contact Info
VITE_CONTACT_EMAIL=info@almona.eg
VITE_APP_URL=https://almona.eg
```

### Step 3: Configure Build Settings

1. **Verify Build Configuration**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Node.js Version: `20.x`

2. **Add Build Overrides** (if needed)
   In your `package.json`, ensure you have:
   ```json
   {
     "engines": {
       "node": ">=18.0.0 <23.0.0"
     }
   }
   ```

### Step 4: Deploy

1. **Trigger Deployment**
   - Railway will automatically deploy when you push to main branch
   - Or manually trigger from Railway dashboard

2. **Monitor Build Process**
   - Watch the build logs in Railway dashboard
   - Look for these success indicators:
     - ✅ Node.js version 20.x+ being used
     - ✅ No Vite version compatibility warnings
     - ✅ Successful build completion
     - ✅ PWA files generated without errors

### Step 5: Verify Deployment

1. **Check Application**
   - Visit your Railway app URL
   - Verify the application loads correctly
   - Check browser console for any errors

2. **Test Key Features**
   - [ ] Supabase authentication works
   - [ ] AI features work (if Gemini key provided)
   - [ ] Maps display correctly (if Maps key provided)
   - [ ] Analytics tracking works (if Analytics ID provided)

## 🔧 Environment Variables Reference

### Essential Variables (Minimum Required)
```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_KEY=your-supabase-anon-key
NODE_ENV=production
NODE_VERSION=20
```

### Complete Variable List
See `RAILWAY_ENVIRONMENT_VARIABLES.md` for the complete list of all available environment variables.

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. Build Fails with Node Version Error
**Problem**: Build fails due to Node.js version incompatibility
**Solution**: 
- Ensure `NODE_VERSION=20` is set in Railway variables
- Check `package.json` engines field

#### 2. White Screen on Load
**Problem**: Application loads but shows white screen
**Solution**:
- Verify Supabase environment variables are correct
- Check browser console for errors
- Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY` are set

#### 3. Vite Build Warnings
**Problem**: Vite version compatibility warnings
**Solution**:
- These are usually non-critical
- Ensure Node.js 20.x is being used
- Check that all dependencies are compatible

#### 4. PWA Files Not Generated
**Problem**: Service worker or manifest files missing
**Solution**:
- Check build logs for PWA plugin errors
- Verify `vite-plugin-pwa` is properly configured
- Ensure build completes successfully

### Debug Commands

```bash
# Check Railway logs
railway logs

# Test build locally
npm run build

# Verify environment variables
railway run env
```

## 📊 Monitoring Your Deployment

### Railway Dashboard
- Monitor build status
- View deployment logs
- Check resource usage
- Manage environment variables

### Application Monitoring
- Browser console for client-side errors
- Network tab for API call failures
- Lighthouse audit for performance

## 🔄 Continuous Deployment

Railway automatically deploys when you:
- Push to the main branch
- Merge pull requests
- Manually trigger deployment

### Custom Domain (Optional)
1. Go to Railway project settings
2. Add custom domain
3. Configure DNS records
4. Enable SSL certificate

## 🎉 Success Indicators

Your deployment is successful when you see:
- ✅ Build completes without errors
- ✅ Application loads at Railway URL
- ✅ No console errors in browser
- ✅ Supabase connection works
- ✅ All features function correctly

## 📞 Support

If you encounter issues:
1. Check Railway documentation
2. Review build logs
3. Verify environment variables
4. Test locally first
5. Check browser console for errors

---

**🚀 Your Almona Portfolio Forge application should now be successfully deployed on Railway!**
