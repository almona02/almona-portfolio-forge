# Phase 4 Reporting & Analytics - Next Steps

**Date:** January 2026  
**Status:** Foundation Complete - Ready for Backend Services

---

## Current Status

✅ **Foundation Complete:**
- Database migration (059_phase4_reporting_analytics.sql)
- Pydantic models (21 models in api_v2_models.py)
- Implementation plan documented

🚧 **Next: Backend Services Implementation**

---

## Implementation Order

### Step 1: Report Templates Service (Highest Priority)

**Files to Create:**
1. `python_backend/apis/v2/repositories/report_templates_repository.py`
2. `python_backend/apis/v2/services/report_template_service.py`
3. `python_backend/apis/v2/report_templates.py` (or add to existing if exists)

**Endpoints to Implement:**
- `GET /api/v2/report-templates` - List templates
- `GET /api/v2/report-templates/{templateId}` - Get template
- `POST /api/v2/report-templates` - Create template
- `PUT /api/v2/report-templates/{templateId}` - Update template
- `DELETE /api/v2/report-templates/{templateId}` - Delete template

**Pattern to Follow:**
- See `python_backend/apis/v2/repositories/project_templates.py` for repository pattern
- See `python_backend/apis/v2/services/project_template_service.py` for service pattern
- See `python_backend/apis/v2/project_templates.py` for router pattern

### Step 2: Report Generation Service

**Files to Create:**
1. `python_backend/apis/v2/services/report_generation_service.py`
2. Add endpoints to report templates router (or create separate router)

**Endpoints to Implement:**
- `POST /api/v2/reports/generate` - Generate report
- `GET /api/v2/reports/{reportId}` - Get report job status
- `GET /api/v2/reports/{reportId}/download` - Download generated report

**Implementation Notes:**
- Start with client-side PDF generation (pdf-lib)
- Server-side generation (headless Chrome) can be added later
- Use background jobs (Celery) for large reports

### Step 3: Analytics Metrics Service

**Files to Create:**
1. `python_backend/apis/v2/repositories/analytics_metrics_repository.py`
2. `python_backend/apis/v2/services/analytics_metrics_service.py`
3. `python_backend/apis/v2/analytics.py` (router)

**Endpoints to Implement:**
- `GET /api/v2/analytics/metrics` - Get analytics metrics

**Implementation Notes:**
- Use cache table for pre-calculated metrics
- Calculate on-demand for ad-hoc queries
- Support real-time, near-real-time, and batch metrics

### Step 4: Analytics Query Service

**Files to Create:**
1. `python_backend/apis/v2/services/analytics_query_service.py`
2. Add endpoints to analytics router

**Endpoints to Implement:**
- `POST /api/v2/analytics/queries` - Execute query
- `GET /api/v2/analytics/queries/{queryId}` - Get query result
- `GET /api/v2/analytics/queries/{queryId}/export` - Export query results

### Step 5: Router Registration

**File to Update:**
- `python_backend/apis/v2/routers/__init__.py`

**Actions:**
- Import report templates router
- Import analytics router
- Register routers with `router.include_router()`

### Step 6: Frontend Integration

**Files to Create:**
1. `src/services/reportTemplatesApi.ts`
2. `src/services/reportGenerationApi.ts`
3. `src/services/analyticsMetricsApi.ts`
4. `src/services/analyticsQueriesApi.ts`

**Pattern to Follow:**
- See `src/services/filterPresetsApi.ts` for API service pattern
- Use `getAuthToken()`, `getApiBase()`, `fetch()` API
- Error handling and response conversion

### Step 7: Frontend Components

**Components to Create/Update:**
1. ReportTemplateEditor (new)
2. ReportGenerator (new or update existing)
3. AnalyticsDashboard (update existing)
4. AnalyticsQueryBuilder (new)

**Integration Points:**
- CommercialPage (reporting tab)
- AdminDashboard (analytics section)

### Step 8: Testing

**Test Files to Create:**
1. Unit tests for repositories
2. Unit tests for services
3. Integration tests
4. Frontend API service tests

---

## Key Implementation Notes

### Repository Pattern
- Initialize with `supabase: Client`
- Methods return `Dict[str, Any]` (raw database rows)
- Handle RLS policies (user-scoped queries)
- Raise `RuntimeError` on failed operations

### Service Pattern
- Initialize with `supabase: Client`
- Call repository methods
- Transform data to Pydantic models
- Business logic and validation
- Return Pydantic models

### Router Pattern
- Use `APIRouter` with prefix and tags
- Dependency injection: `get_supabase`, `get_current_user`
- Error handling: `handle_supabase_error`
- Response models from `api_v2_models.py`
- Use `@router.get`, `@router.post`, etc.

### Error Handling
- Use `apis.v2.core.errors` utilities
- `handle_supabase_error()` for database errors
- `create_error_context()` for debugging
- Return appropriate HTTP status codes

---

## Estimated Effort

- **Report Templates Service:** ~4-6 hours (repository + service + router)
- **Report Generation Service:** ~6-8 hours (service + PDF generation)
- **Analytics Metrics Service:** ~6-8 hours (repository + service + router)
- **Analytics Query Service:** ~4-6 hours (service + endpoints)
- **Frontend Integration:** ~8-10 hours (API services + components)
- **Testing:** ~6-8 hours (unit + integration tests)

**Total:** ~34-46 hours of development time

---

## Quality Standards

- ✅ Follow Phase 3 patterns exactly
- ✅ Type safety (Pydantic models, TypeScript types)
- ✅ Error handling comprehensive
- ✅ RLS policies for security
- ✅ Performance optimization (indexes, caching)
- ✅ Documentation (docstrings, comments)
- ✅ Zero linting errors
- ✅ Zero syntax errors

---

**Last Updated:** January 2026  
**Next Action:** Begin Step 1 - Report Templates Repository
