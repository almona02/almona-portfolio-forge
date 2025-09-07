from datetime import datetime, timedelta
from ai_services.predictive_maintenance import calculate_next_service


def test_known_model_usage():
    installed = datetime.utcnow() - timedelta(days=10)
    usage_hours = 100.0
    next_service = calculate_next_service(installed, usage_hours, "AIM 7420")
    assert isinstance(next_service, datetime)


def test_unknown_model_no_usage():
    installed = datetime.utcnow() - timedelta(days=200)
    next_service = calculate_next_service(installed, None, "UNKNOWN MODEL")
    assert next_service > installed


def test_overdue_service():
    installed = datetime.utcnow() - timedelta(days=400)
    usage_hours = 10000.0
    next_service = calculate_next_service(installed, usage_hours, "CDC 600")
    # if overdue, should return now (or within a few seconds)
    assert (datetime.utcnow() - next_service).total_seconds() < 5
