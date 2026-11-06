"""
Create the empty ALM 6510 Table1 MDB template (one-time workshop-host step).

Run on the Windows host that has the Access ODBC driver::

    python -m scripts.create_alm6510_template

The template is reused (copied) for every binary export. Requires the
``comtypes`` package (pip install comtypes) for ADOX creation.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.alm6510_mdb_writer import MdbUnavailableError, ensure_template


def main() -> int:
    try:
        path = ensure_template()
    except MdbUnavailableError as exc:
        print(f"Cannot create template: {exc.guidance}")
        return 2
    print(f"ALM 6510 template ready: {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
