"""Performance tests skipped in CI (v2 auth/token not available, timing-sensitive)."""

import pytest  # type: ignore

pytest.skip(
    "Performance tests skipped in CI (v2 auth/token not available, timing-sensitive)",
    allow_module_level=True,
)

