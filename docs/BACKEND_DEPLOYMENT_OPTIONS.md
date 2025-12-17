# 🚀 Backend Deployment Options

**Quick guide for deploying the Python backend to production.**

---

## 🎯 Recommended: Railway (Easiest)

### Why Railway?
- ✅ Easiest setup (5 minutes)
- ✅ Automatic deployments from GitHub
- ✅ Built-in PostgreSQL and Redis
- ✅ Free tier available
- ✅ Great for Egyptian internet (good CDN)

### Setup Steps

1. **Create Account**
   - Go to [railway.app](https://railway.app)
   - Sign in with GitHub

2. **Create Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose `almona-portfolio-forge`

3. **Add Service**
   - Click "New" → "GitHub Repo"
   - Select repository
   - Railway auto-detects Dockerfile

4. **Configure Service**
   - Dockerfile Path: `python_backend/Dockerfile.realistic`
   - Port: `8000` (default)
   - Health Check: `/health`

5. **Add Database (PostgreSQL)**
   - Click "New" → "Database" → "PostgreSQL"
   - Railway creates database automatically
   - Connection string available in variables

6. **Add Redis (Optional)**
   - Click "New" → "Database" → "Redis"
   - For background tasks and caching

7. **Set Environment Variables**
   ```bash
   DATABASE_URL=${{Postgres.DATABASE_URL}}  # Auto-provided by Railway
   REDIS_URL=${{Redis.REDIS_URL}}  # Auto-provided if Redis added
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your_service_role_key
   SECRET_KEY=your_secret_key_here
   TZ=Africa/Cairo
   LANG=ar_EG.UTF-8
   LC_ALL=ar_EG.UTF-8
   ```

8. **Deploy**
   - Railway automatically deploys on push to `main`
   - Get your URL: `https://your-app.railway.app`

### Railway Pricing
- **Free Tier:** $5 credit/month
- **Hobby:** $20/month (good for pilot)
- **Pro:** $100/month (production)

---

## 🎯 Alternative: Render (Free Tier)

### Why Render?
- ✅ Free tier available
- ✅ Easy setup
- ✅ Automatic SSL
- ⚠️ Slower cold starts (free tier)

### Setup Steps

1. **Create Account**
   - Go to [render.com](https://render.com)
   - Sign in with GitHub

2. **Create Web Service**
   - New → Web Service
   - Connect GitHub repository
   - Branch: `main`

3. **Configure**
   - Environment: **Docker**
   - Dockerfile Path: `python_backend/Dockerfile.realistic`
   - Build Command: (auto-detected)
   - Start Command: (auto-detected)
   - Health Check Path: `/health`

4. **Add PostgreSQL**
   - New → PostgreSQL
   - Render creates database
   - Connection string in environment variables

5. **Set Environment Variables**
   - Same as Railway (see above)

6. **Deploy**
   - Render builds and deploys
   - URL: `https://your-app.onrender.com`

### Render Pricing
- **Free Tier:** Available (with limitations)
- **Starter:** $7/month
- **Standard:** $25/month

---

## 🎯 Enterprise: AWS ECS

### Why AWS?
- ✅ Enterprise-grade
- ✅ Full control
- ✅ Scalable
- ⚠️ More complex setup

### Setup Steps

1. **Push Docker Image to ECR**
   ```bash
   # Create ECR repository
   aws ecr create-repository --repository-name almona-backend

   # Login to ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account.dkr.ecr.us-east-1.amazonaws.com

   # Build and tag
   docker build -t almona-backend -f python_backend/Dockerfile.realistic python_backend/
   docker tag almona-backend:latest your-account.dkr.ecr.us-east-1.amazonaws.com/almona-backend:latest

   # Push
   docker push your-account.dkr.ecr.us-east-1.amazonaws.com/almona-backend:latest
   ```

2. **Create ECS Task Definition**
   - Use AWS Console or CloudFormation
   - Configure environment variables
   - Set resource limits (CPU, memory)

3. **Create ECS Service**
   - Use Fargate (serverless) or EC2
   - Configure load balancer
   - Set up auto-scaling

4. **Configure RDS (PostgreSQL)**
   - Create RDS PostgreSQL instance
   - Update `DATABASE_URL` in ECS task

5. **Deploy**
   - Update ECS service with new task definition
   - ECS handles rolling deployment

---

## 📊 Comparison

| Feature | Railway | Render | AWS ECS |
|---------|---------|--------|---------|
| **Setup Time** | 5 min | 10 min | 1 hour+ |
| **Free Tier** | $5 credit | Yes | No |
| **Auto Deploy** | ✅ | ✅ | ⚠️ Manual |
| **Database** | ✅ Built-in | ✅ Built-in | ⚠️ Separate |
| **Scaling** | Easy | Easy | Advanced |
| **Cost (Pilot)** | $20/mo | Free-$7/mo | $50+/mo |
| **Best For** | Quick start | Budget | Enterprise |

---

## 🔧 Post-Deployment

### Update CORS

After deploying backend, update CORS in `python_backend/apis/main.py`:

```python
allow_origins=[
    "https://your-app.vercel.app",  # Your Vercel frontend
    "https://www.almona02.com",     # Production domain
    # ... other domains
]
```

### Update Frontend

Set `VITE_API_URL` in Vercel to your backend URL:
```bash
VITE_API_URL=https://your-backend.railway.app
```

### Test

1. Health check: `https://your-backend.railway.app/health`
2. API test: `https://your-backend.railway.app/api/v2/...`
3. Full workflow test from frontend

---

## ✅ Recommendation

**For Pilot Workshop:**
- **Use Railway** - Easiest setup, good performance, reasonable cost

**For Production (Minister Meeting):**
- **Use Railway** (if budget allows) or **Render** (if budget is tight)
- Both are production-ready and reliable

**For Enterprise Scale:**
- **Use AWS ECS** - Full control and scalability

---

**Ready to deploy?** Start with Railway for the quickest setup! 🚀

