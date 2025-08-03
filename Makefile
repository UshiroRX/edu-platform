build:
	docker compose up --build -d

build_no_cache:
	docker compose up --build --no-cache -d

up:
	docker compose up

down:
	docker compose down

migrate:
	docker compose exec auth-service uv run alembic upgrade head

rev:
	docker compose exec auth-service uv run alembic revision --autogenerate -m "new migration"

logs:
	docker compose logs -f



dev:
	@export PYTHONPATH=$$(pwd); \
	docker compose -f docker-compose.dev.yml up -d; \
	echo "Starting auth-service..."; \
	uv run -- uvicorn services.auth_service.app.main:app --reload --port 8001 --app-dir services/auth_service & \
	echo "Starting results-service..."; \
	uv run -- uvicorn services.results_service.app.main:app --reload --port 8002 --app-dir services/results_service & \
	echo "Starting quiz-service..."; \
	uv run -- uvicorn services.quiz_service.app.main:app --reload --port 8003 --app-dir services/quiz_service & \
	echo "Starting frontend..."; \
	wait

results_service_migrate:
	PYTHONPATH=. alembic -c services/results_service/alembic.ini revision --autogenerate

results_service_upgrade:
	PYTHONPATH=. alembic -c services/results_service/alembic.ini upgrade head


auth_service_migrate:
	PYTHONPATH=. alembic -c services/auth_service/alembic.ini revision --autogenerate

auth_service_upgrade:
	PYTHONPATH=. alembic -c services/auth_service/alembic.ini upgrade head

quiz_service_migrate:
	PYTHONPATH=. alembic -c services/quiz_service/alembic.ini revision --autogenerate

quiz_service_upgrade:
	PYTHONPATH=. alembic -c services/quiz_service/alembic.ini upgrade head