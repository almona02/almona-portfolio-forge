#!/bin/bash
# Package Usage Analyzer for Docker Image Optimization

echo "🔍 PACKAGE USAGE ANALYSIS - 2.78GB Image"
echo "========================================"
echo ""

echo "1. 📦 Checking if packages are actually imported in code:"
echo "--------------------------------------------------------"

# Check pandas
echo -n "pandas: "
if grep -r "import pandas\|from pandas" python_backend/ --include="*.py" > /dev/null 2>&1; then
    echo "❌ USED in code (cannot remove)"
    grep -r "import pandas\|from pandas" python_backend/ --include="*.py" | head -3
else
    echo "✅ NOT used in code (can remove - only required by ortools)"
fi

# Check sympy
echo -n "sympy: "
if grep -r "import sympy\|from sympy" python_backend/ --include="*.py" > /dev/null 2>&1; then
    echo "❌ USED in code (cannot remove)"
    grep -r "import sympy\|from sympy" python_backend/ --include="*.py" | head -3
else
    echo "✅ NOT used in code (check if onnxruntime requires it)"
fi

# Check ortools
echo -n "ortools: "
if grep -r "from ortools\|import.*ortools" python_backend/ --include="*.py" > /dev/null 2>&1; then
    echo "⚠️  USED in code (but has fallback - can remove)"
    grep -r "from ortools\|import.*ortools" python_backend/ --include="*.py" | head -3
else
    echo "✅ NOT used in code (can remove)"
fi

echo ""
echo "2. 📊 Package sizes in current image:"
echo "------------------------------------"
echo "Run this inside container:"
echo "  docker run --rm --user root almona-180mb sh -c 'du -sh /root/.local/lib/python3.11/site-packages/* 2>/dev/null | sort -h | tail -10'"

echo ""
echo "3. 🎯 Expected savings if removed:"
echo "---------------------------------"
echo "  ortools: 60MB"
echo "  pandas: 79MB (only required by ortools)"
echo "  sympy: 80MB (check if onnxruntime requires)"
echo "  TOTAL potential: ~140-220MB"

