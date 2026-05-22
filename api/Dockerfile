# Build context is the project root (set in docker-compose.yml)
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies first (layer-cached unless requirements.txt changes)
COPY api/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the api package
COPY api/ ./api/

# Ensure api/ is importable as a Python package
RUN test -f api/__init__.py || touch api/__init__.py

EXPOSE 8000

# 2 workers is safe for a single container; scale horizontally in production
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
