"""
Enhanced monitoring script with structured log parsing for SmartScan v2.0.
"""
import json
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List


class SmartScanMonitor:
    def __init__(self, log_dir: str = "logs", db_path: str = "smartscan_metrics.db"):
        self.log_dir = Path(log_dir)
        self.db_path = db_path
        self._init_database()

    def _init_database(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS smartscan_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                request_id TEXT,
                scan_type TEXT,
                filename TEXT,
                file_size_bytes INTEGER,
                processing_time_ms REAL,
                confidence_score REAL,
                accuracy_tier TEXT,
                ocr_success BOOLEAN,
                standard_match BOOLEAN,
                success BOOLEAN,
                error_message TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS ocr_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                filename TEXT,
                profile_name TEXT,
                confidence REAL,
                materials TEXT,
                brands TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS standard_matches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                filename TEXT,
                standard_name TEXT,
                match_score REAL,
                width_mm REAL,
                height_mm REAL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS performance_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                alert_type TEXT,
                metric TEXT,
                value REAL,
                threshold REAL,
                description TEXT,
                resolved BOOLEAN DEFAULT FALSE,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.commit()
        conn.close()

    def parse_structured_logs(self) -> Dict[str, List]:
        metrics: List[Dict] = []
        ocr_data: List[Dict] = []
        standard_matches: List[Dict] = []
        log_files = list(self.log_dir.glob("backend_*.log"))
        if not log_files:
            return {"metrics": metrics, "ocr_data": ocr_data, "standard_matches": standard_matches}
        latest_log = max(log_files, key=lambda x: x.stat().st_mtime)
        with latest_log.open("r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    log_entry = json.loads(line)
                    event = log_entry.get("event") or log_entry.get("event_name")
                    if log_entry.get("event") == "smartscan_complete":
                        metrics.append(
                            {
                                "timestamp": log_entry.get("timestamp"),
                                "request_id": log_entry.get("request_id", ""),
                                "scan_type": log_entry.get("scan_type"),
                                "filename": log_entry.get("filename"),
                                "file_size_bytes": log_entry.get("file_size_bytes"),
                                "processing_time_ms": log_entry.get("processing_time_ms"),
                                "confidence_score": log_entry.get("confidence_score"),
                                "accuracy_tier": log_entry.get("accuracy_tier"),
                                "ocr_success": log_entry.get("ocr_success"),
                                "standard_match": log_entry.get("standard_match"),
                                "success": log_entry.get("success"),
                                "error_message": log_entry.get("error", ""),
                            }
                        )
                    elif event == "ocr_extraction":
                        ocr_data.append(
                            {
                                "timestamp": log_entry.get("timestamp"),
                                "filename": log_entry.get("filename"),
                                "profile_name": log_entry.get("profile_name"),
                                "confidence": log_entry.get("confidence"),
                                "materials": json.dumps(log_entry.get("materials", [])),
                                "brands": json.dumps(log_entry.get("brands", [])),
                            }
                        )
                    elif event == "egyptian_standard_match":
                        standard_matches.append(
                            {
                                "timestamp": log_entry.get("timestamp"),
                                "filename": log_entry.get("filename"),
                                "standard_name": log_entry.get("standard_name"),
                                "match_score": log_entry.get("match_score"),
                                "width_mm": log_entry.get("width_mm"),
                                "height_mm": log_entry.get("height_mm"),
                            }
                        )
                except json.JSONDecodeError:
                    continue
        return {"metrics": metrics, "ocr_data": ocr_data, "standard_matches": standard_matches}

    def store_metrics(self, data: Dict[str, List]):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        for metric in data["metrics"]:
            cursor.execute(
                """
                INSERT INTO smartscan_metrics
                (timestamp, request_id, scan_type, filename, file_size_bytes,
                 processing_time_ms, confidence_score, accuracy_tier,
                 ocr_success, standard_match, success, error_message)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    metric["timestamp"],
                    metric["request_id"],
                    metric["scan_type"],
                    metric["filename"],
                    metric["file_size_bytes"],
                    metric["processing_time_ms"],
                    metric["confidence_score"],
                    metric["accuracy_tier"],
                    metric["ocr_success"],
                    metric["standard_match"],
                    metric["success"],
                    metric.get("error_message", ""),
                ),
            )
        for ocr in data["ocr_data"]:
            cursor.execute(
                """
                INSERT INTO ocr_metrics
                (timestamp, filename, profile_name, confidence, materials, brands)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    ocr["timestamp"],
                    ocr["filename"],
                    ocr["profile_name"],
                    ocr["confidence"],
                    ocr["materials"],
                    ocr["brands"],
                ),
            )
        for match in data["standard_matches"]:
            cursor.execute(
                """
                INSERT INTO standard_matches
                (timestamp, filename, standard_name, match_score, width_mm, height_mm)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    match["timestamp"],
                    match["filename"],
                    match["standard_name"],
                    match["match_score"],
                    match["width_mm"],
                    match["height_mm"],
                ),
            )
        conn.commit()
        conn.close()

    def generate_report(self, hours: int = 1):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        time_threshold = (datetime.utcnow() - timedelta(hours=hours)).isoformat()

        print(f"\n📊 SmartScan v2.0 Monitoring Report (last {hours}h)")
        print("=" * 60)
        cursor.execute(
            """
            SELECT
                COUNT(*) as total_scans,
                SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_scans,
                AVG(processing_time_ms) as avg_processing_time,
                AVG(confidence_score) as avg_confidence
            FROM smartscan_metrics
            WHERE timestamp > ?
            """,
            (time_threshold,),
        )
        total, successful, avg_time, avg_conf = cursor.fetchone()
        if total == 0:
            print("No scan data available.")
            conn.close()
            return
        success_rate = (successful / total) * 100 if total else 0
        print(f"Total Scans: {total} | Success: {success_rate:.1f}% | Avg Time: {avg_time:.0f}ms | Avg Conf: {avg_conf:.2f}")

        cursor.execute(
            """
            SELECT
                scan_type,
                COUNT(*) as count,
                AVG(processing_time_ms) as avg_time,
                AVG(confidence_score) as avg_conf,
                SUM(CASE WHEN ocr_success THEN 1 ELSE 0 END) as ocr_successes,
                SUM(CASE WHEN standard_match THEN 1 ELSE 0 END) as standard_matches
            FROM smartscan_metrics
            WHERE timestamp > ?
            GROUP BY scan_type
            """,
            (time_threshold,),
        )
        for scan_type, count, avg_time, avg_conf, ocr_success, std_match in cursor.fetchall():
            print(
                f"  {scan_type.upper()}: {count} scans | Avg Time {avg_time:.0f}ms | "
                f"Avg Conf {avg_conf:.2f} | OCR {ocr_success}/{count} | StdMatch {std_match}/{count}"
            )

        cursor.execute(
            """
            SELECT
                standard_name,
                COUNT(*) as count,
                AVG(match_score) as avg_score
            FROM standard_matches
            WHERE timestamp > ?
            GROUP BY standard_name
            ORDER BY count DESC
            LIMIT 5
            """,
            (time_threshold,),
        )
        rows = cursor.fetchall()
        if rows:
            print("\nTop Egyptian Standard Matches:")
            for std_name, count, avg_score in rows:
                print(f"  {std_name}: {count} matches | Avg score {avg_score:.2f}")

        conn.close()

    def check_performance_thresholds(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT COUNT(*) FROM smartscan_metrics
            WHERE processing_time_ms > 10000 AND timestamp > datetime('now', '-1 hour') AND success = TRUE
            """
        )
        slow_scans = cursor.fetchone()[0]
        if slow_scans > 0:
            cursor.execute(
                """
                INSERT INTO performance_alerts
                (timestamp, alert_type, metric, value, threshold, description)
                VALUES (datetime('now'), 'performance', 'slow_scans', ?, 0,
                        'Found scans taking >10 seconds. Check system load.')
                """,
                (slow_scans,),
            )
        cursor.execute(
            """
            SELECT COUNT(*) FROM smartscan_metrics
            WHERE confidence_score < 0.5 AND timestamp > datetime('now', '-1 hour') AND success = TRUE
            """
        )
        low_conf = cursor.fetchone()[0]
        if low_conf > 0:
            cursor.execute(
                """
                INSERT INTO performance_alerts
                (timestamp, alert_type, metric, value, threshold, description)
                VALUES (datetime('now'), 'quality', 'low_confidence_scans', ?, 0,
                        'Scans with confidence < 50%. Check image quality.')
                """,
                (low_conf,),
            )
        conn.commit()
        conn.close()


def main():
    monitor = SmartScanMonitor()
    print("🔍 SmartScan v2.0 Enhanced Monitor")
    print("=" * 50)
    data = monitor.parse_structured_logs()
    if data["metrics"]:
        print(f"Found {len(data['metrics'])} scan records in latest log")
        monitor.store_metrics(data)
        monitor.generate_report(hours=1)
        monitor.generate_report(hours=24)
        monitor.check_performance_thresholds()
    else:
        print("No scan data found. Ensure structured logging is enabled.")


if __name__ == "__main__":
    main()

