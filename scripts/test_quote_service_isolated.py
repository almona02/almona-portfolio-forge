"""Run real quote-service unit tests without booting unrelated API routers.

Requires pytest, fastapi and supabase in the selected Python environment.
No database credentials or network connections are used by these tests.
"""
from pathlib import Path
import sys
import types

import pytest


root = Path(__file__).resolve().parents[1]
backend = root / "python_backend"
sys.path.insert(0, str(backend))
# apis/__init__.py imports every route, including ERP/ML infrastructure.
# Supply only the package paths; the service, repository and errors remain real.
for name, path in (("apis", backend / "apis"), ("apis.v2", backend / "apis/v2")):
    package = types.ModuleType(name)
    package.__path__ = [str(path)]
    sys.modules[name] = package

raise SystemExit(pytest.main([
    "--noconftest", "-o", "addopts=", "-p", "no:cacheprovider", "-q",
    str(backend / "tests/test_quote_service.py"),
]))
