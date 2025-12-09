"""Chaos engineering tests - skipped in CI due to missing assets and auth."""

import pytest  # type: ignore

# Skip all chaos tests in CI; they rely on local assets and valid API keys
pytest.skip(
    "Chaos tests skipped in CI (missing test assets / auth requirements)",
    allow_module_level=True,
)
