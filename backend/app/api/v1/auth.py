"""
Authentication API Endpoints
Registration, login, password management, and token operations
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID

from app.core.database import get_db
from app.services.auth_service import AuthService, get_auth_service
from app.schemas.auth import (
    RegistrationRequest,
    RegistrationResponse,
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    VerifyEmailRequest,
    ResendVerificationRequest,
    UserResponse,
    UserProfileUpdate,
    MessageResponse,
)
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Security scheme for JWT
security = HTTPBearer(auto_error=False)


# ============ Dependencies ============

async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> Optional[dict]:
    """Get current user from JWT token"""
    if not credentials:
        return None
    
    token = credentials.credentials
    payload = AuthService.verify_access_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return payload


async def require_auth(
    current_user: Optional[dict] = Depends(get_current_user),
) -> dict:
    """Require authentication"""
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user


async def get_current_user_model(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    """Get current user as User model from JWT token"""
    from app.models.user import User
    from sqlalchemy import select
    
    if not credentials:
        return None
    
    token = credentials.credentials
    payload = AuthService.verify_access_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    user_id = UUID(payload["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


def require_role(allowed_roles: list):
    """
    Dependency factory that requires specific roles.
    Usage: Depends(require_role([UserRole.SELLER, UserRole.ADMIN]))
    """
    from app.models.user import User, UserRole
    
    async def role_checker(
        credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
        db: AsyncSession = Depends(get_db),
    ) -> User:
        from sqlalchemy import select
        
        if not credentials:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        token = credentials.credentials
        payload = AuthService.verify_access_token(token)
        
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Get user from database
        user_id = UUID(payload["sub"])
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )
        
        # Check role
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in allowed_roles]}",
            )
        
        return user
    
    return role_checker


# ============ Registration ============

@router.post(
    "/register",
    response_model=RegistrationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Create a new user account. A verification email will be sent."
)
async def register(
    data: RegistrationRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Register a new user account.
    
    - **email**: Valid email address (must be unique)
    - **password**: Minimum 8 characters
    - **role**: One of: buyer, seller, bank, delivery_provider
    - **first_name**: User's first name
    - **last_name**: User's last name
    - **shariah_acknowledged**: Must be true
    - **terms_accepted**: Must be true
    """
    auth_service = AuthService(db)
    
    try:
        user, verification_token = await auth_service.register_user(data)
        
        # In production, send verification email here
        # For now, we'll log the token (DO NOT do this in production!)
        logger.info(f"Verification token for {user.email}: {verification_token}")
        
        # TODO: Send verification email
        # await send_verification_email(user.email, verification_token)
        
        return RegistrationResponse(
            user_id=user.id,
            email=user.email,
            message="Registration successful. Please check your email to verify your account.",
            verification_required=True,
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed. Please try again.",
        )


# ============ Email Verification ============

@router.post(
    "/verify-email",
    response_model=MessageResponse,
    summary="Verify email address",
    description="Verify user's email address using the token sent via email."
)
async def verify_email(
    data: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    """Verify email with the token received via email"""
    auth_service = AuthService(db)
    
    user = await auth_service.verify_email(data.token)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token",
        )
    
    return MessageResponse(
        message="Email verified successfully. You can now log in.",
        success=True,
    )


@router.post(
    "/resend-verification",
    response_model=MessageResponse,
    summary="Resend verification email",
    description="Resend the verification email to the user."
)
async def resend_verification(
    data: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db),
):
    """Resend verification email"""
    auth_service = AuthService(db)
    
    token = await auth_service.resend_verification(data.email)
    
    # Always return success to prevent email enumeration
    # In production, send the email if token was generated
    if token:
        logger.info(f"New verification token for {data.email}: {token}")
        # TODO: Send verification email
        # await send_verification_email(data.email, token)
    
    return MessageResponse(
        message="If the email exists and is unverified, a new verification email has been sent.",
        success=True,
    )


# ============ Login ============

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login",
    description="Authenticate user and receive access tokens."
)
async def login(
    data: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Login with email and password.
    
    Returns access token and optionally a refresh token if remember_me is true.
    """
    auth_service = AuthService(db)
    
    try:
        result = await auth_service.login(data)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        
        return result
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh tokens",
    description="Get new access token using refresh token."
)
async def refresh_tokens(
    data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Refresh access token using refresh token"""
    auth_service = AuthService(db)
    
    result = await auth_service.refresh_tokens(data.refresh_token)
    
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    
    return result


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Logout",
    description="Logout user (client should discard tokens)."
)
async def logout(
    current_user: dict = Depends(require_auth),
):
    """
    Logout user.
    
    Note: With JWT tokens, the actual token invalidation happens client-side.
    For enhanced security, implement token blacklisting.
    """
    # TODO: Implement token blacklisting if needed
    logger.info(f"User logged out: {current_user.get('sub')}")
    
    return MessageResponse(
        message="Logged out successfully",
        success=True,
    )


# ============ Password Management ============

@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request password reset",
    description="Send password reset email to user."
)
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Request password reset email"""
    auth_service = AuthService(db)
    
    token = await auth_service.request_password_reset(data.email)
    
    # Always return success to prevent email enumeration
    if token:
        logger.info(f"Password reset token for {data.email}: {token}")
        # TODO: Send password reset email
        # await send_password_reset_email(data.email, token)
    
    return MessageResponse(
        message="If the email exists, a password reset link has been sent.",
        success=True,
    )


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset password",
    description="Reset password using the token received via email."
)
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    """Reset password with token"""
    auth_service = AuthService(db)
    
    success = await auth_service.reset_password(data.token, data.new_password)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )
    
    return MessageResponse(
        message="Password reset successfully. You can now log in with your new password.",
        success=True,
    )


@router.post(
    "/change-password",
    response_model=MessageResponse,
    summary="Change password",
    description="Change password for authenticated user."
)
async def change_password(
    data: ChangePasswordRequest,
    current_user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Change password for logged-in user"""
    auth_service = AuthService(db)
    
    user_id = UUID(current_user["sub"])
    success = await auth_service.change_password(
        user_id, 
        data.current_password, 
        data.new_password
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )
    
    return MessageResponse(
        message="Password changed successfully",
        success=True,
    )


# ============ Current User ============

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user",
    description="Get the currently authenticated user's profile."
)
async def get_me(
    current_user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Get current user profile"""
    auth_service = AuthService(db)
    
    user_id = UUID(current_user["sub"])
    user = await auth_service.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    return UserResponse(
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


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update current user",
    description="Update the currently authenticated user's profile."
)
async def update_me(
    data: UserProfileUpdate,
    current_user: dict = Depends(require_auth),
    db: AsyncSession = Depends(get_db),
):
    """Update current user profile"""
    auth_service = AuthService(db)
    
    user_id = UUID(current_user["sub"])
    user = await auth_service.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    
    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if hasattr(user, field):
            setattr(user, field, value)
    
    await db.commit()
    await db.refresh(user)
    
    return UserResponse(
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

