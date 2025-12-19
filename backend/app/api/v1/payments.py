"""
Payments API Routes
Endpoints for viewing payment history
"""
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.dependencies import get_current_active_user, require_roles
from app.core.logging import get_logger
from app.models.user import User, UserRole
from app.models.order import Order, OrderStatus
from app.models.escrow import Escrow, EscrowTransaction, TransactionType, TransactionStatus, EscrowStatus

logger = get_logger(__name__)
router = APIRouter(prefix="/payments", tags=["Payments"])


@router.get("/seller")
async def get_seller_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[str] = Query(None, description="Filter: pending, received, all"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get payment information for orders where current user is the seller.
    Shows pending payments (locked escrow) and received payments (released).
    """
    # Get seller's orders
    orders_query = (
        select(Order)
        .where(Order.seller_id == current_user.id, Order.is_deleted == False)
    )
    
    if status_filter == "pending":
        orders_query = orders_query.where(Order.status.in_([
            OrderStatus.FUNDED, OrderStatus.PROCESSING, OrderStatus.IN_TRANSIT,
            OrderStatus.DELIVERED, OrderStatus.DELIVERY_VERIFIED
        ]))
    elif status_filter == "received":
        orders_query = orders_query.where(Order.status == OrderStatus.SETTLED)
    
    orders_query = orders_query.order_by(Order.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(orders_query)
    orders = result.scalars().all()
    
    payments = []
    total_pending = 0
    total_received = 0
    
    for order in orders:
        # Get escrow for this order
        escrow_query = select(Escrow).where(Escrow.order_id == order.id, Escrow.is_deleted == False)
        escrow_result = await db.execute(escrow_query)
        escrow = escrow_result.scalar_one_or_none()
        
        payment_status = "pending"
        received_amount = 0
        
        if escrow:
            if escrow.status == EscrowStatus.RELEASED:
                payment_status = "received"
                received_amount = float(escrow.released_amount)
                total_received += received_amount
            elif escrow.status == EscrowStatus.LOCKED:
                payment_status = "pending"
                total_pending += float(escrow.total_amount)
            elif escrow.status == EscrowStatus.FROZEN:
                payment_status = "frozen"
            elif escrow.status == EscrowStatus.REVERTED:
                payment_status = "refunded"
        
        payments.append({
            "order_id": str(order.id),
            "order_number": order.order_number,
            "amount": float(order.total_amount),
            "currency": order.currency,
            "status": payment_status,
            "received_amount": received_amount,
            "order_status": order.status.value,
            "created_at": order.created_at.isoformat() if order.created_at else None,
            "settled_at": order.settled_at.isoformat() if hasattr(order, 'settled_at') and order.settled_at else None,
        })
    
    return {
        "payments": payments,
        "total_pending": total_pending,
        "total_received": total_received,
        "currency": "MYR",
        "count": len(payments),
    }


@router.get("/buyer")
async def get_buyer_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get payment information for orders where current user is the buyer.
    Shows funded payments and refunded amounts.
    """
    # Get buyer's orders with escrow
    orders_query = (
        select(Order)
        .where(Order.buyer_id == current_user.id, Order.is_deleted == False)
        .order_by(Order.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    
    result = await db.execute(orders_query)
    orders = result.scalars().all()
    
    payments = []
    total_funded = 0
    total_refunded = 0
    
    for order in orders:
        # Get escrow for this order
        escrow_query = select(Escrow).where(Escrow.order_id == order.id, Escrow.is_deleted == False)
        escrow_result = await db.execute(escrow_query)
        escrow = escrow_result.scalar_one_or_none()
        
        payment_status = "unfunded"
        funded_amount = 0
        refunded_amount = 0
        
        if escrow:
            if escrow.status in [EscrowStatus.LOCKED, EscrowStatus.RELEASED]:
                payment_status = "funded"
                funded_amount = float(escrow.total_amount)
                total_funded += funded_amount
            elif escrow.status == EscrowStatus.REVERTED:
                payment_status = "refunded"
                refunded_amount = float(escrow.refunded_amount)
                total_refunded += refunded_amount
            elif escrow.status == EscrowStatus.FROZEN:
                payment_status = "frozen"
                funded_amount = float(escrow.total_amount)
        
        payments.append({
            "order_id": str(order.id),
            "order_number": order.order_number,
            "amount": float(order.total_amount),
            "currency": order.currency,
            "status": payment_status,
            "funded_amount": funded_amount,
            "refunded_amount": refunded_amount,
            "order_status": order.status.value,
            "created_at": order.created_at.isoformat() if order.created_at else None,
        })
    
    return {
        "payments": payments,
        "total_funded": total_funded,
        "total_refunded": total_refunded,
        "currency": "MYR",
        "count": len(payments),
    }
