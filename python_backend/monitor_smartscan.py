"""
SmartScan v2.0 Monitoring Script
Run periodically to collect metrics.
"""

import sqlite3
from datetime import datetime
from pathlib import Path


def collect_metrics(log_dir: str = "logs", db_path: str = "smartscan_metrics.db"):
    """Collect and store SmartScan metrics (placeholder parser)."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS smartscan_metrics (
            timestamp TEXT,
            scan_type TEXT,
            accuracy_tier TEXT,
            confidence REAL,
            processing_time_ms INTEGER,
            ocr_success BOOLEAN,
            standard_match BOOLEAN
        )
        """
    )

    log_files = list(Path(log_dir).glob("backend_*.log"))
    if not log_files:
        print("No log files found")
        return
    latest_log = max(log_files, key=lambda x: x.stat().st_mtime)

    metrics = []
    with latest_log.open("r") as f:
        for line in f:
            if "Enhanced scan completed" in line or "Basic scan completed" in line:
                metrics.append(
                    {
                        "timestamp": datetime.now().isoformat(),
                        "scan_type": "enhanced" if "Enhanced" in line else "basic",
                        "accuracy_tier": "unknown",
                        "confidence": 0.8,
                        "processing_time_ms": 1000,
                        "ocr_success": "Enhanced" in line,
                        "standard_match": "Enhanced" in line,
                    }
                )

    for metric in metrics[-100:]:
        cursor.execute(
            """
            INSERT INTO smartscan_metrics VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                metric["timestamp"],
                metric["scan_type"],
                metric["accuracy_tier"],
                metric["confidence"],
                metric["processing_time_ms"],
                metric["ocr_success"],
                metric["standard_match"],
            ),
        )
    conn.commit()

    print(f"\n📊 SmartScan Metrics Report - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)
    cursor.execute(
        """
        SELECT
            scan_type,
            COUNT(*) as total,
            AVG(confidence) as avg_confidence,
            AVG(processing_time_ms) as avg_time_ms,
            SUM(CASE WHEN ocr_success THEN 1 ELSE 0 END) as ocr_successes,
            SUM(CASE WHEN standard_match THEN 1 ELSE 0 END) as standard_matches
        FROM smartscan_metrics
        WHERE timestamp > datetime('now', '-1 hour')
        GROUP BY scan_type
        """
    )
    for row in cursor.fetchall():
        scan_type, total, avg_conf, avg_time, ocr_success, std_match = row
        print(f"\n{scan_type.upper()} Scans (last hour):")
        print(f"  Total: {total}")
        print(f"  Avg Confidence: {avg_conf:.2f}")
        print(f"  Avg Time: {avg_time:.0f}ms")
        print(f"  OCR Success Rate: {ocr_success}/{total} ({(ocr_success/total)*100:.1f}%)")
        print(f"  Standard Matches: {std_match}/{total} ({(std_match/total)*100:.1f}%)")
    conn.close()


if __name__ == "__main__":
    collect_metrics()

