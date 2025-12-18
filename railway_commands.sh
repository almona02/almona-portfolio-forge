#!/bin/bash
# Railway Redis Setup Script

echo "=== Railway Redis Setup ==="
echo ""

# Set PATH for Railway CLI
export PATH="$PATH:/c/Users/bobbi/AppData/Roaming/npm"

echo "Current PATH includes Railway CLI: $(which railway)"
echo ""

echo "Step 1: List your projects"
railway list
echo ""

echo "Step 2: Link to project (if needed)"
railway link
echo ""

echo "Step 3: Add Redis service"
echo "Adding Redis..."
railway add --database redis
echo ""

echo "Step 4: Check service status"
railway service status
echo ""

echo "=== Setup Complete ==="
echo "Check your Railway dashboard - you should now see Redis!"
echo "If Redis doesn't appear, try refreshing the dashboard page."
