"""
Application Dependencies
FastAPI dependency injection utilities
"""
from typing import AsyncGenerator, Optional
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import jwt
from jwt import PyJWKClient
import logging

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User, UserRole
from app.services.keycloak_service import (
    KeycloakSyncService,
    KeycloakJWTValidator,
    jwt_validator,
)

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer(auto_error=False)


class AuthenticationError(HTTPException):
    """Authentication failed"""
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class AuthorizationError(HTTPException):
    """Authorization failed"""
    def __init__(self, detail: str = "Not authorized to perform this action"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )


async def decode_token(token: str) -> dict:
    """
    Decode and validate JWT token from Keycloak.
    Returns token claims if valid.
    """
    try:
        # Normalize Keycloak server URL (remove trailing slash)
        base_url = str(settings.KEYCLOAK_SERVER_URL).rstrip('/')
        
        # Get JWKS for verification
        jwks = await jwt_validator.get_jwks()
        
        # Get the signing key
        jwks_url = f"{base_url}/realms/{settings.KEYCLOAK_REALM}/protocol/openid-connect/certs"
        jwks_client = PyJWKClient(jwks_url)
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        
        # Decode and verify the token
        issuer_url = f"{base_url}/realms/{settings.KEYCLOAK_REALM}"
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=[settings.JWT_ALGORITHM],
            audience=settings.JWT_AUDIENCE,
            options={
                "verify_exp": True,
                "verify_aud": True,
                "verify_iss": True,
            },
            issuer=issuer_url,
        )
        
        return claims
    
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Token has expired")
    except jwt.InvalidAudienceError:
        raise AuthenticationError("Invalid token audience")
    except jwt.InvalidIssuerError:
        raise AuthenticationError("Invalid token issuer")
    except jwt.PyJWTError as e:
        logger.error(f"JWT validation error: {e}")
        raise AuthenticationError("Invalid token")
    except Exception as e:
        logger.error(f"Token decode error: {e}")
        raise AuthenticationError("Could not validate credentials")


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Get current authenticated user.
    Validates JWT token and syncs user from Keycloak if needed.
    """
    if not credentials:
        raise AuthenticationError("No credentials provided")
    
    token = credentials.credentials
    claims = await decode_token(token)
    
    # Get Keycloak user ID from claims
    keycloak_id = UUID(claims.get("sub"))
    
    # Try to get existing local user
    result = await db.execute(
        select(User).where(User.keycloak_id == keycloak_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        # Sync user from Keycloak (lazy creation)
        sync_service = KeycloakSyncService(db)
        user = await sync_service.sync_user_from_token(claims)
    
    if not user:
        raise AuthenticationError("User not found")
    
    if user.is_deleted:
        raise AuthenticationError("User account has been deleted")
    
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Get current active (non-suspended) user"""
    from app.models.user import UserStatus
    
    if current_user.status not in [UserStatus.ACTIVE, UserStatus.VERIFICATION_IN_PROGRESS]:
        raise AuthorizationError("User account is not active")
    
    return current_user


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Get current user if authenticated, None otherwise.
    Useful for endpoints that work both authenticated and anonymously.
    """
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None


class RoleChecker:
    """
    Dependency for checking user roles.
    Usage: Depends(RoleChecker([UserRole.ADMIN, UserRole.SELLER]))
    """
    
    def __init__(self, allowed_roles: list[UserRole]):
        self.allowed_roles = allowed_roles
    
    async def __call__(
        self,
        current_user: User = Depends(get_current_active_user),
    ) -> User:
        if current_user.role not in self.allowed_roles:
            raise AuthorizationError(
                f"Role {current_user.role.value} is not authorized for this action"
            )
        return current_user


def require_roles(*roles: UserRole):
    """
    Dependency factory for requiring specific roles.
    Usage: current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.BANK))
    """
    return RoleChecker(list(roles))


# Convenience dependencies for common role checks
async def get_admin_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Require admin role"""
    if current_user.role != UserRole.ADMIN:
        raise AuthorizationError("Admin access required")
    return current_user


async def get_bank_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Require bank role"""
    if current_user.role != UserRole.BANK:
        raise AuthorizationError("Bank access required")
    return current_user


async def get_seller_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Require seller role"""
    if current_user.role != UserRole.SELLER:
        raise AuthorizationError("Seller access required")
    return current_user


async def get_buyer_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Require buyer role"""
    if current_user.role != UserRole.BUYER:
        raise AuthorizationError("Buyer access required")
    return current_user


async def get_buyer_or_seller_user(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Require buyer or seller role"""
    if current_user.role not in [UserRole.BUYER, UserRole.SELLER]:
        raise AuthorizationError("Buyer or seller access required")
    return current_user


async def get_shariah_officer(
    current_user: User = Depends(get_current_active_user),
) -> User:
    """Require Shariah officer role"""
    if current_user.role not in [UserRole.SHARIAH_OFFICER, UserRole.ADMIN]:
        raise AuthorizationError("Shariah officer access required")
    return current_user
