FROM python:3.12-slim

WORKDIR /app

# Install api + worker deps together
COPY services/api/requirements.txt /tmp/api-req.txt
COPY services/worker/requirements.txt /tmp/worker-req.txt
RUN pip install --no-cache-dir -r /tmp/api-req.txt -r /tmp/worker-req.txt

# Copy api app so graph_engine is importable
COPY services/api/app /app/app

COPY services/worker/worker.py .

CMD ["python", "worker.py"]
