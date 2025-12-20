#!/bin/bash
# Test DXF import endpoint

DXF_FILE="../public/PROFILES/MC 1250 .dxf"
API_URL="http://localhost:8003/api/v2/profile-import/ingest"

echo "Testing DXF Import Endpoint..."
echo "File: $DXF_FILE"
echo "URL: $API_URL"
echo ""

if [ ! -f "$DXF_FILE" ]; then
    echo "ERROR: DXF file not found: $DXF_FILE"
    exit 1
fi

# Test the endpoint
curl -X POST \
  -F "file=@$DXF_FILE" \
  -F "source_type=dxf" \
  -F "material_type=aluminium" \
  "$API_URL" \
  -H "Content-Type: multipart/form-data" \
  2>&1 | python -m json.tool 2>/dev/null || cat

echo ""
echo "Done!"

