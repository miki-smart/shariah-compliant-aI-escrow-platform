"""
Product Schemas
Pydantic models for product requests/responses
"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from enum import Enum


class ShariahCategory(str, Enum):
    """Shariah compliance category for products"""
    HALAL = "halal"
    HARAM = "haram"
    MASHBOOH = "mashbooh"
    PENDING_REVIEW = "pending_review"


class ProductCategory(str, Enum):
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


class ProductStatus(str, Enum):
    """Product availability status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    OUT_OF_STOCK = "out_of_stock"
    PENDING_APPROVAL = "pending_approval"
    REJECTED = "rejected"


# ============ Product Creation ============

class ProductCreateRequest(BaseModel):
    """Request schema for creating a new product"""
    # Basic info
    name: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    sku: Optional[str] = Field(None, max_length=100)
    
    # Category
    category: ProductCategory = ProductCategory.OTHER
    subcategory: Optional[str] = Field(None, max_length=100)
    
    # Pricing
    price: Decimal = Field(..., gt=0, decimal_places=2)
    currency: str = Field(default="USD", max_length=3)
    min_order_quantity: int = Field(default=1, ge=1)
    max_order_quantity: Optional[int] = Field(None, ge=1)
    
    # Inventory
    stock_quantity: int = Field(default=0, ge=0)
    unit: str = Field(default="unit", max_length=50)
    
    # Media
    images: Optional[List[str]] = None
    thumbnail_url: Optional[str] = Field(None, max_length=500)
    
    # Delivery info
    weight_kg: Optional[float] = Field(None, ge=0)
    dimensions: Optional[dict] = None
    shipping_class: Optional[str] = Field(None, max_length=50)
    estimated_delivery_days: int = Field(default=7, ge=1)
    
    # Shariah certifications
    halal_certification: Optional[str] = Field(None, max_length=255)
    certification_expiry: Optional[str] = Field(None, max_length=50)
    certification_body: Optional[str] = Field(None, max_length=255)
    
    # Additional
    tags: Optional[List[str]] = None
    attributes: Optional[dict] = None
    
    @field_validator('max_order_quantity')
    @classmethod
    def validate_max_order(cls, v, info):
        if v is not None and 'min_order_quantity' in info.data:
            if v < info.data['min_order_quantity']:
                raise ValueError('Max order quantity must be >= min order quantity')
        return v


class ProductUpdateRequest(BaseModel):
    """Request schema for updating a product"""
    name: Optional[str] = Field(None, min_length=3, max_length=255)
    description: Optional[str] = Field(None, max_length=5000)
    sku: Optional[str] = Field(None, max_length=100)
    
    category: Optional[ProductCategory] = None
    subcategory: Optional[str] = Field(None, max_length=100)
    
    price: Optional[Decimal] = Field(None, gt=0, decimal_places=2)
    currency: Optional[str] = Field(None, max_length=3)
    min_order_quantity: Optional[int] = Field(None, ge=1)
    max_order_quantity: Optional[int] = Field(None, ge=1)
    
    stock_quantity: Optional[int] = Field(None, ge=0)
    unit: Optional[str] = Field(None, max_length=50)
    
    images: Optional[List[str]] = None
    thumbnail_url: Optional[str] = Field(None, max_length=500)
    
    weight_kg: Optional[float] = Field(None, ge=0)
    dimensions: Optional[dict] = None
    shipping_class: Optional[str] = Field(None, max_length=50)
    estimated_delivery_days: Optional[int] = Field(None, ge=1)
    
    halal_certification: Optional[str] = Field(None, max_length=255)
    certification_expiry: Optional[str] = Field(None, max_length=50)
    certification_body: Optional[str] = Field(None, max_length=255)
    
    tags: Optional[List[str]] = None
    attributes: Optional[dict] = None
    
    is_active: Optional[bool] = None


# ============ Product Response ============

class SellerInfo(BaseModel):
    """Seller information in product response"""
    id: UUID
    business_name: Optional[str] = None
    username: str
    city: Optional[str] = None
    country: Optional[str] = None
    seller_trust_score: Optional[float] = None
    
    class Config:
        from_attributes = True


class ProductResponse(BaseModel):
    """Product response schema"""
    id: UUID
    seller_id: UUID
    
    # Basic info
    name: str
    description: Optional[str] = None
    sku: Optional[str] = None
    
    # Category
    category: ProductCategory
    subcategory: Optional[str] = None
    
    # Shariah compliance
    shariah_category: ShariahCategory
    shariah_notes: Optional[str] = None
    is_halal: bool
    is_haram: bool
    requires_shariah_review: bool
    
    # Pricing
    price: Decimal
    currency: str
    min_order_quantity: int
    max_order_quantity: Optional[int] = None
    
    # Inventory
    stock_quantity: int
    unit: str
    is_available: bool
    
    # Status
    status: ProductStatus
    is_active: bool
    
    # Media
    images: Optional[List[str]] = None
    thumbnail_url: Optional[str] = None
    
    # Delivery
    weight_kg: Optional[float] = None
    dimensions: Optional[dict] = None
    shipping_class: Optional[str] = None
    estimated_delivery_days: int
    
    # Certifications
    halal_certification: Optional[str] = None
    certification_expiry: Optional[str] = None
    certification_body: Optional[str] = None
    
    # Additional
    tags: Optional[List[str]] = None
    attributes: Optional[dict] = None
    
    # Timestamps
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Seller info (optional, for buyer views)
    seller: Optional[SellerInfo] = None
    
    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    """Paginated list of products"""
    products: List[ProductResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    class Config:
        from_attributes = True


# ============ Shariah Validation ============

class ShariahValidationResult(BaseModel):
    """Result of Shariah compliance validation"""
    product_id: UUID
    shariah_category: ShariahCategory
    is_compliant: bool
    confidence_score: float = Field(ge=0, le=1)
    
    # Detected issues
    haram_indicators: Optional[List[dict]] = None
    warnings: Optional[List[str]] = None
    
    # Review info
    requires_manual_review: bool = False
    review_reason: Optional[str] = None
    
    # Validation metadata
    validated_at: datetime
    validation_method: str  # "automatic" or "manual"
    
    class Config:
        from_attributes = True


class ShariahReviewRequest(BaseModel):
    """Request for manual Shariah review"""
    product_id: UUID
    shariah_category: ShariahCategory
    notes: Optional[str] = Field(None, max_length=2000)


# ============ Product Filters ============

class ProductFilterParams(BaseModel):
    """Product filter parameters"""
    category: Optional[ProductCategory] = None
    shariah_category: Optional[ShariahCategory] = None
    status: Optional[ProductStatus] = None
    is_active: Optional[bool] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    in_stock: Optional[bool] = None
    seller_id: Optional[UUID] = None
    search: Optional[str] = None


# ============ Message Responses ============

class ProductMessageResponse(BaseModel):
    """Generic message response for product operations"""
    message: str
    success: bool = True
    product_id: Optional[UUID] = None


class ProductDeleteResponse(BaseModel):
    """Response for product deletion"""
    message: str
    success: bool = True
    product_id: UUID

