FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libglib2.0-0 libgl1 wget \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -m -s /bin/bash appuser

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Prepare InsightFace models directory
RUN mkdir -p /home/appuser/.insightface/models && \
    chown -R appuser:appgroup /home/appuser /app

# Copy local models if present in the build context (directory tracked via .gitkeep)
COPY --chown=appuser:appgroup models/ /home/appuser/.insightface/models/

USER appuser
ENV HOME=/home/appuser
ENV INSIGHTFACE_HOME=/home/appuser/.insightface

# Ensure the InsightFace model pack (buffalo_l) is present:
# 1. If already copied from local build context (buffalo_l directory), verify & load.
# 2. If buffalo_l.zip exists in context, extract it.
# 3. Otherwise, download with wget (with resume & retries) to survive network drops.
RUN if [ ! -f /home/appuser/.insightface/models/buffalo_l/det_10g.onnx ]; then \
        if [ -f /home/appuser/.insightface/models/buffalo_l.zip ]; then \
            echo "Extracting local buffalo_l.zip..." && \
            mkdir -p /home/appuser/.insightface/models/buffalo_l && \
            python -m zipfile -e /home/appuser/.insightface/models/buffalo_l.zip /home/appuser/.insightface/models/buffalo_l && \
            rm -f /home/appuser/.insightface/models/buffalo_l.zip; \
        else \
            echo "Local model not found. Downloading buffalo_l.zip with wget (retries enabled)..." && \
            mkdir -p /home/appuser/.insightface/models/buffalo_l && \
            wget -c --tries=10 --retry-connrefused --waitretry=3 -O /tmp/buffalo_l.zip \
                "https://github.com/deepinsight/insightface/releases/download/model-zoo/buffalo_l.zip" && \
            python -m zipfile -e /tmp/buffalo_l.zip /home/appuser/.insightface/models/buffalo_l && \
            rm -f /tmp/buffalo_l.zip; \
        fi \
    fi && \
    python -c "from insightface.app import FaceAnalysis; app=FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider']); app.prepare(ctx_id=-1, det_size=(640, 640))"

# Copy application source code
COPY --chown=appuser:appgroup . .

# Remove models from /app if copied by 'COPY . .' to prevent doubling image size
RUN rm -rf /app/models

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
