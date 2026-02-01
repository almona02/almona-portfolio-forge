# Analytics Metrics Specification — Enterprise KPI Definitions
Version: 1.0.0
Updated: 2026-01-07
Owners: FE Lead, BE Lead, QA Lead, Data Lead

Objective
Define comprehensive analytics metrics and KPIs for the ALMONA platform, including project volume, revenue, waste percentage, production time, customer segments, and other business-critical metrics. Specify data contracts, units, rounding rules, and freshness SLAs.

Non-Functional Requirements
- Accuracy: Metrics calculations must be accurate and consistent
- Performance: Metrics must be calculated efficiently (cached/pre-aggregated)
- Freshness: Real-time metrics (< 1min), near-real-time (< 5min), batch metrics (hourly/daily)
- Scalability: Support millions of records; efficient aggregation queries
- Reliability: Handle missing data gracefully; validate data quality

Metric Categories

Project Volume Metrics
- Total Projects: Count of all projects
- Active Projects: Count of projects with status "active"
- Completed Projects: Count of projects with status "completed"
- Projects by Period: Count grouped by time period (daily/weekly/monthly)
- Projects by Region: Count grouped by region (Egypt, Turkey, GCC)
- Projects by Customer: Count grouped by customer
- Project Growth Rate: Percentage change in project count (period over period)

Revenue Metrics
- Total Revenue: Sum of all invoice amounts (currency)
- Revenue by Period: Revenue grouped by time period (daily/weekly/monthly)
- Revenue by Customer: Revenue grouped by customer
- Revenue by Region: Revenue grouped by region
- Average Revenue per Project: Total revenue / project count
- Revenue Growth Rate: Percentage change in revenue (period over period)
- Revenue Forecast: Projected revenue based on pipeline

Waste Percentage Metrics
- Material Waste %: (Waste material / Total material) * 100
- Waste by Material Type: Waste percentage by material (aluminum, uPVC, glass)
- Waste by Project: Waste percentage per project
- Waste by Period: Waste percentage grouped by time period
- Waste Reduction Target: Target waste percentage (e.g., < 5%)
- Waste Cost: Cost of wasted material (currency)

Production Time Metrics
- Average Production Time: Average time from start to completion (hours/days)
- Production Time by Project Type: Average production time by project type
- Production Time by Region: Average production time by region
- On-Time Delivery Rate: Percentage of projects delivered on time
- Production Efficiency: (Planned time / Actual time) * 100
- Bottleneck Analysis: Identify slowest production stages

Customer Segment Metrics
- Customer Count: Total number of customers
- Active Customers: Customers with projects in last 30/60/90 days
- Customer Lifetime Value (LTV): Total revenue from customer
- Average Order Value (AOV): Average project value per customer
- Customer Acquisition Cost (CAC): Cost to acquire new customer
- Customer Retention Rate: Percentage of customers with repeat projects
- Customer Segmentation: Group by value, frequency, recency

TypeScript Interface
```typescript
export interface AnalyticsMetrics {
  projectVolume: ProjectVolumeMetrics;
  revenue: RevenueMetrics;
  waste: WasteMetrics;
  productionTime: ProductionTimeMetrics;
  customer: CustomerMetrics;
  timestamp: string;  // ISO 8601
  period: MetricPeriod;
}

export interface ProjectVolumeMetrics {
  total: number;
  active: number;
  completed: number;
  byPeriod: PeriodMetrics<number>;
  byRegion: Record<string, number>;
  byCustomer: Record<string, number>;
  growthRate: number;  // percentage
}

export interface RevenueMetrics {
  total: CurrencyAmount;
  byPeriod: PeriodMetrics<CurrencyAmount>;
  byCustomer: Record<string, CurrencyAmount>;
  byRegion: Record<string, CurrencyAmount>;
  averagePerProject: CurrencyAmount;
  growthRate: number;  // percentage
  forecast?: CurrencyAmount;
}

export interface WasteMetrics {
  overallPercentage: number;  // 0-100
  byMaterialType: Record<string, number>;  // percentage
  byProject: Record<string, number>;  // percentage
  byPeriod: PeriodMetrics<number>;  // percentage
  target: number;  // target percentage
  cost: CurrencyAmount;
}

export interface ProductionTimeMetrics {
  average: number;  // hours
  byProjectType: Record<string, number>;  // hours
  byRegion: Record<string, number>;  // hours
  onTimeDeliveryRate: number;  // percentage
  efficiency: number;  // percentage
  bottlenecks: Bottleneck[];
}

export interface CustomerMetrics {
  totalCount: number;
  activeCount: number;  // last 30/60/90 days
  lifetimeValue: Record<string, CurrencyAmount>;  // by customer
  averageOrderValue: CurrencyAmount;
  acquisitionCost?: CurrencyAmount;
  retentionRate: number;  // percentage
  segments: CustomerSegment[];
}

export interface CurrencyAmount {
  value: number;
  currency: string;  // ISO 4217 code (USD, EGP, etc.)
  formatted?: string;  // formatted string (e.g., "$1,234.56")
}

export interface PeriodMetrics<T> {
  daily?: T[];
  weekly?: T[];
  monthly?: T[];
}

export interface Bottleneck {
  stage: string;
  averageTime: number;  // hours
  impact: number;  // percentage of total time
}

export interface CustomerSegment {
  name: string;
  criteria: string;
  count: number;
  totalValue: CurrencyAmount;
}

export type MetricPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
```

Data Contracts

Units
- Currency: ISO 4217 codes (USD, EGP, TRY, etc.)
- Time: Hours (decimal) or days (decimal)
- Percentage: 0-100 (decimal, 2 decimal places)
- Count: Integer
- Weight: Kilograms (kg) or metric tons
- Length: Meters (m) or millimeters (mm)

Rounding Rules
- Currency: Round to 2 decimal places (0.01)
- Percentage: Round to 2 decimal places (0.01%)
- Time: Round to 1 decimal place (0.1 hours)
- Count: No rounding (integer)
- Rates: Round to 2 decimal places (e.g., growth rate)

Data Quality
- Missing Data: Handle gracefully (null, 0, or estimated)
- Invalid Data: Validate and filter invalid records
- Data Consistency: Ensure calculations are consistent
- Data Freshness: Track data age and staleness

Freshness SLAs

Real-Time Metrics (< 1 minute)
- Active project count
- Current period revenue (today)
- Recent project status changes

Near-Real-Time Metrics (< 5 minutes)
- Daily revenue totals
- Active customer count
- Recent production completions

Batch Metrics (Hourly)
- Hourly project volume
- Hourly revenue totals
- Production time averages

Batch Metrics (Daily)
- Daily aggregates (volume, revenue, waste)
- Customer metrics (LTV, retention)
- Regional breakdowns

Batch Metrics (Weekly/Monthly)
- Weekly/monthly summaries
- Growth rates
- Forecasts and projections

Implementation Notes

Calculation Strategy
- Pre-aggregate: Calculate metrics in advance (batch jobs)
- Cache: Cache calculated metrics (Redis, in-memory)
- Incremental: Update metrics incrementally when possible
- Lazy: Calculate on-demand for ad-hoc queries

Data Sources
- Projects: Projects table
- Revenue: Invoices/payments table
- Waste: Production/cutting data
- Production Time: Project timelines
- Customers: Customers table + project relationships

Performance Optimization
- Indexes: Proper database indexes for aggregation queries
- Materialized Views: Pre-calculated views for common metrics
- Partitioning: Partition tables by date for efficient queries
- Caching: Cache metrics with appropriate TTL

Validation
- Data validation: Validate input data before calculation
- Calculation validation: Verify calculation logic
- Cross-validation: Compare metrics from different sources
- Audit: Log metric calculations for debugging

Testing Requirements

Unit Tests
- Metric calculations
- Rounding rules
- Data formatting
- Currency conversion

Integration Tests
- End-to-end metric calculation
- Data aggregation
- Cache behavior
- Performance benchmarks

Data Quality Tests
- Missing data handling
- Invalid data filtering
- Data consistency checks
- Freshness validation

Acceptance Criteria
- All metrics calculate accurately
- Units and rounding are consistent
- Data contracts are followed
- Freshness SLAs are met
- Performance targets are achieved
- Data quality is maintained
