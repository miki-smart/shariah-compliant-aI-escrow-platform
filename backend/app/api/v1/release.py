"""
Release Gate API Routes
Endpoints for payment release gate operations
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import Optional

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.services.release_gate_service import ReleaseGateService
from app.services.ai_stub_service import AIStubService
from app.schemas.release import (
    ReleaseGateResponse,
    ManualReleaseRequest,
    AutoReleaseCheckResponse
)
from app.models.user import User, UserRole


router = APIRouter(prefix="/release", tags=["Release Gate"])


@router.get(
    "/conditions/{order_id}",
    response_model=ReleaseGateResponse,
    summary="Check release conditions",
    description="Check all conditions for payment release"
)
async def check_release_conditions(
    order_id: UUID,
    db: AsyncSession = Depends(get_db)
):
    """
    Check all conditions required for payment release.
    
    Returns:
        ReleaseGateResponse with all conditions and their status
    """
    result = await ReleaseGateService.check_release_conditions(db, order_id)
    return result


@router.post(
    "/execute/{order_id}",
    response_model=dict,
    summary="Execute payment release",
    description="Execute payment release if all conditions are met"
)
async def execute_release(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Attempt to release payment for an order.
    
    All conditions must be met:
    - Shariah compliance verified
    - AI risk assessment approved
    - Buyer confirmed delivery
    - No active disputes
    - Escrow funds available
    """
    success, message, gate_response = await ReleaseGateService.validate_and_release(
        db=db,
        order_id=order_id,
        released_by=current_user.id
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": message,
                "conditions": [c.model_dump() for c in gate_response.conditions] if gate_response else [],
                "blocking_reasons": gate_response.blocking_reasons if gate_response else [message]
            }
        )
    
    return {
        "success": True,
        "message": message,
        "order_id": str(order_id),
        "released_amount": gate_response.escrow_amount if gate_response else 0,
        "currency": gate_response.currency if gate_response else "MYR"
    }


@router.post(
    "/manual/{order_id}",
    response_model=dict,
    summary="Manual release override",
    description="Manually override release conditions (Bank only)"
)
async def manual_release(
    order_id: UUID,
    request: ManualReleaseRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually release payment, overriding specific conditions.
    Only authorized bank users can perform this action.
    
    Requires:
        - BANK role
        - Authorization code (in production)
        - Reason for override
    """
    # Check user role
    if current_user.role not in [UserRole.BANK, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only bank users can perform manual release"
        )
    
    # First check current conditions
    gate_response = await ReleaseGateService.check_release_conditions(db, order_id)
    
    # Log the override attempt
    # In production, this would require additional authorization
    # For MVP, we allow it with just the reason
    
    from app.models.order import Order, OrderStatus
    from app.models.escrow import Escrow, EscrowStatus, EscrowTransaction, TransactionType
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from datetime import datetime
    
    # Get order with escrow
    stmt = (
        select(Order)
        .options(selectinload(Order.escrow))
        .where(Order.id == order_id)
    )
    result = await db.execute(stmt)
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    if not order.escrow:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No escrow account for this order"
        )
    
    try:
        # Update escrow
        escrow = order.escrow
        escrow.status = EscrowStatus.RELEASED
        escrow.released_at = datetime.utcnow()
        escrow.released_to = order.seller_id
        
        # Create transaction with override note
        transaction = EscrowTransaction(
            escrow_id=escrow.id,
            type=TransactionType.RELEASE,
            amount=escrow.amount,
            status="COMPLETED",
            initiated_by=current_user.id,
            description=f"MANUAL OVERRIDE: {request.reason}",
            metadata={
                "override_by": str(current_user.id),
                "override_conditions": request.override_conditions,
                "authorization_code": request.authorization_code
            }
        )
        db.add(transaction)
        
        # Update order
        order.status = OrderStatus.COMPLETED
        order.completed_at = datetime.utcnow()
        
        await db.commit()
        
        return {
            "success": True,
            "message": "Manual release executed",
            "order_id": str(order_id),
            "released_amount": float(escrow.amount),
            "override_reason": request.reason,
            "overridden_conditions": request.override_conditions
        }
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute manual release: {str(e)}"
        )


@router.get(
    "/auto-check/{order_id}",
    response_model=AutoReleaseCheckResponse,
    summary="Auto-release check",
    description="Check if order should be auto-released"
)
async def check_auto_release(
    order_id: UUID,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """
    Check if order conditions qualify for automatic release.
    Does not trigger actual release, just checks eligibility.
    
    This endpoint is designed to be called by background workers
    or webhooks when conditions change.
    """
    # Check conditions
    gate_response = await ReleaseGateService.check_release_conditions(db, order_id)
    
    # Build summary
    conditions_summary = {
        c.name: c.status.value == "met"
        for c in gate_response.conditions
    }
    
    should_release = gate_response.can_release
    
    return AutoReleaseCheckResponse(
        order_id=order_id,
        should_release=should_release,
        release_triggered=False,  # This endpoint doesn't trigger release
        conditions_summary=conditions_summary,
        message="All conditions met - ready for release" if should_release else f"Blocked: {', '.join(gate_response.blocking_reasons)}"
    )


@router.post(
    "/simulate/{order_id}",
    response_model=ReleaseGateResponse,
    summary="Simulate release check",
    description="Simulate release check with mock AI response"
)
async def simulate_release_check(
    order_id: UUID,
    request: Request,
    ai_scenario: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Simulate a release check with configurable AI responses.
    
    Use ai_scenario query param to test different scenarios:
    - approved: AI approves the transaction
    - high_risk: AI rejects as high risk
    - review_needed: AI requires manual review
    
    Or use headers:
    - X-AI-Mock-Scenario: approved|high_risk|review_needed
    """
    # Get mock scenario from header or query
    scenario = (
        ai_scenario or 
        request.headers.get("X-AI-Mock-Scenario") or 
        "approved"
    )
    
    # Get AI mock response
    ai_response = AIStubService.get_mock_response(
        scenario=scenario,
        order_id=order_id
    )
    
    # Check conditions
    gate_response = await ReleaseGateService.check_release_conditions(db, order_id)
    
    return gate_response
