# Week 0: Build Troubleshooting

## ❓ Issue

User says "build completed" but `almona-final` image not found.

## 🔍 Current Status

**Available images:**
- `almona-backend:slim` - 3.33GB (created 7 min ago)
- `almona-180mb:latest` - 2.78GB (created 29 min ago, still has ortools/pandas)

**Missing:**
- `almona-final` - Not found

## 🔧 Possible Causes

1. **Different tag used:** Build might have used a different tag name
2. **Build failed:** Build might have failed silently
3. **Image not tagged:** Build might have created untagged image

## ✅ Solutions

### Option 1: Check what was actually built
```powershell
docker images --all | grep -E "almona|<none>"
```

### Option 2: Rebuild with correct tag
```powershell
cd python_backend
docker build --no-cache -f Dockerfile.180mb -t almona-final .
```

### Option 3: Check if almona-180mb was rebuilt
If `almona-180mb` was rebuilt recently, check if it has optimized packages:
```powershell
docker run --rm --user root almona-180mb pip list | grep -E "ortools|pandas"
```

If ortools/pandas are NOT found, then `almona-180mb` is the optimized version!

## 📋 Next Steps

1. Check what tag was actually used in the build
2. Verify if any new image was created
3. Rebuild if needed with `-t almona-final`


