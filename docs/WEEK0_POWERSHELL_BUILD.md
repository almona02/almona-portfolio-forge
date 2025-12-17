# Week 0: Building Docker Image in PowerShell

## ⚠️ The Error Explained

**Error:** `export : The term 'export' is not recognized`

**Why:** You're in PowerShell, but `export` is a bash command. PowerShell uses different syntax.

## ✅ Solution: Use PowerShell Syntax

### Option 1: PowerShell (Current Terminal)

```powershell
cd python_backend
$env:DOCKER_BUILDKIT=1
docker build --no-cache -f Dockerfile.prod.slim -t almona-backend:slim .
```

### Option 2: One-Line PowerShell

```powershell
cd python_backend
$env:DOCKER_BUILDKIT=1; docker build --no-cache -f Dockerfile.prod.slim -t almona-backend:slim .
```

### Option 3: Use Git Bash (Recommended)

If you have Git Bash installed:
```bash
cd python_backend
export DOCKER_BUILDKIT=1
docker build --no-cache -f Dockerfile.prod.slim -t almona-backend:slim .
```

## 📋 Complete Build Command (PowerShell)

```powershell
# Navigate to backend directory
cd python_backend

# Set BuildKit environment variable (PowerShell syntax)
$env:DOCKER_BUILDKIT=1

# Build the image
docker build --no-cache -f Dockerfile.prod.slim -t almona-backend:slim .

# Check image size after build
docker images almona-backend:slim
```

## 🔍 Key Differences

| Bash/Shell | PowerShell |
|------------|------------|
| `export VAR=value` | `$env:VAR="value"` |
| `echo $VAR` | `echo $env:VAR` |
| `VAR=value command` | `$env:VAR="value"; command` |

## ✅ Expected Result

After build completes:
- **Image size:** ~180MB (down from 15GB)
- **Build time:** 30-60 minutes (first time, then 1-2 min with cache)

