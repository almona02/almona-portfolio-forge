"""Prevent the backend-only Docker policy from drifting from the frontend."""
import json
from pathlib import Path


def test_packaged_sla_policy_matches_canonical_policy():
    repository = Path(__file__).resolve().parents[2]
    canonical = repository / 'src/lib/ticketing/sla_policy.json'
    packaged = repository / 'python_backend/services/sla_policy.json'
    assert json.loads(packaged.read_text()) == json.loads(canonical.read_text())
