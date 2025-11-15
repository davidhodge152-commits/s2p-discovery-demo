#!/usr/bin/env bash
set -euo pipefail

pip install --upgrade pip
pip install -e .[dev]

cd frontend
pnpm install
cd ..

python -m spacy download en_core_web_sm || true

