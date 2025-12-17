# Week 0 Day 2-3: Build Commands

**Quick Reference for Building Slim Images**

## Build Backend

```bash
cd python_backend
docker build -f Dockerfile.prod.slim -t almona-backend:slim .
```

**Expected:** 15-30 minutes (first build), 2-5 minutes (cached)

## Build Frontend

```bash
cd ..  # Return to project root
docker build -f Dockerfile.frontend.slim -t almona-frontend:slim .
```

**Expected:** 10-20 minutes (first build), 1-3 minutes (cached)

## Verify Sizes

```bash
./scripts/slim-verify.sh
```

Or manually:
```bash
docker images almona-backend:slim
docker images almona-frontend:slim
```

## Test Functionality

```bash
cd python_backend
docker-compose up -d
curl http://localhost:8000/health
```

## Check Image Breakdown (if size issues)

```bash
# Backend
docker run --rm almona-backend:slim du -h --max-depth=2 /root/.local

# Frontend  
docker run --rm almona-frontend:slim du -h --max-depth=1 /
```

