"""CSV generation utility for export functionality."""

from __future__ import annotations

import csv
import io
import json
from typing import Any, Dict, List


def generate_csv_from_data(data: List[Dict[str, Any]]) -> bytes:
    """
    Generate CSV file from list of dictionaries.

    Args:
        data: List of dictionaries (each dict represents a row)

    Returns:
        CSV file as bytes (UTF-8 with BOM for Excel compatibility)
    """
    if not data:
        # Return empty CSV with headers if no data
        output = io.StringIO()
        writer = csv.writer(output)
        output_str = output.getvalue()
        return output_str.encode("utf-8-sig")

    # Extract headers from first row keys
    headers = list(data[0].keys())

    # Create CSV in memory
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=headers, extrasaction="ignore")

    # Write headers
    writer.writeheader()

    # Write data rows
    for row in data:
        # Flatten nested objects and format values
        flattened_row: Dict[str, Any] = {}
        for key, value in row.items():
            if isinstance(value, (dict, list)):
                # Convert complex types to JSON string
                flattened_row[key] = json.dumps(value, default=str)
            elif value is None:
                flattened_row[key] = ""
            else:
                flattened_row[key] = str(value)
        writer.writerow(flattened_row)

    # Get CSV string and encode with BOM for Excel compatibility
    output_str = output.getvalue()
    return output_str.encode("utf-8-sig")
