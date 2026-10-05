# Analytics Queries Specification — Enterprise Analytics Data Access
Version: 1.0.0
Updated: 2026-01-07
Owners: FE Lead, BE Lead, QA Lead, Data Lead

Objective
Define comprehensive analytics query interfaces, expected response shapes, performance targets, export formats (PDF/Excel/CSV), and security considerations. Enables efficient data access for analytics dashboards and reports.

Non-Functional Requirements
- Performance: Dashboard queries < 1s with cached data; ad-hoc queries < 5s; exports < 30s.
- Scalability: Support millions of records; efficient aggregation; pagination for large result sets.
- Security: RBAC enforcement; tenant isolation; data privacy; audit logging.
- Reliability: Handle errors gracefully; validate queries; safe parameter binding.

Query Types

Time-Series Queries
- Revenue over time (daily/weekly/monthly)
- Project volume over time
- Waste percentage over time
- Production time trends
- Customer acquisition over time

Aggregation Queries
- Revenue by customer
- Revenue by region
- Projects by status
- Waste by material type
- Production time by project type

Comparison Queries
- Period-over-period comparisons
- Year-over-year comparisons
- Regional comparisons
- Customer segment comparisons

Segment Queries
- Customer segmentation
- Project segmentation
- Regional segmentation
- Time period segmentation

TypeScript Interface
```typescript
export interface AnalyticsQuery {
  type: QueryType;
  filters?: QueryFilters;
  groupBy?: GroupBy[];
  period?: QueryPeriod;
  dateRange?: DateRange;
  limit?: number;
  offset?: number;
  sort?: SortSpec;
}

export type QueryType =
  | 'revenue'
  | 'project_volume'
  | 'waste'
  | 'production_time'
  | 'customer'
  | 'custom';

export interface QueryFilters {
  customerIds?: string[];
  regionIds?: string[];
  projectTypes?: string[];
  statuses?: string[];
  dateRange?: DateRange;
  custom?: Record<string, any>;
}

export interface GroupBy {
  field: string;
  granularity?: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface QueryPeriod {
  start: string;  // ISO 8601
  end: string;  // ISO 8601
  granularity: 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface DateRange {
  from: string;  // ISO 8601
  to: string;  // ISO 8601
}

export interface SortSpec {
  field: string;
  direction: 'asc' | 'desc';
}

export interface AnalyticsQueryResponse {
  data: any[];
  metadata: QueryMetadata;
  performance: QueryPerformance;
}

export interface QueryMetadata {
  total: number;
  filtered: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface QueryPerformance {
  queryTime: number;  // milliseconds
  cacheHit: boolean;
  dataFreshness: string;  // ISO 8601 timestamp
}

export interface IAnalyticsQueryService {
  // Execute query
  query(query: AnalyticsQuery): Promise<AnalyticsQueryResponse>;

  // Export query results
  export(query: AnalyticsQuery, format: ExportFormat): Promise<Blob>;

  // Get available filters/groupBy options
  getAvailableFilters(): Promise<FilterOptions>;
  getAvailableGroupBy(): Promise<GroupByOption[]>;
}
```

Expected Response Shapes

Revenue Query Response
```typescript
interface RevenueQueryResponse {
  data: Array<{
    period: string;  // ISO 8601 or period label
    revenue: CurrencyAmount;
    count: number;  // project count
    average: CurrencyAmount;
  }>;
  summary: {
    total: CurrencyAmount;
    average: CurrencyAmount;
    growthRate: number;  // percentage
  };
  metadata: QueryMetadata;
}
```

Project Volume Query Response
```typescript
interface ProjectVolumeQueryResponse {
  data: Array<{
    period: string;
    count: number;
    active: number;
    completed: number;
  }>;
  summary: {
    total: number;
    active: number;
    completed: number;
    growthRate: number;  // percentage
  };
  metadata: QueryMetadata;
}
```

Waste Query Response
```typescript
interface WasteQueryResponse {
  data: Array<{
    period: string;
    percentage: number;
    cost: CurrencyAmount;
    material: string;  // material type
  }>;
  summary: {
    overallPercentage: number;
    totalCost: CurrencyAmount;
    target: number;  // target percentage
  };
  metadata: QueryMetadata;
}
```

Customer Query Response
```typescript
interface CustomerQueryResponse {
  data: Array<{
    customerId: string;
    customerName: string;
    projectCount: number;
    totalRevenue: CurrencyAmount;
    averageOrderValue: CurrencyAmount;
    lifetimeValue: CurrencyAmount;
    lastProjectDate: string;  // ISO 8601
  }>;
  summary: {
    totalCustomers: number;
    activeCustomers: number;
    totalRevenue: CurrencyAmount;
    averageLTV: CurrencyAmount;
  };
  metadata: QueryMetadata;
}
```

Performance Targets

Query Performance
- Cached queries: < 100ms
- Pre-aggregated queries: < 500ms
- Ad-hoc aggregation: < 2s
- Complex queries: < 5s
- Exports: < 30s (depends on size)

Cache Strategy
- Cache key: Query hash (filters + groupBy + period)
- Cache TTL: 1-5 minutes (real-time), 1 hour (batch)
- Cache invalidation: On data updates
- Cache storage: Redis or in-memory

Optimization
- Indexes: Proper database indexes
- Materialized views: Pre-calculated aggregations
- Query optimization: Efficient SQL/NoSQL queries
- Pagination: Limit result sets

Export Formats

PDF Export
- Format: PDF report with charts and tables
- Styling: Design tokens, branding
- Charts: Embedded charts (images or vector)
- Pagination: Automatic pagination
- File size: Optimized (< 10MB typical)

Excel Export
- Format: .xlsx (Excel 2007+)
- Sheets: Multiple sheets for different data
- Formatting: Cell formatting, colors, charts
- Formulas: Optional calculated fields
- File size: Optimized (< 50MB typical)

CSV Export
- Format: .csv (comma-separated values)
- Encoding: UTF-8 with BOM (for Excel compatibility)
- Headers: Include column headers
- Escaping: Proper escaping of special characters
- File size: Efficient (< 100MB typical)

Export Options
```typescript
export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  includeCharts?: boolean;
  includeMetadata?: boolean;
  filename?: string;
  template?: string;  // For PDF, use template
}
```

Security Considerations

RBAC (Role-Based Access Control)
- Query permissions: Users can only query data they have access to
- Export permissions: Export permission required
- Data filtering: Automatic tenant/user filtering
- Admin access: Admins can query all data

Data Privacy
- PII protection: Mask sensitive data (optional)
- Data anonymization: Anonymize data for exports (optional)
- Audit logging: Log all queries and exports
- Data retention: Respect data retention policies

Query Validation
- Parameter validation: Validate all query parameters
- SQL injection prevention: Use parameterized queries
- Rate limiting: Limit query frequency per user
- Resource limits: Limit query complexity and result size

Audit Logging
- Log all queries: Query type, filters, user, timestamp
- Log all exports: Export format, size, user, timestamp
- Log errors: Query errors and failures
- Retention: Retain logs for compliance

Implementation Notes

Query Execution
- Use query builder: Build queries programmatically
- Parameter binding: Use parameterized queries (security)
- Connection pooling: Efficient database connections
- Timeout handling: Set query timeouts

Caching
- Cache strategy: Multi-layer caching (memory + Redis)
- Cache keys: Include query hash and data version
- Cache invalidation: On data updates
- Cache warming: Pre-warm common queries

Export Generation
- Async exports: Use background jobs for large exports
- Progress tracking: Track export progress
- Streaming: Stream large exports (CSV)
- Compression: Compress large exports (optional)

Error Handling
- Validation errors: Return clear error messages
- Timeout errors: Handle query timeouts gracefully
- Resource errors: Handle resource exhaustion
- Network errors: Retry transient errors

Testing Requirements

Unit Tests
- Query building
- Parameter validation
- Response formatting
- Export generation

Integration Tests
- End-to-end queries
- Cache behavior
- Export functionality
- Performance benchmarks

Security Tests
- RBAC enforcement
- SQL injection prevention
- Data privacy
- Audit logging

Acceptance Criteria
- Queries execute within performance targets
- Response shapes match specifications
- Exports generate correctly
- Security requirements are met
- Performance targets are achieved consistently
