"""
Authentication Service
Handles user registration, login, JWT tokens, and password management
"""
from typing import Optional, Tuple
from uuid import UUID, uuid4
from datetime import datetime, timedelta, timezone
import secrets
import hashlib

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import bcrypt
from jose import JWTError, jwt

from app.models.user import User, UserRole, UserStatus
from app.schemas.auth import (
    RegistrationRequest, 
    LoginRequest,
    UserResponse,
    TokenResponse,
)
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# JWT settings
JWT_SECRET_KEY = settings.SECRET_KEY
JWT_ALGORITHM = "HS256"  # Using HS256 for simplicity; RS256 for production with Keycloak
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = 30


class AuthService:
    """Service for authentication operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    # ============ Password Management ============
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt"""
        # Bcrypt has a 72-byte limit - truncate if needed
        password_bytes = password.encode('utf-8')[:72]
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password_bytes, salt)
        return hashed.decode('utf-8')
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        try:
            # Apply same truncation for verification
            password_bytes = plain_password.encode('utf-8')[:72]
            return bcrypt.checkpw(password_bytes, hashed_password.encode('utf-8'))
        except Exception:
            return False
    
    @staticmethod
    def generate_verification_token() -> str:
        """Generate a secure verification token"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def generate_password_reset_token() -> str:
        """Generate a secure password reset token"""
        return secrets.token_urlsafe(32)
    
    # ============ JWT Token Management ============
    
    @staticmethod
    def create_access_token(
        user_id: UUID,
        email: str,
        role: str,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create a JWT access token"""
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode = {
            "sub": str(user_id),
            "email": email,
            "role": role,
            "type": "access",
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "jti": str(uuid4()),  # JWT ID for token revocation
        }
        
        encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def create_refresh_token(user_id: UUID) -> str:
        """Create a JWT refresh token"""
        expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        
        to_encode = {
            "sub": str(user_id),
            "type": "refresh",
            "exp": expire,
            "iat": datetime.now(timezone.utc),
            "jti": str(uuid4()),
        }
        
        encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def decode_token(token: str) -> Optional[dict]:
        """Decode and validate a JWT token"""
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            return payload
        except JWTError as e:
            logger.warning(f"JWT decode error: {e}")
            return None
    
    @staticmethod
    def verify_access_token(token: str) -> Optional[dict]:
        """Verify an access token and return payload"""
        payload = AuthService.decode_token(token)
        if payload and payload.get("type") == "access":
            return payload
        return None
    
    @staticmethod
    def verify_refresh_token(token: str) -> Optional[dict]:
        """Verify a refresh token and return payload"""
        payload = AuthService.decode_token(token)
        if payload and payload.get("type") == "refresh":
            return payload
        return None
    
    # ============ User Management ============
    
    async def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        result = await self.db.execute(
            select(User).where(
                and_(User.email == email, User.is_deleted == False)
            )
        )
        return result.scalar_one_or_none()
    
    async def get_user_by_id(self, user_id: UUID) -> Optional[User]:
        """Get user by ID"""
        result = await self.db.execute(
            select(User).where(
                and_(User.id == user_id, User.is_deleted == False)
            )
        )
        return result.scalar_one_or_none()
    
    async def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        result = await self.db.execute(
            select(User).where(
                and_(User.username == username, User.is_deleted == False)
            )
        )
        return result.scalar_one_or_none()
    
    # ============ Registration ============
    
    async def register_user(self, data: RegistrationRequest) -> Tuple[User, str]:
        """
        Register a new user.
        Returns the created user and verification token.
        """
        # Check if email already exists
        existing_user = await self.get_user_by_email(data.email)
        if existing_user:
            raise ValueError("Email already registered")
        
        # Generate username from email
        base_username = data.email.split("@")[0].lower()
        username = base_username
        counter = 1
        
        # Ensure unique username
        while await self.get_user_by_username(username):
            username = f"{base_username}{counter}"
            counter += 1
        
        # Map role from schema to model enum
        role_mapping = {
            "buyer": UserRole.BUYER,
            "seller": UserRole.SELLER,
            "bank": UserRole.BANK,
            "delivery_provider": UserRole.DELIVERY_PROVIDER,
        }
        user_role = role_mapping.get(data.role.value, UserRole.BUYER)
        
        # Generate verification token
        verification_token = self.generate_verification_token()
        
        # Hash the verification token for storage (security best practice)
        token_hash = hashlib.sha256(verification_token.encode()).hexdigest()
        
        # Create user
        user = User(
            keycloak_id=uuid4(),  # Temporary ID until Keycloak integration
            email=data.email,
            username=username,
            first_name=data.first_name,
            last_name=data.last_name,
            phone_number=data.phone,
            role=user_role,
            status=UserStatus.PENDING_VERIFICATION,
            business_name=data.company_name,
            business_registration_number=data.business_license,
            address_line_1=data.address,
            city=data.city,
            country=data.country or "ET",
            is_shariah_compliant=data.shariah_acknowledged,
            # Store password hash in keycloak_attributes temporarily
            # In production, this would be handled by Keycloak
            keycloak_attributes={
                "password_hash": self.hash_password(data.password),
                "verification_token_hash": token_hash,
                "verification_token_expires": (
                    datetime.now(timezone.utc) + timedelta(hours=24)
                ).isoformat(),
            }
        )
        
        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)
        
        logger.info(f"Registered new user: {user.id} ({user.email})")
        
        return user, verification_token
    
    # ============ Email Verification ============
    
    async def verify_email(self, token: str) -> Optional[User]:
        """Verify user email with token"""
        # Hash the provided token
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        # Find user with matching token hash
        result = await self.db.execute(
            select(User).where(
                and_(
                    User.is_deleted == False,
                    User.status == UserStatus.PENDING_VERIFICATION,
                )
            )
        )
        users = result.scalars().all()
        
        for user in users:
            if not user.keycloak_attributes:
                continue
            
            stored_hash = user.keycloak_attributes.get("verification_token_hash")
            expires_str = user.keycloak_attributes.get("verification_token_expires")
            
            if stored_hash != token_hash:
                continue
            
            # Check expiration
            if expires_str:
                expires = datetime.fromisoformat(expires_str)
                if datetime.now(timezone.utc) > expires:
                    logger.warning(f"Verification token expired for user {user.id}")
                    return None
            
            # Verify the user
            user.status = UserStatus.ACTIVE
            user.verified_at = datetime.now(timezone.utc).isoformat()
            
            # Clear verification token
            if user.keycloak_attributes:
                user.keycloak_attributes.pop("verification_token_hash", None)
                user.keycloak_attributes.pop("verification_token_expires", None)
            
            await self.db.commit()
            await self.db.refresh(user)
            
            logger.info(f"Email verified for user: {user.id}")
            return user
        
        return None
    
    async def resend_verification(self, email: str) -> Optional[str]:
        """Resend verification email, returns new token"""
        user = await self.get_user_by_email(email)
        
        if not user:
            return None
        
        if user.status != UserStatus.PENDING_VERIFICATION:
            return None  # Already verified or other status
        
        # Generate new verification token
        verification_token = self.generate_verification_token()
        token_hash = hashlib.sha256(verification_token.encode()).hexdigest()
        
        # Update token in user
        if user.keycloak_attributes is None:
            user.keycloak_attributes = {}
        
        user.keycloak_attributes["verification_token_hash"] = token_hash
        user.keycloak_attributes["verification_token_expires"] = (
            datetime.now(timezone.utc) + timedelta(hours=24)
        ).isoformat()
        
        await self.db.commit()
        
        logger.info(f"Resent verification for user: {user.id}")
        return verification_token
    
    # ============ Login ============
    
    async def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate user with email and password"""
        user = await self.get_user_by_email(email)
        
        if not user:
            return None
        
        # Get password hash from keycloak_attributes
        if not user.keycloak_attributes:
            return None
        
        password_hash = user.keycloak_attributes.get("password_hash")
        if not password_hash:
            return None
        
        if not self.verify_password(password, password_hash):
            return None
        
        return user
    
    async def login(self, data: LoginRequest) -> Optional[TokenResponse]:
        """Login user and return tokens"""
        user = await self.authenticate_user(data.email, data.password)
        
        if not user:
            return None
        
        # Check if user is suspended or blocked
        if user.status in [UserStatus.SUSPENDED, UserStatus.BLOCKED]:
            raise ValueError("Your account has been suspended")
        
        # Allow login for pending verification users (they can verify later)
        # Note: In production, you may want to require verification
        
        # Create tokens
        access_token = self.create_access_token(
            user_id=user.id,
            email=user.email,
            role=user.role.value,
        )
        
        refresh_token = None
        if data.remember_me:
            refresh_token = self.create_refresh_token(user_id=user.id)
        
        # Build user response
        user_response = UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            first_name=user.first_name,
            last_name=user.last_name,
            phone_number=user.phone_number,
            role=user.role.value,
            status=user.status.value,
            business_name=user.business_name,
            city=user.city,
            country=user.country,
            is_verified=user.is_verified,
            is_shariah_compliant=user.is_shariah_compliant,
            created_at=user.created_at,
        )
        
        logger.info(f"User logged in: {user.id}")
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=user_response,
        )
    
    async def refresh_tokens(self, refresh_token: str) -> Optional[TokenResponse]:
        """Refresh access token using refresh token"""
        payload = self.verify_refresh_token(refresh_token)
        
        if not payload:
            return None
        
        user_id = UUID(payload["sub"])
        user = await self.get_user_by_id(user_id)
        
        if not user or user.status != UserStatus.ACTIVE:
            return None
        
        # Create new tokens
        access_token = self.create_access_token(
            user_id=user.id,
            email=user.email,
            role=user.role.value,
        )
        
        new_refresh_token = self.create_refresh_token(user_id=user.id)
        
        user_response = UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            first_name=user.first_name,
            last_name=user.last_name,
            phone_number=user.phone_number,
            role=user.role.value,
            status=user.status.value,
            business_name=user.business_name,
            city=user.city,
            country=user.country,
            is_verified=user.is_verified,
            is_shariah_compliant=user.is_shariah_compliant,
            created_at=user.created_at,
        )
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=user_response,
        )
    
    # ============ Password Reset ============
    
    async def request_password_reset(self, email: str) -> Optional[str]:
        """Request password reset, returns reset token"""
        user = await self.get_user_by_email(email)
        
        if not user:
            return None  # Don't reveal if email exists
        
        # Generate reset token
        reset_token = self.generate_password_reset_token()
        token_hash = hashlib.sha256(reset_token.encode()).hexdigest()
        
        # Store reset token
        if user.keycloak_attributes is None:
            user.keycloak_attributes = {}
        
        user.keycloak_attributes["password_reset_token_hash"] = token_hash
        user.keycloak_attributes["password_reset_expires"] = (
            datetime.now(timezone.utc) + timedelta(hours=1)
        ).isoformat()
        
        await self.db.commit()
        
        logger.info(f"Password reset requested for user: {user.id}")
        return reset_token
    
    async def reset_password(self, token: str, new_password: str) -> bool:
        """Reset password using reset token"""
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        
        # Find user with matching token
        result = await self.db.execute(
            select(User).where(User.is_deleted == False)
        )
        users = result.scalars().all()
        
        for user in users:
            if not user.keycloak_attributes:
                continue
            
            stored_hash = user.keycloak_attributes.get("password_reset_token_hash")
            expires_str = user.keycloak_attributes.get("password_reset_expires")
            
            if stored_hash != token_hash:
                continue
            
            # Check expiration
            if expires_str:
                expires = datetime.fromisoformat(expires_str)
                if datetime.now(timezone.utc) > expires:
                    logger.warning(f"Password reset token expired for user {user.id}")
                    return False
            
            # Update password
            user.keycloak_attributes["password_hash"] = self.hash_password(new_password)
            
            # Clear reset token
            user.keycloak_attributes.pop("password_reset_token_hash", None)
            user.keycloak_attributes.pop("password_reset_expires", None)
            
            await self.db.commit()
            
            logger.info(f"Password reset for user: {user.id}")
            return True
        
        return False
    
    async def change_password(
        self, 
        user_id: UUID, 
        current_password: str, 
        new_password: str
    ) -> bool:
        """Change password for authenticated user"""
        user = await self.get_user_by_id(user_id)
        
        if not user:
            return False
        
        # Verify current password
        if not user.keycloak_attributes:
            return False
        
        password_hash = user.keycloak_attributes.get("password_hash")
        if not password_hash or not self.verify_password(current_password, password_hash):
            return False
        
        # Update password
        user.keycloak_attributes["password_hash"] = self.hash_password(new_password)
        
        await self.db.commit()
        
        logger.info(f"Password changed for user: {user.id}")
        return True


async def get_auth_service(db: AsyncSession) -> AuthService:
    """Dependency for getting AuthService"""
    return AuthService(db)

