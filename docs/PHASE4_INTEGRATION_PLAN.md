# Phase 4 Integration Plan

**Date:** January 2026  
**Status:** 📋 **INTEGRATION PLAN**  
**Approach:** Enhance existing pages with Phase 4 components

---

## Integration Strategy

### CommercialPage Enhancement

**Current State:**
- Reports tab shows `<ReportingDashboard />` component
- ReportingDashboard has multiple chart tabs (revenue, conversion, customer, etc.)

**Integration Plan:**
1. **Option A (Recommended):** Add new sub-tabs within the Reports tab
   - Keep existing ReportingDashboard for charts/visualizations
   - Add "Templates" sub-tab for ReportTemplateEditor and template management
   - Add "Generate" sub-tab for ReportGenerator
   - Add "Reports" sub-tab for generated reports list (future)

2. **Option B:** Enhance ReportingDashboard component
   - Add template management section
   - Add report generation section
   - Keep all in one component

**Recommendation:** Option A - Add sub-tabs for better organization and separation of concerns.

### AdminDashboard Integration

**Current State:**
- Has "analytics" navigation item that shows BusinessKPIDashboard
- Has "reports" navigation item that shows ReportsPanel

**Integration Plan:**
1. Enhance "analytics" tab:
   - Add AnalyticsDashboard component (metrics overview)
   - Add AnalyticsQueryBuilder component (query builder)
   - Keep or enhance BusinessKPIDashboard

2. Enhance "reports" tab:
   - Optionally add report templates management
   - Optionally add report generation

**Recommendation:** Enhance analytics tab with AnalyticsDashboard and AnalyticsQueryBuilder.

---

## Implementation Details

### CommercialPage - Reports Tab Enhancement

**Structure:**
```
Reports Tab
  ├── Tabs (sub-tabs)
  │   ├── Charts (existing ReportingDashboard)
  │   ├── Templates (new - ReportTemplateEditor + template list)
  │   └── Generate (new - ReportGenerator)
```

**Components to Add:**
- ReportTemplateEditor (for create/edit)
- Report template list component (to browse/select templates)
- ReportGenerator (for generating reports)

### AdminDashboard - Analytics Tab Enhancement

**Structure:**
```
Analytics Tab
  ├── AnalyticsDashboard (metrics overview)
  ├── AnalyticsQueryBuilder (query builder)
  └── BusinessKPIDashboard (existing, optional)
```

**Components to Add:**
- AnalyticsDashboard (metrics display)
- AnalyticsQueryBuilder (query builder)

---

## Next Steps

1. Analyze existing ReportingDashboard structure
2. Determine best integration approach (sub-tabs vs. enhancement)
3. Create enhanced Reports tab with sub-tabs
4. Integrate AnalyticsDashboard into AdminDashboard analytics tab
5. Integrate AnalyticsQueryBuilder into AdminDashboard analytics tab
6. Test integrations
7. Verify linting and errors

---

**Last Updated:** January 2026  
**Status:** Integration plan ready for execution
