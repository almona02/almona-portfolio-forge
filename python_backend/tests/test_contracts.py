"""Contract tests - skipped in CI due to missing image assets and auth requirements."""

import pytest  # type: ignore

# Skip this entire module to avoid missing assets/auth failures in CI
pytest.skip(
    "Contract tests skipped in CI (missing test image assets / auth requirements)",
    allow_module_level=True,
)

