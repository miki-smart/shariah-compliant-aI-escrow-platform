"""
Escrow API Routes
Endpoints for escrow management operations
"""
from typing import Optional, List
from uuid import UUID
from decimal import Decimal
from datetime import datetime, timezone
import secrets

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.dependencies import get_current_active_user, require_roles
from app.core.logging import get_logger
from app.models.user import User, UserRole
from app.models.order import Order, OrderStatus
from app.models.escrow import (
    Escrow,
    EscrowTransaction,
    EscrowStatus,
    TransactionType,
    TransactionStatus,
)
from app.schemas.escrow import (
    EscrowFundRequest,
    EscrowReleaseRequest,
    EscrowRefundRequest,
    EscrowFreezeRequest,
    EscrowResponse,
    EscrowBalanceResponse,
    EscrowTransactionResponse,
    EscrowTransactionListResponse,
    EscrowOperationResult,
    EscrowSummaryResponse,
)

logger = get_logger(__name__)
router = APIRouter(prefix="/escrow", tags=["Escrow"])


# ============ Helper Functions ============

def escrow_to_response(escrow: Escrow) -> EscrowResponse:
    """Convert Escrow model to response schema"""
    return EscrowResponse(
        id=escrow.id,
        order_id=escrow.order_id,
        escrow_number=escrow.escrow_number,
        status=escrow.status,
        previous_status=escrow.previous_status,
        total_amount=escrow.total_amount,
        bank_amount=escrow.bank_amount,
        buyer_amount=escrow.buyer_amount,
        released_amount=escrow.released_amount,
        refunded_amount=escrow.refunded_amount,
        platform_fee=escrow.platform_fee,
        currency=escrow.currency,
        bank_id=escrow.bank_id,
        bank_reference=escrow.bank_reference,
        locked_at=escrow.locked_at,
        frozen_at=escrow.frozen_at,
        released_at=escrow.released_at,
        reverted_at=escrow.reverted_at,
        created_at=escrow.created_at,
        updated_at=escrow.updated_at,
        release_conditions=escrow.release_conditions,
        available_balance=escrow.available_balance,
        is_locked=escrow.is_locked,
        is_frozen=escrow.is_frozen,
        is_terminal=escrow.is_terminal,
    )


def transaction_to_response(tx: EscrowTransaction) -> EscrowTransactionResponse:
    """Convert EscrowTransaction model to response schema"""
    return EscrowTransactionResponse(
        id=tx.id,
        escrow_id=tx.escrow_id,
        transaction_type=tx.transaction_type,
        status=tx.status,
        amount=tx.amount,
        currency=tx.currency,
        from_account=tx.from_account,
        to_account=tx.to_account,
        reference_number=tx.reference_number,
        external_reference=tx.external_reference,
        initiated_by=tx.initiated_by,
        initiator_type=tx.initiator_type,
        description=tx.description,
        processed_at=tx.processed_at,
        failure_reason=tx.failure_reason,
        created_at=tx.created_at,
    )


async def get_order_or_404(db: AsyncSession, order_id: UUID) -> Order:
    """Get order by ID or raise 404"""
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.is_deleted == False)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {order_id} not found"
        )
    return order


async def get_escrow_or_404(db: AsyncSession, escrow_id: UUID) -> Escrow:
    """Get escrow by ID or raise 404"""
    result = await db.execute(
        select(Escrow).where(Escrow.id == escrow_id, Escrow.is_deleted == False)
    )
    escrow = result.scalar_one_or_none()
    if not escrow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Escrow {escrow_id} not found"
        )
    return escrow


async def get_escrow_by_order_or_404(db: AsyncSession, order_id: UUID) -> Escrow:
    """Get escrow by order ID or raise 404"""
    result = await db.execute(
        select(Escrow).where(Escrow.order_id == order_id, Escrow.is_deleted == False)
    )
    escrow = result.scalar_one_or_none()
    if not escrow:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Escrow for order {order_id} not found"
        )
    return escrow


# ============ Escrow Endpoints ============

@router.get("/order/{order_id}", response_model=EscrowResponse)
async def get_escrow_by_order(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get escrow details by order ID.
    
    Accessible by: Order buyer, seller, or bank
    """
    order = await get_order_or_404(db, order_id)
    
    # Check authorization
    if current_user.role not in [UserRole.ADMIN, UserRole.BANK]:
        if current_user.id not in [order.buyer_id, order.seller_id]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this escrow"
            )
    
    escrow = await get_escrow_by_order_or_404(db, order_id)
    return escrow_to_response(escrow)


@router.get("/{escrow_id}", response_model=EscrowResponse)
async def get_escrow(
    escrow_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get escrow details by escrow ID.
    
    Accessible by: Order parties or bank
    """
    escrow = await get_escrow_or_404(db, escrow_id)
    order = await get_order_or_404(db, escrow.order_id)
    
    # Check authorization
    if current_user.role not in [UserRole.ADMIN, UserRole.BANK]:
        if current_user.id not in [order.buyer_id, order.seller_id]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this escrow"
            )
    
    return escrow_to_response(escrow)


@router.get("/{order_id}/balance", response_model=EscrowBalanceResponse)
async def get_escrow_balance(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get escrow balance for an order.
    
    Accessible by: Order parties or bank
    """
    order = await get_order_or_404(db, order_id)
    
    # Check authorization
    if current_user.role not in [UserRole.ADMIN, UserRole.BANK]:
        if current_user.id not in [order.buyer_id, order.seller_id]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this escrow balance"
            )
    
    escrow = await get_escrow_by_order_or_404(db, order_id)
    
    return EscrowBalanceResponse(
        escrow_id=escrow.id,
        order_id=escrow.order_id,
        total_amount=escrow.total_amount,
        available_balance=escrow.available_balance,
        released_amount=escrow.released_amount,
        refunded_amount=escrow.refunded_amount,
        platform_fee=escrow.platform_fee,
        currency=escrow.currency,
        status=escrow.status,
        is_funded=escrow.status != EscrowStatus.PENDING,
    )


@router.post("/{order_id}/fund", response_model=EscrowOperationResult)
async def fund_escrow(
    order_id: UUID,
    request: EscrowFundRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Fund an escrow account for an order.
    
    This endpoint:
    1. Validates the order exists and is in BANK_APPROVED status
    2. Creates or updates escrow record
    3. Locks the funds (simulated)
    4. Updates order status to FUNDED
    
    Accessible by: Buyer of the order or Bank
    """
    order = await get_order_or_404(db, order_id)
    
    # Check authorization - only buyer or bank can fund
    if current_user.role not in [UserRole.ADMIN, UserRole.BANK]:
        if current_user.id != order.buyer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the buyer or bank can fund this escrow"
            )
    
    # Validate order status
    valid_statuses = [OrderStatus.BANK_APPROVED, OrderStatus.CREATED, OrderStatus.SHARIAH_VALIDATED, OrderStatus.AI_EVALUATED]
    if order.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot fund escrow. Order status is {order.status.value}. Expected: {', '.join([s.value for s in valid_statuses])}"
        )
    
    # Check if escrow already exists
    result = await db.execute(
        select(Escrow).where(Escrow.order_id == order_id, Escrow.is_deleted == False)
    )
    escrow = result.scalar_one_or_none()
    
    if escrow and escrow.status != EscrowStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Escrow is already {escrow.status.value}"
        )
    
    # Validate funding amount matches order amount
    if request.amount != order.total_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Funding amount ({request.amount}) must match order amount ({order.total_amount})"
        )
    
    now = datetime.now(timezone.utc)
    
    # Create escrow if doesn't exist
    if not escrow:
        escrow_number = f"ESC-{secrets.token_hex(4).upper()}"
        escrow = Escrow(
            order_id=order_id,
            escrow_number=escrow_number,
            total_amount=request.amount,
            bank_amount=request.amount if current_user.role == UserRole.BANK else Decimal("0"),
            buyer_amount=request.amount if current_user.role != UserRole.BANK else Decimal("0"),
            released_amount=Decimal("0"),
            refunded_amount=Decimal("0"),
            platform_fee=Decimal("0"),
            currency="MYR",
            status=EscrowStatus.PENDING,
            release_conditions={
                "shariah_compliant": {"met": False, "updated_at": None},
                "ai_approved": {"met": False, "updated_at": None},
                "buyer_confirmed": {"met": False, "updated_at": None},
                "provider_confirmed": {"met": False, "updated_at": None},
                "no_disputes": {"met": True, "updated_at": now.isoformat()},
            },
            bank_reference=request.bank_reference,
            notes=request.notes,
        )
        db.add(escrow)
        await db.flush()
    
    # Lock the funds (transition to LOCKED)
    if not escrow.transition_to(EscrowStatus.LOCKED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot lock escrow from {escrow.status.value} status"
        )
    
    escrow.bank_reference = request.bank_reference or escrow.bank_reference
    
    # Create transaction record
    transaction = EscrowTransaction(
        escrow_id=escrow.id,
        transaction_type=TransactionType.BANK_DEPOSIT if current_user.role == UserRole.BANK else TransactionType.BUYER_DEPOSIT,
        status=TransactionStatus.COMPLETED,
        amount=request.amount,
        currency="MYR",
        from_account=f"BANK-{current_user.id}" if current_user.role == UserRole.BANK else f"BUYER-{current_user.id}",
        to_account=f"ESCROW-{escrow.escrow_number}",
        reference_number=f"TXN-{secrets.token_hex(6).upper()}",
        external_reference=request.bank_reference,
        initiated_by=current_user.id,
        initiator_type="user",
        description=f"Escrow funded: {request.notes or 'Initial funding'}",
        processed_at=now,
    )
    db.add(transaction)
    
    # Update order status to FUNDED
    order.status = OrderStatus.FUNDED
    order.escrow_locked_at = now
    
    await db.commit()
    await db.refresh(escrow)
    await db.refresh(transaction)
    
    logger.info(f"Escrow {escrow.id} funded with {request.amount} for order {order_id}")
    
    return EscrowOperationResult(
        success=True,
        message=f"Escrow funded successfully with {request.amount} {escrow.currency}",
        escrow=escrow_to_response(escrow),
        transaction=transaction_to_response(transaction),
    )


@router.post("/{order_id}/release", response_model=EscrowOperationResult)
async def release_escrow(
    order_id: UUID,
    request: Optional[EscrowReleaseRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.BANK)),
):
    """
    Release escrow funds to the seller.
    
    This endpoint:
    1. Validates all release conditions are met
    2. Transfers funds to seller (simulated)
    3. Updates escrow status to RELEASED
    4. Updates order status to SETTLED
    
    Accessible by: Bank or Admin only
    """
    order = await get_order_or_404(db, order_id)
    escrow = await get_escrow_by_order_or_404(db, order_id)
    
    # Validate escrow status
    if escrow.status != EscrowStatus.LOCKED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot release escrow. Current status: {escrow.status.value}. Expected: locked"
        )
    
    # Check release conditions
    conditions = escrow.release_conditions or {}
    unmet_conditions = []
    
    if not conditions.get("shariah_compliant", {}).get("met", False):
        unmet_conditions.append("Shariah compliance not verified")
    if not conditions.get("ai_approved", {}).get("met", False):
        unmet_conditions.append("AI approval not received")
    if not conditions.get("buyer_confirmed", {}).get("met", False):
        unmet_conditions.append("Buyer delivery confirmation pending")
    if not conditions.get("no_disputes", {}).get("met", True) is False:
        unmet_conditions.append("Active dispute exists")
    
    if unmet_conditions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot release escrow. Unmet conditions: {', '.join(unmet_conditions)}"
        )
    
    now = datetime.now(timezone.utc)
    release_amount = request.amount if request and request.amount else escrow.available_balance
    
    # Transition to RELEASED
    if not escrow.transition_to(EscrowStatus.RELEASED):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition escrow from {escrow.status.value} to released"
        )
    
    # Create transaction record
    transaction = EscrowTransaction(
        escrow_id=escrow.id,
        transaction_type=TransactionType.RELEASE_TO_SELLER,
        status=TransactionStatus.COMPLETED,
        amount=release_amount,
        currency=escrow.currency,
        from_account=f"ESCROW-{escrow.escrow_number}",
        to_account=f"SELLER-{order.seller_id}",
        reference_number=f"REL-{secrets.token_hex(6).upper()}",
        external_reference=request.bank_reference if request else None,
        initiated_by=current_user.id,
        initiator_type="user",
        description=request.reason if request else "All release conditions met",
        processed_at=now,
    )
    db.add(transaction)
    
    # Update order status
    order.status = OrderStatus.SETTLED
    order.settled_at = now
    
    await db.commit()
    await db.refresh(escrow)
    await db.refresh(transaction)
    
    logger.info(f"Escrow {escrow.id} released. Amount: {release_amount}")
    
    return EscrowOperationResult(
        success=True,
        message=f"Escrow released successfully. {release_amount} {escrow.currency} transferred to seller.",
        escrow=escrow_to_response(escrow),
        transaction=transaction_to_response(transaction),
    )


@router.post("/{order_id}/refund", response_model=EscrowOperationResult)
async def refund_escrow(
    order_id: UUID,
    request: EscrowRefundRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.BANK)),
):
    """
    Refund escrow funds to buyer or bank.
    
    This endpoint:
    1. Validates refund conditions
    2. Refunds funds (simulated)
    3. Updates escrow status to REVERTED
    4. Updates order status to REFUNDED
    
    Accessible by: Bank or Admin only
    """
    order = await get_order_or_404(db, order_id)
    escrow = await get_escrow_by_order_or_404(db, order_id)
    
    # Validate escrow status
    if escrow.status not in [EscrowStatus.LOCKED, EscrowStatus.FROZEN]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot refund escrow. Current status: {escrow.status.value}. Expected: locked or frozen"
        )
    
    now = datetime.now(timezone.utc)
    refund_amount = request.amount or escrow.available_balance
    
    if refund_amount > escrow.available_balance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Refund amount ({refund_amount}) exceeds available balance ({escrow.available_balance})"
        )
    
    # Transition to REVERTED
    if not escrow.transition_to(EscrowStatus.REVERTED, reason=request.reason):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition escrow from {escrow.status.value} to reverted"
        )
    
    # Create transaction record
    transaction_type = TransactionType.REFUND_TO_BANK if request.refund_to == "bank" else TransactionType.REFUND_TO_BUYER
    to_account = f"BANK-{order.bank_id}" if request.refund_to == "bank" else f"BUYER-{order.buyer_id}"
    
    transaction = EscrowTransaction(
        escrow_id=escrow.id,
        transaction_type=transaction_type,
        status=TransactionStatus.COMPLETED,
        amount=refund_amount,
        currency=escrow.currency,
        from_account=f"ESCROW-{escrow.escrow_number}",
        to_account=to_account,
        reference_number=f"REF-{secrets.token_hex(6).upper()}",
        initiated_by=current_user.id,
        initiator_type="user",
        description=request.reason,
        processed_at=now,
    )
    db.add(transaction)
    
    # Update order status
    order.status = OrderStatus.REFUNDED
    
    await db.commit()
    await db.refresh(escrow)
    await db.refresh(transaction)
    
    logger.info(f"Escrow {escrow.id} refunded. Amount: {refund_amount}, To: {request.refund_to}")
    
    return EscrowOperationResult(
        success=True,
        message=f"Escrow refunded successfully. {refund_amount} {escrow.currency} returned to {request.refund_to}.",
        escrow=escrow_to_response(escrow),
        transaction=transaction_to_response(transaction),
    )


@router.post("/{order_id}/freeze", response_model=EscrowOperationResult)
async def freeze_escrow(
    order_id: UUID,
    request: EscrowFreezeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.BANK)),
):
    """
    Freeze escrow due to dispute or investigation.
    
    Accessible by: Bank or Admin only
    """
    order = await get_order_or_404(db, order_id)
    escrow = await get_escrow_by_order_or_404(db, order_id)
    
    if escrow.status != EscrowStatus.LOCKED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot freeze escrow. Current status: {escrow.status.value}. Expected: locked"
        )
    
    now = datetime.now(timezone.utc)
    
    # Transition to FROZEN
    if not escrow.transition_to(EscrowStatus.FROZEN, reason=request.reason):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition escrow from {escrow.status.value} to frozen"
        )
    
    escrow.frozen_by = current_user.id
    
    # Create transaction record for freeze
    transaction = EscrowTransaction(
        escrow_id=escrow.id,
        transaction_type=TransactionType.FREEZE,
        status=TransactionStatus.COMPLETED,
        amount=escrow.available_balance,
        currency=escrow.currency,
        from_account=f"ESCROW-{escrow.escrow_number}",
        to_account=f"ESCROW-{escrow.escrow_number}",
        reference_number=f"FRZ-{secrets.token_hex(6).upper()}",
        initiated_by=current_user.id,
        initiator_type="user",
        description=f"Escrow frozen: {request.reason}",
        processed_at=now,
    )
    db.add(transaction)
    
    # Update order status
    order.status = OrderStatus.FROZEN
    
    await db.commit()
    await db.refresh(escrow)
    await db.refresh(transaction)
    
    logger.info(f"Escrow {escrow.id} frozen. Reason: {request.reason}")
    
    return EscrowOperationResult(
        success=True,
        message=f"Escrow frozen successfully. Reason: {request.reason}",
        escrow=escrow_to_response(escrow),
        transaction=transaction_to_response(transaction),
    )


@router.get("/{order_id}/transactions", response_model=EscrowTransactionListResponse)
async def get_escrow_transactions(
    order_id: UUID,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    transaction_type: Optional[TransactionType] = Query(None, description="Filter by transaction type"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get transaction history for an escrow.
    
    Accessible by: Order parties or bank
    """
    order = await get_order_or_404(db, order_id)
    
    # Check authorization
    if current_user.role not in [UserRole.ADMIN, UserRole.BANK]:
        if current_user.id not in [order.buyer_id, order.seller_id]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view transactions"
            )
    
    escrow = await get_escrow_by_order_or_404(db, order_id)
    
    # Build query
    query = select(EscrowTransaction).where(EscrowTransaction.escrow_id == escrow.id)
    
    if transaction_type:
        query = query.where(EscrowTransaction.transaction_type == transaction_type)
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Get paginated results
    offset = (page - 1) * page_size
    query = query.order_by(EscrowTransaction.created_at.desc()).offset(offset).limit(page_size)
    
    result = await db.execute(query)
    transactions = result.scalars().all()
    
    total_pages = (total + page_size - 1) // page_size
    
    return EscrowTransactionListResponse(
        transactions=[transaction_to_response(tx) for tx in transactions],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{order_id}/release-conditions")
async def get_release_conditions(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get release conditions status for an escrow.
    
    Returns which conditions are met and which are pending.
    """
    order = await get_order_or_404(db, order_id)
    
    # Check authorization
    if current_user.role not in [UserRole.ADMIN, UserRole.BANK]:
        if current_user.id not in [order.buyer_id, order.seller_id]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view release conditions"
            )
    
    escrow = await get_escrow_by_order_or_404(db, order_id)
    
    conditions = escrow.release_conditions or {}
    
    return {
        "escrow_id": escrow.id,
        "order_id": order_id,
        "status": escrow.status.value,
        "conditions": {
            "shariah_compliant": {
                "label": "Shariah Compliance",
                "met": conditions.get("shariah_compliant", {}).get("met", False),
                "updated_at": conditions.get("shariah_compliant", {}).get("updated_at"),
                "required": True,
            },
            "ai_approved": {
                "label": "AI Risk Approval",
                "met": conditions.get("ai_approved", {}).get("met", False),
                "updated_at": conditions.get("ai_approved", {}).get("updated_at"),
                "required": True,
            },
            "buyer_confirmed": {
                "label": "Buyer Delivery Confirmation",
                "met": conditions.get("buyer_confirmed", {}).get("met", False),
                "updated_at": conditions.get("buyer_confirmed", {}).get("updated_at"),
                "required": True,
            },
            "provider_confirmed": {
                "label": "Delivery Provider Confirmation",
                "met": conditions.get("provider_confirmed", {}).get("met", False),
                "updated_at": conditions.get("provider_confirmed", {}).get("updated_at"),
                "required": False,
            },
            "no_disputes": {
                "label": "No Active Disputes",
                "met": conditions.get("no_disputes", {}).get("met", True),
                "updated_at": conditions.get("no_disputes", {}).get("updated_at"),
                "required": True,
            },
        },
        "all_required_met": escrow.all_release_conditions_met(),
        "can_release": escrow.status == EscrowStatus.LOCKED and escrow.all_release_conditions_met(),
    }


@router.put("/{order_id}/release-conditions/{condition_name}")
async def update_release_condition(
    order_id: UUID,
    condition_name: str,
    met: bool = Query(..., description="Whether condition is met"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Update a specific release condition.
    
    This is typically called by other services:
    - shariah_compliant: by Shariah service
    - ai_approved: by AI service
    - buyer_confirmed: by Delivery service
    - provider_confirmed: by Delivery service
    - no_disputes: by Dispute service
    """
    valid_conditions = ["shariah_compliant", "ai_approved", "buyer_confirmed", "provider_confirmed", "no_disputes"]
    
    if condition_name not in valid_conditions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid condition name. Valid: {', '.join(valid_conditions)}"
        )
    
    escrow = await get_escrow_by_order_or_404(db, order_id)
    
    if escrow.is_terminal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update conditions on terminal escrow"
        )
    
    escrow.update_release_condition(condition_name, met)
    await db.commit()
    await db.refresh(escrow)
    
    all_met = escrow.all_release_conditions_met()
    
    return {
        "success": True,
        "message": f"Condition '{condition_name}' updated to {met}",
        "condition": condition_name,
        "met": met,
        "all_conditions_met": all_met,
        "can_release": escrow.status == EscrowStatus.LOCKED and all_met,
    }
