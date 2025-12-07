#!/bin/bash
# Complete deployment and verification in one command (Python 3.11)
echo "🚀 SmartScan v2.0 Complete Deployment & Verification"
echo "==================================================="
if bash deploy_smartscan_311.sh; then
  echo ""
  echo "2️⃣  Deployment successful! Running verification..."
  echo ""
  bash verify_smartscan_quick.sh
else
  echo ""
  echo "❌ Deployment failed. Check logs above."
  exit 1
fi

