.PHONY: dev backend frontend seed test fmt lint clean install

install:
pip install -e .[dev]
cd frontend && pnpm install

backend:
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000

frontend:
cd frontend && pnpm dev --host 0.0.0.0 --port 5173

seed:
python backend/app/main.py --seed

dev:
pnpm -C frontend install >/dev/null 2>&1 || true
pip install -e . >/dev/null 2>&1 || true
python backend/app/main.py --seed-initial >/dev/null 2>&1 || true
pnpm dlx concurrently "make backend" "make frontend"

test:
pytest

fmt:
black backend
ruff check backend --fix
npx prettier --write "frontend/src/**/*.{ts,tsx}" || true

lint:
ruff check backend
npx prettier --check "frontend/src/**/*.{ts,tsx}" || true

clean:
rm -rf __pycache__ .pytest_cache frontend/node_modules .mypy_cache

