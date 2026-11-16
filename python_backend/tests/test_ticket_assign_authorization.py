"""Gateway assign authorization: admin/support only (not technician/sales_rep)."""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import MagicMock
from uuid import UUID

import pytest

from fastapi import Request


TICKET_ID = UUID("84e83212-edee-456d-8a18-afa160147251")
ASSIGNEE_ID = UUID("e2000000-0000-4000-8000-000000000002")
ACTOR_ID = UUID("e2000000-0000-4000-8000-000000000099")


@pytest.fixture
def tickets_mod(monkeypatch):
    # Minimal stubs so tickets.py can import.
    stubs = {
        "models.api_v2_models": ModuleType("models.api_v2_models"),
        "apis.v2.services.ticket_service": ModuleType("apis.v2.services.ticket_service"),
        "apis.v2.core.errors": ModuleType("apis.v2.core.errors"),
        "apis.v2.deps": ModuleType("apis.v2.deps"),
        "supabase": ModuleType("supabase"),
    }
    # Populate enums/models lightly
    models = stubs["models.api_v2_models"]
    for name in (
        "SupportTicketCreate",
        "PreventiveMaintenanceTicketCreate",
        "ScheduledMaintenanceTicketCreate",
        "EmergencyServiceTicketCreate",
        "ProductQuoteTicketCreate",
        "AddToQuoteTicketCreate",
        "TicketResponse",
        "TicketStatus",
        "TicketCategory",
    ):
        setattr(models, name, object)

    errors = stubs["apis.v2.core.errors"]

    class V2ForbiddenError(Exception):
        def __init__(self, message, required_role=None, user_role=None, context=None):
            super().__init__(message)
            self.message = message
            self.required_role = required_role
            self.user_role = user_role
            self.context = context

    class TicketValidationError(Exception):
        pass

    class TicketPermissionError(Exception):
        pass

    class TicketNotFoundError(Exception):
        pass

    errors.V2ForbiddenError = V2ForbiddenError
    errors.TicketValidationError = TicketValidationError
    errors.TicketPermissionError = TicketPermissionError
    errors.TicketNotFoundError = TicketNotFoundError
    errors.handle_supabase_error = MagicMock()
    errors.create_error_context = MagicMock(return_value={"op": "assign"})
    errors.COMMON_ERROR_RESPONSES = {}

    svc_mod = stubs["apis.v2.services.ticket_service"]

    class TicketService:
        def __init__(self, supabase):
            self.supabase = supabase
            self.assign_ticket = MagicMock(
                return_value={"id": str(TICKET_ID), "status": "assigned"}
            )

    svc_mod.TicketService = TicketService

    deps = stubs["apis.v2.deps"]
    deps.get_supabase = MagicMock()
    deps.get_current_user = MagicMock()

    stubs["supabase"].Client = object

    for name, mod in stubs.items():
        monkeypatch.setitem(sys.modules, name, mod)
        # Also set parent packages lightly
        parts = name.split(".")
        for i in range(1, len(parts)):
            pkg = ".".join(parts[:i])
            if pkg not in sys.modules:
                monkeypatch.setitem(sys.modules, pkg, ModuleType(pkg))

    root = Path(__file__).resolve().parents[1]
    # Ensure apis.v2.tickets path import works via file location
    spec = importlib.util.spec_from_file_location(
        "tickets_assign_auth_test", root / "apis/v2/tickets.py"
    )
    module = importlib.util.module_from_spec(spec)
    monkeypatch.setitem(sys.modules, "tickets_assign_auth_test", module)
    spec.loader.exec_module(module)
    return module, V2ForbiddenError, TicketService


def _request() -> Request:
    return Request({"type": "http", "headers": [], "method": "POST", "path": "/x"})


@pytest.mark.parametrize("role", ["admin", "support"])
def test_assign_allowed_for_admin_and_support(tickets_mod, role):
    tickets, _, TicketService = tickets_mod
    user = {"id": str(ACTOR_ID), "sub": str(ACTOR_ID), "role": role}
    # Patch _service to return a service with spy
    svc = TicketService(None)
    tickets._service = lambda _sb: svc  # type: ignore
    result = tickets.assign_ticket(
        _request(),
        TICKET_ID,
        ASSIGNEE_ID,
        supabase=MagicMock(),
        current_user=user,
    )
    assert result["status"] == "assigned"
    svc.assign_ticket.assert_called_once()


@pytest.mark.parametrize("role", ["customer", "technician", "sales_rep", None])
def test_assign_denied_for_non_assigners(tickets_mod, role):
    tickets, V2ForbiddenError, TicketService = tickets_mod
    user = {"id": str(ACTOR_ID), "sub": str(ACTOR_ID), "role": role}
    svc = TicketService(None)
    tickets._service = lambda _sb: svc  # type: ignore
    with pytest.raises(V2ForbiddenError) as err:
        tickets.assign_ticket(
            _request(),
            TICKET_ID,
            ASSIGNEE_ID,
            supabase=MagicMock(),
            current_user=user,
        )
    assert "admin/support" in err.value.message
    svc.assign_ticket.assert_not_called()
