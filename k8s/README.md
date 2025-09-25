# Kubernetes Deployment for Almona Industrial API

This directory contains Kubernetes manifests for deploying the Almona Industrial API with comprehensive monitoring, logging, and observability features.

## Prerequisites

- Kubernetes cluster (v1.21+)
- kubectl configured to access your cluster
- Docker registry access for the application image
- Prometheus and Grafana (optional, for monitoring)
- Jaeger (optional, for distributed tracing)

## Quick Start

1. **Create the namespace and basic resources:**
   ```bash
   kubectl apply -f namespace.yaml
   kubectl apply -f configmap.yaml
   kubectl apply -f secrets.yaml
   ```

2. **Deploy the application:**
   ```bash
   kubectl apply -f deployment.yaml
   kubectl apply -f service.yaml
   kubectl apply -f ingress.yaml
   ```

3. **Deploy monitoring stack (optional):**
   ```bash
   kubectl apply -f monitoring/
   ```

4. **Deploy autoscaling and policies:**
   ```bash
   kubectl apply -f hpa.yaml
   kubectl apply -f pod-disruption-budget.yaml
   kubectl apply -f network-policy.yaml
   ```

## Configuration

### Environment Variables

The application is configured through ConfigMap and Secrets:

- **ConfigMap**: Contains non-sensitive configuration
- **Secrets**: Contains sensitive data (API keys, database credentials)

### Monitoring Endpoints

- **Health Checks**: `/health`, `/health/live`, `/health/ready`
- **Metrics**: `/metrics` (Prometheus format)
- **JSON Metrics**: `/metrics/json` (Human-readable format)

### Observability Features

1. **Structured JSON Logging**: All logs are in JSON format with trace context
2. **Prometheus Metrics**: Comprehensive application and business metrics
3. **Distributed Tracing**: OpenTelemetry integration with Jaeger
4. **Health Checks**: Multi-level health checks for Kubernetes probes

## Monitoring Stack

### Prometheus Configuration

- Scrapes metrics from `/metrics` endpoint every 10 seconds
- Includes custom alerting rules for:
  - High error rates
  - Slow response times
  - Database connection issues
  - Resource usage alerts

### Grafana Dashboard

Pre-configured dashboard includes:
- Request rate and response time graphs
- Error rate monitoring
- Database performance metrics
- Business operation counters
- System resource usage

### Jaeger Tracing

- Collects distributed traces from the application
- Provides request flow visualization
- Helps with performance debugging

## Scaling and High Availability

### Horizontal Pod Autoscaler (HPA)

- Scales based on CPU (70%) and Memory (80%) usage
- Min replicas: 3, Max replicas: 10
- Gradual scaling policies to prevent thundering herd

### Pod Disruption Budget

- Ensures minimum 2 pods are always available during updates
- Prevents service disruption during maintenance

### Network Policies

- Restricts network access to necessary services only
- Allows ingress from nginx-ingress and monitoring namespaces
- Controls egress to external services

## Security Features

1. **Network Policies**: Restrict pod-to-pod communication
2. **Security Headers**: Added via middleware
3. **Rate Limiting**: Per-client rate limiting
4. **TLS Termination**: SSL/TLS at ingress level
5. **Secrets Management**: Sensitive data in Kubernetes secrets

## Health Checks

### Liveness Probe (`/health/live`)
- Checks critical system components only
- Used by Kubernetes to restart unhealthy pods
- Fails fast to enable quick recovery

### Readiness Probe (`/health/ready`)
- Comprehensive health check of all components
- Used by Kubernetes to route traffic
- Includes database, external services, and system resources

### Health Check Components

1. **Database**: Connection pool health, query performance
2. **External Services**: Supabase, SendGrid, Twilio connectivity
3. **System Resources**: Memory, CPU, disk usage
4. **Redis**: Cache connectivity (if configured)

## Deployment Strategies

### Rolling Updates
- Default Kubernetes rolling update strategy
- Zero-downtime deployments
- Configurable max unavailable and surge

### Blue-Green Deployment
- Can be implemented using multiple deployments
- Switch traffic using service selector changes
- Enables instant rollback capability

## Troubleshooting

### Common Issues

1. **Pod Crash Loops**: Check logs and health check endpoints
2. **High Memory Usage**: Monitor metrics and adjust resource limits
3. **Database Connection Issues**: Check connection pool configuration
4. **Slow Response Times**: Analyze traces and database query performance

### Debugging Commands

```bash
# Check pod status
kubectl get pods -n almona-industrial

# View logs
kubectl logs -f deployment/almona-api -n almona-industrial

# Check health status
kubectl port-forward svc/almona-api-service 8000:80 -n almona-industrial
curl http://localhost:8000/health

# View metrics
curl http://localhost:8000/metrics

# Check resource usage
kubectl top pods -n almona-industrial
```

## Production Considerations

1. **Resource Limits**: Set appropriate CPU and memory limits
2. **Monitoring**: Ensure Prometheus and Grafana are properly configured
3. **Logging**: Consider centralized logging solution (ELK stack)
4. **Backup**: Regular database backups and disaster recovery plan
5. **Security**: Regular security updates and vulnerability scanning
6. **Performance**: Load testing and performance optimization

## Environment-Specific Configurations

### Development
- Single replica
- Debug logging enabled
- Local Jaeger instance

### Staging
- 2-3 replicas
- Production-like configuration
- Full monitoring stack

### Production
- 3+ replicas with HPA
- Optimized resource limits
- Complete observability stack
- Network policies enabled
