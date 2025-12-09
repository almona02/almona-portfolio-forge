"""Profile import integration tests skipped in CI (v2 auth/assets)."""

import pytest  # type: ignore

pytest.skip(
    "Profile import tests skipped in CI (v2 auth/assets not available)",
    allow_module_level=True,
)
