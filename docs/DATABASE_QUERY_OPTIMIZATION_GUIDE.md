# Database Query Optimization Guide

Complete guide for profiling and optimizing database queries in ALMONA.

**Status:** Production-Ready  
**Last Updated:** January 2026  
**Focus Areas:** Constraint validation, BOM generation, audit trail queries

---

## Overview

This guide covers database query profiling and optimization for:
- **Constraint validation lookups**: Material properties, machine specifications, certification rules
- **BOM generation queries**: Profile system data, hardware catalog, cost calculation
- **Audit trail queries**: Recent audit records, chain integrity verification, historical data

---

## 1. Query Profiling

### Using Query Profiler

The `QueryProfiler` class uses PostgreSQL `EXPLAIN ANALYZE` to provide detailed query execution plans.

**Basic Usage:**

```python
from core.query_profiler import QueryProfiler, profile_query

# Profile a single query
result = await profile_query(
    "SELECT * FROM fabricator_profiles WHERE user_id = :user_id",
    params={"user_id": "123e4567-e89b-12d3-a456-426614174000"}
)

print(f"Execution time: {result.execution_time_ms}ms")
print(f"Planning time: {result.planning_time_ms}ms")
print(f"Rows returned: {result.rows_returned}")
print(f"Indexes used: {result.indexes_used}")
print(f"Warnings: {result.warnings}")
print(f"Recommendations: {result.recommendations}")
```

**Using QueryProfiler Class:**

```python
from core.query_profiler import QueryProfiler
from core.database import AsyncSessionLocal

async with AsyncSessionLocal() as session:
    profiler = QueryProfiler(session)
    
    result = await profiler.profile_query(
        "SELECT * FROM material_properties WHERE material_type = :type",
        params={"type": "aluminum"},
        format="JSON"  # or "TEXT", "YAML"
    )
    
    # Access plan details
    if result.plan:
        print(f"Plan: {result.plan_json}")
```

**Comparing Multiple Queries:**

```python
profiler = QueryProfiler()

queries = [
    "SELECT * FROM profiles WHERE user_id = :user_id",
    "SELECT id, name FROM profiles WHERE user_id = :user_id"
]

results = await profiler.compare_queries(
    queries,
    params=[{"user_id": "123"}, {"user_id": "123"}]
)

for name, result in results.items():
    print(f"{name}: {result.execution_time_ms}ms")
```

### Understanding EXPLAIN ANALYZE Output

**Key Metrics:**

- **Planning Time**: Time spent planning the query
- **Execution Time**: Time spent executing the query
- **Total Cost**: Estimated cost (relative)
- **Actual Time**: Actual execution time
- **Rows**: Estimated/actual rows processed

**Plan Node Types:**

- **Seq Scan**: Sequential scan (usually slow) - needs index
- **Index Scan**: Index scan (usually fast) - good
- **Index Only Scan**: Index-only scan (very fast) - optimal
- **Hash Join**: Hash join - check join conditions
- **Nested Loop**: Nested loop join - may be slow for large datasets
- **Sort**: Sorting operation - consider index on ORDER BY columns

---

## 2. Slow Query Detection

### Using Slow Query Detector

The `SlowQueryDetector` uses `pg_stat_statements` extension to track query performance over time.

**Prerequisites:**

Enable `pg_stat_statements` extension (requires superuser):

```sql
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

**Basic Usage:**

```python
from core.slow_query_detector import SlowQueryDetector

detector = SlowQueryDetector(threshold_ms=1000.0)

# Get slow queries
slow_queries = await detector.get_slow_queries(
    limit=50,
    min_calls=10,
    threshold_ms=1000.0
)

for query in slow_queries:
    print(f"Query: {query.query[:100]}...")
    print(f"  Calls: {query.calls}")
    print(f"  Mean time: {query.mean_time_ms}ms")
    print(f"  Total time: {query.total_time_ms}ms")
```

**Generate Report:**

```python
report = await detector.generate_report(limit=50, min_calls=10)

print(f"Total slow queries: {report.slow_queries_count}")
print(f"Threshold: {report.threshold_ms}ms")
print(f"Recommendations: {report.recommendations}")

for query in report.queries:
    print(f"- {query.normalized_query[:80]}... ({query.mean_time_ms}ms avg)")
```

**Get Query Statistics:**

```python
# Get statistics for specific query ID
query_stats = await detector.get_query_statistics(queryid=12345)

if query_stats:
    print(f"Query: {query_stats.query}")
    print(f"Mean time: {query_stats.mean_time_ms}ms")
    print(f"Cache hit rate: {query_stats.shared_blks_hit / (query_stats.shared_blks_hit + query_stats.shared_blks_read) * 100}%")
```

### pg_stat_statements Configuration

**View Configuration:**

```sql
SELECT * FROM pg_stat_statements_info;
```

**Reset Statistics:**

```python
await detector.reset_statistics()  # Requires superuser
```

**Query pg_stat_statements Directly:**

```sql
SELECT 
    query,
    calls,
    mean_exec_time,
    total_exec_time,
    rows
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

---

## 3. Query Optimization

### Using Query Optimizer

The `QueryOptimizer` analyzes queries and provides optimization recommendations.

**Basic Usage:**

```python
from core.query_optimizer import QueryOptimizer
from core.query_profiler import QueryProfiler

# Profile query first
profiler = QueryProfiler()
profile_result = await profiler.profile_query(
    "SELECT * FROM fabricator_profiles WHERE user_id = :user_id AND material = :material"
)

# Optimize query
optimizer = QueryOptimizer()
report = await optimizer.optimize_query(
    "SELECT * FROM fabricator_profiles WHERE user_id = :user_id AND material = :material",
    profile_result=profile_result
)

print(f"Overall recommendation: {report.overall_recommendation}")

# Index recommendations
for idx_rec in report.index_recommendations:
    print(f"Index: {idx_rec.create_statement}")
    print(f"  Reason: {idx_rec.reason}")
    print(f"  Estimated improvement: {idx_rec.estimated_improvement}")

# Query optimizations
for opt in report.optimizations:
    print(f"Optimization type: {opt.optimization_type}")
    print(f"  Reason: {opt.reason}")
    print(f"  Changes: {opt.changes}")

# Caching recommendations
for cache_rec in report.caching_recommendations:
    print(f"Caching: {cache_rec}")
```

**Check Existing Indexes:**

```python
indexes = await optimizer.check_existing_indexes("fabricator_profiles")

for idx in indexes:
    print(f"Index: {idx['name']}")
    print(f"  Definition: {idx['definition']}")
```

---

## 4. Critical Query Patterns

### Constraint Validation Queries

**Material Properties Lookup:**

```python
# Profile material properties query
result = await profile_query(
    """
    SELECT * FROM material_properties
    WHERE material_type = :type AND region = :region
    """,
    params={"type": "aluminum", "region": "egypt"}
)

# Optimize if slow
if result.execution_time_ms > 100:
    optimizer = QueryOptimizer()
    report = await optimizer.optimize_query(
        "SELECT * FROM material_properties WHERE material_type = :type AND region = :region",
        profile_result=result
    )
```

**Recommended Index:**

```sql
CREATE INDEX idx_material_properties_type_region 
ON material_properties(material_type, region);
```

**Machine Specification Lookup:**

```python
result = await profile_query(
    """
    SELECT * FROM machine_specifications
    WHERE machine_type = :type AND capability = :capability
    """,
    params={"type": "cutting", "capability": "aluminum"}
)
```

**Recommended Index:**

```sql
CREATE INDEX idx_machine_specs_type_capability 
ON machine_specifications(machine_type, capability);
```

**Certification Rule Queries:**

```python
result = await profile_query(
    """
    SELECT * FROM certification_rules
    WHERE region = :region AND certification_type = :type
    ORDER BY priority DESC
    """,
    params={"region": "egypt", "type": "safety"}
)
```

**Recommended Index:**

```sql
CREATE INDEX idx_certification_rules_region_type_priority 
ON certification_rules(region, certification_type, priority DESC);
```

### BOM Generation Queries

**Profile System Data Lookup:**

```python
result = await profile_query(
    """
    SELECT * FROM profile_systems
    WHERE system_id = :system_id AND material = :material
    """,
    params={"system_id": "sys123", "material": "aluminum"}
)
```

**Hardware Catalog Queries:**

```python
result = await profile_query(
    """
    SELECT * FROM hardware_catalog
    WHERE hardware_type = :type AND compatible_materials @> ARRAY[:material]
    """,
    params={"type": "hinge", "material": "aluminum"}
)
```

**Recommended Index:**

```sql
CREATE INDEX idx_hardware_catalog_type_materials 
ON hardware_catalog(hardware_type) 
INCLUDE (compatible_materials);
```

**Cost Calculation Queries:**

```python
result = await profile_query(
    """
    SELECT price, currency FROM pricing_data
    WHERE material_type = :type AND region = :region
    ORDER BY effective_date DESC
    LIMIT 1
    """,
    params={"type": "aluminum", "region": "egypt"}
)
```

**Recommended Index:**

```sql
CREATE INDEX idx_pricing_data_type_region_date 
ON pricing_data(material_type, region, effective_date DESC);
```

### Audit Trail Queries

**Recent Audit Records:**

```python
result = await profile_query(
    """
    SELECT * FROM audit_log
    WHERE user_id = :user_id
    ORDER BY created_at DESC
    LIMIT 100
    """,
    params={"user_id": "123e4567-e89b-12d3-a456-426614174000"}
)
```

**Recommended Index:**

```sql
CREATE INDEX idx_audit_log_user_created 
ON audit_log(user_id, created_at DESC);
```

**Chain Integrity Verification:**

```python
result = await profile_query(
    """
    SELECT * FROM audit_chain
    WHERE anchor_id = :anchor_id
    ORDER BY chain_position
    """,
    params={"anchor_id": "anchor123"}
)
```

**Recommended Index:**

```sql
CREATE INDEX idx_audit_chain_anchor_position 
ON audit_chain(anchor_id, chain_position);
```

**Historical Data Queries:**

```python
result = await profile_query(
    """
    SELECT * FROM audit_log
    WHERE created_at >= :start_date AND created_at <= :end_date
    ORDER BY created_at DESC
    """,
    params={
        "start_date": "2025-01-01",
        "end_date": "2025-12-31"
    }
)
```

**Recommended Index:**

```sql
CREATE INDEX idx_audit_log_created 
ON audit_log(created_at DESC);
```

---

## 5. Index Optimization

### Index Types

**B-tree Index (Default):**
- Good for equality and range queries
- Most common index type
- Good for WHERE, ORDER BY, JOIN

```sql
CREATE INDEX idx_table_column ON table_name(column_name);
```

**GIN Index (Generalized Inverted Index):**
- Good for array, JSONB, full-text search
- Larger than B-tree but faster for complex queries

```sql
CREATE INDEX idx_table_array ON table_name USING GIN(array_column);
CREATE INDEX idx_table_jsonb ON table_name USING GIN(jsonb_column);
```

**GiST Index (Generalized Search Tree):**
- Good for geometric data, full-text search
- More flexible than GIN but may be slower

```sql
CREATE INDEX idx_table_geometry ON table_name USING GIST(geometry_column);
```

**Hash Index:**
- Good for equality queries only
- Faster than B-tree for simple equality
- Not usable for range queries or sorting

```sql
CREATE INDEX idx_table_column ON table_name USING HASH(column_name);
```

### Composite Indexes

**Order Matters:**

```sql
-- Good for: WHERE a = ? AND b = ? AND c = ?
-- Also good for: WHERE a = ? AND b = ?
-- Also good for: WHERE a = ?
CREATE INDEX idx_table_abc ON table_name(a, b, c);

-- NOT good for: WHERE b = ? (can't use index efficiently)
-- NOT good for: WHERE c = ? (can't use index efficiently)
```

**Covering Index (INCLUDE):**

```sql
-- Index-only scan - no table access needed
CREATE INDEX idx_table_covering 
ON table_name(a, b) 
INCLUDE (c, d);
```

### Index Maintenance

**Check Index Usage:**

```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

**Check Unused Indexes:**

```sql
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
    AND idx_scan = 0
    AND indexname NOT LIKE 'pg_toast%'
ORDER BY tablename, indexname;
```

**Rebuild Index:**

```sql
REINDEX INDEX CONCURRENTLY index_name;
```

**Analyze Table (Update Statistics):**

```sql
ANALYZE table_name;
```

---

## 6. Query Caching

### Application-Level Caching

**Redis Caching:**

```python
from core.cache import get_cache

cache = get_cache()

# Cache query result
cache_key = f"material_properties:{material_type}:{region}"
result = await cache.get(cache_key)

if not result:
    result = await execute_query(...)
    await cache.set(cache_key, result, ttl=300)  # 5 minutes
```

**Query Result Caching:**

```python
from functools import lru_cache
import asyncio

# Cache function results
@lru_cache(maxsize=100)
def get_material_properties(material_type: str, region: str):
    # Synchronous cache
    pass

# Async caching with TTL
async def get_cached_query_result(query_key: str, query_func, ttl: int = 300):
    cache = get_cache()
    result = await cache.get(query_key)
    
    if not result:
        result = await query_func()
        await cache.set(query_key, result, ttl=ttl)
    
    return result
```

### PostgreSQL Query Cache

PostgreSQL doesn't have a built-in query cache, but:

- **Shared buffers**: Caches frequently accessed pages
- **Plan cache**: Caches query plans (automatic)

**Check Cache Hit Rate:**

```sql
SELECT
    sum(heap_blks_read) as heap_read,
    sum(heap_blks_hit) as heap_hit,
    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio
FROM pg_statio_user_tables;
```

**Target:** Cache hit ratio should be > 95%

---

## 7. Connection Pool Monitoring

### Connection Pool Statistics

**Check Active Connections:**

```sql
SELECT
    count(*) as total_connections,
    count(*) FILTER (WHERE state = 'active') as active_queries,
    count(*) FILTER (WHERE state = 'idle') as idle_connections,
    count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
FROM pg_stat_activity
WHERE datname = current_database()
    AND pid != pg_backend_pid();
```

**Check Long-Running Queries:**

```sql
SELECT
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE state = 'active'
    AND now() - pg_stat_activity.query_start > interval '5 minutes'
ORDER BY duration DESC;
```

**Check Connection Pool Size:**

```python
from core.database import engine

# SQLAlchemy connection pool stats
pool = engine.pool
print(f"Pool size: {pool.size()}")
print(f"Checked out: {pool.checkedout()}")
print(f"Overflow: {pool.overflow()}")
print(f"Checked in: {pool.checkedin()}")
```

---

## 8. Optimization Checklist

### Query Optimization
- [ ] Profile queries with EXPLAIN ANALYZE
- [ ] Identify slow queries (>1000ms)
- [ ] Check for sequential scans
- [ ] Verify indexes are being used
- [ ] Optimize JOIN conditions
- [ ] Use specific columns (not SELECT *)
- [ ] Consider query caching

### Index Optimization
- [ ] Add indexes on WHERE clause columns
- [ ] Add indexes on JOIN columns
- [ ] Add indexes on ORDER BY columns
- [ ] Use composite indexes for multiple columns
- [ ] Remove unused indexes
- [ ] Consider covering indexes (INCLUDE)
- [ ] Analyze tables after index changes

### Connection Pool Optimization
- [ ] Monitor connection pool usage
- [ ] Adjust pool size based on load
- [ ] Monitor long-running queries
- [ ] Check for connection leaks
- [ ] Optimize query timeouts

### Caching Strategy
- [ ] Identify cacheable queries (read-only, frequent)
- [ ] Implement Redis caching for hot data
- [ ] Set appropriate TTLs
- [ ] Monitor cache hit rates
- [ ] Implement cache invalidation

---

## 9. Performance Targets

| Query Type | Target Time | Threshold |
|------------|-------------|-----------|
| Constraint validation | <50ms | <100ms |
| Material properties lookup | <20ms | <50ms |
| Machine specification lookup | <30ms | <100ms |
| Certification rule query | <40ms | <100ms |
| BOM generation | <500ms | <1000ms |
| Profile system lookup | <30ms | <100ms |
| Hardware catalog query | <50ms | <150ms |
| Cost calculation | <100ms | <200ms |
| Audit record lookup | <50ms | <150ms |
| Chain integrity verification | <100ms | <200ms |
| Historical data query | <200ms | <500ms |

---

## 10. Tools and Commands

### PostgreSQL Tools

**psql:**

```bash
# Connect to database
psql -h localhost -U postgres -d almona

# Enable query timing
\timing

# Explain query
EXPLAIN ANALYZE SELECT * FROM table_name;
```

**pg_stat_statements:**

```sql
-- View top queries
SELECT * FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Reset statistics
SELECT pg_stat_statements_reset();
```

### Python Tools

**Query Profiler:**

```bash
python -m core.query_profiler --query "SELECT * FROM table_name"
```

**Slow Query Detector:**

```bash
python -m core.slow_query_detector --threshold 1000 --limit 50
```

**Query Optimizer:**

```bash
python -m core.query_optimizer --query "SELECT * FROM table_name"
```

---

## References

- [PostgreSQL EXPLAIN Documentation](https://www.postgresql.org/docs/current/sql-explain.html)
- [pg_stat_statements Documentation](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [PostgreSQL Index Types](https://www.postgresql.org/docs/current/indexes-types.html)
- [Query Performance Optimization](https://www.postgresql.org/docs/current/performance-tips.html)
