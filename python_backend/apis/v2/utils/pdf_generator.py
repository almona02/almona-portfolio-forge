"""PDF generation utility for export functionality."""

from __future__ import annotations

import io
import json
from typing import Any, Dict, List

try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.platypus import (
        SimpleDocTemplate,
        Table,
        TableStyle,
        Paragraph,
        Spacer,
        PageBreak,
    )
except ImportError:
    SimpleDocTemplate = None  # type: ignore


def generate_pdf_from_data(data: List[Dict[str, Any]]) -> bytes:
    """
    Generate PDF file from list of dictionaries.

    Args:
        data: List of dictionaries (each dict represents a row)

    Returns:
        PDF file as bytes
    """
    if SimpleDocTemplate is None:
        raise ImportError(
            "reportlab is required for PDF generation. "
            "Install it with: pip install reportlab"
        )

    # Create PDF in memory
    buffer = io.BytesIO()

    # Create document (A4 size)
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=18,
    )

    # Container for PDF elements
    elements = []

    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "CustomTitle",
        parent=styles["Heading1"],
        fontSize=16,
        textColor=colors.HexColor("#366092"),
        spaceAfter=30,
        alignment=1,  # Center
    )

    # Add title
    title = Paragraph("Query Export", title_style)
    elements.append(title)
    elements.append(Spacer(1, 0.2 * inch))

    if not data:
        # Add message for empty data
        empty_msg = Paragraph(
            "No data available for export.", styles["Normal"]
        )
        elements.append(empty_msg)
        doc.build(elements)
        return buffer.getvalue()

    # Extract headers from first row keys
    headers = list(data[0].keys())

    # Prepare table data
    table_data = [headers]  # Header row

    # Add data rows (limit to 1000 rows to prevent PDF from being too large)
    max_rows = 1000
    for row_data in data[:max_rows]:
        row = []
        for header in headers:
            value = row_data.get(header)
            if isinstance(value, (dict, list)):
                import json
                formatted_value = json.dumps(value, default=str)
            elif value is None:
                formatted_value = ""
            else:
                formatted_value = str(value)
            # Truncate long values
            if len(formatted_value) > 100:
                formatted_value = formatted_value[:97] + "..."
            row.append(formatted_value)
        table_data.append(row)

    # Create table
    table = Table(table_data, repeatRows=1)

    # Apply table style
    table.setStyle(
        TableStyle(
            [
                # Header row
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#366092")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 10),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                ("TOPPADDING", (0, 0), (-1, 0), 12),
                # Data rows
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 1), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 1, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )

    elements.append(table)

    # Add note if rows were truncated
    if len(data) > max_rows:
        elements.append(Spacer(1, 0.2 * inch))
        note = Paragraph(
            f"Note: Only first {max_rows} rows shown. "
            f"Total rows: {len(data)}",
            styles["Normal"],
        )
        elements.append(note)

    # Build PDF
    doc.build(elements)
    return buffer.getvalue()
