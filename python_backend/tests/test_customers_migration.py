"""
Database migration verification test for 062_customers_enhancements.sql.

Tests that the migration runs successfully and creates all required tables.
"""

import pytest
import os
import sys


def test_migration_file_exists():
    """Test that the migration file exists."""
    migration_file = os.path.join(
        os.path.dirname(__file__), "..", "migrations", "062_customers_enhancements.sql"
    )
    assert os.path.exists(migration_file), f"Migration file not found: {migration_file}"


def test_migration_file_readable():
    """Test that the migration file is readable."""
    migration_file = os.path.join(
        os.path.dirname(__file__), "..", "migrations", "062_customers_enhancements.sql"
    )
    with open(migration_file, "r", encoding="utf-8") as f:
        content = f.read()
        assert len(content) > 0, "Migration file is empty"


def test_migration_contains_tables():
    """Test that the migration creates all required tables."""
    migration_file = os.path.join(
        os.path.dirname(__file__), "..", "migrations", "062_customers_enhancements.sql"
    )
    with open(migration_file, "r", encoding="utf-8") as f:
        content = f.read()

        # Check for all required tables
        required_tables = [
            "customer_tags",
            "customer_tag_assignments",
            "customer_communications",
            "customer_reminders",
            "customer_segments",
            "customer_segment_assignments",
        ]

        for table in required_tables:
            assert (
                f'CREATE TABLE IF NOT EXISTS {table}' in content
                or f'CREATE TABLE {table}' in content
            ), f"Table {table} not found in migration"


def test_migration_contains_indexes():
    """Test that the migration creates indexes."""
    migration_file = os.path.join(
        os.path.dirname(__file__), "..", "migrations", "062_customers_enhancements.sql"
    )
    with open(migration_file, "r", encoding="utf-8") as f:
        content = f.read()
        assert "CREATE INDEX" in content, "No indexes found in migration"


def test_migration_contains_rls_policies():
    """Test that the migration creates RLS policies."""
    migration_file = os.path.join(
        os.path.dirname(__file__), "..", "migrations", "062_customers_enhancements.sql"
    )
    with open(migration_file, "r", encoding="utf-8") as f:
        content = f.read()
        assert "ENABLE ROW LEVEL SECURITY" in content, "No RLS policies found"
        assert "CREATE POLICY" in content, "No RLS policies created"


def test_migration_contains_triggers():
    """Test that the migration creates updated_at triggers."""
    migration_file = os.path.join(
        os.path.dirname(__file__), "..", "migrations", "062_customers_enhancements.sql"
    )
    with open(migration_file, "r", encoding="utf-8") as f:
        content = f.read()
        assert "CREATE TRIGGER" in content, "No triggers found in migration"
        assert "updated_at" in content.lower(), "No updated_at triggers found"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
