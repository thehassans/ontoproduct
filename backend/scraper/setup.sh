#!/bin/bash
# Run once on the server to install crawl4ai + Playwright into a venv
# Usage: bash backend/scraper/setup.sh  (from project root / httpdocs)
set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV="$SCRIPT_DIR/.venv"

echo "[setup] Creating virtual environment at $VENV ..."
python3 -m venv "$VENV"

echo "[setup] Installing dependencies..."
"$VENV/bin/pip" install --upgrade pip
"$VENV/bin/pip" install -r "$SCRIPT_DIR/requirements.txt"

echo "[setup] Installing Playwright Chromium browser..."
"$VENV/bin/python" -m playwright install chromium

echo "[setup] Done. Python: $VENV/bin/python"
