"""
User Service
Business logic for user management
"""
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload

from app.models.user import User, UserRole, UserStatus, UserDocument
from app.core.events import event_dispatcher, UserCreatedEvent
from app.core.logging import get_logger

logger = get_logger(__name__)


class UserService:
    """Service for user management operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_by_id(self, user_id: UUID) -> Optional[User]:
        """Get user by ID"""
        result = await self.db.execute(
            select(User).where(
                and_(User.id == user_id, User.is_deleted == False)
            )
        )
        return result.scalar_one_or_none()
    
    async def get_by_keycloak_id(self, keycloak_id: UUID) -> Optional[User]:
        """Get user by Keycloak ID"""
        result = await self.db.execute(
            select(User).where(
                and_(User.keycloak_id == keycloak_id, User.is_deleted == False)
            )
        )
        return result.scalar_one_or_none()
    
    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        result = await self.db.execute(
            select(User).where(
                and_(User.email == email, User.is_deleted == False)
            )
        )
        return result.scalar_one_or_none()
    
    async def get_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        result = await self.db.execute(
            select(User).where(
                and_(User.username == username, User.is_deleted == False)
            )
        )
        return result.scalar_one_or_none()
    
    async def list_users(
        self,
        role: Optional[UserRole] = None,
        status: Optional[UserStatus] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[User]:
        """List users with optional filters"""
        query = select(User).where(User.is_deleted == False)
        
        if role:
            query = query.where(User.role == role)
        if status:
            query = query.where(User.status == status)
        
        query = query.offset(skip).limit(limit).order_by(User.created_at.desc())
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def create_user(
        self,
        keycloak_id: UUID,
        email: str,
        username: str,
        role: UserRole,
        first_name: Optional[str] = None,
        last_name: Optional[str] = None,
        phone_number: Optional[str] = None,
        **kwargs
    ) -> User:
        """Create a new user"""
        user = User(
            keycloak_id=keycloak_id,
            email=email,
            username=username,
            role=role,
            first_name=first_name,
            last_name=last_name,
            phone_number=phone_number,
            status=UserStatus.PENDING_VERIFICATION,
            **kwargs
        )
        
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        
        # Emit event
        await event_dispatcher.dispatch_async(
            UserCreatedEvent(
                user_id=user.id,
                keycloak_id=keycloak_id,
                role=role.value,
                email=email,
            )
        )
        
        logger.info(f"Created user {user.id} with role {role}")
        return user
    
    async def update_user(
        self,
        user_id: UUID,
        **updates
    ) -> Optional[User]:
        """Update user fields"""
        user = await self.get_by_id(user_id)
        if not user:
            return None
        
        for key, value in updates.items():
            if hasattr(user, key):
                setattr(user, key, value)
        
        await self.db.commit()
        await self.db.refresh(user)
        
        logger.info(f"Updated user {user_id}")
        return user
    
    async def verify_user(
        self,
        user_id: UUID,
        verifier_id: UUID,
        notes: Optional[str] = None
    ) -> Optional[User]:
        """Verify a user's account"""
        user = await self.get_by_id(user_id)
        if not user:
            return None
        
        user.status = UserStatus.ACTIVE
        user.verified_at = datetime.now(timezone.utc).isoformat()
        user.verified_by = verifier_id
        user.verification_notes = notes
        
        await self.db.commit()
        await self.db.refresh(user)
        
        logger.info(f"Verified user {user_id} by {verifier_id}")
        return user
    
    async def suspend_user(
        self,
        user_id: UUID,
        reason: Optional[str] = None
    ) -> Optional[User]:
        """Suspend a user's account"""
        user = await self.get_by_id(user_id)
        if not user:
            return None
        
        user.status = UserStatus.SUSPENDED
        
        await self.db.commit()
        await self.db.refresh(user)
        
        logger.info(f"Suspended user {user_id}: {reason}")
        return user
    
    async def delete_user(self, user_id: UUID) -> bool:
        """Soft delete a user"""
        user = await self.get_by_id(user_id)
        if not user:
            return False
        
        user.soft_delete()
        await self.db.commit()
        
        logger.info(f"Soft deleted user {user_id}")
        return True
    
    async def update_financial_profile(
        self,
        user_id: UUID,
        profile_data: dict
    ) -> Optional[User]:
        """Update user's financial DNA profile"""
        user = await self.get_by_id(user_id)
        if not user:
            return None
        
        user.update_financial_profile(profile_data)
        await self.db.commit()
        await self.db.refresh(user)
        
        return user
    
    async def get_users_by_role(
        self,
        role: UserRole,
        active_only: bool = True
    ) -> List[User]:
        """Get all users with a specific role"""
        query = select(User).where(
            and_(User.role == role, User.is_deleted == False)
        )
        
        if active_only:
            query = query.where(User.status == UserStatus.ACTIVE)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def search_users(
        self,
        query: str,
        skip: int = 0,
        limit: int = 20
    ) -> List[User]:
        """Search users by name, email, or username"""
        search_pattern = f"%{query}%"
        
        stmt = select(User).where(
            and_(
                User.is_deleted == False,
                or_(
                    User.email.ilike(search_pattern),
                    User.username.ilike(search_pattern),
                    User.first_name.ilike(search_pattern),
                    User.last_name.ilike(search_pattern),
                    User.business_name.ilike(search_pattern),
                )
            )
        ).offset(skip).limit(limit)
        
        result = await self.db.execute(stmt)
        return list(result.scalars().all())


async def get_user_service(db: AsyncSession) -> UserService:
    """Dependency for getting UserService"""
    return UserService(db)
