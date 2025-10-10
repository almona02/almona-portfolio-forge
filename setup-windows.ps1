# Almona EU Deployment - Windows Setup Script
# This script creates all necessary files for EU production deployment

Write-Host "🚀 Setting up Almona EU Production Deployment on Windows..." -ForegroundColor Green
Write-Host ""

# Check if Docker Desktop is running
Write-Host "🔍 Checking Docker Desktop..." -ForegroundColor Yellow
docker version > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker Desktop not found! Please install and start Docker Desktop." -ForegroundColor Red
    Write-Host "Download from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Check if Kubernetes is enabled
Write-Host "🔍 Checking Kubernetes..." -ForegroundColor Yellow
kubectl version --client > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ kubectl not found! Please enable Kubernetes in Docker Desktop." -ForegroundColor Red
    Write-Host "Docker Desktop -> Settings -> Kubernetes -> Enable Kubernetes" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Docker Desktop and Kubernetes detected!" -ForegroundColor Green
Write-Host ""

# Create directory structure
Write-Host "📁 Creating directory structure..." -ForegroundColor Yellow
$directories = @(
    "k8s\eu-production",
    "src\components\compliance", 
    "locales\fr",
    "locales\de",
    "python_backend"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  ✅ Created $dir" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "📝 Creating Kubernetes manifests..." -ForegroundColor Yellow

# Create all the Kubernetes YAML files
Write-Host "  📦 Creating namespace.yaml..." -ForegroundColor Cyan
@"
apiVersion: v1
kind: Namespace
metadata:
  name: almona-industrial-eu
  labels:
    name: almona-industrial-eu
    environment: eu-production
    region: eu-west-1
    compliance: gdpr-enabled
"@ | Out-File -FilePath "k8s\eu-production\namespace.yaml" -Encoding UTF8

Write-Host "  📋 Creating configmap.yaml..." -ForegroundColor Cyan
@"
apiVersion: v1
kind: ConfigMap
metadata:
  name: almona-config
  namespace: almona-industrial-eu
data:
  ENVIRONMENT: "eu-production"
  REGION: "eu-west-1"
  LOG_LEVEL: "INFO"
  GDPR_COMPLIANCE: "enabled"
  SUPPORTED_LANGUAGES: "en,fr,de,ar,tr"
  SECURITY_HEADERS_ENABLED: "true"
"@ | Out-File -FilePath "k8s\eu-production\configmap.yaml" -Encoding UTF8

Write-Host "  🚀 Creating deployment.yaml..." -ForegroundColor Cyan
@"
apiVersion: apps/v1
kind: Deployment
metadata:
  name: almona-api
  namespace: almona-industrial-eu
  labels:
    app: almona-api
    version: v2.0.0
    region: eu-west-1
spec:
  replicas: 2
  selector:
    matchLabels:
      app: almona-api
  template:
    metadata:
      labels:
        app: almona-api
        version: v2.0.0
    spec:
      containers:
      - name: almona-api
        image: nginx:latest
        ports:
        - containerPort: 80
          name: http
        env:
        - name: REGION
          value: "eu-west-1"
        - name: GDPR_COMPLIANCE
          value: "enabled"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
"@ | Out-File -FilePath "k8s\eu-production\deployment.yaml" -Encoding UTF8

Write-Host "  🌐 Creating service.yaml..." -ForegroundColor Cyan
@"
apiVersion: v1
kind: Service
metadata:
  name: almona-api-service
  namespace: almona-industrial-eu
  labels:
    app: almona-api
spec:
  selector:
    app: almona-api
  ports:
  - name: http
    port: 80
    targetPort: 80
    protocol: TCP
  type: ClusterIP
"@ | Out-File -FilePath "k8s\eu-production\service.yaml" -Encoding UTF8

Write-Host "  🔄 Creating hpa.yaml..." -ForegroundColor Cyan
@"
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: almona-api-hpa
  namespace: almona-industrial-eu
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: almona-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
"@ | Out-File -FilePath "k8s\eu-production\hpa.yaml" -Encoding UTF8

Write-Host "  🌍 Creating ingress.yaml..." -ForegroundColor Cyan
@"
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: almona-api-ingress
  namespace: almona-industrial-eu
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
spec:
  rules:
  - host: localhost
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: almona-api-service
            port:
              number: 80
"@ | Out-File -FilePath "k8s\eu-production\ingress.yaml" -Encoding UTF8

Write-Host ""
Write-Host "🎉 Setup Complete!" -ForegroundColor Green -BackgroundColor Black
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Run the deployment:" -ForegroundColor White
Write-Host "   .\deploy-eu-local.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Or deploy manually:" -ForegroundColor White
Write-Host "   kubectl config use-context docker-desktop" -ForegroundColor Gray
Write-Host "   kubectl apply -f k8s\eu-production\" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Access your application:" -ForegroundColor White
Write-Host "   kubectl port-forward -n almona-industrial-eu service/almona-api-service 8080:80" -ForegroundColor Gray
Write-Host "   Then visit: http://localhost:8080" -ForegroundColor Cyan
Write-Host ""

$response = Read-Host "Would you like to run the deployment now? (y/N)"
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host ""
    Write-Host "🚀 Starting deployment..." -ForegroundColor Green
    & ".\deploy-eu-local.ps1"
}
Write-Host "Ready to deploy your EU Production platform!" -ForegroundColor Green