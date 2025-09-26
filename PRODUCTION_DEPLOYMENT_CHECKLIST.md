Production Deployment Checklist

Use this checklist to validate readiness before pushing to production.

### 1) Pre-Deployment
- [ ] Environment variables configured (API keys, SUPABASE_URL, SUPABASE_SERVICE_KEY, REDIS_URL, JAEGER_ENDPOINT)
- [ ] Secrets loaded into Kubernetes `secrets.yaml`
- [ ] Resource requests/limits set in `k8s/deployment.yaml`
- [ ] HPA enabled and thresholds tuned in `k8s/hpa.yaml`
- [ ] Network policies validated in `k8s/network-policy.yaml`
- [ ] TLS/Ingress configured in `k8s/ingress.yaml`

### 2) Application Health & Monitoring
- [ ] `/health`, `/health/live`, `/health/ready` return expected status
- [ ] `/metrics` and `/metrics/json` emit valid data
- [ ] `/connection-pool/stats|health|metrics|validate` return expected payloads
- [ ] Celery monitoring endpoints (status, tasks, workers) reachable
- [ ] Prometheus scraping configured; Grafana dashboards installed
- [ ] Jaeger traces present for API requests and DB calls

### 3) Background Processing
- [ ] Redis reachable from workers and API pods
- [ ] Celery workers started with correct queues (quotes, notifications, reports, heavy_processing)
- [ ] Heavy tasks (quote calc, report generation) execute within limits
- [ ] Task retention/expiry configured and cleanup tasks scheduled

### 4) Database & Connection Pooling
- [ ] Connection pool healthy under load; error_rate < 5%
- [ ] Slow query threshold tuned; alerts configured
- [ ] Query timeout set appropriately for workload
- [ ] Read-only vs high-performance dependencies validated

### 5) Security & Compliance
- [ ] Rate limiting enabled and thresholds verified
- [ ] Auth flows validated (token issuance/refresh/expiry)
- [ ] Security headers present; CORS configured appropriately
- [ ] Secrets rotation plan documented

### 6) SDKs & Documentation
- [ ] TypeScript SDK sample runs against staging
- [ ] Python SDK sample runs against staging
- [ ] OpenAPI docs accurate and accessible
- [ ] Onboarding docs updated with examples and troubleshooting

### 7) Testing
- [ ] All unit and integration tests pass locally and in CI
- [ ] End-to-end tests pass against staging
- [ ] Load test targets met (baseline and peak scenarios)

### 8) Operations
- [ ] Alerting rules configured (latency, error rate, worker failures)
- [ ] Runbooks created for common incidents
- [ ] Dashboards linked and shared with the team
- [ ] Backup/restore procedures validated

Sign-off:

- [ ] Engineering Lead
- [ ] SRE/DevOps
- [ ] Product Owner


