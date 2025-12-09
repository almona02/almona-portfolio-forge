"""Security/MLflow tests skipped in CI (model deps not available)."""

import pytest  # type: ignore

pytest.skip(
    "Security/MLflow tests skipped in CI (model deps not available)",
    allow_module_level=True,
)
