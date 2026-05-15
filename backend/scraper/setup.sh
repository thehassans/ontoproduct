#!/bin/bash
# Run once on the server to install crawl4ai + Playwright
# Usage: bash backend/scraper/setup.sh  (from project root / httpdocs)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "[setup] Installing Python dependencies from $SCRIPT_DIR/requirements.txt..."
python3 -m pip install --upgrade pip
python3 -m pip install -r "$SCRIPT_DIR/requirements.txt"

echo "[setup] Installing Playwright Chromium browser..."
python3 -m playwright install chromium

echo "[setup] Scraper setup complete."
