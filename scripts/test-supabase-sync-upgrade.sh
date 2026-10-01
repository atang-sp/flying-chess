#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "$0")/.." && pwd)
container_name="flying-chess-sync-test-$$"
trap 'docker rm -f -v "$container_name" >/dev/null 2>&1 || true' EXIT

docker run --rm -d --name "$container_name" --network none \
  -e POSTGRES_PASSWORD=local-test-only \
  -v "$repo_root:/workspace:ro" postgres:17-alpine >/dev/null
for attempt in $(seq 1 60); do
  if docker exec "$container_name" pg_isready -h 127.0.0.1 -U postgres >/dev/null 2>&1; then break; fi
  sleep 1
done
docker exec -e PGPASSWORD=local-test-only "$container_name" psql -h 127.0.0.1 -U postgres -v ON_ERROR_STOP=1 \
  -f /workspace/scripts/fixtures/account-sync-db.test.sql
