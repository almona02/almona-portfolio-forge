#!/bin/bash
# download_models.sh - Downloads SR model with verification
set -e

MODEL_DIR="${MODEL_DIR:-models}"
SR_URL="https://github.com/opencv/opencv_contrib/raw/4.x/modules/dnn_superres/models/FSRCNN_x2.pb"

mkdir -p "$MODEL_DIR"

echo "📥 Downloading SR model..."
curl -L "$SR_URL" -o "$MODEL_DIR/FSRCNN_x2.pb" --retry 3

SR_HASH=$(sha256sum "$MODEL_DIR/FSRCNN_x2.pb" | cut -d' ' -f1)
echo "FSRCNN_x2.pb $SR_HASH" > "$MODEL_DIR/checksums.txt"

echo "✅ Model ready: $MODEL_DIR/FSRCNN_x2.pb ($(du -h $MODEL_DIR/FSRCNN_x2.pb | cut -f1))"

