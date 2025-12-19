"""
Order Service
Business logic for order management and state transitions
"""
from typing import Optional, List, Tuple
from uuid import UUID
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload

from app.models.order import (
    Order,
    OrderStatusHistory,
    OrderStatus,
    ShariahStatus,
    AIApprovalStatus,
    BankApprovalStatus,
    ContractType,
)
from app.models.user import User, UserRole
from app.core.events import (
    event_dispatcher,
    OrderCreatedEvent,
    OrderApprovedEvent,
    OrderRejectedEvent,
    OrderCancelledEvent,
    OrderCompletedEvent,
    ShariahValidatedEvent,
)
from app.core.logging import get_logger

logger = get_logger(__name__)


class OrderService:
    """Service for order management operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_by_id(
        self,
        order_id: UUID,
        include_relations: bool = False
    ) -> Optional[Order]:
        """Get order by ID"""
        query = select(Order).where(
            and_(Order.id == order_id, Order.is_deleted == False)
        )
        
        if include_relations:
            query = query.options(
                selectinload(Order.buyer),
                selectinload(Order.seller),
                selectinload(Order.product),
                selectinload(Order.status_history),
            )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def get_by_reference(self, order_reference: str) -> Optional[Order]:
        """Get order by reference number"""
        result = await self.db.execute(
            select(Order).where(
                and_(Order.order_reference == order_reference, Order.is_deleted == False)
            )
        )
        return result.scalar_one_or_none()
    
    async def create_order(
        self,
        buyer_id: UUID,
        seller_id: UUID,
        product_id: UUID,
        quantity: int,
        unit_price: Decimal,
        contract_type: ContractType = ContractType.MURABAHA,
        markup_percentage: Optional[Decimal] = None,
        markup_amount: Optional[Decimal] = None,
        delivery_address: Optional[dict] = None,
        notes: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> Order:
        """Create a new order"""
        order = Order(
            buyer_id=buyer_id,
            seller_id=seller_id,
            product_id=product_id,
            quantity=quantity,
            unit_price=unit_price,
            contract_type=contract_type,
            markup_percentage=markup_percentage,
            markup_amount=markup_amount,
            delivery_address=delivery_address,
            notes=notes,
            metadata=metadata or {},
        )
        
        self.db.add(order)
        await self.db.commit()
        await self.db.refresh(order)
        
        # Add initial status history
        await self._add_status_history(
            order_id=order.id,
            from_status=None,
            to_status=order.status,
            reason="Order created",
        )
        
        # Emit event
        await event_dispatcher.dispatch_async(
            OrderCreatedEvent(
                order_id=order.id,
                buyer_id=buyer_id,
                seller_id=seller_id,
                product_id=product_id,
                total_amount=float(order.total_amount),
            )
        )
        
        logger.info(f"Created order {order.id} for buyer {buyer_id}")
        return order
    
    async def transition_status(
        self,
        order_id: UUID,
        new_status: OrderStatus,
        actor_id: Optional[UUID] = None,
        reason: Optional[str] = None,
        force: bool = False,
    ) -> Tuple[bool, str]:
        """
        Transition order to new status.
        Returns (success, message)
        """
        order = await self.get_by_id(order_id)
        if not order:
            return False, "Order not found"
        
        old_status = order.status
        
        # Attempt transition
        success = order.transition_to(new_status, force=force)
        if not success:
            return False, f"Invalid transition from {old_status.value} to {new_status.value}"
        
        await self.db.commit()
        
        # Add status history
        await self._add_status_history(
            order_id=order_id,
            from_status=old_status,
            to_status=new_status,
            actor_id=actor_id,
            reason=reason,
        )
        
        logger.info(f"Order {order_id} transitioned from {old_status.value} to {new_status.value}")
        return True, f"Status changed to {new_status.value}"
    
    async def submit_for_shariah_review(
        self,
        order_id: UUID,
        actor_id: Optional[UUID] = None,
    ) -> Tuple[bool, str]:
        """Submit order for Shariah compliance review"""
        success, message = await self.transition_status(
            order_id=order_id,
            new_status=OrderStatus.SHARIAH_PENDING,
            actor_id=actor_id,
            reason="Submitted for Shariah review",
        )
        return success, message
    
    async def set_shariah_result(
        self,
        order_id: UUID,
        is_compliant: bool,
        violations: Optional[List[str]] = None,
        compliance_score: Optional[float] = None,
    ) -> Tuple[bool, str]:
        """Set Shariah compliance result"""
        order = await self.get_by_id(order_id)
        if not order:
            return False, "Order not found"
        
        if is_compliant:
            order.shariah_status = ShariahStatus.COMPLIANT
            new_status = OrderStatus.AI_PENDING
        else:
            order.shariah_status = ShariahStatus.NON_COMPLIANT
            new_status = OrderStatus.SHARIAH_REJECTED
        
        await self.db.commit()
        
        # Transition order status
        success, message = await self.transition_status(
            order_id=order_id,
            new_status=new_status,
            reason=f"Shariah review: {'compliant' if is_compliant else 'non-compliant'}",
        )
        
        # Emit event
        await event_dispatcher.dispatch_async(
            ShariahValidatedEvent(
                order_id=order_id,
                is_compliant=is_compliant,
                violations=violations or [],
            )
        )
        
        return success, message
    
    async def set_ai_approval(
        self,
        order_id: UUID,
        is_approved: bool,
        risk_score: Optional[float] = None,
        decision_factors: Optional[dict] = None,
    ) -> Tuple[bool, str]:
        """Set AI governance approval result"""
        order = await self.get_by_id(order_id)
        if not order:
            return False, "Order not found"
        
        if is_approved:
            order.ai_approval_status = AIApprovalStatus.APPROVED
            new_status = OrderStatus.BANK_PENDING
        else:
            order.ai_approval_status = AIApprovalStatus.REJECTED
            new_status = OrderStatus.AI_REJECTED
        
        order.ai_risk_score = risk_score
        order.ai_decision_factors = decision_factors or {}
        
        await self.db.commit()
        
        success, message = await self.transition_status(
            order_id=order_id,
            new_status=new_status,
            reason=f"AI governance: {'approved' if is_approved else 'rejected'}",
        )
        
        return success, message
    
    async def set_bank_approval(
        self,
        order_id: UUID,
        is_approved: bool,
        bank_officer_id: UUID,
        reason: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """Set bank approval result"""
        order = await self.get_by_id(order_id)
        if not order:
            return False, "Order not found"
        
        if is_approved:
            order.bank_approval_status = BankApprovalStatus.APPROVED
            new_status = OrderStatus.APPROVED
            
            # Emit approved event
            await event_dispatcher.dispatch_async(
                OrderApprovedEvent(
                    order_id=order_id,
                    approved_by=bank_officer_id,
                )
            )
        else:
            order.bank_approval_status = BankApprovalStatus.REJECTED
            new_status = OrderStatus.REJECTED
            
            # Emit rejected event
            await event_dispatcher.dispatch_async(
                OrderRejectedEvent(
                    order_id=order_id,
                    rejected_by=bank_officer_id,
                    reason=reason or "Bank rejection",
                )
            )
        
        order.bank_officer_id = bank_officer_id
        await self.db.commit()
        
        success, message = await self.transition_status(
            order_id=order_id,
            new_status=new_status,
            actor_id=bank_officer_id,
            reason=reason or f"Bank {'approved' if is_approved else 'rejected'}",
        )
        
        return success, message
    
    async def cancel_order(
        self,
        order_id: UUID,
        actor_id: UUID,
        reason: str,
    ) -> Tuple[bool, str]:
        """Cancel an order"""
        success, message = await self.transition_status(
            order_id=order_id,
            new_status=OrderStatus.CANCELLED,
            actor_id=actor_id,
            reason=reason,
        )
        
        if success:
            await event_dispatcher.dispatch_async(
                OrderCancelledEvent(
                    order_id=order_id,
                    cancelled_by=actor_id,
                    reason=reason,
                )
            )
        
        return success, message
    
    async def complete_order(
        self,
        order_id: UUID,
        reason: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """Mark order as completed"""
        success, message = await self.transition_status(
            order_id=order_id,
            new_status=OrderStatus.COMPLETED,
            reason=reason or "Order completed",
        )
        
        if success:
            await event_dispatcher.dispatch_async(
                OrderCompletedEvent(order_id=order_id)
            )
        
        return success, message
    
    async def list_orders(
        self,
        user_id: Optional[UUID] = None,
        user_role: Optional[UserRole] = None,
        status: Optional[OrderStatus] = None,
        statuses: Optional[List[OrderStatus]] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Order]:
        """List orders with optional filters"""
        query = select(Order).where(Order.is_deleted == False)
        
        # Filter by user based on role
        if user_id and user_role:
            if user_role == UserRole.BUYER:
                query = query.where(Order.buyer_id == user_id)
            elif user_role == UserRole.SELLER:
                query = query.where(Order.seller_id == user_id)
            elif user_role == UserRole.BANK:
                # Bank sees orders pending their approval and beyond
                pass
        
        if status:
            query = query.where(Order.status == status)
        elif statuses:
            query = query.where(Order.status.in_(statuses))
        
        query = query.offset(skip).limit(limit).order_by(Order.created_at.desc())
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def get_status_history(self, order_id: UUID) -> List[OrderStatusHistory]:
        """Get order status history"""
        result = await self.db.execute(
            select(OrderStatusHistory)
            .where(OrderStatusHistory.order_id == order_id)
            .order_by(OrderStatusHistory.changed_at.asc())
        )
        return list(result.scalars().all())
    
    async def _add_status_history(
        self,
        order_id: UUID,
        from_status: Optional[OrderStatus],
        to_status: OrderStatus,
        actor_id: Optional[UUID] = None,
        reason: Optional[str] = None,
    ) -> OrderStatusHistory:
        """Add entry to order status history"""
        history = OrderStatusHistory(
            order_id=order_id,
            from_status=from_status,
            to_status=to_status,
            changed_by=actor_id,
            reason=reason,
            changed_at=datetime.now(timezone.utc),
        )
        
        self.db.add(history)
        await self.db.commit()
        await self.db.refresh(history)
        
        return history


async def get_order_service(db: AsyncSession) -> OrderService:
    """Dependency for getting OrderService"""
    return OrderService(db)
