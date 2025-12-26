# 🔍 YDT Production Verification Guide

This guide helps you verify that YDT (YDT Future Intelligence) is running correctly in production with all parsed knowledge base data.

## Quick Verification

### 1. Run Local Verification Script

```bash
npm run verify:ydt
```

This checks:
- ✅ Knowledge base file exists and has data
- ✅ Frontend integration points
- ✅ YDTCoreService configuration
- ✅ YDTBusinessLayer integration
- ✅ FabricatorWorkflow integration

### 2. Test API Endpoint

```bash
# Test local API
npm run verify:ydt:api

# Or test production API directly
curl https://your-production-domain.com/api/v2/ydt/parser/knowledge-base
```

### 3. Browser Console Check

Open your production app and check the browser console for:

```
✅ YDT Core Service initialized with knowledge base
✅ DocumentationKnowledgeGraph loaded successfully
```

## Detailed Verification Steps

### Step 1: Verify Knowledge Base File

The knowledge base should be at:
```
src/lib/ydt/knowledge-base.json
```

**Check:**
- File exists
- File size > 0 KB
- Contains `egyptian.fabricationKnowledge` section
- Contains `systemPacks`, `profileRoles`, `connections`, `cutting` data

**Command:**
```bash
node -e "const kb = require('./src/lib/ydt/knowledge-base.json'); console.log('Files:', kb.documents?.totalFiles || 0); console.log('Workflows:', Object.keys(kb.workflows || {}).length); console.log('Systems:', kb.egyptian?.fabricationKnowledge?.systemPacks?.systems?.length || 0);"
```

### Step 2: Verify API Endpoint

**Endpoint:** `GET /api/v2/ydt/parser/knowledge-base`

**Expected Response:**
```json
{
  "documents": {
    "totalFiles": 150,
    ...
  },
  "egyptian": {
    "fabricationKnowledge": {
      "systemPacks": { ... },
      "profileRoles": { ... },
      "connections": { ... },
      "cutting": { ... }
    }
  },
  "workflows": { ... },
  "algorithms": { ... },
  "components": [ ... ]
}
```

**Test:**
```bash
# Local
curl http://localhost:8000/api/v2/ydt/parser/knowledge-base | jq '.egyptian.fabricationKnowledge.systemPacks.systems | length'

# Production (replace with your domain)
curl https://your-domain.com/api/v2/ydt/parser/knowledge-base | jq '.egyptian.fabricationKnowledge.systemPacks.systems | length'
```

### Step 3: Verify Frontend Integration

**Check Files:**
1. `src/lib/ydt/DocumentationKnowledgeGraph.ts` - Should load from API
2. `src/lib/ydt/YDTCoreService.ts` - Should use DocumentationKnowledgeGraph
3. `src/lib/ydt/YDTBusinessLayer.ts` - Should use YDTCoreService
4. `src/pages/FabricatorWorkflow.tsx` - Should use YDTBusinessLayer

**Browser Console Test:**
```javascript
// In browser console
window.ydtTest = async () => {
  const { DocumentationKnowledgeGraph } = await import('/src/lib/ydt/DocumentationKnowledgeGraph.ts');
  const graph = new DocumentationKnowledgeGraph();
  await graph.load();
  console.log('Knowledge base loaded:', graph.isLoaded());
  console.log('Systems:', graph.getSystemPacks()?.length || 0);
};
ydtTest();
```

### Step 4: Verify YDT Features in UI

**In FabricatorWorkflow:**
1. Open a project
2. Check for YDT validation messages
3. Check for preset suggestions
4. Verify optimization recommendations

**In Dashboard:**
1. Check for Morning Brief Widget
2. Verify it shows YDT insights
3. Check for system recommendations

### Step 5: Verify Backend API

**Health Check:**
```bash
curl https://your-domain.com/api/health
```

**Knowledge Base Stats:**
```bash
curl https://your-domain.com/api/v2/ydt/parser/stats
```

**Expected Response:**
```json
{
  "status": "success",
  "files_parsed": 150,
  "workflows": 25,
  "algorithms": 10,
  "components": 50,
  "parsed_at": "2025-01-XX..."
}
```

## Troubleshooting

### Issue: Knowledge Base Not Found (404)

**Solution:**
1. Run parser: `npm run parse:documentation`
2. Verify file exists: `ls -la src/lib/ydt/knowledge-base.json`
3. Check API path resolution in `python_backend/apis/v2/ydt_parser.py`

### Issue: API Returns 500 Error

**Check:**
1. Python backend is running
2. Knowledge base file path is correct
3. File permissions are correct
4. Check backend logs for traceback

**Debug:**
```bash
# Check backend logs
tail -f python_backend/logs/*.log

# Test path resolution
cd python_backend
python -c "from pathlib import Path; p = Path('apis/v2/ydt_parser.py'); print(p.resolve().parent.parent.parent.parent / 'src' / 'lib' / 'ydt' / 'knowledge-base.json')"
```

### Issue: Frontend Can't Load Knowledge Base

**Check:**
1. Browser console for errors
2. Network tab for API calls
3. CORS settings on backend
4. API URL in frontend environment variables

**Debug:**
```javascript
// In browser console
fetch('/api/v2/ydt/parser/knowledge-base')
  .then(r => r.json())
  .then(d => console.log('KB loaded:', d.documents?.totalFiles || 0))
  .catch(e => console.error('Error:', e));
```

### Issue: YDT Features Not Appearing

**Check:**
1. YDTBusinessLayer is initialized in FabricatorWorkflow
2. Console shows initialization messages
3. No errors in console
4. Knowledge base is actually loaded

**Debug:**
```typescript
// In FabricatorWorkflow.tsx, add:
useEffect(() => {
  console.log('YDT Business Layer:', ydtBusinessLayer);
  console.log('KB Loaded:', ydtBusinessLayer?.isKnowledgeBaseLoaded());
}, []);
```

## Production Checklist

- [ ] Knowledge base file exists and has data
- [ ] API endpoint `/api/v2/ydt/parser/knowledge-base` returns 200
- [ ] API response contains `egyptian.fabricationKnowledge`
- [ ] Frontend loads knowledge base without errors
- [ ] YDTCoreService initializes successfully
- [ ] YDTBusinessLayer is used in FabricatorWorkflow
- [ ] YDT validation works in workflow
- [ ] Preset suggestions appear
- [ ] Morning Brief Widget shows on dashboard
- [ ] No console errors related to YDT

## Expected Data Counts

After parsing, you should see:
- **Files parsed:** 100-200+ files
- **System Packs:** 10-20+ systems
- **Profile Roles:** 20-30+ roles
- **Connection Angles:** 10-15+ angles
- **Cutting Rules:** 15-25+ rules
- **Workflows:** 20-30+ workflows
- **Algorithms:** 5-10+ algorithms
- **Components:** 30-50+ components

## Quick Test Commands

```bash
# Full verification
npm run verify:ydt && npm run verify:ydt:api

# Check knowledge base structure
node -e "const kb = require('./src/lib/ydt/knowledge-base.json'); console.log(JSON.stringify({files: kb.documents?.totalFiles, systems: kb.egyptian?.fabricationKnowledge?.systemPacks?.systems?.length, roles: kb.egyptian?.fabricationKnowledge?.profileRoles?.roles?.length}, null, 2));"

# Test API endpoint
curl -s http://localhost:8000/api/v2/ydt/parser/knowledge-base | jq '{files: .documents.totalFiles, systems: .egyptian.fabricationKnowledge.systemPacks.systems | length}'
```

## Success Indicators

✅ **All Good:**
- Knowledge base file exists with > 100KB
- API returns 200 with full JSON
- Browser console shows "YDT Core Service initialized"
- YDT features work in UI
- No errors in console

❌ **Needs Attention:**
- 404 on knowledge base file
- 500 on API endpoint
- Console errors about YDT
- Features not appearing in UI
- Empty or missing data sections

---

**Last Updated:** 2025-01-XX
**Version:** 1.0.0

