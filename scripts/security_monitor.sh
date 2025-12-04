#!/bin/bash
# set -e removed to allow reporting warnings without exiting immediately

echo "=== Daily Security Check ==="
date

# Add user scripts to PATH for pip-audit
export PATH=$PATH:$(python -c "import site; print(site.getusersitepackages().replace('site-packages', 'Scripts'))")

# 1. Dependency vulnerabilities
echo "Checking Python dependencies..."
if [ -f python_backend/requirements.txt ]; then
    # Try running as module (pip_audit) or command
    if python -m pip_audit -r python_backend/requirements.txt 2>/dev/null; then
         echo "Python dependency check passed."
    elif command -v pip-audit &> /dev/null; then
         pip-audit -r python_backend/requirements.txt || echo "Warning: Python vulnerabilities found"
    else
         echo "pip-audit not found or failed to run. Attempting to run via python module..."
         python -m pip_audit -r python_backend/requirements.txt || echo "Warning: Python vulnerabilities found (or pip-audit missing)"
    fi
else
    echo "python_backend/requirements.txt not found"
fi

echo "Checking npm dependencies..."
if [ -f package.json ]; then
    npm audit --audit-level=high || echo "Warning: NPM vulnerabilities found"
elif [ -f frontend/package.json ]; then
    cd frontend
    npm audit --audit-level=high || echo "Warning: NPM vulnerabilities found"
    cd ..
else
    echo "package.json not found"
fi

# 2. Security headers check
echo "Testing security headers..."
TARGET_URL=${1:-"http://localhost:8000"}
if command -v curl &> /dev/null; then
    # Don't fail script if server is down
    if curl -s -I "$TARGET_URL" > /dev/null 2>&1; then
        curl -s -I "$TARGET_URL" | grep -E "(X-Content-Type-Options|X-Frame-Options|Content-Security-Policy)" || echo "Warning: Missing security headers"
    else
        echo "Server not running at $TARGET_URL, skipping headers check"
    fi
else
    echo "curl not found, skipping headers check"
fi

# 3. Check for leaked secrets
if command -v gitleaks &> /dev/null; then
    echo "Scanning for secrets..."
    gitleaks detect --source . --verbose
else
    echo "gitleaks not installed, skipping secret scan."
fi

# 4. Check for any MLflow regressions
echo "Checking for MLflow regressions..."
# Exclude tests and comments
FOUND_MLFLOW=$(grep -r "mlflow" python_backend/ --include="*.py" --exclude-dir="tests" --exclude-dir="__pycache__" | grep -v "#")

if [ -n "$FOUND_MLFLOW" ]; then
    echo "⚠️  MLflow found! Investigate immediately!"
    echo "$FOUND_MLFLOW"
    exit 1
else
    echo "No MLflow regressions found."
fi

echo "✅ Security check completed successfully"
