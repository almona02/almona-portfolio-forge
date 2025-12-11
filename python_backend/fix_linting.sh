#!/bin/bash
# Automated Linting Fix Script
# Fixes ~200+ style issues automatically

echo "🔧 Starting automated linting fixes..."
echo ""

# Check if we're in the right directory
if [ ! -d "python_backend" ]; then
    echo "❌ Error: Must run from project root"
    exit 1
fi

cd python_backend || exit 1

# Install required tools if not present
echo "📦 Checking/installing formatting tools..."
pip install -q black isort autoflake 2>/dev/null || {
    echo "⚠️  Warning: Could not install tools. Install manually:"
    echo "   pip install black isort autoflake"
    exit 1
}

echo ""
echo "✨ Running Black (line length, formatting)..."
black . --line-length 79 --quiet

echo "✨ Running isort (import sorting)..."
isort . --quiet

echo "✨ Running autoflake (unused imports)..."
autoflake --in-place --remove-all-unused-imports --recursive . --quiet

echo ""
echo "✅ Automated fixes complete!"
echo ""
echo "📊 Next steps:"
echo "   1. Re-run your linter to see reduced errors"
echo "   2. Remaining issues are mostly environment/config"
echo "   3. Type checker false positives can be ignored"
echo ""

