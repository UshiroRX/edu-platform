FROM python:3.12-slim
RUN pip install uv
WORKDIR /app

COPY pyproject.toml ./
COPY uv.lock ./
COPY services/auth_service ./services/auth_service
COPY services/results_service ./services/results_service
COPY services/quiz_service ./services/quiz_service
COPY services/shared ./services/shared

RUN uv sync --frozen
RUN uv pip install ./services/auth_service

CMD ["uv", "run", "uvicorn", "--host", "0.0.0.0", "--port", "8000", "app.main:app"]
