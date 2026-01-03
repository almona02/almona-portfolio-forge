"""
Almona-RealityOS Integration Setup

This module provides a factory function to set up the complete integration
between Almona calibration system and RealityOS Event Ledger.

Usage:
    from python_backend.adapters.setup_integration import setup_almona_realityos_integration
    
    # Initialize integration
    integration = setup_almona_realityos_integration(
        database_url="postgresql://...",
        vertical_secrets={"almona_vertical": "secret_key"},
    )
    
    # Get wrapped transaction manager
    wrapped_tx_manager = integration["transaction_manager"]
    
    # Use wrapped manager in CalibrationSafetyNet
    safety_net = CalibrationSafetyNet()
    safety_net.transaction_manager = wrapped_tx_manager
"""

import logging
from typing import Dict, Any, Optional

from realityos_core.capture_gateway.gateway_skeleton import (
    RealityCaptureGateway,
)
from realityos_core.event_ledger import EventLedger

from python_backend.adapters.almona_realityos_adapter import (
    AlmonaRealityOSAdapter,
)
from python_backend.adapters.almona_integration import (
    AlmonaIntegrationWrapper,
)
from ai_services.calibration.calibration_transactions import (
    CalibrationTransactionManager,
)

logger = logging.getLogger(__name__)


def setup_almona_realityos_integration(
    database_url: str,
    vertical_secrets: Dict[str, str],
    enable_dual_write: bool = True,
    enable_retry: bool = True,
) -> Dict[str, Any]:
    """
    Set up complete Almona-RealityOS integration.

    Args:
        database_url: PostgreSQL connection URL for RealityOS Event Ledger
        vertical_secrets: Mapping of vertical_id → secret_key for QR signing
        enable_dual_write: Whether to enable dual-write (default: True)
        enable_retry: Whether to enable retry logic (default: True)

    Returns:
        Dictionary with:
            - "adapter": AlmonaRealityOSAdapter instance
            - "integration_wrapper": AlmonaIntegrationWrapper instance
            - "transaction_manager": Wrapped CalibrationTransactionManager
            - "event_ledger": EventLedger instance
            - "gateway": RealityCaptureGateway instance
    """
    logger.info("Setting up Almona-RealityOS integration...")

    # 1. Initialize RealityOS components
    event_ledger = EventLedger(database_url)
    gateway = RealityCaptureGateway(
        database_url=database_url,
        vertical_secrets=vertical_secrets,
        event_ledger=event_ledger,
        enable_fraud_detection=True,
    )

    # 2. Initialize Almona transaction manager (original)
    almona_tx_manager = CalibrationTransactionManager()

    # 3. Create adapter
    adapter = AlmonaRealityOSAdapter(
        almona_transaction_manager=almona_tx_manager,
        realityos_gateway=gateway,
        realityos_ledger=event_ledger,
        vertical_id="almona_vertical",
        enable_retry=enable_retry,
    )

    # 4. Create integration wrapper
    integration_wrapper = AlmonaIntegrationWrapper(adapter)
    if not enable_dual_write:
        integration_wrapper.disable()

    # 5. Wrap transaction manager methods
    wrapped_tx_manager = CalibrationTransactionManager()
    wrapped_tx_manager._supabase = almona_tx_manager._supabase

    # Wrap certify_baseline_transactional
    original_certify = almona_tx_manager.certify_baseline_transactional
    wrapped_certify = integration_wrapper.wrap_certify_baseline(
        original_certify
    )
    wrapped_tx_manager.certify_baseline_transactional = wrapped_certify

    # Wrap log_anomaly_transactional
    original_log_anomaly = almona_tx_manager.log_anomaly_transactional
    wrapped_log_anomaly = integration_wrapper.wrap_log_anomaly(
        original_log_anomaly
    )
    wrapped_tx_manager.log_anomaly_transactional = wrapped_log_anomaly

    # Copy other methods unchanged
    wrapped_tx_manager.freeze_calibration_transactional = (
        almona_tx_manager.freeze_calibration_transactional
    )
    wrapped_tx_manager.get_baseline_with_status = (
        almona_tx_manager.get_baseline_with_status
    )

    logger.info("Almona-RealityOS integration setup complete")

    return {
        "adapter": adapter,
        "integration_wrapper": integration_wrapper,
        "transaction_manager": wrapped_tx_manager,
        "event_ledger": event_ledger,
        "gateway": gateway,
    }


def enable_integration(integration: Dict[str, Any]):
    """Enable dual-write operations."""
    integration["integration_wrapper"].enable()
    logger.info("Dual-write enabled")


def disable_integration(integration: Dict[str, Any]):
    """Disable dual-write operations (fallback to Almona only)."""
    integration["integration_wrapper"].disable()
    logger.info("Dual-write disabled")

