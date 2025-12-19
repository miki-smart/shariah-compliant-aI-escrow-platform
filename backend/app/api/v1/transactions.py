"""
Transactions API Routes
Endpoints for viewing transaction history
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
from app.models.order import Order
from app.models.escrow import Escrow, EscrowTransaction, TransactionType, TransactionStatus

logger = get_logger(__name__)
router = APIRouter(prefix="/transactions", tags=["Transactions"])


def transaction_to_dict(tx: EscrowTransaction) -> dict:
    """Convert EscrowTransaction to dictionary"""
    return {
        "id": str(tx.id),
        "escrow_id": str(tx.escrow_id),
        "transaction_type": tx.transaction_type.value,
        "status": tx.status.value,
        "amount": float(tx.amount),
        "currency": tx.currency,
        "from_account": tx.from_account,
        "to_account": tx.to_account,
        "reference_number": tx.reference_number,
        "external_reference": tx.external_reference,
        "description": tx.description,
        "processed_at": tx.processed_at.isoformat() if tx.processed_at else None,
        "created_at": tx.created_at.isoformat() if tx.created_at else None,
    }


@router.get("/buyer")
async def get_buyer_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    transaction_type: Optional[TransactionType] = Query(None, description="Filter by type"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get all transactions for orders where current user is the buyer.
    """
    # Get escrow IDs for buyer's orders
    escrow_query = (
        select(Escrow.id)
        .join(Order, Escrow.order_id == Order.id)
        .where(Order.buyer_id == current_user.id, Escrow.is_deleted == False)
    )
    escrow_result = await db.execute(escrow_query)
    escrow_ids = [r[0] for r in escrow_result.fetchall()]
    
    if not escrow_ids:
        return {"transactions": [], "total": 0}
    
    # Get transactions
    query = select(EscrowTransaction).where(EscrowTransaction.escrow_id.in_(escrow_ids))
    
    if transaction_type:
        query = query.where(EscrowTransaction.transaction_type == transaction_type)
    
    # Count
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0
    
    # Paginate
    query = query.order_by(EscrowTransaction.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    transactions = result.scalars().all()
    
    return {
        "transactions": [transaction_to_dict(tx) for tx in transactions],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/seller")
async def get_seller_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    transaction_type: Optional[TransactionType] = Query(None, description="Filter by type"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get all transactions for orders where current user is the seller.
    """
    # Get escrow IDs for seller's orders
    escrow_query = (
        select(Escrow.id)
        .join(Order, Escrow.order_id == Order.id)
        .where(Order.seller_id == current_user.id, Escrow.is_deleted == False)
    )
    escrow_result = await db.execute(escrow_query)
    escrow_ids = [r[0] for r in escrow_result.fetchall()]
    
    if not escrow_ids:
        return {"transactions": [], "total": 0}
    
    # Get transactions
    query = select(EscrowTransaction).where(EscrowTransaction.escrow_id.in_(escrow_ids))
    
    if transaction_type:
        query = query.where(EscrowTransaction.transaction_type == transaction_type)
    
    # Count
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0
    
    # Paginate
    query = query.order_by(EscrowTransaction.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    transactions = result.scalars().all()
    
    return {
        "transactions": [transaction_to_dict(tx) for tx in transactions],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("")
async def get_all_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    transaction_type: Optional[TransactionType] = Query(None, description="Filter by type"),
    status_filter: Optional[TransactionStatus] = Query(None, description="Filter by status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.BANK)),
):
    """
    Get all transactions. Bank/Admin only.
    """
    query = select(EscrowTransaction)
    
    if transaction_type:
        query = query.where(EscrowTransaction.transaction_type == transaction_type)
    if status_filter:
        query = query.where(EscrowTransaction.status == status_filter)
    
    # Count
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0
    
    # Paginate
    query = query.order_by(EscrowTransaction.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    transactions = result.scalars().all()
    
    return {
        "transactions": [transaction_to_dict(tx) for tx in transactions],
        "total": total,
        "skip": skip,
        "limit": limit,
    }
