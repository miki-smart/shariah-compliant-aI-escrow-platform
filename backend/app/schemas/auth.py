"""
Authentication Schemas
Pydantic models for auth requests/responses
"""
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """User roles in the platform"""
    BUYER = "buyer"
    SELLER = "seller"
    BANK = "bank"
    DELIVERY_PROVIDER = "delivery_provider"
    ADMIN = "admin"
    SHARIAH_OFFICER = "shariah_officer"


class UserStatus(str, Enum):
    """User account status"""
    PENDING_VERIFICATION = "pending_verification"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    BLOCKED = "blocked"


# ============ Registration ============

class RegistrationRequest(BaseModel):
    """Registration request schema"""
    # Account info
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str
    
    # Role
    role: UserRole = UserRole.BUYER
    
    # Personal info
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    
    # Business info (for sellers/banks)
    company_name: Optional[str] = Field(None, max_length=255)
    business_license: Optional[str] = Field(None, max_length=100)
    
    # Address
    address: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=2)  # ISO country code
    
    # Compliance
    shariah_acknowledged: bool = False
    terms_accepted: bool = False
    
    @field_validator('confirm_password')
    @classmethod
    def passwords_match(cls, v, info):
        if 'password' in info.data and v != info.data['password']:
            raise ValueError('Passwords do not match')
        return v
    
    @field_validator('terms_accepted')
    @classmethod
    def terms_must_be_accepted(cls, v):
        if not v:
            raise ValueError('You must accept the terms and conditions')
        return v
    
    @field_validator('shariah_acknowledged')
    @classmethod
    def shariah_must_be_acknowledged(cls, v):
        if not v:
            raise ValueError('You must acknowledge Shariah compliance guidelines')
        return v


class RegistrationResponse(BaseModel):
    """Registration response schema"""
    user_id: UUID
    email: str
    message: str
    verification_required: bool = True
    
    class Config:
        from_attributes = True


# ============ Login ============

class LoginRequest(BaseModel):
    """Login request schema"""
    email: EmailStr
    password: str
    remember_me: bool = False


class TokenResponse(BaseModel):
    """JWT token response"""
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: "UserResponse"


class RefreshTokenRequest(BaseModel):
    """Refresh token request"""
    refresh_token: str


# ============ Password Reset ============

class ForgotPasswordRequest(BaseModel):
    """Forgot password request"""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Reset password request"""
    token: str
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str
    
    @field_validator('confirm_password')
    @classmethod
    def passwords_match(cls, v, info):
        if 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError('Passwords do not match')
        return v


class ChangePasswordRequest(BaseModel):
    """Change password request (for authenticated users)"""
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)
    confirm_password: str
    
    @field_validator('confirm_password')
    @classmethod
    def passwords_match(cls, v, info):
        if 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError('Passwords do not match')
        return v


# ============ Email Verification ============

class VerifyEmailRequest(BaseModel):
    """Email verification request"""
    token: str


class ResendVerificationRequest(BaseModel):
    """Resend verification email request"""
    email: EmailStr


# ============ User Response ============

class UserResponse(BaseModel):
    """User data response"""
    id: UUID
    email: str
    username: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[str] = None
    role: UserRole
    status: UserStatus
    
    # Business info
    business_name: Optional[str] = None
    
    # Location
    city: Optional[str] = None
    country: Optional[str] = None
    
    # Flags
    is_verified: bool = False
    is_shariah_compliant: bool = True
    
    # Timestamps
    created_at: datetime
    
    class Config:
        from_attributes = True


class UserProfileUpdate(BaseModel):
    """User profile update schema"""
    first_name: Optional[str] = Field(None, max_length=100)
    last_name: Optional[str] = Field(None, max_length=100)
    phone_number: Optional[str] = Field(None, max_length=20)
    business_name: Optional[str] = Field(None, max_length=255)
    address_line_1: Optional[str] = Field(None, max_length=255)
    city: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=2)


# ============ Message Responses ============

class MessageResponse(BaseModel):
    """Generic message response"""
    message: str
    success: bool = True


class ErrorResponse(BaseModel):
    """Error response"""
    detail: str
    error_code: Optional[str] = None


# Update forward refs
TokenResponse.model_rebuild()

