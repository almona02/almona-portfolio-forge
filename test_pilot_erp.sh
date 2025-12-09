#!/bin/bash
set -e

echo "🧪 Almona ERP Pilot Test"
echo "========================"

API_BASE="${API_BASE:-https://pilot.almona-egypt.com}"

echo "1️⃣ Testing API health..."
curl -s "${API_BASE}/health/erp" | jq '.' || true

echo ""
echo "2️⃣ Creating test quote with ERP dispatch..."
QUOTE_RESPONSE=$(curl -s -X POST "${API_BASE}/api/v2/quotes" \
  -H "Content-Type: application/json" \
  -d '{
    "project_name": "Pilot Test Window",
    "contact_name": "Pilot Workshop Cairo",
    "region": "EG",
    "customer_tax_id": "300123456789",
    "currency": "EGP",
    "dispatch_to_erp": true,
    "optimization_signals": {
      "material_requirements_kg": 52.8,
      "labor_hours": 9.5,
      "machine_time_hours": 4.2,
      "remnant_utilization_kg": 3.0
    },
    "products": [
      {
        "product_id": "fab-window-ps5600",
        "quantity": 3,
        "unit_price": 4250.00
      }
    ],
    "services": [
      {
        "service_id": "thermal-break-install",
        "quantity": 1,
        "unit_price": 1250.00
      }
    ]
  }')

echo "Quote Response:"
echo "$QUOTE_RESPONSE" | jq '.'

QUOTE_ID=$(echo "$QUOTE_RESPONSE" | jq -r '.id')
ERP_TASK_ID=$(echo "$QUOTE_RESPONSE" | jq -r '.erp_task_id')

echo ""
echo "3️⃣ Checking ERP status..."
sleep 3
curl -s "${API_BASE}/api/v2/quotes/erp-status/${QUOTE_ID}" | jq '.'

echo ""
echo "🎯 TEST COMPLETE"
echo "Quote ID: $QUOTE_ID"
echo "ERP Task ID: $ERP_TASK_ID"
echo ""
echo "Next steps:"
echo "1. Check Odoo for draft invoice"
echo "2. Verify e-invoice XML attachment"
echo "3. Monitor erp_transaction_log table"
