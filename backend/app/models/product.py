"""
Product Model
Product catalog with Shariah classification
"""
from sqlalchemy import Column, String, Text, Numeric, Boolean, Index, ForeignKey
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import Optional, List, TYPE_CHECKING
import uuid
import enum
from decimal import Decimal

from app.models.base import BaseModel, AuditMixin

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.order import Order


class ShariahCategory(str, enum.Enum):
    """Shariah compliance category for products"""
    HALAL = "halal"  # Permissible
    HARAM = "haram"  # Prohibited
    MASHBOOH = "mashbooh"  # Doubtful - requires review
    PENDING_REVIEW = "pending_review"  # Not yet classified


class ProductCategory(str, enum.Enum):
    """Product categories"""
    FOOD_BEVERAGE = "food_beverage"
    ELECTRONICS = "electronics"
    CLOTHING_TEXTILE = "clothing_textile"
    AGRICULTURE = "agriculture"
    MANUFACTURING = "manufacturing"
    RAW_MATERIALS = "raw_materials"
    SERVICES = "services"
    COSMETICS = "cosmetics"
    PHARMACEUTICALS = "pharmaceuticals"
    OTHER = "other"


class ProductStatus(str, enum.Enum):
    """Product availability status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    OUT_OF_STOCK = "out_of_stock"
    PENDING_APPROVAL = "pending_approval"
    REJECTED = "rejected"


class Product(BaseModel, AuditMixin):
    """
    Product model with Shariah compliance classification.
    Sellers list products; buyers purchase them.
    """
    __tablename__ = "products"
    
    # Seller reference
    seller_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    
    # Basic product info
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sku: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, unique=True)
    
    # Category and classification
    category: Mapped[ProductCategory] = mapped_column(
        SQLEnum(ProductCategory),
        nullable=False,
        default=ProductCategory.OTHER,
    )
    subcategory: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Shariah compliance
    shariah_category: Mapped[ShariahCategory] = mapped_column(
        SQLEnum(ShariahCategory),
        nullable=False,
        default=ShariahCategory.PENDING_REVIEW,
    )
    shariah_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    shariah_reviewed_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    shariah_reviewed_at: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    # Haram indicators (for AI validation)
    haram_indicators: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="Detected haram indicators with confidence scores"
    )
    
    # Pricing
    price: Mapped[Decimal] = mapped_column(
        Numeric(18, 4),
        nullable=False,
    )
    currency: Mapped[str] = mapped_column(String(3), default="MYR", nullable=False)
    min_order_quantity: Mapped[int] = mapped_column(default=1, nullable=False)
    max_order_quantity: Mapped[Optional[int]] = mapped_column(nullable=True)
    
    # Inventory
    stock_quantity: Mapped[int] = mapped_column(default=0, nullable=False)
    unit: Mapped[str] = mapped_column(String(50), default="unit", nullable=False)  # unit, kg, piece, etc.
    
    # Status
    status: Mapped[ProductStatus] = mapped_column(
        SQLEnum(ProductStatus),
        nullable=False,
        default=ProductStatus.PENDING_APPROVAL,
    )
    is_active: Mapped[bool] = mapped_column(default=False, nullable=False)
    
    # Media
    images: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    # Delivery info
    weight_kg: Mapped[Optional[float]] = mapped_column(nullable=True)
    dimensions: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="Product dimensions {length, width, height, unit}"
    )
    shipping_class: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    estimated_delivery_days: Mapped[int] = mapped_column(default=7, nullable=False)
    
    # Certifications (for Shariah compliance)
    halal_certification: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    certification_expiry: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    certification_body: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Additional metadata
    tags: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    attributes: Mapped[Optional[dict]] = mapped_column(
        JSONB,
        nullable=True,
        comment="Custom product attributes"
    )
    
    # Relationships
    seller: Mapped["User"] = relationship("User", back_populates="products")
    orders: Mapped[List["Order"]] = relationship("Order", back_populates="product", lazy="selectin")
    
    # Indexes
    __table_args__ = (
        Index("ix_products_seller_status", "seller_id", "status"),
        Index("ix_products_category", "category"),
        Index("ix_products_shariah", "shariah_category"),
        Index("ix_products_active", "is_active", "status"),
    )
    
    @property
    def is_halal(self) -> bool:
        """Check if product is halal"""
        return self.shariah_category == ShariahCategory.HALAL
    
    @property
    def is_haram(self) -> bool:
        """Check if product is haram"""
        return self.shariah_category == ShariahCategory.HARAM
    
    @property
    def requires_shariah_review(self) -> bool:
        """Check if product needs Shariah review"""
        return self.shariah_category in [
            ShariahCategory.MASHBOOH,
            ShariahCategory.PENDING_REVIEW
        ]
    
    @property
    def is_available(self) -> bool:
        """Check if product is available for order"""
        return (
            self.is_active
            and self.status == ProductStatus.ACTIVE
            and self.stock_quantity > 0
            and not self.is_haram
        )
    
    def reduce_stock(self, quantity: int) -> bool:
        """Reduce stock quantity, return False if insufficient"""
        if self.stock_quantity >= quantity:
            self.stock_quantity -= quantity
            return True
        return False
    
    def restore_stock(self, quantity: int) -> None:
        """Restore stock quantity (e.g., on order cancellation)"""
        self.stock_quantity += quantity
    
    def __repr__(self) -> str:
        return f"<Product(id={self.id}, name={self.name}, shariah={self.shariah_category})>"


class ProductReview(BaseModel):
    """Product reviews by buyers"""
    __tablename__ = "product_reviews"
    
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id"),
        nullable=False,
        index=True,
    )
    reviewer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
    )
    
    rating: Mapped[int] = mapped_column(nullable=False)  # 1-5
    review_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Moderation
    is_approved: Mapped[bool] = mapped_column(default=True, nullable=False)
    moderated_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), nullable=True)


class HaramProductKeyword(BaseModel):
    """
    Keywords and patterns for detecting haram products.
    Used by AI/rule-based Shariah compliance checks.
    """
    __tablename__ = "haram_product_keywords"
    
    keyword: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)  # alcohol, pork, gambling, etc.
    severity: Mapped[str] = mapped_column(String(20), default="high", nullable=False)  # high, medium, low
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
