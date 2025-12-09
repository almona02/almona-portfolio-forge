"""Part Detection v1 tests skipped in CI (heavy ML deps not available)."""

import pytest  # type: ignore

pytest.skip(
    "Part Detection v1 tests skipped in CI (ML/model deps not available)",
    allow_module_level=True,
)
