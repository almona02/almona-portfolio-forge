# Multi-stage build for production-ready Python API
FROM python:3.11-slim AS builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies needed for building wheels and OpenCV
# Added libtesseract-dev for proper pytesseract compilation
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    tesseract-ocr \
    tesseract-ocr-eng \
    libtesseract-dev \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

# Create and activate virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install -r requirements.txt

# ---------------------------------------------------------------------------
# BUILD-TIME SMOKE TEST
# This ensures we don't ship a broken container. 
# If imports fail here, the build stops immediately.
# ---------------------------------------------------------------------------
RUN python -c "import pytesseract; print('✅ Pytesseract found')" && \
    python -c "import cv2; print('✅ OpenCV found')" && \
    python -c "import tensorflow; print('✅ TensorFlow found')" && \
    python -c "import pydantic; print('✅ Pydantic', pydantic.__version__)"

# Production stage
FROM python:3.11-slim AS production

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    ENVIRONMENT=production \
    # Explicitly tell Tesseract where data is (standard linux path)
    TESSDATA_PREFIX=/usr/share/tesseract-ocr/5/tessdata/

# Install runtime dependencies
# We include tesseract-ocr-eng explicitly to ensure English data is present
RUN apt-get update && apt-get install -y \
    libpq5 \
    curl \
    libgl1 \
    libglib2.0-0 \
    libmagic1 \
    tesseract-ocr \
    tesseract-ocr-eng \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# Copy virtual environment from builder stage
COPY --from=builder /opt/venv /opt/venv

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Create application directory
WORKDIR /app

# Copy application code
COPY . .

# Download SR model for preprocessing
RUN mkdir -p /app/models && \
    curl -L https://github.com/opencv/opencv_contrib/raw/4.x/modules/dnn_superres/models/FSRCNN_x2.pb \
         -o /app/models/FSRCNN_x2.pb --retry 3 && \
    echo "FSRCNN_x2.pb $(sha256sum /app/models/FSRCNN_x2.pb | cut -d' ' -f1)" > /app/models/checksums.txt

# Create logs directory
RUN mkdir -p /app/logs && chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose ports
EXPOSE 8000 8001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/health/live || exit 1

# Default command
CMD ["uvicorn", "apis.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
