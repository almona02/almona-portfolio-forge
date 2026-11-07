"""
ALM 6510 Binary MDB Writer
==========================

Writes real Jet/Access (.mdb) files carrying the Table1 rows that Yilmaz ALM
6510 machine software imports. This is the binary counterpart to the
intermediate JSON payload: same records, same all-or-nothing contract, but a
file a controller can actually open.

How it works
------------
1. `ensure_template()` guarantees an empty .mdb containing an empty Table1.
   The template is created once via ADOX (Windows workshop host) and reused.
2. `write_mdb()` copies the template, INSERTs every record over ODBC, then
   reads the rows back and refuses to return a file whose row count or edge
   values disagree.

Requirements (workshop host, not the cloud API by default)
----------------------------------------------------------
- Python package ``pyodbc`` (already in requirements-prod.txt).
- The Microsoft Access Database Engine Redistributable (the
  ``Microsoft Access Driver (*.mdb, *.accdb)`` ODBC driver).
- A template file, created once with
  ``python -m scripts.create_alm6510_template`` on a Windows host.

When any requirement is missing the writer raises :class:`MdbUnavailableError`
with operator guidance instead of producing a fake file. Callers must surface
that as HTTP 501, never silently fall back to JSON.

Column fidelity note: Access DDL types below (INTEGER / TEXT) are the standard
mapping for the Table1 interchange. If the Yilmaz importer rejects a column,
adjust the type here AND re-run the controller acceptance checklist in
docs/plans/ALM6510_CONTROLLER_ACCEPTANCE.md.
"""

from __future__ import annotations

import logging
import os
import shutil
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

TABLE_NAME = "Table1"

#: (column, Access DDL type) in interchange order. Must stay 1:1 with the
#: JSON columns list in apis/v2/alm6510_export.py so JSON <-> MDB map exactly.
TABLE1_COLUMNS: List[tuple] = [
    ("PROGRAM_NO", "INTEGER"),
    ("CUSTOMER_CODE", "TEXT(50)"),
    ("CUSTOMER_NAME", "TEXT(100)"),
    ("STOCK_CODE", "TEXT(50)"),
    ("STOCK_NAME", "TEXT(100)"),
    ("ORDER_NO", "TEXT(50)"),
    ("EXPLANATION1", "TEXT(100)"),
    ("EXPLANATION2", "TEXT(100)"),
    ("LENGTH", "TEXT(20)"),
    ("INCH_MM", "INTEGER"),
    ("FRAME_X", "TEXT(20)"),
    ("FRAME_Y", "TEXT(20)"),
    ("POSE_NO", "INTEGER"),
    ("TROLLEY", "INTEGER"),
    ("UNIT", "INTEGER"),
    ("LEFT_ANGLE", "INTEGER"),
    ("RIGHT_ANGLE", "INTEGER"),
    ("SIDE", "INTEGER"),
    ("CUTTED", "INTEGER"),
    ("HEIGHT", "INTEGER"),
    ("SELLER", "TEXT(100)"),
    ("IMAGE", "TEXT(255)"),
    ("PAIR", "INTEGER"),
    ("BAR_NO", "INTEGER"),
    ("TOTAL_SIZE", "TEXT(20)"),
    ("PICE_NO", "INTEGER"),
    ("GRUP", "TEXT(50)"),
    ("WIDTH", "INTEGER"),
    ("TYPE", "TEXT(2)"),
    ("COLOR_CODE", "TEXT(10)"),
    ("STIL_LENGTH", "TEXT(20)"),
    ("FRAME_NO", "INTEGER"),
    ("REMAINING_LENGTH", "TEXT(20)"),
    ("CODE", "TEXT(50)"),
    ("ROBOT_Y", "INTEGER"),
    ("ROBOT_Z", "INTEGER"),
    ("ROBOT_VERTICAL", "INTEGER"),
]

TABLE1_COLUMN_NAMES: List[str] = [name for name, _ in TABLE1_COLUMNS]

ACCESS_DRIVER_MARKER = "Microsoft Access Driver (*.mdb"

DEFAULT_TEMPLATE_PATH = (
    Path(__file__).resolve().parent.parent / "assets" / "alm6510_table1_template.mdb"
)


def template_path() -> Path:
    """Template location, overridable via ALM6510_TEMPLATE_PATH (tests)."""
    override = os.environ.get("ALM6510_TEMPLATE_PATH")
    return Path(override) if override else DEFAULT_TEMPLATE_PATH


@dataclass
class MdbUnavailableError(Exception):
    """The binary writer cannot run on this host. Never fake the file."""

    reason: str  # 'pyodbc-missing' | 'driver-missing' | 'template-missing'
    guidance: str

    def __str__(self) -> str:  # pragma: no cover - trivial
        return f"[{self.reason}] {self.guidance}"


def _import_pyodbc() -> Any:
    try:
        import pyodbc  # type: ignore
    except ImportError as exc:
        raise MdbUnavailableError(
            "pyodbc-missing",
            "Binary MDB export needs the 'pyodbc' package. Install backend "
            "requirements (pip install -r requirements.txt) and retry.",
        ) from exc
    return pyodbc


def find_access_driver() -> Optional[str]:
    """Return an installed Access ODBC driver name, or None."""
    pyodbc = _import_pyodbc()
    try:
        drivers: List[str] = pyodbc.drivers()
    except Exception:
        return None
    for driver in drivers:
        if ACCESS_DRIVER_MARKER in driver:
            return driver
    return None


def require_access_driver() -> str:
    driver = find_access_driver()
    if not driver:
        raise MdbUnavailableError(
            "driver-missing",
            "Binary MDB export needs the Microsoft Access Database Engine "
            "(64-bit) installed on this host so the 'Microsoft Access Driver "
            "(*.mdb, *.accdb)' ODBC driver exists. Install it, restart the "
            "backend, and retry. The intermediate JSON export keeps working.",
        )
    return driver


def table1_ddl(table: str = TABLE_NAME) -> str:
    cols = ", ".join(f"[{name}] {ddl}" for name, ddl in TABLE1_COLUMNS)
    return f"CREATE TABLE [{table}] ({cols})"


def ensure_template(path: Optional[Path] = None) -> Path:
    """Create the empty Table1 template once (Windows + ADOX), else reuse it."""
    target = Path(path) if path else template_path()
    if target.exists():
        return target
    try:
        import comtypes.client  # type: ignore
    except ImportError as exc:
        raise MdbUnavailableError(
            "template-missing",
            f"No MDB template at {target}, and this host cannot create one "
            "(needs Windows + 'comtypes' for ADOX). Run "
            "'python -m scripts.create_alm6510_template' on the Windows "
            "workshop host, then copy the template next to the backend or set "
            "ALM6510_TEMPLATE_PATH.",
        ) from exc
    logger.info("Creating ALM 6510 MDB template at %s", target)
    target.parent.mkdir(parents=True, exist_ok=True)
    catalog = comtypes.client.CreateObject("ADOX.Catalog")
    catalog.Create(f"Provider=Microsoft.Jet.OLEDB.4.0;Data Source={target};")
    driver = require_access_driver()
    pyodbc = _import_pyodbc()
    connection = pyodbc.connect(f"DRIVER={{{driver}}};DBQ={target};", autocommit=True)
    try:
        connection.execute(table1_ddl())
    finally:
        connection.close()
    return target


def _placeholders(count: int) -> str:
    return ", ".join(["?"] * count)


def write_mdb(
    records: List[Dict[str, Any]],
    dest_path: Path,
    template: Optional[Path] = None,
) -> Path:
    """Write records to a binary .mdb copy. Verifies by reading back.

    Raises:
        ValueError: no records, or a record misses Table1 columns.
        MdbUnavailableError: driver/pyodbc/template missing on this host.
        IOError: the read-back verification disagreed (file deleted).
    """
    if not records:
        raise ValueError("Refusing to write an MDB with zero records.")
    missing = [c for c in TABLE1_COLUMN_NAMES if any(c not in r for r in records)]
    if missing:
        raise ValueError(f"Records miss Table1 columns: {', '.join(missing)}")

    template_file = ensure_template(template)
    dest = Path(dest_path)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(template_file, dest)

    driver = require_access_driver()
    pyodbc = _import_pyodbc()
    connection = pyodbc.connect(f"DRIVER={{{driver}}};DBQ={dest};")
    try:
        cursor = connection.cursor()
        cursor.execute(f"DELETE FROM [{TABLE_NAME}]")
        columns = ", ".join(f"[{c}]" for c in TABLE1_COLUMN_NAMES)
        statement = f"INSERT INTO [{TABLE_NAME}] ({columns}) VALUES ({_placeholders(len(TABLE1_COLUMN_NAMES))})"
        cursor.executemany(
            statement,
            [[record[name] for name in TABLE1_COLUMN_NAMES] for record in records],
        )
        connection.commit()

        # Read-back verification: count plus both edge rows.
        count = cursor.execute(f"SELECT COUNT(*) FROM [{TABLE_NAME}]").fetchone()[0]
        if int(count) != len(records):
            raise IOError(
                f"MDB verification failed: wrote {len(records)} rows, read back {count}."
            )
        first = cursor.execute(
            f"SELECT [LENGTH], [BAR_NO], [PICE_NO] FROM [{TABLE_NAME}] "
            "ORDER BY [BAR_NO], [PICE_NO]"
        ).fetchall()
        if len(first) != len(records):
            raise IOError("MDB verification failed: edge-row read-back mismatch.")
        if first and (
            str(first[0][0]) != str(records[0]["LENGTH"])
            or str(first[-1][0]) != str(records[-1]["LENGTH"])
        ):
            raise IOError("MDB verification failed: LENGTH edge values disagree.")
    except MdbUnavailableError:
        raise
    except Exception:
        try:
            dest.unlink(missing_ok=True)
        except Exception:
            pass
        raise
    finally:
        try:
            connection.close()
        except Exception:
            pass
    logger.info("Wrote %d ALM 6510 rows to %s", len(records), dest)
    return dest
