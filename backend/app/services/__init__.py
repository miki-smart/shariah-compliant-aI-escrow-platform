"""
Services Package
Exports all service classes for the application
"""

from app.services.keycloak_service import (
    KeycloakSyncService,
    KeycloakAdminClient,
    KeycloakJWTValidator,
    keycloak_admin,
    jwt_validator,
    get_keycloak_sync_service,
)
from app.services.user_service import UserService, get_user_service
from app.services.order_service import OrderService, get_order_service
from app.services.escrow_service import EscrowService, get_escrow_service
from app.services.delivery_service import DeliveryService, get_delivery_service
from app.services.audit_service import AuditService, get_audit_service
from app.services.shariah_service import ShariahService

__all__ = [
    # Keycloak
    "KeycloakSyncService",
    "KeycloakAdminClient",
    "KeycloakJWTValidator",
    "keycloak_admin",
    "jwt_validator",
    "get_keycloak_sync_service",
    # Domain Services
    "UserService",
    "get_user_service",
    "OrderService",
    "get_order_service",
    "EscrowService",
    "get_escrow_service",
    "DeliveryService",
    "get_delivery_service",
    "AuditService",
    "get_audit_service",
    "ShariahService",
]
