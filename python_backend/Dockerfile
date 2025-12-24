# YDT Prestige Agent API - Production Dockerfile
# Build context: Project root (almona-portfolio-forge/)
# Usage: docker build -f python_backend/Dockerfile .
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    poppler-utils \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better Docker layer caching
COPY python_backend/requirements_prestige.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /tmp/requirements.txt && \
    rm /tmp/requirements.txt

# Copy Python backend API code
COPY python_backend/api/ ./api/
COPY python_backend/tests/ ./tests/

# Copy YDT agent code (required for chatbot engine)
# This includes: ydt_chatbot_engine.py, gcode_ydt_integration.py, arabic_support.py, etc.
COPY ai_agents/ydt_agent/*.py ./ai_agents/ydt_agent/

# Copy knowledge base (processed data, JSON files)
COPY ai_agents/ydt_agent/knowledge/ ./knowledge/

# Create necessary directories
RUN mkdir -p /app/knowledge/processed/aim-7510 && \
    mkdir -p /app/logs && \
    chmod -R 755 /app

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app:/app/ai_agents/ydt_agent
ENV API_HOST=0.0.0.0
ENV API_PORT=8000
ENV PORT=8000

# Expose port (Railway uses PORT env var, default to 8000)
EXPOSE 8000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api/health || exit 1

# Run the application
# Railway sets PORT automatically, we use it with fallback to 8000
# API_WORKERS defaults to 4 if not set
CMD sh -c "uvicorn api.prestige_endpoints:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${API_WORKERS:-4}"
