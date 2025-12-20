"""
Keycloak Service
Handles user synchronization between Keycloak and local database
"""
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime, timezone
import httpx
import logging
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.core.config import settings
from app.models.user import User, UserRole, UserStatus
from app.core.events import event_dispatcher, UserCreatedEvent, UserSyncedFromKeycloakEvent

logger = logging.getLogger(__name__)


@dataclass
class KeycloakUser:
    """Keycloak user representation"""
    id: UUID
    username: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email_verified: bool = False
    enabled: bool = True
    attributes: Dict[str, Any] = None
    realm_roles: List[str] = None
    
    @classmethod
    def from_token_claims(cls, claims: Dict[str, Any]) -> "KeycloakUser":
        """Create KeycloakUser from JWT token claims"""
        return cls(
            id=UUID(claims.get("sub")),
            username=claims.get("preferred_username", claims.get("sub")),
            email=claims.get("email", ""),
            first_name=claims.get("given_name"),
            last_name=claims.get("family_name"),
            email_verified=claims.get("email_verified", False),
            enabled=True,
            attributes=claims.get("attributes", {}),
            realm_roles=claims.get("realm_access", {}).get("roles", []),
        )
    
    @classmethod
    def from_admin_api(cls, data: Dict[str, Any]) -> "KeycloakUser":
        """Create KeycloakUser from Keycloak Admin API response"""
        return cls(
            id=UUID(data.get("id")),
            username=data.get("username"),
            email=data.get("email", ""),
            first_name=data.get("firstName"),
            last_name=data.get("lastName"),
            email_verified=data.get("emailVerified", False),
            enabled=data.get("enabled", True),
            attributes=data.get("attributes", {}),
            realm_roles=[],  # Loaded separately
        )


class KeycloakAdminClient:
    """
    Keycloak Admin API client.
    Used for background sync and admin operations.
    """
    
    def __init__(self):
        # Normalize server URL (remove trailing slash)
        self.server_url = str(settings.KEYCLOAK_SERVER_URL).rstrip('/')
        self.realm = settings.KEYCLOAK_REALM
        self.client_id = settings.KEYCLOAK_CLIENT_ID
        self.client_secret = settings.KEYCLOAK_CLIENT_SECRET
        self.admin_username = settings.KEYCLOAK_ADMIN_USERNAME
        self.admin_password = settings.KEYCLOAK_ADMIN_PASSWORD
        self._access_token: Optional[str] = None
        self._token_expires: Optional[datetime] = None
    
    async def _get_admin_token(self) -> str:
        """Get admin access token from Keycloak"""
        if self._access_token and self._token_expires:
            if datetime.now(timezone.utc) < self._token_expires:
                return self._access_token
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.server_url}/realms/master/protocol/openid-connect/token",
                data={
                    "grant_type": "password",
                    "client_id": "admin-cli",
                    "username": self.admin_username,
                    "password": self.admin_password,
                },
            )
            response.raise_for_status()
            data = response.json()
            
            self._access_token = data["access_token"]
            expires_in = data.get("expires_in", 300)
            self._token_expires = datetime.now(timezone.utc)
            
            return self._access_token
    
    async def get_user(self, user_id: UUID) -> Optional[KeycloakUser]:
        """Get user from Keycloak by ID"""
        try:
            token = await self._get_admin_token()
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.server_url}/admin/realms/{self.realm}/users/{user_id}",
                    headers={"Authorization": f"Bearer {token}"},
                )
                if response.status_code == 404:
                    return None
                response.raise_for_status()
                return KeycloakUser.from_admin_api(response.json())
        except Exception as e:
            logger.error(f"Error fetching user {user_id} from Keycloak: {e}")
            return None
    
    async def get_users(
        self,
        first: int = 0,
        max_results: int = 100,
        search: Optional[str] = None
    ) -> List[KeycloakUser]:
        """Get users from Keycloak"""
        try:
            token = await self._get_admin_token()
            params = {"first": first, "max": max_results}
            if search:
                params["search"] = search
            
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.server_url}/admin/realms/{self.realm}/users",
                    headers={"Authorization": f"Bearer {token}"},
                    params=params,
                )
                response.raise_for_status()
                return [KeycloakUser.from_admin_api(u) for u in response.json()]
        except Exception as e:
            logger.error(f"Error fetching users from Keycloak: {e}")
            return []
    
    async def get_user_roles(self, user_id: UUID) -> List[str]:
        """Get user's realm roles from Keycloak"""
        try:
            token = await self._get_admin_token()
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.server_url}/admin/realms/{self.realm}/users/{user_id}/role-mappings/realm",
                    headers={"Authorization": f"Bearer {token}"},
                )
                response.raise_for_status()
                return [r["name"] for r in response.json()]
        except Exception as e:
            logger.error(f"Error fetching roles for user {user_id}: {e}")
            return []


class KeycloakSyncService:
    """
    Service for synchronizing Keycloak users with local database.
    """
    
    KEYCLOAK_TO_LOCAL_ROLE_MAP = {
        "buyer": UserRole.BUYER,
        "seller": UserRole.SELLER,
        "bank": UserRole.BANK,
        "delivery_provider": UserRole.DELIVERY_PROVIDER,
        "admin": UserRole.ADMIN,
        "shariah_officer": UserRole.SHARIAH_OFFICER,
    }
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.admin_client = KeycloakAdminClient()
    
    async def sync_user_from_token(
        self,
        token_claims: Dict[str, Any]
    ) -> User:
        """
        Sync user from JWT token claims (lazy sync on first request).
        Creates or updates local user record.
        """
        keycloak_user = KeycloakUser.from_token_claims(token_claims)
        return await self._upsert_user(keycloak_user, sync_type="token")
    
    async def sync_user_by_id(self, keycloak_id: UUID) -> Optional[User]:
        """
        Sync a specific user from Keycloak Admin API.
        """
        keycloak_user = await self.admin_client.get_user(keycloak_id)
        if not keycloak_user:
            return None
        
        # Get roles
        keycloak_user.realm_roles = await self.admin_client.get_user_roles(keycloak_id)
        
        return await self._upsert_user(keycloak_user, sync_type="admin_api")
    
    async def sync_all_users(
        self,
        batch_size: int = 100
    ) -> Dict[str, int]:
        """
        Full sync of all Keycloak users (background task).
        Returns statistics: created, updated, failed counts.
        """
        stats = {"created": 0, "updated": 0, "failed": 0, "total": 0}
        offset = 0
        
        while True:
            users = await self.admin_client.get_users(
                first=offset,
                max_results=batch_size
            )
            
            if not users:
                break
            
            for kc_user in users:
                try:
                    # Get roles for each user
                    kc_user.realm_roles = await self.admin_client.get_user_roles(kc_user.id)
                    
                    # Check if user exists
                    existing = await self._get_local_user(kc_user.id)
                    
                    await self._upsert_user(kc_user, sync_type="batch")
                    
                    if existing:
                        stats["updated"] += 1
                    else:
                        stats["created"] += 1
                except Exception as e:
                    logger.error(f"Failed to sync user {kc_user.id}: {e}")
                    stats["failed"] += 1
                
                stats["total"] += 1
            
            offset += batch_size
            
            if len(users) < batch_size:
                break
        
        logger.info(f"User sync completed: {stats}")
        return stats
    
    async def _get_local_user(self, keycloak_id: UUID) -> Optional[User]:
        """Get local user by Keycloak ID"""
        result = await self.db.execute(
            select(User).where(User.keycloak_id == keycloak_id)
        )
        return result.scalar_one_or_none()
    
    async def _upsert_user(
        self,
        keycloak_user: KeycloakUser,
        sync_type: str
    ) -> User:
        """
        Create or update local user from Keycloak data.
        Uses PostgreSQL upsert for atomic operation.
        """
        # Determine role from Keycloak roles
        role = self._determine_role(keycloak_user.realm_roles or [])
        
        # Prepare user data
        user_data = {
            "keycloak_id": keycloak_user.id,
            "email": keycloak_user.email,
            "username": keycloak_user.username,
            "first_name": keycloak_user.first_name,
            "last_name": keycloak_user.last_name,
            "role": role,
            "status": UserStatus.ACTIVE if keycloak_user.enabled else UserStatus.INACTIVE,
            "keycloak_attributes": keycloak_user.attributes,
            "last_keycloak_sync": datetime.now(timezone.utc).isoformat(),
        }
        
        # Check if user exists
        existing_user = await self._get_local_user(keycloak_user.id)
        
        if existing_user:
            # Update existing user
            for key, value in user_data.items():
                if key not in ["keycloak_id"]:  # Don't update keycloak_id
                    setattr(existing_user, key, value)
            
            await self.db.commit()
            await self.db.refresh(existing_user)
            
            # Emit event
            await event_dispatcher.dispatch_async(
                UserSyncedFromKeycloakEvent(
                    user_id=existing_user.id,
                    keycloak_id=keycloak_user.id,
                    sync_type="updated",
                )
            )
            
            logger.debug(f"Updated user {existing_user.id} from Keycloak")
            return existing_user
        else:
            # Create new user
            new_user = User(**user_data)
            self.db.add(new_user)
            await self.db.commit()
            await self.db.refresh(new_user)
            
            # Emit events
            await event_dispatcher.dispatch_async(
                UserCreatedEvent(
                    user_id=new_user.id,
                    keycloak_id=keycloak_user.id,
                    role=role.value,
                    email=keycloak_user.email,
                )
            )
            await event_dispatcher.dispatch_async(
                UserSyncedFromKeycloakEvent(
                    user_id=new_user.id,
                    keycloak_id=keycloak_user.id,
                    sync_type="created",
                )
            )
            
            logger.info(f"Created user {new_user.id} from Keycloak")
            return new_user
    
    def _determine_role(self, keycloak_roles: List[str]) -> UserRole:
        """
        Determine local role from Keycloak realm roles.
        Priority: admin > shariah_officer > bank > seller > delivery_provider > buyer
        """
        role_priority = [
            "admin",
            "shariah_officer",
            "bank",
            "seller",
            "delivery_provider",
            "buyer",
        ]
        
        for role_name in role_priority:
            if role_name in keycloak_roles:
                return self.KEYCLOAK_TO_LOCAL_ROLE_MAP.get(role_name, UserRole.BUYER)
        
        return UserRole.BUYER  # Default role


class KeycloakJWTValidator:
    """
    Validates Keycloak JWT tokens.
    Used by authentication middleware.
    """
    
    def __init__(self):
        # Normalize server URL (remove trailing slash)
        self.server_url = str(settings.KEYCLOAK_SERVER_URL).rstrip('/')
        self.realm = settings.KEYCLOAK_REALM
        self.client_id = settings.KEYCLOAK_CLIENT_ID
        self._jwks_cache: Optional[Dict] = None
        self._jwks_expires: Optional[datetime] = None
    
    async def get_jwks(self) -> Dict:
        """Get JWKS from Keycloak for token verification"""
        if self._jwks_cache and self._jwks_expires:
            if datetime.now(timezone.utc) < self._jwks_expires:
                return self._jwks_cache
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.server_url}/realms/{self.realm}/protocol/openid-connect/certs"
            )
            response.raise_for_status()
            self._jwks_cache = response.json()
            # Cache for 1 hour
            self._jwks_expires = datetime.now(timezone.utc)
            return self._jwks_cache
    
    async def get_openid_config(self) -> Dict:
        """Get OpenID Connect configuration"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.server_url}/realms/{self.realm}/.well-known/openid-configuration"
            )
            response.raise_for_status()
            return response.json()


# Singleton instances
keycloak_admin = KeycloakAdminClient()
jwt_validator = KeycloakJWTValidator()


async def get_keycloak_sync_service(db: AsyncSession) -> KeycloakSyncService:
    """Dependency for getting KeycloakSyncService"""
    return KeycloakSyncService(db)
