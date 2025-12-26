# ✅ YDT Production Verification Checklist

Quick checklist to verify YDT is working in production.

## Pre-Deployment

- [ ] Knowledge base file exists: `src/lib/ydt/knowledge-base.json`
- [ ] File size > 50 KB (should be ~60-100 KB)
- [ ] Run parser: `npm run parse:documentation`
- [ ] Verify parser completed successfully

## Post-Deployment

### 1. Run Verification Script

```bash
npm run verify:ydt
```

**Expected Output:**
- ✅ Knowledge base file exists
- ✅ 100+ files parsed
- ✅ 10+ system packs
- ✅ Frontend integration points verified

### 2. Test API Endpoint

```bash
# Local
npm run verify:ydt:api

# Production (replace with your domain)
curl https://your-domain.com/api/v2/ydt/parser/knowledge-base | jq '.documents.totalFiles'
```

**Expected:**
- HTTP 200 response
- `totalFiles` > 100
- Contains `egyptian.fabricationKnowledge` section

### 3. Browser Console Check

Open production app and check console for:

```
✅ Loaded YDT knowledge base from API
✅ YDT Core Service initialized with knowledge base
```

**No errors should appear related to:**
- `DocumentationKnowledgeGraph`
- `YDTCoreService`
- `/api/v2/ydt/parser/knowledge-base`

### 4. UI Feature Check

**In FabricatorWorkflow:**
- [ ] Open a project
- [ ] YDT validation messages appear (if applicable)
- [ ] No console errors

**In Dashboard:**
- [ ] Morning Brief Widget appears
- [ ] Shows YDT insights/recommendations

### 5. Quick Production Test

```bash
# Replace with your production URL
./scripts/test_ydt_production.sh https://your-domain.com
```

## Expected Data Counts

After successful parsing:
- **Files parsed:** 100-700+ files
- **System Packs:** 100-200+ systems
- **Connection Angles:** 20-30+ angles
- **Cutting Rules:** 10-20+ rules
- **Workflows:** 3-10+ workflows
- **Components:** 5-10+ components

## Troubleshooting

### API Returns 404

1. Check backend is running
2. Verify route is registered: `/api/v2/ydt/parser/knowledge-base`
3. Check file path in `python_backend/apis/v2/ydt_parser.py`

### API Returns 500

1. Check backend logs
2. Verify knowledge base file exists at expected path
3. Check file permissions
4. Verify JSON is valid: `jq . src/lib/ydt/knowledge-base.json`

### Frontend Can't Load

1. Check browser console for errors
2. Verify API URL in network tab
3. Check CORS settings
4. Verify environment variables

### Features Not Appearing

1. Check YDTBusinessLayer is initialized
2. Verify console shows initialization messages
3. Check for errors in console
4. Verify knowledge base actually loaded

## Success Criteria

✅ **All Good:**
- Knowledge base file exists (>50 KB)
- API returns 200 with full JSON
- Browser console shows initialization messages
- No errors in console
- YDT features work in UI

❌ **Needs Fix:**
- 404 or 500 on API endpoint
- Console errors about YDT
- Features not appearing
- Empty or missing data

---

**Quick Commands:**

```bash
# Full verification
npm run verify:ydt && npm run verify:ydt:api

# Test production API
curl https://your-domain.com/api/v2/ydt/parser/knowledge-base | jq '{files: .documents.totalFiles, systems: .egyptian.fabricationKnowledge.systemPacks.systems | length}'

# Check knowledge base locally
node -e "const kb = require('./src/lib/ydt/knowledge-base.json'); console.log('Files:', kb.documents?.totalFiles, 'Systems:', kb.egyptian?.fabricationKnowledge?.systemPacks?.systems?.length);"
```

