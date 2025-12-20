"""
Orders API Endpoints
Handles order creation, management, and lifecycle operations
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, case
from sqlalchemy.sql import case as sql_case
from sqlalchemy.orm import selectinload
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone
from decimal import Decimal
import uuid as uuid_module

from app.core.database import get_db
from app.api.v1.auth import require_auth, require_auth_user, require_role
from app.models.user import User, UserRole, UserStatus
from app.models.order import (
    Order,
    OrderStatus as OrderStatusModel,
    ShariahStatus as ShariahStatusModel,
    AIApprovalStatus as AIApprovalStatusModel,
    BankApprovalStatus as BankApprovalStatusModel,
    ContractType as ContractTypeModel,
    OwnershipStatus as OwnershipStatusModel,
    OrderStatusHistory,
)
from app.models.product import Product
from app.schemas.order import (
    OrderCreateRequest,
    OrderResponse,
    OrderListResponse,
    BankApprovalRequest,
    DeliveryConfirmationRequest,
    SellerProcessRequest,
    DeliveryAssignmentRequest,
    CancelOrderRequest,
    OrderStatusHistoryResponse,
    UserSummary,
    ProductSummary,
    DeliveryAddressResponse,
    OrderStatus,
    ShariahStatus,
    AIApprovalStatus,
    BankApprovalStatus,
    ContractType,
    OwnershipStatus,
)
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/orders", tags=["orders"])


# ============ Helper Functions ============

def generate_order_number() -> str:
    """Generate unique order number"""
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_part = str(uuid_module.uuid4())[:6].upper()
    return f"ORD-{timestamp}-{random_part}"


def to_order_response(order: Order, include_relations: bool = True) -> OrderResponse:
    """Convert Order model to OrderResponse"""
    buyer = None
    seller = None
    product = None
    
    if include_relations and order.buyer:
        buyer = UserSummary(
            id=order.buyer.id,
            email=order.buyer.email,
            full_name=order.buyer.full_name,
            business_name=order.buyer.business_name,
        )
    
    if include_relations and order.seller:
        seller = UserSummary(
            id=order.seller.id,
            email=order.seller.email,
            full_name=order.seller.full_name,
            business_name=order.seller.business_name,
        )
    
    if include_relations and order.product:
        product = ProductSummary(
            id=order.product.id,
            name=order.product.name,
            sku=order.product.sku,
            category=order.product.category.value if order.product.category else "other",
            price=order.product.price,
            currency=order.product.currency,
            thumbnail_url=order.product.thumbnail_url,
        )
    
    delivery_address = None
    if order.delivery_address:
        delivery_address = DeliveryAddressResponse(**order.delivery_address)
    
    return OrderResponse(
        id=order.id,
        order_number=order.order_number,
        buyer_id=order.buyer_id,
        seller_id=order.seller_id,
        bank_id=order.bank_id,
        buyer=buyer,
        seller=seller,
        product_id=order.product_id,
        product=product,
        quantity=order.quantity,
        unit_price=order.unit_price,
        total_amount=order.total_amount,
        buyer_down_payment=order.buyer_down_payment,
        bank_financing_amount=order.bank_financing_amount,
        currency=order.currency,
        status=OrderStatus(order.status.value),
        shariah_status=ShariahStatus(order.shariah_status.value),
        ai_approval_status=AIApprovalStatus(order.ai_approval_status.value),
        bank_approval_status=BankApprovalStatus(order.bank_approval_status.value),
        contract_type=ContractType(order.contract_type.value),
        financing_requested=order.financing_requested,
        ownership_status=OwnershipStatus(order.ownership_status.value),
        delivery_address=delivery_address,
        delivery_terms=order.delivery_terms,
        expected_delivery_date=order.expected_delivery_date,
        actual_delivery_date=order.actual_delivery_date,
        buyer_confirmed_at=order.buyer_confirmed_at,
        seller_confirmed_at=order.seller_confirmed_at,
        provider_confirmed_at=order.provider_confirmed_at,
        shariah_validated_at=order.shariah_validated_at,
        ai_evaluated_at=order.ai_evaluated_at,
        bank_approved_at=order.bank_approved_at,
        escrow_locked_at=order.escrow_locked_at,
        escrow_released_at=order.escrow_released_at,
        settled_at=order.settled_at,
        notes=order.notes,
        cancellation_reason=order.cancellation_reason,
        created_at=order.created_at,
        updated_at=order.updated_at,
        is_active=order.is_active,
        can_be_cancelled=order.can_be_cancelled,
        release_conditions_met=order.release_conditions_met,
    )


# ============ Order Creation ============

@router.post(
    "",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new order",
    description="Buyer creates a new order for a product"
)
async def create_order(
    request: OrderCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BUYER]))
):
    """Create a new order as a buyer."""
    # Get the product
    product_result = await db.execute(
        select(Product)
        .options(selectinload(Product.seller))
        .where(and_(
            Product.id == request.product_id,
            Product.is_deleted == False,
            Product.is_active == True
        ))
    )
    product = product_result.scalar_one_or_none()
    
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found or not available"
        )
    
    # Validate stock
    if product.stock_quantity < request.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock. Available: {product.stock_quantity}"
        )
    
    # Validate order quantity
    if request.quantity < product.min_order_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum order quantity is {product.min_order_quantity}"
        )
    
    if product.max_order_quantity and request.quantity > product.max_order_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Maximum order quantity is {product.max_order_quantity}"
        )
    
    # Check product is not from the buyer themselves
    if product.seller_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot order your own product"
        )
    
    # Calculate amounts
    unit_price = product.price
    total_amount = unit_price * request.quantity
    
    # Determine financing amounts
    if request.financing_requested:
        buyer_down_payment = total_amount * Decimal('0.2')  # 20% down payment
        bank_financing_amount = total_amount * Decimal('0.8')  # 80% financing
    else:
        buyer_down_payment = total_amount
        bank_financing_amount = Decimal('0')
    
    # Create delivery address dict
    delivery_address_dict = None
    if request.delivery_address:
        delivery_address_dict = request.delivery_address.model_dump()
    
    # Create order
    order = Order(
        order_number=generate_order_number(),
        buyer_id=current_user.id,
        seller_id=product.seller_id,
        product_id=product.id,
        quantity=request.quantity,
        unit_price=unit_price,
        total_amount=total_amount,
        buyer_down_payment=buyer_down_payment,
        bank_financing_amount=bank_financing_amount,
        currency=product.currency,
        status=OrderStatusModel.CREATED,
        contract_type=ContractTypeModel(request.contract_type.value),
        financing_requested=request.financing_requested,
        delivery_address=delivery_address_dict,
        notes=request.notes,
    )
    
    db.add(order)
    
    # Flush to generate order ID before creating status history
    await db.flush()
    
    # Add initial status history
    history = OrderStatusHistory(
        order_id=order.id,
        from_status=None,
        to_status=OrderStatusModel.CREATED.value,
        changed_by=current_user.id,
        reason="Order created",
        trigger_type="user",
    )
    db.add(history)
    
    await db.commit()
    await db.refresh(order)
    
    # Load relationships
    order_result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.buyer),
            selectinload(Order.seller),
            selectinload(Order.product)
        )
        .where(Order.id == order.id)
    )
    order = order_result.scalar_one()
    
    # Auto-trigger Shariah validation (simulated)
    await _auto_shariah_validate(db, order, current_user.id)
    
    logger.info(f"Order {order.order_number} created by {current_user.email}")
    
    return to_order_response(order)


async def _auto_shariah_validate(db: AsyncSession, order: Order, actor_id: UUID):
    """Auto-trigger Shariah validation after order creation"""
    # In a real system, this would call the Shariah service
    # For now, we simulate auto-approval for halal products
    
    product = order.product
    if not product:
        product_result = await db.execute(
            select(Product).where(Product.id == order.product_id)
        )
        product = product_result.scalar_one_or_none()
    
    if product and product.shariah_category:
        from app.models.product import ShariahCategory
        if product.shariah_category == ShariahCategory.HALAL:
            order.shariah_status = ShariahStatusModel.COMPLIANT
            order.shariah_validated_at = datetime.now(timezone.utc)
            order.status = OrderStatusModel.SHARIAH_VALIDATED
            
            # Add history
            history = OrderStatusHistory(
                order_id=order.id,
                from_status=OrderStatusModel.CREATED.value,
                to_status=OrderStatusModel.SHARIAH_VALIDATED.value,
                changed_by=actor_id,
                reason="Auto Shariah validation - Product is halal certified",
                trigger_type="system",
            )
            db.add(history)
            
            # Auto-trigger AI evaluation
            await _auto_ai_evaluate(db, order, actor_id)
        elif product.shariah_category == ShariahCategory.HARAM:
            order.shariah_status = ShariahStatusModel.NON_COMPLIANT
            order.status = OrderStatusModel.BLOCKED
            
            history = OrderStatusHistory(
                order_id=order.id,
                from_status=OrderStatusModel.CREATED.value,
                to_status=OrderStatusModel.BLOCKED.value,
                changed_by=actor_id,
                reason="Blocked - Product is haram",
                trigger_type="system",
            )
            db.add(history)
        else:
            order.shariah_status = ShariahStatusModel.REQUIRES_REVIEW
    
    await db.commit()


async def _auto_ai_evaluate(db: AsyncSession, order: Order, actor_id: UUID):
    """Auto-trigger AI evaluation after Shariah validation"""
    # Simulated AI evaluation - in production, call AI service
    order.ai_approval_status = AIApprovalStatusModel.APPROVED
    order.ai_evaluated_at = datetime.now(timezone.utc)
    
    if order.financing_requested:
        order.status = OrderStatusModel.PENDING_BANK_APPROVAL
        order.bank_approval_status = BankApprovalStatusModel.PENDING
        
        history = OrderStatusHistory(
            order_id=order.id,
            from_status=OrderStatusModel.SHARIAH_VALIDATED.value,
            to_status=OrderStatusModel.PENDING_BANK_APPROVAL.value,
            changed_by=actor_id,
            reason="AI approved - Awaiting bank approval for financing",
            trigger_type="system",
        )
    else:
        # No financing needed, skip bank approval
        order.status = OrderStatusModel.FUNDED
        order.escrow_locked_at = datetime.now(timezone.utc)
        order.bank_approval_status = BankApprovalStatusModel.NOT_REQUESTED
        
        history = OrderStatusHistory(
            order_id=order.id,
            from_status=OrderStatusModel.SHARIAH_VALIDATED.value,
            to_status=OrderStatusModel.FUNDED.value,
            changed_by=actor_id,
            reason="AI approved - Escrow funded (no financing)",
            trigger_type="system",
        )
    
    db.add(history)
    await db.commit()


# ============ Order Retrieval ============

@router.get(
    "",
    response_model=OrderListResponse,
    summary="List orders",
    description="Get orders for the current user based on their role"
)
async def list_orders(
    status: Optional[str] = Query(None, description="Filter by status"),
    financing_requested: Optional[bool] = Query(None, description="Filter by financing"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_auth_user)
):
    """List orders based on user role."""
    query = select(Order).options(
        selectinload(Order.buyer),
        selectinload(Order.seller),
        selectinload(Order.product)
    ).where(Order.is_deleted == False)
    
    # Filter by role
    if current_user.role == UserRole.BUYER:
        query = query.where(Order.buyer_id == current_user.id)
    elif current_user.role == UserRole.SELLER:
        query = query.where(Order.seller_id == current_user.id)
    elif current_user.role == UserRole.BANK:
        # Banks see orders pending their approval or that they've approved
        query = query.where(
            and_(
                Order.financing_requested == True,
                Order.bank_approval_status.in_([
                    BankApprovalStatusModel.PENDING,
                    BankApprovalStatusModel.APPROVED,
                    BankApprovalStatusModel.REJECTED
                ])
            )
        )
    elif current_user.role == UserRole.DELIVERY_PROVIDER:
        # Delivery partners see orders in transit
        query = query.where(
            Order.status.in_([
                OrderStatusModel.PROCESSING,
                OrderStatusModel.IN_TRANSIT,
                OrderStatusModel.DELIVERED
            ])
        )
    # Admin and Shariah Officer see all orders
    
    # Apply status filter
    if status:
        try:
            status_enum = OrderStatusModel(status)
            query = query.where(Order.status == status_enum)
        except ValueError:
            pass
    
    # Apply financing filter
    if financing_requested is not None:
        query = query.where(Order.financing_requested == financing_requested)
    
    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Apply pagination and ordering
    query = query.offset(skip).limit(limit).order_by(Order.created_at.desc())
    
    result = await db.execute(query)
    orders = result.scalars().all()
    
    return OrderListResponse(
        orders=[to_order_response(o) for o in orders],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get(
    "/my-orders",
    response_model=OrderListResponse,
    summary="Get my orders",
    description="Get orders where current user is buyer or seller"
)
async def get_my_orders(
    role_filter: Optional[str] = Query(None, description="Filter: 'buyer' or 'seller'"),
    status: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_auth_user)
):
    """Get orders where user is buyer or seller."""
    query = select(Order).options(
        selectinload(Order.buyer),
        selectinload(Order.seller),
        selectinload(Order.product)
    ).where(Order.is_deleted == False)
    
    if role_filter == "buyer":
        query = query.where(Order.buyer_id == current_user.id)
    elif role_filter == "seller":
        query = query.where(Order.seller_id == current_user.id)
    else:
        query = query.where(
            (Order.buyer_id == current_user.id) | (Order.seller_id == current_user.id)
        )
    
    if status:
        try:
            status_enum = OrderStatusModel(status)
            query = query.where(Order.status == status_enum)
        except ValueError:
            pass
    
    # Get count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    query = query.offset(skip).limit(limit).order_by(Order.created_at.desc())
    
    result = await db.execute(query)
    orders = result.scalars().all()
    
    return OrderListResponse(
        orders=[to_order_response(o) for o in orders],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get(
    "/pending-approval",
    response_model=OrderListResponse,
    summary="Get orders pending bank approval",
    description="Bank users can view orders awaiting their approval"
)
async def get_pending_approval_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BANK, UserRole.ADMIN]))
):
    """Get orders pending bank approval."""
    query = select(Order).options(
        selectinload(Order.buyer),
        selectinload(Order.seller),
        selectinload(Order.product)
    ).where(
        and_(
            Order.is_deleted == False,
            Order.financing_requested == True,
            Order.bank_approval_status == BankApprovalStatusModel.PENDING,
            Order.status == OrderStatusModel.PENDING_BANK_APPROVAL
        )
    )
    
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    query = query.offset(skip).limit(limit).order_by(Order.created_at.asc())
    
    result = await db.execute(query)
    orders = result.scalars().all()
    
    return OrderListResponse(
        orders=[to_order_response(o) for o in orders],
        total=total,
        skip=skip,
        limit=limit
    )


# ============ Delivery Assignment ============
# NOTE: This route must be defined BEFORE /{order_id} routes to avoid route conflicts

@router.get(
    "/delivery-providers",
    response_model=List[UserSummary],
    summary="List delivery providers",
    description="Get list of available delivery providers for sellers to assign"
)
async def list_delivery_providers(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SELLER, UserRole.ADMIN]))
):
    """List all available delivery providers."""
    # First, check all delivery providers regardless of status for debugging
    all_providers_result = await db.execute(
        select(User).where(
            and_(
                User.role == UserRole.DELIVERY_PROVIDER,
                User.is_deleted == False
            )
        )
    )
    all_providers = all_providers_result.scalars().all()
    logger.info(f"Found {len(all_providers)} total delivery providers (any status)")
    for p in all_providers:
        logger.info(f"  - {p.email} (Status: {p.status.value}, Role: {p.role.value})")
    
    # Get all delivery providers (excluding only SUSPENDED and deleted)
    result = await db.execute(
        select(User).where(
            and_(
                User.role == UserRole.DELIVERY_PROVIDER,
                User.status != UserStatus.SUSPENDED,  # Only exclude suspended
                User.is_deleted == False
            )
        ).order_by(
            # Order by status: ACTIVE first, then others
            sql_case(
                (User.status == UserStatus.ACTIVE, 1),
                else_=2
            ),
            User.first_name.asc(),
            User.last_name.asc()
        )
    )
    providers = result.scalars().all()
    logger.info(f"Returning {len(providers)} delivery providers (excluding suspended)")
    
    return [
        UserSummary(
            id=str(p.id),
            email=p.email,
            full_name=p.full_name or p.email or p.username,
            business_name=p.business_name,
            phone=p.phone_number
        )
        for p in providers
    ]


@router.get(
    "/{order_id}",
    response_model=OrderResponse,
    summary="Get order details",
    description="Get detailed information about a specific order"
)
async def get_order(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_auth_user)
):
    """Get order by ID."""
    result = await db.execute(
        select(Order).options(
            selectinload(Order.buyer),
            selectinload(Order.seller),
            selectinload(Order.product)
        ).where(
            and_(Order.id == order_id, Order.is_deleted == False)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check access
    allowed_roles = [UserRole.ADMIN, UserRole.SHARIAH_OFFICER]
    is_participant = (
        order.buyer_id == current_user.id or
        order.seller_id == current_user.id or
        order.bank_id == current_user.id
    )
    
    if current_user.role not in allowed_roles and not is_participant:
        # Delivery partners can view assigned orders
        if current_user.role == UserRole.DELIVERY_PROVIDER:
            if order.status not in [OrderStatusModel.PROCESSING, OrderStatusModel.IN_TRANSIT, OrderStatusModel.DELIVERED]:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to this order"
                )
        elif current_user.role == UserRole.BANK and order.financing_requested:
            pass  # Banks can view financing orders
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this order"
            )
    
    return to_order_response(order)


# ============ Bank Approval ============

@router.post(
    "/{order_id}/bank-approve",
    response_model=OrderResponse,
    summary="Bank approve order",
    description="Bank approves financing for an order"
)
async def bank_approve_order(
    order_id: UUID,
    request: Optional[BankApprovalRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BANK, UserRole.ADMIN]))
):
    """Bank approves an order for financing."""
    result = await db.execute(
        select(Order).options(
            selectinload(Order.buyer),
            selectinload(Order.seller),
            selectinload(Order.product)
        ).where(
            and_(Order.id == order_id, Order.is_deleted == False)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    if order.status != OrderStatusModel.PENDING_BANK_APPROVAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order is not pending bank approval. Current status: {order.status.value}"
        )
    
    # Approve
    order.bank_approval_status = BankApprovalStatusModel.APPROVED
    order.bank_approved_at = datetime.now(timezone.utc)
    order.bank_id = current_user.id
    order.status = OrderStatusModel.BANK_APPROVED
    
    if request and request.financing_amount:
        order.bank_financing_amount = request.financing_amount
    
    # Add history
    history = OrderStatusHistory(
        order_id=order.id,
        from_status=OrderStatusModel.PENDING_BANK_APPROVAL.value,
        to_status=OrderStatusModel.BANK_APPROVED.value,
        changed_by=current_user.id,
        reason=request.notes if request else "Bank approved financing",
        trigger_type="user",
    )
    db.add(history)
    
    # Auto-fund escrow after bank approval
    order.status = OrderStatusModel.FUNDED
    order.escrow_locked_at = datetime.now(timezone.utc)
    
    fund_history = OrderStatusHistory(
        order_id=order.id,
        from_status=OrderStatusModel.BANK_APPROVED.value,
        to_status=OrderStatusModel.FUNDED.value,
        changed_by=current_user.id,
        reason="Escrow funded after bank approval",
        trigger_type="system",
    )
    db.add(fund_history)
    
    await db.commit()
    
    # Re-query order with relationships to avoid lazy loading issues
    result = await db.execute(
        select(Order).options(
            selectinload(Order.buyer),
            selectinload(Order.seller),
            selectinload(Order.product)
        ).where(Order.id == order_id)
    )
    order = result.scalar_one()
    
    logger.info(f"Order {order.order_number} approved by bank {current_user.email}")
    
    return to_order_response(order)


@router.post(
    "/{order_id}/bank-reject",
    response_model=OrderResponse,
    summary="Bank reject order",
    description="Bank rejects financing for an order"
)
async def bank_reject_order(
    order_id: UUID,
    request: BankApprovalRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BANK, UserRole.ADMIN]))
):
    """Bank rejects an order for financing."""
    result = await db.execute(
        select(Order).options(
            selectinload(Order.buyer),
            selectinload(Order.seller),
            selectinload(Order.product)
        ).where(
            and_(Order.id == order_id, Order.is_deleted == False)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    if order.status != OrderStatusModel.PENDING_BANK_APPROVAL:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order is not pending bank approval. Current status: {order.status.value}"
        )
    
    # Reject
    order.bank_approval_status = BankApprovalStatusModel.REJECTED
    order.bank_id = current_user.id
    order.status = OrderStatusModel.CANCELLED
    order.cancellation_reason = request.reason or "Bank rejected financing"
    
    history = OrderStatusHistory(
        order_id=order.id,
        from_status=OrderStatusModel.PENDING_BANK_APPROVAL.value,
        to_status=OrderStatusModel.CANCELLED.value,
        changed_by=current_user.id,
        reason=request.reason or "Bank rejected financing",
        trigger_type="user",
    )
    db.add(history)
    
    await db.commit()
    
    # Re-query order with relationships to avoid lazy loading issues
    result = await db.execute(
        select(Order).options(
            selectinload(Order.buyer),
            selectinload(Order.seller),
            selectinload(Order.product)
        ).where(Order.id == order_id)
    )
    order = result.scalar_one()
    
    logger.info(f"Order {order.order_number} rejected by bank {current_user.email}")
    
    return to_order_response(order)


# ============ Seller Actions ============

@router.post(
    "/{order_id}/seller-process",
    response_model=OrderResponse,
    summary="Seller process order",
    description="Seller accepts, rejects, or ships an order"
)
async def seller_process_order(
    order_id: UUID,
    request: SellerProcessRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SELLER, UserRole.ADMIN]))
):
    """Seller processes an order."""
    result = await db.execute(
        select(Order).options(
            selectinload(Order.buyer),
            selectinload(Order.seller),
            selectinload(Order.product)
        ).where(
            and_(Order.id == order_id, Order.is_deleted == False)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Verify seller owns this order
    if order.seller_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not the seller for this order"
        )
    
    if request.action == "accept":
        if order.status != OrderStatusModel.FUNDED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order must be funded to accept"
            )
        
        order.status = OrderStatusModel.PROCESSING
        order.seller_confirmed_at = datetime.now(timezone.utc)
        if request.estimated_delivery_date:
            order.expected_delivery_date = request.estimated_delivery_date
        
        history = OrderStatusHistory(
            order_id=order.id,
            from_status=OrderStatusModel.FUNDED.value,
            to_status=OrderStatusModel.PROCESSING.value,
            changed_by=current_user.id,
            reason="Seller accepted order",
            trigger_type="user",
        )
        db.add(history)
        
    elif request.action == "reject":
        if order.status not in [OrderStatusModel.FUNDED, OrderStatusModel.PROCESSING]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot reject order in current status"
            )
        
        order.status = OrderStatusModel.REFUNDED
        order.cancellation_reason = request.notes or "Seller rejected order"
        
        history = OrderStatusHistory(
            order_id=order.id,
            from_status=order.status.value,
            to_status=OrderStatusModel.REFUNDED.value,
            changed_by=current_user.id,
            reason=request.notes or "Seller rejected order",
            trigger_type="user",
        )
        db.add(history)
        
    elif request.action == "ship":
        if order.status != OrderStatusModel.PROCESSING:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order must be processing to ship"
            )
        
        order.status = OrderStatusModel.IN_TRANSIT
        order.ownership_status = OwnershipStatusModel.IN_TRANSIT
        
        if request.estimated_delivery_date:
            order.expected_delivery_date = request.estimated_delivery_date
        
        # Store tracking number in metadata
        if request.tracking_number:
            metadata = order.order_metadata or {}
            metadata['tracking_number'] = request.tracking_number
            order.order_metadata = metadata
        
        history = OrderStatusHistory(
            order_id=order.id,
            from_status=OrderStatusModel.PROCESSING.value,
            to_status=OrderStatusModel.IN_TRANSIT.value,
            changed_by=current_user.id,
            reason=f"Order shipped{' - ' + request.notes if request.notes else ''}",
            trigger_type="user",
        )
        db.add(history)
    
    await db.commit()
    
    # Re-query order with relationships to avoid lazy loading issues
    result = await db.execute(
        select(Order).options(
            selectinload(Order.buyer),
            selectinload(Order.seller),
            selectinload(Order.product)
        ).where(Order.id == order_id)
    )
    order = result.scalar_one()
    
    logger.info(f"Order {order.order_number} {request.action}ed by seller {current_user.email}")
    
    return to_order_response(order)


@router.post(
    "/{order_id}/assign-delivery",
    response_model=OrderResponse,
    summary="Assign delivery provider",
    description="Seller assigns a delivery provider to an order"
)
async def assign_delivery_provider(
    order_id: UUID,
    request: DeliveryAssignmentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SELLER, UserRole.ADMIN]))
):
    """Seller assigns a delivery provider to an order."""
    from app.services.delivery_service import DeliveryService
    from app.models.delivery import Delivery
    
    # Get order
    result = await db.execute(
        select(Order).options(
            selectinload(Order.buyer),
            selectinload(Order.seller),
            selectinload(Order.product)
        ).where(
            and_(Order.id == order_id, Order.is_deleted == False)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Verify seller owns this order
    if order.seller_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not the seller for this order"
        )
    
    # Check order status
    if order.status != OrderStatusModel.PROCESSING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must be in PROCESSING status to assign delivery"
        )
    
    # Check if delivery already exists
    delivery_result = await db.execute(
        select(Delivery).where(Delivery.order_id == order_id)
    )
    existing_delivery = delivery_result.scalar_one_or_none()
    
    if existing_delivery:
        # If delivery exists but order.delivery_id is not set, update it
        if order.delivery_id != existing_delivery.id:
            order.delivery_id = existing_delivery.id
            await db.commit()
            logger.info(f"Updated order {order.order_number} with existing delivery {existing_delivery.id}")
        
        # Get provider info for better error message
        provider_info = "Unknown"
        if existing_delivery.provider_id:
            provider_check = await db.execute(
                select(User).where(User.id == existing_delivery.provider_id)
            )
            provider_user = provider_check.scalar_one_or_none()
            if provider_user:
                provider_info = provider_user.full_name or provider_user.email
        
        # Return the existing delivery info
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Delivery already assigned to this order. Provider: {provider_info}"
        )
    
    # Verify provider exists and is a delivery provider
    # Allow all statuses except SUSPENDED (matching the list endpoint)
    logger.info(f"Looking for delivery provider: id={request.provider_id}")
    provider_result = await db.execute(
        select(User).where(
            and_(
                User.id == request.provider_id,
                User.role == UserRole.DELIVERY_PROVIDER,
                User.status != UserStatus.SUSPENDED,  # Only exclude suspended
                User.is_deleted == False
            )
        )
    )
    provider = provider_result.scalar_one_or_none()
    
    if not provider:
        # Log for debugging - check if user exists at all
        user_check = await db.execute(
            select(User).where(User.id == request.provider_id)
        )
        user = user_check.scalar_one_or_none()
        if user:
            logger.warning(
                f"User found but doesn't match delivery provider criteria: "
                f"id={user.id}, email={user.email}, "
                f"role={user.role.value if user.role else None}, "
                f"status={user.status.value if user.status else None}, "
                f"deleted={user.is_deleted}"
            )
            # Provide more specific error message
            if user.role != UserRole.DELIVERY_PROVIDER:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"User is not a delivery provider (role: {user.role.value if user.role else 'unknown'})"
                )
            elif user.status == UserStatus.SUSPENDED:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Delivery provider account is suspended"
                )
            elif user.is_deleted:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Delivery provider account has been deleted"
                )
        else:
            logger.warning(f"User not found with id: {request.provider_id}")
        
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery provider not found"
        )
    
    logger.info(f"Found delivery provider: {provider.email} (status: {provider.status.value})")
    
    # Get addresses from order
    pickup_address = {
        "name": order.seller.full_name if order.seller else "Seller",
        "address": order.seller.address_line_1 if order.seller and order.seller.address_line_1 else "",
        "city": order.seller.city if order.seller and order.seller.city else "",
        "phone": order.seller.phone_number if order.seller and order.seller.phone_number else "",
    }
    
    delivery_address = order.delivery_address or {}
    
    # Create delivery
    service = DeliveryService(db)
    delivery = await service.create_delivery(
        order_id=order_id,
        provider_id=request.provider_id,
        pickup_address=pickup_address,
        delivery_address=delivery_address,
        estimated_delivery=request.estimated_delivery_date,
        special_instructions=request.special_instructions,
        metadata={
            "assigned_by": str(current_user.id),
            "assigned_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    
    # Update order to link delivery
    order.delivery_id = delivery.id
    
    # Add status history
    history = OrderStatusHistory(
        order_id=order.id,
        from_status=OrderStatusModel.PROCESSING.value,
        to_status=OrderStatusModel.PROCESSING.value,  # Status stays PROCESSING until shipped
        changed_by=current_user.id,
        reason=f"Delivery assigned to {provider.full_name or provider.email}",
        trigger_type="user",
    )
    db.add(history)
    
    await db.commit()
    
    # Re-query order with relationships to avoid lazy loading issues
    result = await db.execute(
        select(Order).options(
            selectinload(Order.buyer),
            selectinload(Order.seller),
            selectinload(Order.product)
        ).where(Order.id == order_id)
    )
    order = result.scalar_one()
    
    logger.info(f"Delivery {delivery.id} assigned to order {order.order_number} by seller {current_user.email}")
    
    return to_order_response(order)


# ============ Delivery Confirmation ============

@router.post(
    "/{order_id}/confirm-delivery",
    response_model=OrderResponse,
    summary="Confirm delivery",
    description="Buyer confirms delivery of the order"
)
async def confirm_delivery(
    order_id: UUID,
    request: DeliveryConfirmationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BUYER, UserRole.ADMIN]))
):
    """Buyer confirms delivery."""
    result = await db.execute(
        select(Order).options(
            selectinload(Order.buyer),
            selectinload(Order.seller),
            selectinload(Order.product)
        ).where(
            and_(Order.id == order_id, Order.is_deleted == False)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Verify buyer owns this order
    if order.buyer_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not the buyer for this order"
        )
    
    if order.status != OrderStatusModel.IN_TRANSIT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order must be in transit to confirm delivery. Current status: {order.status.value}"
        )
    
    if request.confirmed:
        order.status = OrderStatusModel.DELIVERED
        order.buyer_confirmed_at = datetime.now(timezone.utc)
        order.actual_delivery_date = request.delivery_date or datetime.now(timezone.utc)
        order.ownership_status = OwnershipStatusModel.BUYER
        
        # Store rating
        if request.rating:
            metadata = order.order_metadata or {}
            metadata['buyer_rating'] = request.rating
            order.order_metadata = metadata
        
        history = OrderStatusHistory(
            order_id=order.id,
            from_status=OrderStatusModel.IN_TRANSIT.value,
            to_status=OrderStatusModel.DELIVERED.value,
            changed_by=current_user.id,
            reason=request.notes or "Buyer confirmed delivery",
            trigger_type="user",
        )
        db.add(history)
        
        # Auto verify delivery and settle (simulated)
        order.status = OrderStatusModel.DELIVERY_VERIFIED
        order.provider_confirmed_at = datetime.now(timezone.utc)
        
        verify_history = OrderStatusHistory(
            order_id=order.id,
            from_status=OrderStatusModel.DELIVERED.value,
            to_status=OrderStatusModel.DELIVERY_VERIFIED.value,
            changed_by=current_user.id,
            reason="Delivery verified by system",
            trigger_type="system",
        )
        db.add(verify_history)
        
        # Auto-settle
        order.status = OrderStatusModel.SETTLED
        order.escrow_released_at = datetime.now(timezone.utc)
        order.settled_at = datetime.now(timezone.utc)
        
        settle_history = OrderStatusHistory(
            order_id=order.id,
            from_status=OrderStatusModel.DELIVERY_VERIFIED.value,
            to_status=OrderStatusModel.SETTLED.value,
            changed_by=current_user.id,
            reason="Payment released to seller",
            trigger_type="system",
        )
        db.add(settle_history)
        
    else:
        # Buyer reports delivery issue
        order.status = OrderStatusModel.DISPUTED
        
        history = OrderStatusHistory(
            order_id=order.id,
            from_status=OrderStatusModel.IN_TRANSIT.value,
            to_status=OrderStatusModel.DISPUTED.value,
            changed_by=current_user.id,
            reason=request.notes or "Buyer reported delivery issue",
            trigger_type="user",
        )
        db.add(history)
    
    await db.commit()
    
    # Re-query order with relationships to avoid lazy loading issues
    result = await db.execute(
        select(Order).options(
            selectinload(Order.buyer),
            selectinload(Order.seller),
            selectinload(Order.product)
        ).where(Order.id == order_id)
    )
    order = result.scalar_one()
    
    logger.info(f"Order {order.order_number} delivery {'confirmed' if request.confirmed else 'disputed'} by buyer {current_user.email}")
    
    return to_order_response(order)


# ============ Order Cancellation ============

@router.post(
    "/{order_id}/cancel",
    response_model=OrderResponse,
    summary="Cancel order",
    description="Cancel an order (if allowed)"
)
async def cancel_order(
    order_id: UUID,
    request: CancelOrderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_auth_user)
):
    """Cancel an order."""
    result = await db.execute(
        select(Order).options(
            selectinload(Order.buyer),
            selectinload(Order.seller),
            selectinload(Order.product)
        ).where(
            and_(Order.id == order_id, Order.is_deleted == False)
        )
    )
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check if user can cancel
    is_buyer = order.buyer_id == current_user.id
    is_seller = order.seller_id == current_user.id
    is_admin = current_user.role == UserRole.ADMIN
    
    if not (is_buyer or is_seller or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to cancel this order"
        )
    
    if not order.can_be_cancelled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Order cannot be cancelled in current status: {order.status.value}"
        )
    
    old_status = order.status
    order.status = OrderStatusModel.CANCELLED
    order.cancellation_reason = request.reason
    
    # Refund if funded
    if old_status in [OrderStatusModel.FUNDED, OrderStatusModel.PROCESSING, OrderStatusModel.BANK_APPROVED]:
        order.status = OrderStatusModel.REFUNDED
    
    history = OrderStatusHistory(
        order_id=order.id,
        from_status=old_status.value,
        to_status=order.status.value,
        changed_by=current_user.id,
        reason=request.reason,
        trigger_type="user",
    )
    db.add(history)
    
    await db.commit()
    
    # Re-query order with relationships to avoid lazy loading issues
    result = await db.execute(
        select(Order).options(
            selectinload(Order.buyer),
            selectinload(Order.seller),
            selectinload(Order.product)
        ).where(Order.id == order_id)
    )
    order = result.scalar_one()
    
    logger.info(f"Order {order.order_number} cancelled by {current_user.email}")
    
    return to_order_response(order)


# ============ Order History ============

@router.get(
    "/{order_id}/history",
    response_model=List[OrderStatusHistoryResponse],
    summary="Get order status history",
    description="Get the complete status history of an order"
)
async def get_order_history(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_auth_user)
):
    """Get order status history."""
    # First verify order exists and user has access
    order_result = await db.execute(
        select(Order).where(
            and_(Order.id == order_id, Order.is_deleted == False)
        )
    )
    order = order_result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Check access
    is_participant = (
        order.buyer_id == current_user.id or
        order.seller_id == current_user.id or
        order.bank_id == current_user.id
    )
    
    if not is_participant and current_user.role not in [UserRole.ADMIN, UserRole.SHARIAH_OFFICER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this order"
        )
    
    # Get history
    history_result = await db.execute(
        select(OrderStatusHistory)
        .where(OrderStatusHistory.order_id == order_id)
        .order_by(OrderStatusHistory.created_at.asc())
    )
    history = history_result.scalars().all()
    
    return [
        OrderStatusHistoryResponse(
            id=h.id,
            order_id=h.order_id,
            from_status=h.from_status,
            to_status=h.to_status,
            changed_by=h.changed_by,
            reason=h.reason,
            trigger_type=h.trigger_type,
            created_at=h.created_at,
        )
        for h in history
    ]

