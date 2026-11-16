"""FR-1: optional workflow tables fail closed; unrelated DB errors propagate."""
from __future__ import annotations

from uuid import uuid4

import pytest

from apis.v2.repositories.tickets import TicketsRepository, _relation_missing
from services.unified_ticket_service import UnifiedTicketService


class _Result:
    def __init__(self, data):
        self.data = data

    def execute(self):
        return self


class _RaisingQuery:
    def __init__(self, exc: BaseException):
        self._exc = exc

    def select(self, *_a, **_k):
        return self

    def eq(self, *_a, **_k):
        return self

    def in_(self, *_a, **_k):
        return self

    def order(self, *_a, **_k):
        return self

    def limit(self, *_a, **_k):
        return self

    def execute(self):
        raise self._exc


class _Client:
    def __init__(self, errors: dict[str, BaseException]):
        self.errors = errors

    def table(self, name: str):
        if name in self.errors:
            return _RaisingQuery(self.errors[name])
        return _RaisingQuery(RuntimeError(f"unexpected table access: {name}"))

    def rpc(self, *_a, **_k):
        return _Result(None)


def test_relation_missing_recognizes_absent_workflow_tables():
    assert _relation_missing(Exception('relation "service_jobs" does not exist'))
    assert _relation_missing(Exception("Could not find the table 'public.service_job_visits'"))
    assert _relation_missing(Exception("PGRST205: table not in schema cache"))
    assert not _relation_missing(Exception("connection timed out"))
    assert not _relation_missing(Exception("JWT expired"))
    assert not _relation_missing(Exception("permission denied for table service_tickets"))


def test_repo_job_helpers_fail_closed_when_tables_missing():
    missing = Exception('relation "service_jobs" does not exist')
    repo = TicketsRepository(
        _Client({"service_jobs": missing, "service_job_visits": missing})  # type: ignore[arg-type]
    )
    tid = uuid4()
    uid = uuid4()
    assert repo.technician_has_job_assignment(tid, uid) is False
    assert repo.technician_is_historical_attendee(tid, uid) is False
    assert repo.list_technician_related_ticket_ids(uid) == set()


def test_repo_job_helpers_propagate_unrelated_errors():
    boom = RuntimeError("connection timed out contacting PostgREST")
    repo = TicketsRepository(_Client({"service_jobs": boom}))  # type: ignore[arg-type]
    with pytest.raises(RuntimeError, match="connection timed out"):
        repo.technician_has_job_assignment(uuid4(), uuid4())
    with pytest.raises(RuntimeError, match="connection timed out"):
        repo.technician_is_historical_attendee(uuid4(), uuid4())
    with pytest.raises(RuntimeError, match="connection timed out"):
        repo.list_technician_related_ticket_ids(uuid4())


def test_unified_service_job_helpers_fail_closed_and_propagate():
    missing = Exception("PGRST205 Could not find the table public.service_jobs in the schema cache")
    svc = UnifiedTicketService(_Client({"service_jobs": missing, "service_job_visits": missing}))
    assert svc._technician_has_job(str(uuid4()), uuid4()) is False
    assert svc._technician_historical_attendee(str(uuid4()), uuid4()) is False

    boom = RuntimeError("upstream 503 from database pool")
    svc_err = UnifiedTicketService(_Client({"service_jobs": boom}))
    with pytest.raises(RuntimeError, match="upstream 503"):
        svc_err._technician_has_job(str(uuid4()), uuid4())
    with pytest.raises(RuntimeError, match="upstream 503"):
        svc_err._technician_historical_attendee(str(uuid4()), uuid4())
