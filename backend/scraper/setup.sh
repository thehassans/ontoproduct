#!/bin/bash
# Run once on the server to install scraper dependencies
pip install -r "$(dirname "$0")/requirements.txt"
python3 -m playwright install chromium
echo "Scraper setup complete."
