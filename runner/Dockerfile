FROM docker:28-cli AS dockercli
FROM python:3.14-slim
COPY --from=dockercli /usr/local/bin/docker /usr/local/bin/docker
WORKDIR /runner
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py .
CMD ["sh", "-c", "docker pull python:3.14-slim && exec uvicorn main:app --host 0.0.0.0 --port 8090"]
