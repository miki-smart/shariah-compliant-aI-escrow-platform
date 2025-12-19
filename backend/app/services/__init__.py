"""
Services Package
Exports all service classes for the application

Note: Import services directly from their modules to avoid circular imports
For example: from app.services.auth_service import AuthService
"""

# Lazy imports - don't import at module level to avoid circular dependencies
# Services should be imported directly from their modules when needed

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
    "AuthService",
    "get_auth_service",
]


def __getattr__(name):
    """Lazy import services when accessed"""
    if name in ("KeycloakSyncService", "KeycloakAdminClient", "KeycloakJWTValidator", 
                "keycloak_admin", "jwt_validator", "get_keycloak_sync_service"):
        from app.services.keycloak_service import (
            KeycloakSyncService, KeycloakAdminClient, KeycloakJWTValidator,
            keycloak_admin, jwt_validator, get_keycloak_sync_service
        )
        return locals()[name]
    
    if name in ("UserService", "get_user_service"):
        from app.services.user_service import UserService, get_user_service
        return locals()[name]
    
    if name in ("OrderService", "get_order_service"):
        from app.services.order_service import OrderService, get_order_service
        return locals()[name]
    
    if name in ("EscrowService", "get_escrow_service"):
        from app.services.escrow_service import EscrowService, get_escrow_service
        return locals()[name]
    
    if name in ("DeliveryService", "get_delivery_service"):
        from app.services.delivery_service import DeliveryService, get_delivery_service
        return locals()[name]
    
    if name in ("AuditService", "get_audit_service"):
        from app.services.audit_service import AuditService, get_audit_service
        return locals()[name]
    
    if name == "ShariahService":
        from app.services.shariah_service import ShariahService
        return ShariahService
    
    if name in ("AuthService", "get_auth_service"):
        from app.services.auth_service import AuthService, get_auth_service
        return locals()[name]
    
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
