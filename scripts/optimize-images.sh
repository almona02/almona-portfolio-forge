#!/bin/bash

# Image Optimization Script for WebP Conversion
# Converts JPG/PNG images to WebP format for better performance
# Usage: ./scripts/optimize-images.sh

set -e

echo "🖼️  Starting image optimization to WebP..."

# Check if cwebp is installed
if ! command -v cwebp &> /dev/null; then
    echo "❌ cwebp not found. Installing..."
    echo ""
    echo "Please install WebP tools:"
    echo "  macOS:   brew install webp"
    echo "  Ubuntu:  sudo apt-get install webp"
    echo "  Windows: Download from https://developers.google.com/speed/webp/download"
    exit 1
fi

# Directories to process
DIRS=(
    "public/images"
    "src/assets/images"
    "srcassetsimages"
)

# Counters
converted=0
skipped=0
errors=0

# Function to convert image
convert_to_webp() {
    local file=$1
    local base="${file%.*}"
    local ext="${file##*.}"
    local webp_file="${base}.webp"
    
    # Skip if WebP already exists
    if [ -f "$webp_file" ]; then
        echo "⏭️  Skipping $file (WebP already exists)"
        ((skipped++))
        return
    fi
    
    # Convert based on extension
    if [[ "$ext" =~ ^(jpg|jpeg|JPG|JPEG)$ ]]; then
        echo "🔄 Converting $file to WebP..."
        cwebp -q 85 -m 6 "$file" -o "$webp_file" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "✅ Created $webp_file"
            ((converted++))
        else
            echo "❌ Failed to convert $file"
            ((errors++))
        fi
    elif [[ "$ext" =~ ^(png|PNG)$ ]]; then
        echo "🔄 Converting $file to WebP..."
        cwebp -q 85 -m 6 -lossless "$file" -o "$webp_file" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "✅ Created $webp_file"
            ((converted++))
        else
            echo "❌ Failed to convert $file"
            ((errors++))
        fi
    fi
}

# Process each directory
for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo ""
        echo "📁 Processing $dir..."
        find "$dir" -type f \( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" \) | while read file; do
            convert_to_webp "$file"
        done
    else
        echo "⚠️  Directory $dir not found, skipping..."
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Conversion Summary:"
echo "   ✅ Converted: $converted"
echo "   ⏭️  Skipped: $skipped"
echo "   ❌ Errors: $errors"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Next Steps:"
echo "   1. Review converted WebP files"
echo "   2. Update image src attributes in components"
echo "   3. Test in browser to verify quality"
echo "   4. Deploy and monitor performance improvements"
echo ""

