"""
Escrow Service
Business logic for escrow fund management
"""
from typing import Optional, List, Tuple
from uuid import UUID
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.models.escrow import (
    Escrow,
    EscrowTransaction,
    EscrowStatus,
    TransactionType,
)
from app.models.order import Order, OrderStatus
from app.core.events import (
    event_dispatcher,
    EscrowCreatedEvent,
    EscrowLockedEvent,
    EscrowReleasedEvent,
    FundsTransferredEvent,
)
from app.core.logging import get_logger

logger = get_logger(__name__)


class EscrowService:
    """Service for escrow management operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_by_id(self, escrow_id: UUID) -> Optional[Escrow]:
        """Get escrow by ID"""
        result = await self.db.execute(
            select(Escrow).where(
                and_(Escrow.id == escrow_id, Escrow.is_deleted == False)
            )
        )
        return result.scalar_one_or_none()
    
    async def get_by_order_id(self, order_id: UUID) -> Optional[Escrow]:
        """Get escrow for an order"""
        result = await self.db.execute(
            select(Escrow).where(
                and_(Escrow.order_id == order_id, Escrow.is_deleted == False)
            )
        )
        return result.scalar_one_or_none()
    
    async def create_escrow(
        self,
        order_id: UUID,
        amount: Decimal,
        bank_amount: Decimal = Decimal("0"),
        buyer_amount: Decimal = Decimal("0"),
        currency: str = "MYR",
        release_conditions: Optional[dict] = None,
        bank_id: Optional[UUID] = None,
        notes: Optional[str] = None,
    ) -> Escrow:
        """Create escrow for an approved order"""
        import secrets
        escrow_number = f"ESC-{secrets.token_hex(4).upper()}"
        
        escrow = Escrow(
            order_id=order_id,
            escrow_number=escrow_number,
            total_amount=amount,
            bank_amount=bank_amount,
            buyer_amount=buyer_amount,
            released_amount=Decimal("0"),
            refunded_amount=Decimal("0"),
            currency=currency,
            status=EscrowStatus.PENDING,
            release_conditions=release_conditions or {
                "delivery_confirmed": False,
                "buyer_confirmed": False,
                "ai_validated": False,
                "shariah_compliant": False,
            },
            bank_id=bank_id,
            notes=notes,
        )
        
        self.db.add(escrow)
        await self.db.commit()
        await self.db.refresh(escrow)
        
        # Emit event
        await event_dispatcher.dispatch_async(
            EscrowCreatedEvent(
                escrow_id=escrow.id,
                order_id=order_id,
                amount=float(amount),
            )
        )
        
        logger.info(f"Created escrow {escrow.id} for order {order_id}")
        return escrow
    
    async def lock_funds(
        self,
        escrow_id: UUID,
        amount: Decimal,
        reference: Optional[str] = None,
        bank_reference: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """Lock funds in escrow"""
        escrow = await self.get_by_id(escrow_id)
        if not escrow:
            return False, "Escrow not found"
        
        if escrow.status != EscrowStatus.PENDING:
            return False, f"Cannot lock funds in {escrow.status.value} escrow"
        
        if amount > escrow.total_amount:
            return False, "Amount exceeds total escrow amount"
        
        # Update escrow
        escrow.held_amount = amount
        escrow.status = EscrowStatus.LOCKED
        escrow.locked_at = datetime.now(timezone.utc)
        
        # Create transaction record
        transaction = EscrowTransaction(
            escrow_id=escrow_id,
            transaction_type=TransactionType.LOCK,
            amount=amount,
            reference=reference,
            bank_reference=bank_reference,
            description="Funds locked in escrow",
            status="completed",
        )
        
        self.db.add(transaction)
        await self.db.commit()
        
        # Emit event
        await event_dispatcher.dispatch_async(
            EscrowLockedEvent(
                escrow_id=escrow_id,
                order_id=escrow.order_id,
                amount=float(amount),
            )
        )
        
        logger.info(f"Locked {amount} in escrow {escrow_id}")
        return True, "Funds locked successfully"
    
    async def release_funds(
        self,
        escrow_id: UUID,
        amount: Optional[Decimal] = None,
        reason: Optional[str] = None,
        bank_reference: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """Release funds from escrow to seller"""
        escrow = await self.get_by_id(escrow_id)
        if not escrow:
            return False, "Escrow not found"
        
        if escrow.status not in [EscrowStatus.LOCKED, EscrowStatus.PARTIAL_RELEASE]:
            return False, f"Cannot release funds from {escrow.status.value} escrow"
        
        release_amount = amount or escrow.held_amount
        
        if release_amount > escrow.held_amount:
            return False, "Release amount exceeds held amount"
        
        # Update escrow
        escrow.held_amount -= release_amount
        escrow.released_amount += release_amount
        
        if escrow.held_amount == 0:
            escrow.status = EscrowStatus.RELEASED
            escrow.released_at = datetime.now(timezone.utc)
        else:
            escrow.status = EscrowStatus.PARTIAL_RELEASE
        
        # Create transaction record
        transaction = EscrowTransaction(
            escrow_id=escrow_id,
            transaction_type=TransactionType.RELEASE,
            amount=release_amount,
            bank_reference=bank_reference,
            description=reason or "Funds released to seller",
            status="completed",
        )
        
        self.db.add(transaction)
        await self.db.commit()
        
        # Emit event
        await event_dispatcher.dispatch_async(
            EscrowReleasedEvent(
                escrow_id=escrow_id,
                order_id=escrow.order_id,
                amount=float(release_amount),
            )
        )
        
        # Also emit funds transferred event
        await event_dispatcher.dispatch_async(
            FundsTransferredEvent(
                escrow_id=escrow_id,
                from_id=escrow.buyer_id,
                to_id=escrow.seller_id,
                amount=float(release_amount),
            )
        )
        
        logger.info(f"Released {release_amount} from escrow {escrow_id}")
        return True, "Funds released successfully"
    
    async def refund_funds(
        self,
        escrow_id: UUID,
        amount: Optional[Decimal] = None,
        reason: str = "Refund",
        bank_reference: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """Refund funds from escrow to buyer"""
        escrow = await self.get_by_id(escrow_id)
        if not escrow:
            return False, "Escrow not found"
        
        if escrow.status not in [EscrowStatus.LOCKED, EscrowStatus.PARTIAL_RELEASE]:
            return False, f"Cannot refund from {escrow.status.value} escrow"
        
        refund_amount = amount or escrow.held_amount
        
        if refund_amount > escrow.held_amount:
            return False, "Refund amount exceeds held amount"
        
        # Update escrow
        escrow.held_amount -= refund_amount
        escrow.refunded_amount = (escrow.refunded_amount or Decimal("0")) + refund_amount
        
        if escrow.held_amount == 0:
            escrow.status = EscrowStatus.REFUNDED
            escrow.refunded_at = datetime.now(timezone.utc)
        
        # Create transaction record
        transaction = EscrowTransaction(
            escrow_id=escrow_id,
            transaction_type=TransactionType.REFUND,
            amount=refund_amount,
            bank_reference=bank_reference,
            description=reason,
            status="completed",
        )
        
        self.db.add(transaction)
        await self.db.commit()
        
        logger.info(f"Refunded {refund_amount} from escrow {escrow_id}")
        return True, "Funds refunded successfully"
    
    async def put_in_dispute(
        self,
        escrow_id: UUID,
        reason: str,
    ) -> Tuple[bool, str]:
        """Put escrow in dispute status"""
        escrow = await self.get_by_id(escrow_id)
        if not escrow:
            return False, "Escrow not found"
        
        escrow.status = EscrowStatus.IN_DISPUTE
        await self.db.commit()
        
        logger.info(f"Escrow {escrow_id} put in dispute: {reason}")
        return True, "Escrow marked as in dispute"
    
    async def check_release_conditions(
        self,
        escrow_id: UUID,
    ) -> Tuple[bool, List[str]]:
        """
        Check if all release conditions are met.
        Returns (all_met, pending_conditions)
        """
        escrow = await self.get_by_id(escrow_id)
        if not escrow:
            return False, ["Escrow not found"]
        
        conditions = escrow.release_conditions or {}
        pending = []
        
        if not conditions.get("delivery_confirmed", False):
            pending.append("delivery_confirmed")
        if not conditions.get("buyer_confirmed", False):
            pending.append("buyer_confirmed")
        
        return len(pending) == 0, pending
    
    async def update_release_condition(
        self,
        escrow_id: UUID,
        condition: str,
        value: bool,
    ) -> Tuple[bool, str]:
        """Update a specific release condition"""
        escrow = await self.get_by_id(escrow_id)
        if not escrow:
            return False, "Escrow not found"
        
        if escrow.release_conditions is None:
            escrow.release_conditions = {}
        
        escrow.release_conditions[condition] = value
        await self.db.commit()
        
        # Check if all conditions are now met
        all_met, pending = await self.check_release_conditions(escrow_id)
        
        if all_met and escrow.status == EscrowStatus.LOCKED:
            # Auto-release if all conditions met
            success, message = await self.release_funds(
                escrow_id=escrow_id,
                reason="All release conditions met",
            )
            return success, f"Condition updated. {message}"
        
        return True, f"Condition '{condition}' updated. Pending: {pending}"
    
    async def get_transactions(
        self,
        escrow_id: UUID,
        transaction_type: Optional[TransactionType] = None,
    ) -> List[EscrowTransaction]:
        """Get escrow transactions"""
        query = select(EscrowTransaction).where(
            EscrowTransaction.escrow_id == escrow_id
        )
        
        if transaction_type:
            query = query.where(
                EscrowTransaction.transaction_type == transaction_type
            )
        
        query = query.order_by(EscrowTransaction.created_at.desc())
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def list_escrows(
        self,
        user_id: Optional[UUID] = None,
        as_buyer: bool = True,
        status: Optional[EscrowStatus] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Escrow]:
        """List escrows with filters"""
        query = select(Escrow).where(Escrow.is_deleted == False)
        
        if user_id:
            if as_buyer:
                query = query.where(Escrow.buyer_id == user_id)
            else:
                query = query.where(Escrow.seller_id == user_id)
        
        if status:
            query = query.where(Escrow.status == status)
        
        query = query.offset(skip).limit(limit).order_by(Escrow.created_at.desc())
        
        result = await self.db.execute(query)
        return list(result.scalars().all())


async def get_escrow_service(db: AsyncSession) -> EscrowService:
    """Dependency for getting EscrowService"""
    return EscrowService(db)
