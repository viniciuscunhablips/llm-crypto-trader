# Backend API Dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY pyproject.toml ./

# Install Python dependencies
RUN pip install --no-cache-dir \
    requests>=2.31.0 \
    pandas>=2.0.0 \
    numpy>=1.24.0 \
    python-binance>=1.0.0 \
    google-genai>=0.8.0 \
    python-dotenv>=1.0.0 \
    colorama>=0.4.0 \
    pytz>=2023.0 \
    fastapi>=0.109.0 \
    uvicorn>=0.27.0

# Copy application code
COPY src/ ./src/
COPY main.py ./

# Create data directory
RUN mkdir -p /app/data

# Expose API port
EXPOSE 8000

# Run the API server
CMD ["uvicorn", "src.api:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
