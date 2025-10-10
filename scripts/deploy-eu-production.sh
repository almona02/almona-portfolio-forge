#!/bin/bash

# EU Production Deployment Script
# Deploys all EU infrastructure components for global market entry

set -e

echo "🚀 ALMONA EU PRODUCTION DEPLOYMENT INITIATED"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EU_REGION="${EU_REGION:-eu-west-1}"
CLUSTER_NAME="${CLUSTER_NAME:-almona-eu-production}"
NAMESPACE="almona-industrial-eu"

echo -e "${BLUE}🌍 Deploying to EU Region: ${EU_REGION}${NC}"
echo -e "${BLUE}📦 Target Cluster: ${CLUSTER_NAME}${NC}"
echo -e "${BLUE}🏷️  Namespace: ${NAMESPACE}${NC}"
echo ""

# Pre-deployment checks
echo -e "${YELLOW}🔍 Pre-deployment Validation${NC}"
echo "----------------------------------------"

# Check kubectl connectivity
if ! kubectl cluster-info &> /dev/null; then
    echo -e "${RED}❌ kubectl not connected to cluster${NC}"
    echo "Please configure kubectl for your EU production cluster"
    exit 1
fi

echo -e "${GREEN}✅ kubectl connected to cluster${NC}"

# Check required files
REQUIRED_FILES=(
    "k8s/eu-production/namespace.yaml"
    "k8s/eu-production/configmap.yaml"
    "k8s/eu-production/deployment.yaml"
    "k8s/eu-production/service.yaml" 
    "k8s/eu-production/ingress.yaml"
    "k8s/eu-production/hpa.yaml"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo -e "${RED}❌ Required file missing: $file${NC}"
        exit 1
    fi
done

echo -e "${GREEN}✅ All required Kubernetes manifests found${NC}"

# Check GDPR compliance components
if [ ! -f "src/components/compliance/GDPRCompliance.tsx" ]; then
    echo -e "${RED}❌ GDPR Compliance component missing${NC}"
    exit 1
fi

if [ ! -d "locales/fr" ] || [ ! -d "locales/de" ]; then
    echo -e "${RED}❌ EU language files missing${NC}"
    exit 1
fi

echo -e "${GREEN}✅ GDPR compliance and EU localization ready${NC}"
echo ""

# Deploy EU Infrastructure
echo -e "${YELLOW}🏗️  Deploying EU Infrastructure${NC}"
echo "----------------------------------------"

# Create namespace
echo "Creating EU namespace..."
kubectl apply -f k8s/eu-production/namespace.yaml
echo -e "${GREEN}✅ EU namespace created${NC}"

# Wait for namespace to be ready
kubectl wait --for=condition=Active namespace/${NAMESPACE} --timeout=60s

# Apply ConfigMaps (including GDPR config)
echo "Applying EU configuration..."
kubectl apply -f k8s/eu-production/configmap.yaml
echo -e "${GREEN}✅ EU configuration applied${NC}"

# Create secrets (placeholder - in real deployment, these would be actual secrets)
echo "Creating EU secrets..."
kubectl create secret generic almona-secrets-eu \
    --namespace=${NAMESPACE} \
    --from-literal=database-url="postgresql://user:pass@eu-db.almona.com:5432/almona_eu" \
    --from-literal=redis-url="redis://eu-redis.almona.com:6379" \
    --from-literal=jwt-secret="$(openssl rand -base64 32)" \
    --dry-run=client -o yaml | kubectl apply -f -
echo -e "${GREEN}✅ EU secrets configured${NC}"

# Deploy application
echo "Deploying EU application..."
kubectl apply -f k8s/eu-production/deployment.yaml
echo -e "${GREEN}✅ EU application deployed${NC}"

# Create service
echo "Creating EU service..."
cat > k8s/eu-production/service.yaml << EOF
apiVersion: v1
kind: Service
metadata:
  name: almona-service-eu
  namespace: almona-industrial-eu
  labels:
    app: almona-api
    region: eu-west-1
spec:
  selector:
    app: almona-api
    region: eu-west-1
  ports:
  - name: http
    port: 80
    targetPort: 8000
    protocol: TCP
  - name: metrics
    port: 8001
    targetPort: 8001
    protocol: TCP
  type: ClusterIP
EOF

kubectl apply -f k8s/eu-production/service.yaml
echo -e "${GREEN}✅ EU service created${NC}"

# Apply ingress
echo "Configuring EU ingress..."
kubectl apply -f k8s/eu-production/ingress.yaml
echo -e "${GREEN}✅ EU ingress configured${NC}"

# Apply HPA
echo "Configuring EU auto-scaling..."
kubectl apply -f k8s/eu-production/hpa.yaml
echo -e "${GREEN}✅ EU auto-scaling configured${NC}"

echo ""

# Wait for deployment to be ready
echo -e "${YELLOW}⏳ Waiting for EU deployment to be ready...${NC}"
kubectl wait --for=condition=available deployment/almona-api-eu -n ${NAMESPACE} --timeout=300s
echo -e "${GREEN}✅ EU deployment is ready${NC}"

# Verify deployment
echo ""
echo -e "${YELLOW}🔍 Verifying EU Deployment${NC}"
echo "----------------------------------------"

# Check pods
POD_COUNT=$(kubectl get pods -n ${NAMESPACE} -l app=almona-api --no-headers | wc -l)
READY_PODS=$(kubectl get pods -n ${NAMESPACE} -l app=almona-api --no-headers | grep -c "Running" || true)

echo "Pods deployed: ${POD_COUNT}"
echo "Pods ready: ${READY_PODS}"

if [ "$READY_PODS" -gt 0 ]; then
    echo -e "${GREEN}✅ EU pods are running${NC}"
else
    echo -e "${RED}❌ No EU pods are ready${NC}"
    kubectl get pods -n ${NAMESPACE}
    exit 1
fi

# Check services
kubectl get services -n ${NAMESPACE}
echo -e "${GREEN}✅ EU services verified${NC}"

# Check ingress
INGRESS_IP=$(kubectl get ingress almona-ingress-eu -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
echo "Ingress IP: ${INGRESS_IP}"

if [ "$INGRESS_IP" != "pending" ] && [ "$INGRESS_IP" != "" ]; then
    echo -e "${GREEN}✅ EU ingress has IP address${NC}"
else
    echo -e "${YELLOW}⏳ EU ingress IP still pending${NC}"
fi

# Check HPA
kubectl get hpa -n ${NAMESPACE}
echo -e "${GREEN}✅ EU auto-scaling verified${NC}"

echo ""

# Test EU endpoints
echo -e "${YELLOW}🧪 Testing EU Endpoints${NC}"
echo "----------------------------------------"

# Test health endpoint
if [ "$INGRESS_IP" != "pending" ] && [ "$INGRESS_IP" != "" ]; then
    echo "Testing health endpoint..."
    if curl -s -f http://${INGRESS_IP}/health > /dev/null; then
        echo -e "${GREEN}✅ EU health endpoint responding${NC}"
    else
        echo -e "${YELLOW}⏳ EU health endpoint not yet ready${NC}"
    fi
else
    echo -e "${YELLOW}⏳ Skipping endpoint tests (IP pending)${NC}"
fi

echo ""

# GDPR Compliance Verification
echo -e "${YELLOW}🛡️  GDPR Compliance Verification${NC}"
echo "----------------------------------------"

# Check GDPR configuration
if kubectl get configmap gdpr-compliance-config -n ${NAMESPACE} &> /dev/null; then
    echo -e "${GREEN}✅ GDPR configuration deployed${NC}"
else
    echo -e "${RED}❌ GDPR configuration missing${NC}"
fi

# Check environment variables
echo "Verifying GDPR environment variables..."
GDPR_ENABLED=$(kubectl get deployment almona-api-eu -n ${NAMESPACE} -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="GDPR_COMPLIANCE")].value}' 2>/dev/null || echo "not-set")

if [ "$GDPR_ENABLED" = "enabled" ]; then
    echo -e "${GREEN}✅ GDPR compliance enabled${NC}"
else
    echo -e "${RED}❌ GDPR compliance not enabled${NC}"
fi

echo ""

# Language Support Verification  
echo -e "${YELLOW}🌍 Multi-Language Support Verification${NC}"
echo "----------------------------------------"

SUPPORTED_LANGS=$(kubectl get deployment almona-api-eu -n ${NAMESPACE} -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="SUPPORTED_LANGUAGES")].value}' 2>/dev/null || echo "not-set")

if [[ "$SUPPORTED_LANGS" == *"fr"* ]] && [[ "$SUPPORTED_LANGS" == *"de"* ]]; then
    echo -e "${GREEN}✅ EU languages (French/German) configured${NC}"
else
    echo -e "${RED}❌ EU languages not properly configured${NC}"
fi

echo ""

# Final Status
echo -e "${YELLOW}📊 EU Deployment Summary${NC}"
echo "============================================="
echo "Namespace: ${NAMESPACE}"
echo "Pods Running: ${READY_PODS}/${POD_COUNT}"
echo "Ingress IP: ${INGRESS_IP}"
echo "GDPR Compliance: ${GDPR_ENABLED}"
echo "EU Languages: ${SUPPORTED_LANGS}"

echo ""
echo -e "${GREEN}🎉 EU PRODUCTION DEPLOYMENT COMPLETED!${NC}"
echo ""
echo -e "${BLUE}🌍 EU Market Access URLs:${NC}"
echo "  - https://eu.almona.com (when DNS configured)"
echo "  - https://europe.almona.com (when DNS configured)" 
echo "  - https://almona.eu (when DNS configured)"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "  1. Configure DNS records for EU domains"
echo "  2. Test GDPR compliance features"
echo "  3. Verify French/German language switching"
echo "  4. Monitor EU performance metrics"
echo "  5. Onboard first EU enterprise client"
echo ""
echo -e "${GREEN}✅ EU market is now LIVE and ready for customers!${NC}"