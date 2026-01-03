"""
Operation Mode System - Security Boundary for Production Hardening
===================================================================

Defines explicit operating modes (sandbox, production, certified) as a security
boundary. The mode is resolved once per request and passed explicitly through
all critical paths. This context is immutable per transaction.

This is the foundation for all hardening features:
- Calibration Safety Net
- CNC Export Contracts
- Fail-Loud Constraint Enforcement
- Deterministic Execution
"""

import logging
import os
import uuid
from dataclasses import dataclass
from enum import Enum
from typing import Optional

logger = logging.getLogger(__name__)


class OperationMode(str, Enum):
    """Explicit operating modes as security boundary."""
    SANDBOX = "sandbox"
    PRODUCTION = "production"
    CERTIFIED = "certified"


@dataclass(frozen=True)
class ExecutionContext:
    """
    Immutable execution context for a request.
    
    This is the security boundary - mode is resolved once per request
    and must remain unchanged throughout the transaction.
    """
    mode: OperationMode
    workshop_id: str
    user_id: Optional[str] = None
    trace_id: str = None  # type: ignore
    
    # Mode-derived capability flags
    locked_profiles: bool = False
    allow_manual_overrides: bool = True
    allow_experimental_features: bool = True
    allow_beta_features: bool = True
    require_verified_tuning: bool = False
    require_determinism: bool = False
    
    def __post_init__(self):
        """Generate trace_id if not provided."""
        if self.trace_id is None:
            object.__setattr__(self, 'trace_id', str(uuid.uuid4()))


class OperationModeManager:
    """Manages operation mode resolution and context creation."""
    
    @staticmethod
    def resolve(
        workshop_id: str,
        user_id: Optional[str] = None,
        explicit_mode: Optional[OperationMode] = None
    ) -> ExecutionContext:
        """
        Resolve operation mode for a request.
        
        Resolution order:
        1. Explicit mode (for admin/testing - use with caution)
        2. Workshop-level setting (from database)
        3. Environment variable (OPERATION_MODE)
        4. Default: sandbox
        
        Args:
            workshop_id: Workshop identifier
            user_id: Optional user identifier
            explicit_mode: Optional explicit override (admin only)
            
        Returns:
            ExecutionContext with resolved mode and capability flags
        """
        # Step 1: Check explicit mode (admin override)
        if explicit_mode:
            logger.warning(
                f"Explicit mode override: {explicit_mode.value} "
                f"for workshop {workshop_id}"
            )
            mode = explicit_mode
        else:
            # Step 2: Check workshop-level setting (TODO: implement database lookup)
            # For now, fall back to environment variable
            mode_str = os.getenv("OPERATION_MODE", "sandbox").lower()
            
            # Step 3: Validate mode
            try:
                mode = OperationMode(mode_str)
            except ValueError:
                logger.warning(
                    f"Invalid OPERATION_MODE '{mode_str}', defaulting to sandbox"
                )
                mode = OperationMode.SANDBOX
        
        # Derive capability flags from mode
        if mode == OperationMode.CERTIFIED:
            locked_profiles = True
            allow_manual_overrides = False
            allow_experimental_features = False
            allow_beta_features = False
            require_verified_tuning = True
            require_determinism = True
        elif mode == OperationMode.PRODUCTION:
            locked_profiles = False
            allow_manual_overrides = True
            allow_experimental_features = False
            allow_beta_features = True
            require_verified_tuning = False
            require_determinism = True
        else:  # SANDBOX
            locked_profiles = False
            allow_manual_overrides = True
            allow_experimental_features = True
            allow_beta_features = True
            require_verified_tuning = False
            require_determinism = False
        
        context = ExecutionContext(
            mode=mode,
            workshop_id=workshop_id,
            user_id=user_id,
            locked_profiles=locked_profiles,
            allow_manual_overrides=allow_manual_overrides,
            allow_experimental_features=allow_experimental_features,
            allow_beta_features=allow_beta_features,
            require_verified_tuning=require_verified_tuning,
            require_determinism=require_determinism
        )
        
        logger.info(
            f"Resolved operation mode: {mode.value} "
            f"for workshop {workshop_id} (trace_id: {context.trace_id})"
        )
        
        return context

