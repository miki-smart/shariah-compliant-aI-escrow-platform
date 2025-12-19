"""
Product Service
Handles product CRUD operations and Shariah compliance validation
"""
import logging
from typing import Optional, List, Tuple
from uuid import UUID
from datetime import datetime
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from sqlalchemy.orm import selectinload

from app.models.product import Product, ShariahCategory, ProductCategory, ProductStatus, HaramProductKeyword
from app.models.user import User, UserRole
from app.schemas.product import (
    ProductCreateRequest,
    ProductUpdateRequest,
    ProductResponse,
    ProductListResponse,
    ShariahValidationResult,
    ProductFilterParams,
    SellerInfo,
)

logger = logging.getLogger(__name__)


# Haram keywords for automatic detection (BR-004: Product Permissibility)
HARAM_KEYWORDS = {
    "alcohol": {
        "keywords": ["alcohol", "wine", "beer", "whiskey", "vodka", "rum", "liquor", "champagne", "spirits", "brewery"],
        "severity": "high",
        "category": "alcohol"
    },
    "pork": {
        "keywords": ["pork", "bacon", "ham", "pig", "swine", "lard", "gelatin"],
        "severity": "high",
        "category": "pork"
    },
    "gambling": {
        "keywords": ["gambling", "casino", "lottery", "betting", "poker chips", "slot machine"],
        "severity": "high",
        "category": "gambling"
    },
    "tobacco": {
        "keywords": ["cigarette", "tobacco", "cigar", "vape", "nicotine", "smoking"],
        "severity": "medium",
        "category": "tobacco"
    },
    "adult": {
        "keywords": ["adult content", "pornographic", "xxx", "erotic"],
        "severity": "high",
        "category": "adult_content"
    },
    "interest": {
        "keywords": ["interest-bearing", "riba", "usury", "conventional loan"],
        "severity": "high",
        "category": "riba"
    },
}

# Categories that typically require Shariah review (mashbooh)
REVIEW_CATEGORIES = [
    ProductCategory.FOOD_BEVERAGE,
    ProductCategory.COSMETICS,
    ProductCategory.PHARMACEUTICALS,
]


class ProductService:
    """Service for product management and Shariah compliance"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_product(
        self,
        seller_id: UUID,
        data: ProductCreateRequest
    ) -> Tuple[Product, ShariahValidationResult]:
        """
        Create a new product with automatic Shariah validation.
        BR-004: Products must be validated before order acceptance.
        """
        # Create the product
        product = Product(
            seller_id=seller_id,
            name=data.name,
            description=data.description,
            sku=data.sku,
            category=data.category,
            subcategory=data.subcategory,
            price=data.price,
            currency=data.currency,
            min_order_quantity=data.min_order_quantity,
            max_order_quantity=data.max_order_quantity,
            stock_quantity=data.stock_quantity,
            unit=data.unit,
            images=data.images,
            thumbnail_url=data.thumbnail_url,
            weight_kg=data.weight_kg,
            dimensions=data.dimensions,
            shipping_class=data.shipping_class,
            estimated_delivery_days=data.estimated_delivery_days,
            halal_certification=data.halal_certification,
            certification_expiry=data.certification_expiry,
            certification_body=data.certification_body,
            tags=data.tags,
            attributes=data.attributes,
            status=ProductStatus.PENDING_APPROVAL,
            is_active=False,  # Start inactive until approved
        )
        
        # Perform Shariah validation
        validation_result = await self._validate_shariah_compliance(product)
        
        # Update product based on validation
        product.shariah_category = validation_result.shariah_category
        product.haram_indicators = (
            {"indicators": validation_result.haram_indicators}
            if validation_result.haram_indicators else None
        )
        
        # Auto-approve halal products, reject haram, pending for mashbooh
        if validation_result.shariah_category == ShariahCategory.HALAL:
            product.status = ProductStatus.ACTIVE
            product.is_active = True
        elif validation_result.shariah_category == ShariahCategory.HARAM:
            product.status = ProductStatus.REJECTED
            product.is_active = False
            product.shariah_notes = "Product automatically rejected due to Shariah non-compliance"
        else:
            # MASHBOOH or PENDING_REVIEW - needs manual review
            product.status = ProductStatus.PENDING_APPROVAL
            product.is_active = False
        
        self.db.add(product)
        await self.db.commit()
        await self.db.refresh(product)
        
        logger.info(f"Product created: {product.id}, Shariah status: {product.shariah_category}")
        
        return product, validation_result
    
    async def _validate_shariah_compliance(self, product: Product) -> ShariahValidationResult:
        """
        Validate product against Shariah rules.
        BR-004: Product Permissibility
        - Halal products proceed
        - Haram products are blocked
        - Mashbooh products require review
        """
        haram_indicators = []
        warnings = []
        
        # Check name and description against haram keywords
        text_to_check = f"{product.name} {product.description or ''}".lower()
        
        for category, config in HARAM_KEYWORDS.items():
            for keyword in config["keywords"]:
                if keyword.lower() in text_to_check:
                    haram_indicators.append({
                        "keyword": keyword,
                        "category": config["category"],
                        "severity": config["severity"],
                        "location": "name_or_description"
                    })
        
        # Determine Shariah category based on findings
        shariah_category = ShariahCategory.HALAL
        confidence_score = 0.95
        requires_manual_review = False
        review_reason = None
        
        # Check for haram indicators
        high_severity_count = sum(
            1 for i in haram_indicators if i.get("severity") == "high"
        )
        
        if high_severity_count > 0:
            shariah_category = ShariahCategory.HARAM
            confidence_score = min(0.99, 0.80 + (high_severity_count * 0.05))
            review_reason = f"Detected {high_severity_count} high-severity haram indicator(s)"
        elif len(haram_indicators) > 0:
            shariah_category = ShariahCategory.MASHBOOH
            confidence_score = 0.70
            requires_manual_review = True
            review_reason = "Product contains terms requiring Shariah review"
        elif product.category in REVIEW_CATEGORIES:
            # Food, cosmetics, pharmaceuticals need extra scrutiny
            if not product.halal_certification:
                shariah_category = ShariahCategory.PENDING_REVIEW
                confidence_score = 0.60
                requires_manual_review = True
                review_reason = f"Category {product.category.value} requires halal certification"
                warnings.append(f"Products in {product.category.value} typically require halal certification")
        
        # Check halal certification for food products
        if product.category == ProductCategory.FOOD_BEVERAGE:
            if product.halal_certification:
                shariah_category = ShariahCategory.HALAL
                confidence_score = 0.98
                requires_manual_review = False
            elif shariah_category == ShariahCategory.HALAL:
                # Downgrade to pending review if no certification
                shariah_category = ShariahCategory.PENDING_REVIEW
                confidence_score = 0.65
                requires_manual_review = True
                review_reason = "Food products require halal certification for full approval"
        
        return ShariahValidationResult(
            product_id=product.id or UUID('00000000-0000-0000-0000-000000000000'),
            shariah_category=shariah_category,
            is_compliant=shariah_category == ShariahCategory.HALAL,
            confidence_score=confidence_score,
            haram_indicators=haram_indicators if haram_indicators else None,
            warnings=warnings if warnings else None,
            requires_manual_review=requires_manual_review,
            review_reason=review_reason,
            validated_at=datetime.utcnow(),
            validation_method="automatic"
        )
    
    async def get_product(self, product_id: UUID, include_seller: bool = True) -> Optional[Product]:
        """Get product by ID"""
        query = select(Product).where(
            Product.id == product_id,
            Product.is_deleted == False
        )
        
        if include_seller:
            query = query.options(selectinload(Product.seller))
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_products(
        self,
        filters: ProductFilterParams,
        page: int = 1,
        page_size: int = 20,
        include_seller: bool = True
    ) -> ProductListResponse:
        """Get paginated list of products with filters"""
        query = select(Product).where(Product.is_deleted == False)
        count_query = select(func.count(Product.id)).where(Product.is_deleted == False)
        
        # Apply filters
        if filters.category:
            query = query.where(Product.category == filters.category)
            count_query = count_query.where(Product.category == filters.category)
        
        if filters.shariah_category:
            query = query.where(Product.shariah_category == filters.shariah_category)
            count_query = count_query.where(Product.shariah_category == filters.shariah_category)
        
        if filters.status:
            query = query.where(Product.status == filters.status)
            count_query = count_query.where(Product.status == filters.status)
        
        if filters.is_active is not None:
            query = query.where(Product.is_active == filters.is_active)
            count_query = count_query.where(Product.is_active == filters.is_active)
        
        if filters.min_price is not None:
            query = query.where(Product.price >= filters.min_price)
            count_query = count_query.where(Product.price >= filters.min_price)
        
        if filters.max_price is not None:
            query = query.where(Product.price <= filters.max_price)
            count_query = count_query.where(Product.price <= filters.max_price)
        
        if filters.in_stock:
            query = query.where(Product.stock_quantity > 0)
            count_query = count_query.where(Product.stock_quantity > 0)
        
        if filters.seller_id:
            query = query.where(Product.seller_id == filters.seller_id)
            count_query = count_query.where(Product.seller_id == filters.seller_id)
        
        if filters.search:
            search_term = f"%{filters.search}%"
            search_filter = or_(
                Product.name.ilike(search_term),
                Product.description.ilike(search_term),
                Product.sku.ilike(search_term)
            )
            query = query.where(search_filter)
            count_query = count_query.where(search_filter)
        
        # Get total count
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()
        
        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        query = query.order_by(Product.created_at.desc())
        
        if include_seller:
            query = query.options(selectinload(Product.seller))
        
        result = await self.db.execute(query)
        products = result.scalars().all()
        
        # Convert to response
        product_responses = []
        for product in products:
            product_response = self._to_product_response(product, include_seller)
            product_responses.append(product_response)
        
        total_pages = (total + page_size - 1) // page_size
        
        return ProductListResponse(
            products=product_responses,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    
    async def update_product(
        self,
        product_id: UUID,
        seller_id: UUID,
        data: ProductUpdateRequest
    ) -> Optional[Product]:
        """Update a product"""
        product = await self.get_product(product_id, include_seller=False)
        
        if not product or product.seller_id != seller_id:
            return None
        
        # Update fields
        update_data = data.model_dump(exclude_unset=True)
        
        for field, value in update_data.items():
            if hasattr(product, field):
                setattr(product, field, value)
        
        # Re-validate Shariah compliance if name/description changed
        if 'name' in update_data or 'description' in update_data:
            validation_result = await self._validate_shariah_compliance(product)
            product.shariah_category = validation_result.shariah_category
            product.haram_indicators = (
                {"indicators": validation_result.haram_indicators}
                if validation_result.haram_indicators else None
            )
            
            # Update status based on new validation
            if validation_result.shariah_category == ShariahCategory.HARAM:
                product.status = ProductStatus.REJECTED
                product.is_active = False
            elif validation_result.shariah_category == ShariahCategory.MASHBOOH:
                product.status = ProductStatus.PENDING_APPROVAL
        
        await self.db.commit()
        await self.db.refresh(product)
        
        logger.info(f"Product updated: {product.id}")
        return product
    
    async def delete_product(self, product_id: UUID, seller_id: UUID) -> bool:
        """Soft delete a product"""
        product = await self.get_product(product_id, include_seller=False)
        
        if not product or product.seller_id != seller_id:
            return False
        
        product.is_deleted = True
        product.is_active = False
        
        await self.db.commit()
        
        logger.info(f"Product deleted: {product.id}")
        return True
    
    async def approve_product(
        self,
        product_id: UUID,
        reviewer_id: UUID,
        shariah_category: ShariahCategory,
        notes: Optional[str] = None
    ) -> Optional[Product]:
        """
        Approve/reject a product after manual Shariah review.
        Only Shariah officers can perform this action.
        """
        product = await self.get_product(product_id, include_seller=False)
        
        if not product:
            return None
        
        product.shariah_category = shariah_category
        product.shariah_reviewed_by = reviewer_id
        product.shariah_reviewed_at = datetime.utcnow().isoformat()
        product.shariah_notes = notes
        
        if shariah_category == ShariahCategory.HALAL:
            product.status = ProductStatus.ACTIVE
            product.is_active = True
        elif shariah_category == ShariahCategory.HARAM:
            product.status = ProductStatus.REJECTED
            product.is_active = False
        else:
            product.status = ProductStatus.PENDING_APPROVAL
            product.is_active = False
        
        await self.db.commit()
        await self.db.refresh(product)
        
        logger.info(f"Product {product.id} reviewed by {reviewer_id}: {shariah_category}")
        return product
    
    async def get_seller_products(
        self,
        seller_id: UUID,
        page: int = 1,
        page_size: int = 20
    ) -> ProductListResponse:
        """Get all products for a specific seller"""
        filters = ProductFilterParams(seller_id=seller_id)
        return await self.get_products(filters, page, page_size, include_seller=False)
    
    async def get_available_products(
        self,
        page: int = 1,
        page_size: int = 20,
        category: Optional[ProductCategory] = None,
        search: Optional[str] = None,
        min_price: Optional[Decimal] = None,
        max_price: Optional[Decimal] = None
    ) -> ProductListResponse:
        """Get all available (active, halal, in-stock) products for buyers"""
        filters = ProductFilterParams(
            is_active=True,
            shariah_category=ShariahCategory.HALAL,
            status=ProductStatus.ACTIVE,
            in_stock=True,
            category=category,
            search=search,
            min_price=min_price,
            max_price=max_price
        )
        return await self.get_products(filters, page, page_size, include_seller=True)
    
    async def get_products_pending_review(
        self,
        page: int = 1,
        page_size: int = 20
    ) -> ProductListResponse:
        """Get products pending Shariah review (for Shariah officers)"""
        query = select(Product).where(
            Product.is_deleted == False,
            or_(
                Product.shariah_category == ShariahCategory.MASHBOOH,
                Product.shariah_category == ShariahCategory.PENDING_REVIEW
            ),
            Product.status == ProductStatus.PENDING_APPROVAL
        )
        
        count_query = select(func.count(Product.id)).where(
            Product.is_deleted == False,
            or_(
                Product.shariah_category == ShariahCategory.MASHBOOH,
                Product.shariah_category == ShariahCategory.PENDING_REVIEW
            ),
            Product.status == ProductStatus.PENDING_APPROVAL
        )
        
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()
        
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)
        query = query.order_by(Product.created_at.asc())  # Oldest first
        query = query.options(selectinload(Product.seller))
        
        result = await self.db.execute(query)
        products = result.scalars().all()
        
        product_responses = [
            self._to_product_response(p, include_seller=True) for p in products
        ]
        
        total_pages = (total + page_size - 1) // page_size
        
        return ProductListResponse(
            products=product_responses,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
    
    def _to_product_response(
        self,
        product: Product,
        include_seller: bool = True
    ) -> ProductResponse:
        """Convert Product model to ProductResponse"""
        seller_info = None
        if include_seller and product.seller:
            seller_info = SellerInfo(
                id=product.seller.id,
                business_name=product.seller.business_name,
                username=product.seller.username,
                city=product.seller.city,
                country=product.seller.country,
                seller_trust_score=product.seller.seller_trust_score
            )
        
        return ProductResponse(
            id=product.id,
            seller_id=product.seller_id,
            name=product.name,
            description=product.description,
            sku=product.sku,
            category=product.category,
            subcategory=product.subcategory,
            shariah_category=product.shariah_category,
            shariah_notes=product.shariah_notes,
            is_halal=product.is_halal,
            is_haram=product.is_haram,
            requires_shariah_review=product.requires_shariah_review,
            price=product.price,
            currency=product.currency,
            min_order_quantity=product.min_order_quantity,
            max_order_quantity=product.max_order_quantity,
            stock_quantity=product.stock_quantity,
            unit=product.unit,
            is_available=product.is_available,
            status=product.status,
            is_active=product.is_active,
            images=product.images,
            thumbnail_url=product.thumbnail_url,
            weight_kg=product.weight_kg,
            dimensions=product.dimensions,
            shipping_class=product.shipping_class,
            estimated_delivery_days=product.estimated_delivery_days,
            halal_certification=product.halal_certification,
            certification_expiry=product.certification_expiry,
            certification_body=product.certification_body,
            tags=product.tags,
            attributes=product.attributes,
            created_at=product.created_at,
            updated_at=product.updated_at,
            seller=seller_info
        )

