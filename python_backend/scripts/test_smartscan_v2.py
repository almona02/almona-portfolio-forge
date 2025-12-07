"""
Quick SmartScan v2 smoke test.

Usage:
    python scripts/test_smartscan_v2.py --file ../public/PROFILES/sheried\ 2.pdf --port 8003
"""

import argparse
import json
from pathlib import Path

import requests


def run_test(file_path: Path, port: int):
    url = f"http://localhost:{port}/api/v2/smart-scan/enhanced"
    with file_path.open("rb") as f:
        files = {"file": (file_path.name, f, "application/octet-stream")}
        resp = requests.post(url, files=files, timeout=120)
    print(f"Status: {resp.status_code}")
    try:
        data = resp.json()
        print(json.dumps(data, indent=2))
    except Exception:
        print(resp.text)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", type=Path, required=True, help="Path to file to scan")
    parser.add_argument("--port", type=int, default=8002, help="API port (default 8002)")
    args = parser.parse_args()

    if not args.file.exists():
        raise SystemExit(f"File not found: {args.file}")

    run_test(args.file, args.port)

