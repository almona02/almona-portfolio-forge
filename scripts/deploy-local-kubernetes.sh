#!/bin/bash

# Local Kubernetes Deployment Script
# Deploy Almona Global Platform to Docker Desktop Kubernetes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 ALMONA LOCAL KUBERNETES DEPLOYMENT${NC}"
echo "============================================="
echo ""

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Check if Kubernetes is enabled in Docker Desktop
if ! docker container ls --filter "name=k8s_" --quiet | head -1 &> /dev/null; then
    echo -e "${YELLOW}⚠️  Kubernetes doesn't seem to be enabled in Docker Desktop${NC}"
    echo "Please enable Kubernetes in Docker Desktop:"
    echo "1. Open Docker Desktop"
    echo "2. Go to Settings → Kubernetes"  
    echo "3. Check 'Enable Kubernetes'"
    echo "4. Click 'Apply & Restart'"
    echo ""
    echo "Continuing with Docker Compose deployment instead..."
    
    # Use Docker Compose as fallback
    deploy_with_docker_compose
    exit 0
fi

echo -e "${GREEN}✅ Kubernetes is enabled in Docker Desktop${NC}"

# Use docker desktop context for kubectl
export KUBECONFIG="$HOME/.kube/config"

# Function to check kubectl via Docker Desktop
check_kubectl() {
    # Try different ways to access kubectl
    if command -v kubectl &> /dev/null; then
        echo -e "${GREEN}✅ kubectl found in PATH${NC}"
        return 0
    elif docker run --rm -v ~/.kube:/root/.kube -v $(pwd):/workspace -w /workspace bitnami/kubectl:latest version --client &> /dev/null; then
        echo -e "${GREEN}✅ kubectl available via Docker${NC}"
        KUBECTL_CMD="docker run --rm -v ~/.kube:/root/.kube -v $(pwd):/workspace -w /workspace bitnami/kubectl:latest"
        return 0
    else
        echo -e "${YELLOW}⚠️  kubectl not found, using Docker Desktop Kubernetes API${NC}"
        return 1
    fi
}

# Function to deploy using Docker Compose (fallback)
deploy_with_docker_compose() {
    echo -e "${YELLOW}🐳 Deploying with Docker Compose (Local Mode)${NC}"
    echo "----------------------------------------"
    
    # Create simplified docker-compose for local testing
    cat > docker-compose.local.yml << 'EOF'
version: '3.8'
services:
  almona-frontend:
    build: 
      context: .
      dockerfile: Dockerfile.local
    ports:
      - "3000:3000"
      - "3001:3001"  # For development server
    environment:
      - NODE_ENV=development
      - VITE_SUPABASE_URL=${VITE_SUPABASE_URL:-http://localhost:8000}
      - VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY:-your-anon-key}
      - GDPR_COMPLIANCE=enabled
      - SUPPORTED_LANGUAGES=en,fr,de,ar,tr
      - REGION=local
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev -- --host 0.0.0.0

  almona-backend:
    build:
      context: python_backend
      dockerfile: Dockerfile.prod
    ports:
      - "8000:8000"
    environment:
      - REGION=local
      - GDPR_COMPLIANCE=enabled
      - SUPPORTED_LANGUAGES=en,fr,de,ar,tr
    volumes:
      - ./python_backend:/app
    depends_on:
      - redis

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  redis_data:
EOF

    # Create local Dockerfile for frontend
    cat > Dockerfile.local << 'EOF'
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml ./

# Install dependencies
RUN npm install -g pnpm && pnpm install

# Copy source
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["pnpm", "dev", "--host", "0.0.0.0"]
EOF

    echo "Starting local deployment..."
    docker-compose -f docker-compose.local.yml up -d
    
    echo -e "${GREEN}✅ Local deployment started!${NC}"
    echo ""
    echo -e "${BLUE}🌍 Access your Global Platform:${NC}"
    echo "  Frontend: http://localhost:3000"
    echo "  Backend API: http://localhost:8000"
    echo "  Admin Dashboard: http://localhost:3000/admin/dashboard"
    echo ""
    echo -e "${BLUE}🎯 Test Your Global Features:${NC}"
    echo "  1. Navigate to Admin Dashboard"
    echo "  2. Click 'Business KPI' tab"
    echo "  3. Test language switching (English/French/German/Arabic/Turkish)"
    echo "  4. Try GDPR compliance features"
    echo "  5. Explore Enterprise Portal and Partner Onboarding"
    echo ""
    echo -e "${GREEN}🎉 Your Global Empire is LIVE locally!${NC}"
}

# Try to deploy to Kubernetes first
if check_kubectl; then
    echo "Deploying to local Kubernetes cluster..."
    
    # Modified deployment for local cluster (no external domains)
    deploy_to_local_k8s
else
    echo "Using Docker Compose for local deployment..."
    deploy_with_docker_compose
fi

# Function to deploy to local Kubernetes
deploy_to_local_k8s() {
    NAMESPACE="almona-local"
    
    echo -e "${YELLOW}🏗️  Local Kubernetes Deployment${NC}"
    echo "----------------------------------------"
    
    # Create namespace
    ${KUBECTL_CMD:-kubectl} apply -f - << EOF
apiVersion: v1
kind: Namespace
metadata:
  name: ${NAMESPACE}
  labels:
    name: ${NAMESPACE}
    environment: local
    testing: enabled
EOF
    
    echo -e "${GREEN}✅ Local namespace created${NC}"
    
    # Deploy application
    ${KUBECTL_CMD:-kubectl} apply -f - << EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: almona-local
  namespace: ${NAMESPACE}
spec:
  replicas: 1
  selector:
    matchLabels:
      app: almona-local
  template:
    metadata:
      labels:
        app: almona-local
    spec:
      containers:
      - name: almona-frontend
        image: node:20-alpine
        command: ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "development"
        - name: REGION
          value: "local"
        - name: GDPR_COMPLIANCE
          value: "enabled"
        - name: SUPPORTED_LANGUAGES
          value: "en,fr,de,ar,tr"
        workingDir: /app
        volumeMounts:
        - name: app-source
          mountPath: /app
      volumes:
      - name: app-source
        hostPath:
          path: $(pwd)
          type: Directory
---
apiVersion: v1
kind: Service
metadata:
  name: almona-local-service
  namespace: ${NAMESPACE}
spec:
  selector:
    app: almona-local
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
EOF

    echo -e "${GREEN}✅ Local deployment created${NC}"
    
    # Wait for deployment
    echo "Waiting for deployment to be ready..."
    ${KUBECTL_CMD:-kubectl} wait --for=condition=available deployment/almona-local -n ${NAMESPACE} --timeout=300s
    
    # Get access URL
    SERVICE_URL=$(${KUBECTL_CMD:-kubectl} get service almona-local-service -n ${NAMESPACE} -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "localhost")
    
    echo ""
    echo -e "${GREEN}🎉 LOCAL KUBERNETES DEPLOYMENT COMPLETED!${NC}"
    echo ""
    echo -e "${BLUE}🌍 Access Your Global Platform:${NC}"
    echo "  URL: http://localhost:3000 (or check Docker Desktop)"
    echo "  Admin: http://localhost:3000/admin/dashboard"
    echo ""
    echo -e "${BLUE}🎯 Test Your Global Features:${NC}"
    echo "  1. Business KPI Dashboard"
    echo "  2. GDPR Compliance"
    echo "  3. Multi-language support (FR/DE)"
    echo "  4. Enterprise Portal"
    echo "  5. Partner Ecosystem"
    echo "  6. AI Sales Acceleration"
}
