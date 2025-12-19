"""
Release Gate Service
Implements multi-condition payment release gate logic
"""
import logging
from datetime import datetime
from typing import Optional, Tuple, List, Dict, Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.order import Order, OrderStatus
from app.models.escrow import Escrow, EscrowStatus, EscrowTransaction, TransactionType
from app.models.shariah_result import ShariahResult, ShariahComplianceStatus
from app.models.ai_decision import AIDecision, AIDecisionType
from app.models.dispute import Dispute, DisputeStatus
from app.models.delivery import Delivery, DeliveryStatus
from app.schemas.release import (
    ReleaseConditionStatus, 
    ReleaseConditionDetail,
    ReleaseGateResponse
)

logger = logging.getLogger(__name__)


class ReleaseGateService:
    """
    Service to check all conditions for payment release.
    
    Release Gate Conditions (all must be met):
    1. Shariah Compliance: Order must be COMPLIANT
    2. AI Risk Assessment: Must be APPROVED (not REJECTED)
    3. Delivery Confirmed: Buyer must confirm delivery
    4. No Active Disputes: No unresolved disputes
    5. Escrow Funded: Escrow must be in FUNDED or LOCKED status
    """
    
    REQUIRED_CONDITIONS = [
        "shariah_compliant",
        "ai_approved",
        "delivery_confirmed",
        "no_disputes",
        "escrow_funded"
    ]
    
    CONDITION_LABELS = {
        "shariah_compliant": "Shariah Compliance Verified",
        "ai_approved": "AI Risk Assessment Approved",
        "delivery_confirmed": "Buyer Confirmed Delivery",
        "no_disputes": "No Active Disputes",
        "escrow_funded": "Escrow Funds Available",
        "bank_approved": "Bank Financing Approved"
    }
    
    @classmethod
    async def check_release_conditions(
        cls,
        db: AsyncSession,
        order_id: UUID
    ) -> ReleaseGateResponse:
        """
        Check all release conditions for an order.
        
        Args:
            db: Async database session
            order_id: UUID of the order to check
            
        Returns:
            ReleaseGateResponse with condition details
        """
        logger.info(f"Checking release conditions for order {order_id}")
        
        # Fetch order with related data
        order = await cls._get_order_with_relations(db, order_id)
        if not order:
            return cls._build_error_response(order_id, "Order not found")
        
        # Check each condition
        conditions = []
        blocking_reasons = []
        
        # 1. Check Shariah compliance
        shariah_condition = await cls._check_shariah_compliance(db, order)
        conditions.append(shariah_condition)
        if shariah_condition.status != ReleaseConditionStatus.MET:
            blocking_reasons.append(f"Shariah: {shariah_condition.details}")
        
        # 2. Check AI approval
        ai_condition = await cls._check_ai_approval(db, order)
        conditions.append(ai_condition)
        if ai_condition.status != ReleaseConditionStatus.MET:
            blocking_reasons.append(f"AI Risk: {ai_condition.details}")
        
        # 3. Check delivery confirmation
        delivery_condition = await cls._check_delivery_confirmed(db, order)
        conditions.append(delivery_condition)
        if delivery_condition.status != ReleaseConditionStatus.MET:
            blocking_reasons.append(f"Delivery: {delivery_condition.details}")
        
        # 4. Check no disputes
        dispute_condition = await cls._check_no_disputes(db, order)
        conditions.append(dispute_condition)
        if dispute_condition.status != ReleaseConditionStatus.MET:
            blocking_reasons.append(f"Disputes: {dispute_condition.details}")
        
        # 5. Check escrow funded
        escrow_condition = await cls._check_escrow_funded(db, order)
        conditions.append(escrow_condition)
        if escrow_condition.status != ReleaseConditionStatus.MET:
            blocking_reasons.append(f"Escrow: {escrow_condition.details}")
        
        # Calculate summary
        required_met = sum(
            1 for c in conditions 
            if c.is_required and c.status == ReleaseConditionStatus.MET
        )
        required_total = sum(1 for c in conditions if c.is_required)
        
        all_conditions_met = required_met == required_total
        can_release = all_conditions_met and order.escrow is not None
        
        # Get escrow info
        escrow_status = order.escrow.status.value if order.escrow else "not_found"
        escrow_amount = float(order.escrow.amount) if order.escrow else 0.0
        escrow_id = order.escrow.id if order.escrow else None
        
        return ReleaseGateResponse(
            order_id=order_id,
            escrow_id=escrow_id,
            can_release=can_release,
            all_conditions_met=all_conditions_met,
            conditions=conditions,
            required_conditions_met=required_met,
            required_conditions_total=required_total,
            escrow_status=escrow_status,
            escrow_amount=escrow_amount,
            currency=order.currency if order.currency else "MYR",
            checked_at=datetime.utcnow(),
            blocking_reasons=blocking_reasons
        )
    
    @classmethod
    async def _get_order_with_relations(
        cls, 
        db: AsyncSession, 
        order_id: UUID
    ) -> Optional[Order]:
        """Fetch order with all related entities"""
        stmt = (
            select(Order)
            .options(
                selectinload(Order.escrow),
                selectinload(Order.shariah_result),
                selectinload(Order.ai_decision),
                selectinload(Order.delivery),
                selectinload(Order.disputes)
            )
            .where(Order.id == order_id)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
    
    @classmethod
    async def _check_shariah_compliance(
        cls, 
        db: AsyncSession, 
        order: Order
    ) -> ReleaseConditionDetail:
        """Check if order has passed Shariah compliance"""
        name = "shariah_compliant"
        label = cls.CONDITION_LABELS[name]
        
        if not order.shariah_result:
            return ReleaseConditionDetail(
                name=name,
                label=label,
                status=ReleaseConditionStatus.NOT_MET,
                is_required=True,
                details="Shariah validation not performed"
            )
        
        shariah = order.shariah_result
        if shariah.status == ShariahComplianceStatus.COMPLIANT:
            return ReleaseConditionDetail(
                name=name,
                label=label,
                status=ReleaseConditionStatus.MET,
                is_required=True,
                checked_at=shariah.updated_at or shariah.created_at,
                details=f"Compliant (Score: {shariah.compliance_score or 'N/A'})"
            )
        elif shariah.status == ShariahComplianceStatus.REQUIRES_REVIEW:
            return ReleaseConditionDetail(
                name=name,
                label=label,
                status=ReleaseConditionStatus.PENDING,
                is_required=True,
                details="Pending Shariah review"
            )
        else:
            return ReleaseConditionDetail(
                name=name,
                label=label,
                status=ReleaseConditionStatus.NOT_MET,
                is_required=True,
                details=f"Status: {shariah.status.value}"
            )
    
    @classmethod
    async def _check_ai_approval(
        cls, 
        db: AsyncSession, 
        order: Order
    ) -> ReleaseConditionDetail:
        """Check if AI risk assessment is approved"""
        name = "ai_approved"
        label = cls.CONDITION_LABELS[name]
        
        if not order.ai_decision:
            return ReleaseConditionDetail(
                name=name,
                label=label,
                status=ReleaseConditionStatus.NOT_MET,
                is_required=True,
                details="AI evaluation not performed"
            )
        
        ai = order.ai_decision
        # AIDecisionType uses ALLOW, BLOCK, REVIEW
        if ai.decision == AIDecisionType.ALLOW:
            return ReleaseConditionDetail(
                name=name,
                label=label,
                status=ReleaseConditionStatus.MET,
                is_required=True,
                checked_at=ai.updated_at or ai.created_at,
                details=f"Approved (Risk Score: {ai.risk_score})"
            )
        elif ai.decision == AIDecisionType.REVIEW:
            return ReleaseConditionDetail(
                name=name,
                label=label,
                status=ReleaseConditionStatus.PENDING,
                is_required=True,
                details="Manual review required"
            )
        else:  # AIDecisionType.BLOCK
            return ReleaseConditionDetail(
                name=name,
                label=label,
                status=ReleaseConditionStatus.NOT_MET,
                is_required=True,
                details=f"Blocked (Risk Score: {ai.risk_score})"
            )
    
    @classmethod
    async def _check_delivery_confirmed(
        cls, 
        db: AsyncSession, 
        order: Order
    ) -> ReleaseConditionDetail:
        """Check if buyer has confirmed delivery"""
        name = "delivery_confirmed"
        label = cls.CONDITION_LABELS[name]
        
        if not order.delivery:
            return ReleaseConditionDetail(
                name=name,
                label=label,
                status=ReleaseConditionStatus.NOT_MET,
                is_required=True,
                details="No delivery record found"
            )
        
        delivery = order.delivery
        if delivery.status == DeliveryStatus.DELIVERED and delivery.buyer_confirmed:
            return ReleaseConditionDetail(
                name=name,
                label=label,
                status=ReleaseConditionStatus.MET,
                is_required=True,
                checked_at=delivery.buyer_confirmed_at,
                details="Buyer confirmed delivery"
            )
        elif delivery.status == DeliveryStatus.DELIVERED:
            return ReleaseConditionDetail(
                name=name,
                label=label,
                status=ReleaseConditionStatus.PENDING,
                is_required=True,
                details="Delivered, awaiting buyer confirmation"
            )
        else:
            return ReleaseConditionDetail(
                name=name,
                label=label,
                status=ReleaseConditionStatus.PENDING,
                is_required=True,
                details=f"Delivery status: {delivery.status.value}"
            )
    
    @classmethod
    async def _check_no_disputes(
        cls, 
        db: AsyncSession, 
        order: Order
    ) -> ReleaseConditionDetail:
        """Check if there are no active disputes"""
        name = "no_disputes"
        label = cls.CONDITION_LABELS[name]
        
        if not order.disputes:
            return ReleaseConditionDetail(
                name=name,
                label=label,
                status=ReleaseConditionStatus.MET,
                is_required=True,
                details="No disputes filed"
            )
        
        # Check for active disputes
        active_disputes = [
            d for d in order.disputes 
            if d.status in [DisputeStatus.OPENED, DisputeStatus.UNDER_REVIEW, DisputeStatus.IN_MEDIATION]
        ]
        
        if active_disputes:
            return ReleaseConditionDetail(
                name=name,
                label=label,
                status=ReleaseConditionStatus.NOT_MET,
                is_required=True,
                details=f"{len(active_disputes)} active dispute(s)"
            )
        
        return ReleaseConditionDetail(
            name=name,
            label=label,
            status=ReleaseConditionStatus.MET,
            is_required=True,
            details="All disputes resolved"
        )
    
    @classmethod
    async def _check_escrow_funded(
        cls, 
        db: AsyncSession, 
        order: Order
    ) -> ReleaseConditionDetail:
        """Check if escrow is funded and available"""
        name = "escrow_funded"
        label = cls.CONDITION_LABELS[name]
        
        if not order.escrow:
            return ReleaseConditionDetail(
                name=name,
                label=label,
                status=ReleaseConditionStatus.NOT_MET,
                is_required=True,
                details="No escrow account found"
            )
        
        escrow = order.escrow
        valid_statuses = [EscrowStatus.FUNDED, EscrowStatus.LOCKED]
        
        if escrow.status in valid_statuses:
            return ReleaseConditionDetail(
                name=name,
                label=label,
                status=ReleaseConditionStatus.MET,
                is_required=True,
                checked_at=escrow.funded_at,
                details=f"Funds available: {escrow.amount} {escrow.currency}"
            )
        elif escrow.status == EscrowStatus.PENDING:
            return ReleaseConditionDetail(
                name=name,
                label=label,
                status=ReleaseConditionStatus.PENDING,
                is_required=True,
                details="Awaiting funding"
            )
        else:
            return ReleaseConditionDetail(
                name=name,
                label=label,
                status=ReleaseConditionStatus.NOT_MET,
                is_required=True,
                details=f"Escrow status: {escrow.status.value}"
            )
    
    @classmethod
    def _build_error_response(
        cls, 
        order_id: UUID, 
        error: str
    ) -> ReleaseGateResponse:
        """Build error response"""
        return ReleaseGateResponse(
            order_id=order_id,
            escrow_id=None,
            can_release=False,
            all_conditions_met=False,
            conditions=[],
            required_conditions_met=0,
            required_conditions_total=len(cls.REQUIRED_CONDITIONS),
            escrow_status="error",
            escrow_amount=0.0,
            currency="MYR",
            checked_at=datetime.utcnow(),
            blocking_reasons=[error]
        )
    
    @classmethod
    async def validate_and_release(
        cls,
        db: AsyncSession,
        order_id: UUID,
        released_by: UUID
    ) -> Tuple[bool, str, Optional[ReleaseGateResponse]]:
        """
        Validate conditions and release escrow if all conditions are met.
        
        Args:
            db: Async database session
            order_id: Order ID
            released_by: User ID who triggered the release
            
        Returns:
            Tuple of (success, message, gate_response)
        """
        # Check conditions
        gate_response = await cls.check_release_conditions(db, order_id)
        
        if not gate_response.can_release:
            return (
                False, 
                f"Cannot release: {', '.join(gate_response.blocking_reasons)}", 
                gate_response
            )
        
        # Get escrow and process release
        order = await cls._get_order_with_relations(db, order_id)
        if not order or not order.escrow:
            return (False, "Order or escrow not found", gate_response)
        
        try:
            # Update escrow status
            escrow = order.escrow
            escrow.status = EscrowStatus.RELEASED
            escrow.released_at = datetime.utcnow()
            escrow.released_to = order.seller_id
            
            # Create release transaction
            transaction = EscrowTransaction(
                escrow_id=escrow.id,
                type=TransactionType.RELEASE,
                amount=escrow.amount,
                status="COMPLETED",
                initiated_by=released_by,
                description="Payment released - all conditions met"
            )
            db.add(transaction)
            
            # Update order status
            order.status = OrderStatus.COMPLETED
            order.completed_at = datetime.utcnow()
            
            await db.commit()
            
            logger.info(f"Payment released for order {order_id}")
            return (True, "Payment released successfully", gate_response)
            
        except Exception as e:
            await db.rollback()
            logger.error(f"Failed to release payment for order {order_id}: {e}")
            return (False, f"Release failed: {str(e)}", gate_response)
