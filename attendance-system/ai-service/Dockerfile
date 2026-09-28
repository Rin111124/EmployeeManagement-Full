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

# Download the InsightFace pack at image build time. Production services run on
# an isolated Docker network, so model startup must not depend on runtime egress.
RUN mkdir -p /home/appuser/.insightface/models && chown -R appuser:appgroup /home/appuser/.insightface
USER appuser
ENV HOME=/home/appuser
ENV INSIGHTFACE_HOME=/home/appuser/.insightface
RUN python -c "from insightface.app import FaceAnalysis; app=FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider']); app.prepare(ctx_id=-1, det_size=(640, 640))"

COPY . .

# Set up permissions and cache directories
RUN mkdir -p /home/appuser/.insightface/models && \
    mkdir -p /root/.insightface/models && \
    chown -R appuser:appgroup /app /home/appuser/.insightface

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
