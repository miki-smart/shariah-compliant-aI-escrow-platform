"""
Product API Endpoints
Handles product CRUD and Shariah compliance operations
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from uuid import UUID
from decimal import Decimal

from app.core.database import get_db
from app.api.v1.auth import get_current_user, require_role
from app.models.user import User, UserRole
from app.schemas.product import (
    ProductCreateRequest,
    ProductUpdateRequest,
    ProductResponse,
    ProductListResponse,
    ProductMessageResponse,
    ProductDeleteResponse,
    ShariahReviewRequest,
    ShariahValidationResult,
    ProductCategory,
    ShariahCategory,
    ProductStatus,
)
from app.services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["Products"])


# ============ Product CRUD ============

@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new product",
    description="Create a new product. Automatic Shariah compliance validation is performed."
)
async def create_product(
    data: ProductCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SELLER, UserRole.ADMIN]))
):
    """
    Create a new product with automatic Shariah validation.
    
    - **Halal products**: Automatically approved and active
    - **Haram products**: Automatically rejected
    - **Mashbooh products**: Pending manual Shariah review
    """
    service = ProductService(db)
    product, validation = await service.create_product(
        seller_id=current_user.id,
        data=data
    )
    
    return service._to_product_response(product, include_seller=False)


@router.get(
    "",
    response_model=ProductListResponse,
    summary="List products",
    description="Get paginated list of products with filters"
)
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: Optional[ProductCategory] = None,
    shariah_category: Optional[ShariahCategory] = None,
    status: Optional[ProductStatus] = None,
    is_active: Optional[bool] = None,
    min_price: Optional[Decimal] = None,
    max_price: Optional[Decimal] = None,
    in_stock: Optional[bool] = None,
    seller_id: Optional[UUID] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    List products with optional filters.
    
    Available filters:
    - **category**: Product category
    - **shariah_category**: Shariah compliance status
    - **status**: Product status (active, pending, rejected)
    - **is_active**: Filter by active status
    - **min_price/max_price**: Price range
    - **in_stock**: Only products with stock > 0
    - **seller_id**: Products from specific seller
    - **search**: Search in name, description, SKU
    """
    from app.schemas.product import ProductFilterParams
    
    filters = ProductFilterParams(
        category=category,
        shariah_category=shariah_category,
        status=status,
        is_active=is_active,
        min_price=min_price,
        max_price=max_price,
        in_stock=in_stock,
        seller_id=seller_id,
        search=search
    )
    
    service = ProductService(db)
    return await service.get_products(filters, page, page_size)


@router.get(
    "/available",
    response_model=ProductListResponse,
    summary="List available products for buyers",
    description="Get products that are active, halal, and in stock"
)
async def list_available_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: Optional[ProductCategory] = None,
    search: Optional[str] = None,
    min_price: Optional[Decimal] = None,
    max_price: Optional[Decimal] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Get products available for purchase (buyers' view).
    
    Only returns products that are:
    - Active and approved
    - Shariah compliant (halal)
    - In stock
    """
    service = ProductService(db)
    return await service.get_available_products(
        page=page,
        page_size=page_size,
        category=category,
        search=search,
        min_price=min_price,
        max_price=max_price
    )


@router.get(
    "/my-products",
    response_model=ProductListResponse,
    summary="List seller's own products",
    description="Get all products for the authenticated seller"
)
async def list_my_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SELLER, UserRole.ADMIN]))
):
    """Get all products owned by the current seller."""
    service = ProductService(db)
    return await service.get_seller_products(
        seller_id=current_user.id,
        page=page,
        page_size=page_size
    )


@router.get(
    "/pending-review",
    response_model=ProductListResponse,
    summary="List products pending Shariah review",
    description="Get products that need manual Shariah compliance review"
)
async def list_pending_review(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SHARIAH_OFFICER, UserRole.ADMIN]))
):
    """
    Get products pending Shariah review.
    Only accessible by Shariah officers and admins.
    """
    service = ProductService(db)
    return await service.get_products_pending_review(page, page_size)


@router.get(
    "/{product_id}",
    response_model=ProductResponse,
    summary="Get product details",
    description="Get detailed information about a specific product"
)
async def get_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get product by ID with seller information."""
    service = ProductService(db)
    product = await service.get_product(product_id)
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return service._to_product_response(product, include_seller=True)


@router.put(
    "/{product_id}",
    response_model=ProductResponse,
    summary="Update product",
    description="Update an existing product"
)
async def update_product(
    product_id: UUID,
    data: ProductUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SELLER, UserRole.ADMIN]))
):
    """
    Update a product.
    
    Only the product owner (seller) can update their products.
    If name/description is changed, Shariah validation is re-run.
    """
    service = ProductService(db)
    
    # Check ownership
    product = await service.get_product(product_id, include_seller=False)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    if product.seller_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own products"
        )
    
    updated_product = await service.update_product(product_id, current_user.id, data)
    
    if not updated_product:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update product"
        )
    
    return service._to_product_response(updated_product, include_seller=False)


@router.delete(
    "/{product_id}",
    response_model=ProductDeleteResponse,
    summary="Delete product",
    description="Soft delete a product"
)
async def delete_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SELLER, UserRole.ADMIN]))
):
    """
    Delete a product (soft delete).
    
    Only the product owner (seller) can delete their products.
    """
    service = ProductService(db)
    
    # Check ownership
    product = await service.get_product(product_id, include_seller=False)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    if product.seller_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own products"
        )
    
    success = await service.delete_product(product_id, current_user.id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to delete product"
        )
    
    return ProductDeleteResponse(
        message="Product deleted successfully",
        success=True,
        product_id=product_id
    )


# ============ Shariah Review ============

@router.post(
    "/{product_id}/shariah-review",
    response_model=ProductResponse,
    summary="Submit Shariah review decision",
    description="Approve or reject a product after manual Shariah review"
)
async def submit_shariah_review(
    product_id: UUID,
    data: ShariahReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SHARIAH_OFFICER, UserRole.ADMIN]))
):
    """
    Submit Shariah compliance review decision.
    
    Only Shariah officers and admins can review products.
    
    - **HALAL**: Product is compliant and will be activated
    - **HARAM**: Product is non-compliant and will be rejected
    - **MASHBOOH**: Product remains in review status
    """
    service = ProductService(db)
    
    product = await service.approve_product(
        product_id=product_id,
        reviewer_id=current_user.id,
        shariah_category=data.shariah_category,
        notes=data.notes
    )
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    return service._to_product_response(product, include_seller=True)


@router.post(
    "/{product_id}/revalidate",
    response_model=ShariahValidationResult,
    summary="Re-validate product Shariah compliance",
    description="Run Shariah validation again on a product"
)
async def revalidate_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SELLER, UserRole.SHARIAH_OFFICER, UserRole.ADMIN]))
):
    """
    Re-run Shariah compliance validation on a product.
    
    Useful after product updates or policy changes.
    """
    service = ProductService(db)
    
    product = await service.get_product(product_id, include_seller=False)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    # Check ownership for sellers
    if current_user.role == UserRole.SELLER and product.seller_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only revalidate your own products"
        )
    
    validation_result = await service._validate_shariah_compliance(product)
    
    # Update product with new validation
    product.shariah_category = validation_result.shariah_category
    product.haram_indicators = (
        {"indicators": validation_result.haram_indicators}
        if validation_result.haram_indicators else None
    )
    
    await db.commit()
    
    # Update the result with actual product ID
    validation_result.product_id = product_id
    
    return validation_result


# ============ Stock Management ============

@router.patch(
    "/{product_id}/stock",
    response_model=ProductResponse,
    summary="Update product stock",
    description="Update the stock quantity of a product"
)
async def update_stock(
    product_id: UUID,
    quantity: int = Query(..., ge=0, description="New stock quantity"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SELLER, UserRole.ADMIN]))
):
    """Update product stock quantity."""
    service = ProductService(db)
    
    product = await service.get_product(product_id, include_seller=False)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    if product.seller_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update stock for your own products"
        )
    
    product.stock_quantity = quantity
    
    # Update status if out of stock
    if quantity == 0 and product.status == ProductStatus.ACTIVE:
        product.status = ProductStatus.OUT_OF_STOCK
    elif quantity > 0 and product.status == ProductStatus.OUT_OF_STOCK:
        product.status = ProductStatus.ACTIVE
    
    await db.commit()
    await db.refresh(product)
    
    return service._to_product_response(product, include_seller=False)


@router.patch(
    "/{product_id}/toggle-active",
    response_model=ProductResponse,
    summary="Toggle product active status",
    description="Activate or deactivate a product"
)
async def toggle_active(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SELLER, UserRole.ADMIN]))
):
    """Toggle product active/inactive status."""
    service = ProductService(db)
    
    product = await service.get_product(product_id, include_seller=False)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    
    if product.seller_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only toggle your own products"
        )
    
    # Can only activate approved or previously-active products (not pending/rejected)
    if not product.is_active and product.status not in [ProductStatus.ACTIVE, ProductStatus.OUT_OF_STOCK, ProductStatus.INACTIVE]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot activate product that is not approved"
        )
    
    # Cannot activate haram products
    if not product.is_active and product.shariah_category == ShariahCategory.HARAM:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot activate Shariah non-compliant products"
        )
    
    # Toggle is_active and update status accordingly
    product.is_active = not product.is_active
    
    if product.is_active:
        # When activating, check stock to set appropriate status
        if product.stock_quantity > 0:
            product.status = ProductStatus.ACTIVE
        else:
            product.status = ProductStatus.OUT_OF_STOCK
    else:
        # When deactivating, set status to INACTIVE
        product.status = ProductStatus.INACTIVE
    
    await db.commit()
    await db.refresh(product)
    
    return service._to_product_response(product, include_seller=False)

