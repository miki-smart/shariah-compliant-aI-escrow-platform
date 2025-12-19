"""
User Model
Synced with Keycloak for authentication, stores application-specific data
"""
from sqlalchemy import Column, String, Enum as SQLEnum, Index, Text, Boolean, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List, TYPE_CHECKING
import uuid
import enum

from app.models.base import BaseModel, AuditMixin

if TYPE_CHECKING:
    from app.models.order import Order
    from app.models.product import Product


class UserRole(str, enum.Enum):
    """User roles in the platform"""
    BUYER = "buyer"
    SELLER = "seller"
    BANK = "bank"
    DELIVERY_PROVIDER = "delivery_provider"
    ADMIN = "admin"
    SHARIAH_OFFICER = "shariah_officer"


class UserStatus(str, enum.Enum):
    """User account status"""
    PENDING_VERIFICATION = "pending_verification"
    VERIFICATION_IN_PROGRESS = "verification_in_progress"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    BLOCKED = "blocked"
    INACTIVE = "inactive"


class BusinessType(str, enum.Enum):
    """Type of business entity"""
    MSME = "msme"
    WHOLESALER = "wholesaler"
    RETAILER = "retailer"
    MANUFACTURER = "manufacturer"
    ISLAMIC_BANK = "islamic_bank"
    LOGISTICS = "logistics"
    INDIVIDUAL = "individual"


class User(BaseModel, AuditMixin):
    """
    User model synced with Keycloak.
    Keycloak handles authentication; this stores application-specific data.
    """
    __tablename__ = "users"
    
    # Keycloak sync fields
    keycloak_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        unique=True,
        nullable=False,
        index=True,
        comment="Keycloak user ID for authentication sync"
    )
    
    # Basic profile (synced from Keycloak)
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    username: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )
    first_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    last_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    phone_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    
    # Application-specific fields
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole),
        nullable=False,
        default=UserRole.BUYER,
    )
    status: Mapped[UserStatus] = mapped_column(
        SQLEnum(UserStatus),
        nullable=False,
        default=UserStatus.PENDING_VERIFICATION,
    )
    
    # Business information
    business_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    business_registration_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    business_type: Mapped[Optional[BusinessType]] = mapped_column(
        SQLEnum(BusinessType),
        nullable=True,
    )
    tax_identification_number: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Address
    address_line_1: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    address_line_2: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    city: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    postal_code: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    country: Mapped[str] = mapped_column(String(2), default="MY", nullable=False)  # ISO country code
    
    # Financial DNA (for AI risk assessment)
    financial_profile: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="Financial DNA data for AI credit scoring"
    )
    
    # Platform statistics (updated by triggers/services)
    total_orders_as_buyer: Mapped[int] = mapped_column(default=0, nullable=False)
    total_orders_as_seller: Mapped[int] = mapped_column(default=0, nullable=False)
    successful_deliveries: Mapped[int] = mapped_column(default=0, nullable=False)
    disputes_initiated: Mapped[int] = mapped_column(default=0, nullable=False)
    disputes_lost: Mapped[int] = mapped_column(default=0, nullable=False)
    
    # Trust scores
    buyer_trust_score: Mapped[Optional[float]] = mapped_column(nullable=True)
    seller_trust_score: Mapped[Optional[float]] = mapped_column(nullable=True)
    
    # Compliance
    shariah_certification: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_shariah_compliant: Mapped[bool] = mapped_column(default=True, nullable=False)
    
    # Verification documents reference
    verification_documents: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="References to uploaded verification documents"
    )
    verification_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    verified_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    verified_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    # Keycloak sync metadata
    last_keycloak_sync: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    keycloak_attributes: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="Additional attributes from Keycloak"
    )
    
    # Relationships
    orders_as_buyer: Mapped[List["Order"]] = relationship(
        "Order",
        back_populates="buyer",
        foreign_keys="Order.buyer_id",
        lazy="selectin",
    )
    orders_as_seller: Mapped[List["Order"]] = relationship(
        "Order",
        back_populates="seller",
        foreign_keys="Order.seller_id",
        lazy="selectin",
    )
    products: Mapped[List["Product"]] = relationship(
        "Product",
        back_populates="seller",
        lazy="selectin",
    )
    
    # Indexes
    __table_args__ = (
        Index("ix_users_role_status", "role", "status"),
        Index("ix_users_business_type", "business_type"),
        UniqueConstraint("keycloak_id", name="uq_users_keycloak_id"),
    )
    
    @property
    def full_name(self) -> str:
        """Get user's full name"""
        parts = [self.first_name, self.last_name]
        return " ".join(filter(None, parts)) or self.username
    
    @property
    def is_verified(self) -> bool:
        """Check if user is verified and active"""
        return self.status == UserStatus.ACTIVE
    
    @property
    def can_trade(self) -> bool:
        """Check if user can participate in transactions"""
        return self.status == UserStatus.ACTIVE and not self.is_deleted
    
    @property
    def is_buyer(self) -> bool:
        return self.role == UserRole.BUYER
    
    @property
    def is_seller(self) -> bool:
        return self.role == UserRole.SELLER
    
    @property
    def is_bank(self) -> bool:
        return self.role == UserRole.BANK
    
    def update_financial_profile(self, profile_data: dict) -> None:
        """Update financial DNA profile"""
        if self.financial_profile is None:
            self.financial_profile = {}
        self.financial_profile.update(profile_data)
    
    def increment_order_count(self, as_buyer: bool = True) -> None:
        """Increment order count"""
        if as_buyer:
            self.total_orders_as_buyer += 1
        else:
            self.total_orders_as_seller += 1
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, username={self.username}, role={self.role})>"


class UserDocument(BaseModel):
    """User uploaded documents for verification"""
    __tablename__ = "user_documents"
    
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        index=True,
    )
    document_type: Mapped[str] = mapped_column(String(50), nullable=False)  # business_registration, tax_cert, etc.
    document_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_size: Mapped[int] = mapped_column(nullable=True)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=True)
    
    # Verification
    is_verified: Mapped[bool] = mapped_column(default=False, nullable=False)
    verified_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)
    verification_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    __table_args__ = (
        Index("ix_user_documents_user_type", "user_id", "document_type"),
    )
