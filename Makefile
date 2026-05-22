# HealthDash — convenience targets wrapping docker compose
.PHONY: up down restart logs rebuild ps db-shell api-logs seed-check

## Start all services in the background
up:
	docker compose up -d

## Stop all services (data is preserved)
down:
	docker compose down

## Stop and remove volumes (DELETES all data)
clean:
	docker compose down -v

## Restart a specific service:  make restart s=api
restart:
	docker compose restart $(s)

## Follow logs for all services (Ctrl-C to stop)
logs:
	docker compose logs -f

## Follow logs for one service:  make logs-svc s=api
logs-svc:
	docker compose logs -f $(s)

## Rebuild images and restart (use after code changes)
rebuild:
	docker compose up -d --build

## Show running containers and their health
ps:
	docker compose ps

## Open a psql shell in the database container
db-shell:
	docker compose exec db psql -U postgres health_dashboard

## Verify seed data loaded
seed-check:
	docker compose exec db psql -U postgres health_dashboard -c "SELECT COUNT(*) AS icd10_codes FROM icd10_codes; SELECT COUNT(*) AS provinces FROM provinces;"
