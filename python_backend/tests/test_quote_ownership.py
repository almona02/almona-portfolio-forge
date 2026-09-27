from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import Mock
import sys

from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from httpx import ConnectError
import pytest
from supabase import AuthApiError

from apis.v2.services.quote_ownership import resolve_quote_owner

OWNER = '00000000-0000-0000-0000-000000000001'
OTHER = '00000000-0000-0000-0000-000000000002'


@pytest.fixture
def database():
    client = Mock()
    client.auth.get_user.return_value = SimpleNamespace(user=SimpleNamespace(id=OWNER))
    return client


def test_guest_is_ownerless_without_auth_call(database):
    assert resolve_quote_owner(database, None, None) is None
    database.auth.get_user.assert_not_called()


@pytest.mark.parametrize('hint', [OWNER, OTHER, ''])
def test_guest_cannot_claim_owner(database, hint):
    with pytest.raises(HTTPException) as error:
        resolve_quote_owner(database, None, hint)
    assert error.value.status_code == 401
    database.auth.get_user.assert_not_called()


@pytest.mark.parametrize('header', ['', 'Bearer', 'Basic value', 'Bearer one two'])
def test_malformed_credentials_are_not_treated_as_guest(database, header):
    with pytest.raises(HTTPException) as error:
        resolve_quote_owner(database, header, None)
    assert error.value.status_code == 401
    database.auth.get_user.assert_not_called()


@pytest.mark.parametrize('hint', [None, OWNER])
def test_verified_user_is_authoritative(database, hint):
    assert resolve_quote_owner(database, 'bearer test-token', hint) == OWNER
    database.auth.get_user.assert_called_once_with('test-token')
    database.auth.set_session.assert_not_called()


@pytest.mark.parametrize('hint', [OTHER, 'invalid-id', ''])
def test_authenticated_user_cannot_claim_another_owner(database, hint):
    with pytest.raises(HTTPException) as error:
        resolve_quote_owner(database, 'Bearer test-token', hint)
    assert error.value.status_code == 403


@pytest.mark.parametrize('upstream_status, expected', [(401, 401), (403, 401), (429, 503), (500, 503)])
def test_auth_failures_fail_closed_without_leaking_details(database, upstream_status, expected):
    database.auth.get_user.side_effect = AuthApiError('private-auth-detail', upstream_status, 'bad_jwt')
    with pytest.raises(HTTPException) as error:
        resolve_quote_owner(database, 'Bearer test-token', None)
    assert error.value.status_code == expected
    assert 'private-auth-detail' not in error.value.detail


def test_network_failure_is_not_guest_fallback(database):
    database.auth.get_user.side_effect = ConnectError('private-network-detail')
    with pytest.raises(HTTPException) as error:
        resolve_quote_owner(database, 'Bearer test-token', None)
    assert error.value.status_code == 503


@pytest.mark.parametrize('user', [None, SimpleNamespace(id=None), SimpleNamespace(id='invalid')])
def test_missing_or_invalid_verified_identity_is_rejected(database, user):
    database.auth.get_user.return_value = SimpleNamespace(user=user)
    with pytest.raises(HTTPException) as error:
        resolve_quote_owner(database, 'Bearer test-token', None)
    assert error.value.status_code == 401


@pytest.fixture
def http_route(database, monkeypatch):
    # Load the real quote router; isolate only unrelated ERP startup and DB wiring.
    deps = ModuleType('apis.v2.deps')
    deps.get_supabase = lambda: database
    erp = ModuleType('tasks.erp_tasks')
    erp.dispatch_invoice_task = Mock()
    monkeypatch.setitem(sys.modules, 'apis.v2.deps', deps)
    monkeypatch.setitem(sys.modules, 'tasks.erp_tasks', erp)
    path = Path(__file__).resolve().parents[1] / 'apis/v2/quotes.py'
    spec = spec_from_file_location('quote_router_ownership_test', path)
    assert spec and spec.loader
    route = module_from_spec(spec)
    spec.loader.exec_module(route)
    service = Mock()
    service.create_quote_with_items.return_value = {
        'id': OTHER, 'quote_number': 'QT-000001', 'status': 'pending',
        'total_amount': 0, 'digital_twin_code': None, 'portal_reference': None,
        'related_service_ticket_id': None, 'created_at': '2026-09-22T00:00:00Z',
    }
    monkeypatch.setattr(route, 'QuoteService', Mock(return_value=service))
    app = FastAPI()
    app.include_router(route.router, prefix='/api/v2')
    with TestClient(app) as client:
        yield client, service


@pytest.mark.parametrize('token, hint, status', [
    (None, None, 201), (None, OWNER, 401),
    ('Bearer test-token', None, 201), ('Bearer test-token', OWNER, 201),
    ('Bearer test-token', OTHER, 403), ('Basic wrong', OWNER, 401),
])
def test_real_route_checks_identity_before_persistence(http_route, token, hint, status):
    client, service = http_route
    payload = {
        'contact_name': 'Test', 'contact_email': 'test@example.invalid',
        'services': [{'service_id': 'maintenance', 'quantity': 1}],
    }
    if hint is not None:
        payload['user_id'] = hint
    headers = {'Authorization': token} if token else {}
    response = client.post('/api/v2/quotes/create', json=payload, headers=headers)
    assert response.status_code == status
    if status == 201:
        stored = service.create_quote_with_items.call_args.args[0]
        assert stored['user_id'] == (OWNER if token else None)
    else:
        service.create_quote_with_items.assert_not_called()
