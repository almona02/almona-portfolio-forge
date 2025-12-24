# 🐳 Docker Build Context Guide

## ⚠️ Important: Build Context

The Dockerfile needs access to both `python_backend/` and `ai_agents/ydt_agent/` directories.

## 🔧 Build Commands

### Option 1: Build from Project Root (Recommended)

```bash
# From project root (almona-portfolio-forge/)
docker build -f python_backend/Dockerfile -t ydt-prestige-api .
```

This allows the Dockerfile to access:
- `python_backend/api/`
- `python_backend/tests/`
- `ai_agents/ydt_agent/`
- `ai_agents/ydt_agent/knowledge/`

### Option 2: Build from python_backend (Alternative)

If building from `python_backend/`, update Dockerfile:

```dockerfile
# Copy from parent directory
COPY ../ai_agents/ydt_agent/ ./ai_agents/ydt_agent/
```

Then build:
```bash
cd python_backend
docker build -f Dockerfile -t ydt-prestige-api ..
```

## 🚂 Railway Configuration

Railway automatically builds from the repository root, so the Dockerfile paths work correctly.

**In Railway Dashboard:**
- Root Directory: `python_backend`
- Dockerfile Path: `python_backend/Dockerfile`
- Build Context: Project root

## ✅ Verification

After building, verify the image contains all files:

```bash
# Check image contents
docker run --rm ydt-prestige-api ls -la /app/ai_agents/ydt_agent/

# Should show:
# - ydt_chatbot_engine.py
# - gcode_ydt_integration.py
# - arabic_support.py
# - knowledge/
```

## 🔍 Troubleshooting

### "COPY failed: file not found"
- Ensure build context includes both directories
- Check `.dockerignore` doesn't exclude needed files
- Verify paths in Dockerfile match build context

### "Module not found: ydt_chatbot_engine"
- Verify `ai_agents/ydt_agent/` is copied
- Check PYTHONPATH in Dockerfile
- Ensure knowledge base is included

---

**Build from project root for best results!** 🎯

