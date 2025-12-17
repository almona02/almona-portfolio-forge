#!/bin/bash
# Test TensorFlow versions to find smallest size
# This helps identify the optimal TF version for backend

set -e

echo "🧪 Testing TensorFlow Versions for Size Optimization"
echo "====================================================="
echo ""

VERSIONS=("2.15.0" "2.16.1" "2.17.1")

for version in "${VERSIONS[@]}"; do
    echo "📦 Testing TensorFlow-CPU $version..."
    
    # Create temporary Dockerfile
    cat > /tmp/Dockerfile.tf-test-$version << EOF
FROM python:3.11-slim
RUN pip install --no-cache-dir tensorflow-cpu==$version && \
    python -c "import tensorflow as tf; print('TF version:', tf.__version__)" && \
    rm -rf /root/.cache/pip
EOF
    
    # Build test image
    docker build -f /tmp/Dockerfile.tf-test-$version -t tf-test-$version . > /dev/null 2>&1
    
    # Get size
    size=$(docker images tf-test-$version --format "{{.Size}}" 2>/dev/null)
    
    echo "   ✅ TF $version: $size"
    
    # Cleanup
    docker rmi tf-test-$version > /dev/null 2>&1 || true
    rm -f /tmp/Dockerfile.tf-test-$version
done

echo ""
echo "🎯 Recommendation: Use the smallest version that meets requirements"
echo ""

