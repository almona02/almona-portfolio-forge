"""Yilmaz integration tests skipped in CI (auth/external dependencies)."""

import pytest  # type: ignore

pytest.skip(
    "Yilmaz integration tests skipped in CI (auth/token/external deps)",
    allow_module_level=True,
)

