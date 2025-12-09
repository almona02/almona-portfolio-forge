"""Integration tests - skipped in CI due to v2 auth/token requirements."""

import pytest  # type: ignore

pytest.skip(
    "Integration tests skipped in CI (v2 auth/token not available)",
    allow_module_level=True,
)
