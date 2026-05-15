#!/bin/bash
# Run once on the server to install crawl4ai + Playwright into a venv
# Usage: bash backend/scraper/setup.sh  (from project root / httpdocs)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VENV="$SCRIPT_DIR/.venv"

# ── Step 1: Ensure python3-venv is installed ──────────────────────────────────
echo "[setup] Checking for python3-venv..."
if ! python3 -c "import ensurepip" 2>/dev/null; then
    echo "[setup] Installing python3.12-venv package..."
    apt-get install -y python3.12-venv python3-venv 2>/dev/null \
    || apt install -y python3.12-venv 2>/dev/null \
    || echo "[setup] apt failed (no sudo?), will try --without-pip fallback"
fi

# ── Step 2: Create venv ───────────────────────────────────────────────────────
echo "[setup] Creating virtual environment at $VENV ..."
if python3 -m venv "$VENV" 2>/dev/null; then
    echo "[setup] venv created OK"
else
    echo "[setup] Standard venv failed — trying --without-pip + bootstrap..."
    python3 -m venv --without-pip "$VENV"
    curl -sS https://bootstrap.pypa.io/get-pip.py | "$VENV/bin/python3"
fi

# ── Step 3: Install Python packages ──────────────────────────────────────────
echo "[setup] Installing dependencies..."
"$VENV/bin/pip" install --upgrade pip
"$VENV/bin/pip" install -r "$SCRIPT_DIR/requirements.txt"

# ── Step 4: Install Playwright browser ───────────────────────────────────────
echo "[setup] Installing Playwright Chromium browser..."
"$VENV/bin/python" -m playwright install chromium

echo "[setup] Done. Scraper ready at: $VENV/bin/python"
