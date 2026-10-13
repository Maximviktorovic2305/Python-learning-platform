FROM python:3.14-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY --chown=10001:10001 pyproject.toml requirements.lock ./
RUN pip install --no-cache-dir -r requirements.lock
COPY --chown=10001:10001 app ./app
COPY --chown=10001:10001 migrations ./migrations
COPY --chown=10001:10001 alembic.ini ./
RUN useradd --uid 10001 --create-home appuser
USER appuser
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8010"]
