# Production Deployment Guide

## Overview

This guide covers the deployment process for the Fabricator Pro application, including both the web app and mobile app.

## Pre-Deployment Checklist

### 1. Security Hardening

- [ ] Review and update encryption keys in `SecurityManager`
- [ ] Verify all API keys are stored in environment variables
- [ ] Enable HTTPS for all API endpoints
- [ ] Review and update CORS settings
- [ ] Audit user input validation
- [ ] Review SQL injection prevention measures

### 2. Performance Optimization

- [ ] Enable CDN for static assets
- [ ] Configure image optimization
- [ ] Enable lazy loading for analytics dashboard
- [ ] Optimize database queries
- [ ] Set up caching strategies
- [ ] Review and optimize bundle sizes

### 3. Testing

- [ ] Run production readiness test suite
- [ ] Run mobile app test suite
- [ ] Perform load testing
- [ ] Test offline functionality
- [ ] Verify sync reliability
- [ ] Test ML model performance

### 4. Monitoring Setup

- [ ] Configure error tracking (Sentry, etc.)
- [ ] Set up performance monitoring
- [ ] Configure log aggregation
- [ ] Set up alerting for critical errors
- [ ] Configure uptime monitoring

## Web App Deployment

### Environment Variables

```bash
# Supabase
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key

# ML Model
VITE_ML_MODEL_URL=your-cdn-url/model.json

# Feature Flags
VITE_ENABLE_ML_PREDICTIONS=true
VITE_ENABLE_REALTIME_SYNC=true
```

### Build Process

```bash
# Install dependencies
npm install

# Run tests
npm run test

# Build for production
npm run build

# Deploy to hosting platform (Vercel, Netlify, etc.)
```

### Post-Deployment

1. Verify all endpoints are accessible
2. Test real-time sync functionality
3. Verify ML model loading
4. Check analytics dashboard performance
5. Monitor error rates

## Mobile App Deployment

### App Store Configuration

#### iOS (App Store)

1. Update `app.json` with production bundle identifier
2. Configure App Store Connect:
   - App name: "Fabricator Pro Mobile"
   - Bundle ID: `com.fabricatorpro.mobile`
   - Version: `1.0.0`
3. Build and submit:
   ```bash
   eas build --platform ios --profile production
   eas submit --platform ios
   ```

#### Android (Google Play)

1. Update `app.json` with production package name
2. Configure Google Play Console:
   - App name: "Fabricator Pro Mobile"
   - Package name: `com.fabricatorpro.mobile`
   - Version: `1.0.0`
3. Build and submit:
   ```bash
   eas build --platform android --profile production
   eas submit --platform android
   ```

### Environment Configuration

Create `app.config.js` for environment-specific settings:

```javascript
export default {
  expo: {
    extra: {
      apiUrl: process.env.API_URL,
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    },
  },
};
```

### Testing Before Release

1. Test on physical devices (iOS and Android)
2. Test offline functionality
3. Test barcode scanning
4. Test sync reliability
5. Test battery usage
6. Test memory usage

## ML Model Deployment

### CDN Setup

1. Upload model files to CDN:
   - `model.json`
   - `weights.bin` (or sharded weights)

2. Update model URL in environment variables

3. Verify model loading from CDN

### Model Versioning

- Use semantic versioning for models
- Maintain backward compatibility
- Implement fallback to previous version if new model fails

## Database Migration

### Pre-Migration

1. Backup production database
2. Test migrations on staging
3. Review migration scripts

### Migration Process

```bash
# Run migrations
npm run migrate:production

# Verify migration success
npm run verify:migration
```

### Post-Migration

1. Verify data integrity
2. Check performance metrics
3. Monitor error rates

## Monitoring and Alerts

### Key Metrics to Monitor

1. **Performance**
   - API response times
   - ML prediction latency
   - Sync operation duration
   - Memory usage

2. **Reliability**
   - Error rates
   - Sync conflict rates
   - Failed operations
   - Offline queue length

3. **Usage**
   - Active users
   - Operations per day
   - ML predictions per day
   - Sync operations per day

### Alert Thresholds

- Error rate > 1%
- API response time > 2s
- ML prediction latency > 500ms
- Sync conflict rate > 5%
- Offline queue length > 100

## Rollback Plan

### Web App Rollback

1. Revert to previous deployment
2. Restore database backup if needed
3. Verify functionality

### Mobile App Rollback

1. Submit previous version to app stores
2. Notify users of update
3. Monitor for issues

### Database Rollback

1. Restore from backup
2. Revert migration scripts
3. Verify data integrity

## Success Metrics

### Target Metrics

- **Uptime**: > 99.9%
- **Error Rate**: < 1%
- **API Response Time**: < 500ms (p95)
- **ML Prediction Latency**: < 500ms
- **Sync Success Rate**: > 99%
- **Mobile App Rating**: > 4.5/5

### Monitoring Dashboard

Set up dashboard to track:
- Real-time metrics
- Historical trends
- Error logs
- Performance metrics

## Support and Documentation

### User Documentation

- [ ] User guide for web app
- [ ] User guide for mobile app
- [ ] Video tutorials
- [ ] Troubleshooting guide
- [ ] FAQ

### Developer Documentation

- [ ] API documentation
- [ ] Architecture overview
- [ ] Deployment guide
- [ ] Troubleshooting guide

## Post-Deployment

### Week 1

- Monitor error rates daily
- Review performance metrics
- Collect user feedback
- Address critical issues

### Week 2-4

- Continue monitoring
- Optimize based on metrics
- Plan improvements
- Update documentation

## Emergency Contacts

- DevOps Team: [contact]
- Development Team: [contact]
- Database Admin: [contact]

