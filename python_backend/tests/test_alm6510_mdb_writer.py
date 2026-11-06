"""
Tests for the ALM 6510 Binary MDB Writer
========================================

pyodbc/ODBC are faked: these tests prove the writer's contract (column
coverage, all-rows insert, read-back verification, honest unavailability)
without an Access driver installed.
"""

import sys
import types
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent))

from apis.v2.alm6510_export import ALM6510CutRecord  # noqa: E402
from services import alm6510_mdb_writer as writer  # noqa: E402
from services.alm6510_mdb_writer import MdbUnavailableError  # noqa: E402


def _record(**overrides):
    values = {name: 1 for name in writer.TABLE1_COLUMN_NAMES}
    values.update(
        {
            "PROGRAM_NO": 1,
            "CUSTOMER_CODE": "C1",
            "CUSTOMER_NAME": "Customer",
            "STOCK_CODE": "FR60",
            "STOCK_NAME": "Frame 60",
            "ORDER_NO": "ORDER-1",
            "EXPLANATION1": "frame_top",
            "EXPLANATION2": "frame",
            "LENGTH": "15000",
            "FRAME_X": "5000",
            "FRAME_Y": "5000",
            "IMAGE": "",
            "TOTAL_SIZE": "15000",
            "TYPE": "A",
            "COLOR_CODE": "1",
            "STIL_LENGTH": "15000",
        }
    )
    values.update(overrides)
    return values


class FakeCursor:
    """Records writes; answers verification reads from what was written."""

    def __init__(self, connection):
        self.connection = connection
        self.statements = []
        self._result = []

    def execute(self, sql, *params):
        self.statements.append(sql)
        if "COUNT(*)" in sql:
            self._result = [(self.connection.reported_count,)]
        elif "ORDER BY" in sql:
            self._result = list(self.connection.edge_rows)
        else:
            self._result = []
        return self

    def executemany(self, sql, seq):
        self.statements.append(sql)
        rows = list(seq)
        self.connection.inserted_batches.append((sql, rows))
        self.connection.reported_count = len(rows)
        length_idx = writer.TABLE1_COLUMN_NAMES.index("LENGTH")
        self.connection.edge_rows = [(row[length_idx], None, None) for row in rows]
        return self

    def fetchone(self):
        return self._result[0]

    def fetchall(self):
        return self._result


class FakeConnection:
    def __init__(self):
        self.inserted_batches = []
        self.reported_count = 0
        self.edge_rows = []
        self.committed = False
        self.closed = False
        self.cursor_obj = FakeCursor(self)

    def cursor(self):
        return self.cursor_obj

    def commit(self):
        self.committed = True

    def close(self):
        self.closed = True


def _install_fake_pyodbc(monkeypatch, connection, drivers=("Microsoft Access Driver (*.mdb, *.accdb)",)):
    module = types.ModuleType("pyodbc")
    module.drivers = lambda: list(drivers)
    module.connect = lambda *args, **kwargs: connection
    monkeypatch.setitem(sys.modules, "pyodbc", module)
    return module


class TestTableContract:
    def test_columns_cover_every_record_field(self):
        model_keys = set(ALM6510CutRecord().dict().keys())
        assert set(writer.TABLE1_COLUMN_NAMES) == model_keys

    def test_ddl_mentions_every_column_once(self):
        ddl = writer.table1_ddl()
        for name in writer.TABLE1_COLUMN_NAMES:
            assert ddl.count(f"[{name}]") == 1


class TestWriteMdb:
    def test_writes_all_rows_and_verifies(self, monkeypatch, tmp_path):
        connection = FakeConnection()
        _install_fake_pyodbc(monkeypatch, connection)
        template = tmp_path / "tpl.mdb"
        template.write_bytes(b"fake-template")
        dest = tmp_path / "out.mdb"
        records = [_record(LENGTH="15000"), _record(LENGTH="9000", BAR_NO=2, PICE_NO=2)]

        result = writer.write_mdb(records, dest, template)

        assert result == dest
        assert dest.exists()
        assert connection.committed is True
        assert connection.closed is True
        assert connection.reported_count == 2
        assert len(connection.inserted_batches) == 1
        _, rows = connection.inserted_batches[0]
        assert len(rows) == 2
        assert all(len(row) == len(writer.TABLE1_COLUMN_NAMES) for row in rows)

    def test_count_mismatch_deletes_the_file(self, monkeypatch, tmp_path):
        connection = FakeConnection()
        _install_fake_pyodbc(monkeypatch, connection)
        template = tmp_path / "tpl.mdb"
        template.write_bytes(b"fake-template")
        dest = tmp_path / "out.mdb"

        real_executemany = FakeCursor.executemany

        def lying_executemany(self, sql, seq):
            real_executemany(self, sql, seq)
            self.connection.reported_count = 999  # corrupt read-back

        monkeypatch.setattr(FakeCursor, "executemany", lying_executemany)

        with pytest.raises(IOError, match="verification failed"):
            writer.write_mdb([_record()], dest, template)
        assert not dest.exists()

    def test_rejects_records_missing_columns(self, monkeypatch, tmp_path):
        connection = FakeConnection()
        _install_fake_pyodbc(monkeypatch, connection)
        template = tmp_path / "tpl.mdb"
        template.write_bytes(b"fake-template")
        dest = tmp_path / "out.mdb"

        with pytest.raises(ValueError, match="miss Table1 columns"):
            writer.write_mdb([{"LENGTH": "1"}], dest, template)
        assert not dest.exists()

    def test_rejects_empty_record_list(self, monkeypatch, tmp_path):
        connection = FakeConnection()
        _install_fake_pyodbc(monkeypatch, connection)
        with pytest.raises(ValueError, match="zero records"):
            writer.write_mdb([], tmp_path / "out.mdb", tmp_path / "tpl.mdb")


class TestUnavailabilityIsHonest:
    def test_missing_pyodbc_reports_install_guidance(self, monkeypatch):
        monkeypatch.setitem(sys.modules, "pyodbc", None)
        with pytest.raises(MdbUnavailableError) as exc_info:
            writer.find_access_driver()
        assert exc_info.value.reason == "pyodbc-missing"
        assert "pyodbc" in exc_info.value.guidance

    def test_missing_driver_reports_engine_guidance(self, monkeypatch):
        connection = FakeConnection()
        _install_fake_pyodbc(monkeypatch, connection, drivers=["SQLite3 ODBC Driver"])
        with pytest.raises(MdbUnavailableError) as exc_info:
            writer.require_access_driver()
        assert exc_info.value.reason == "driver-missing"
        assert "Access Database Engine" in exc_info.value.guidance

    def test_missing_template_without_comtypes_reports_workshop_step(self, monkeypatch, tmp_path):
        monkeypatch.setitem(sys.modules, "comtypes", None)
        with pytest.raises(MdbUnavailableError) as exc_info:
            writer.ensure_template(tmp_path / "absent.mdb")
        assert exc_info.value.reason == "template-missing"
        assert "create_alm6510_template" in exc_info.value.guidance

    def test_existing_template_is_reused_without_touching_comtypes(self, monkeypatch, tmp_path):
        monkeypatch.setitem(sys.modules, "comtypes", None)
        template = tmp_path / "tpl.mdb"
        template.write_bytes(b"fake-template")
        assert writer.ensure_template(template) == template
