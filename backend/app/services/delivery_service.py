"""
Delivery Service
Business logic for delivery management and verification
"""
from typing import Optional, List, Tuple
from uuid import UUID
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.models.delivery import (
    Delivery,
    DeliveryTrackingEvent,
    DeliveryConfirmation,
    DeliveryStatus,
    DeliveryEventType,
    ConfirmedBy,
)
from app.models.order import Order, OrderStatus
from app.core.events import (
    event_dispatcher,
    DeliveryCreatedEvent,
    DeliveryInTransitEvent,
    DeliveryConfirmedEvent,
)
from app.core.logging import get_logger

logger = get_logger(__name__)


class DeliveryService:
    """Service for delivery management operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def get_by_id(self, delivery_id: UUID) -> Optional[Delivery]:
        """Get delivery by ID"""
        result = await self.db.execute(
            select(Delivery)
            .where(and_(Delivery.id == delivery_id, Delivery.is_deleted == False))
            .options(
                selectinload(Delivery.tracking_events),
                selectinload(Delivery.confirmations),
            )
        )
        return result.scalar_one_or_none()
    
    async def get_by_order_id(self, order_id: UUID) -> Optional[Delivery]:
        """Get delivery for an order"""
        result = await self.db.execute(
            select(Delivery).where(
                and_(Delivery.order_id == order_id, Delivery.is_deleted == False)
            )
        )
        return result.scalar_one_or_none()
    
    async def get_by_tracking_number(self, tracking_number: str) -> Optional[Delivery]:
        """Get delivery by tracking number"""
        result = await self.db.execute(
            select(Delivery).where(
                and_(
                    Delivery.tracking_number == tracking_number,
                    Delivery.is_deleted == False
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def create_delivery(
        self,
        order_id: UUID,
        provider_id: UUID,
        pickup_address: dict,
        delivery_address: dict,
        estimated_delivery: Optional[datetime] = None,
        special_instructions: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> Delivery:
        """Create delivery record for an order"""
        # Convert timezone-aware datetime to timezone-naive if needed
        # (Delivery model uses TIMESTAMP WITHOUT TIME ZONE)
        estimated_delivery_naive = None
        if estimated_delivery:
            if estimated_delivery.tzinfo is not None:
                # Convert to UTC and remove timezone info
                estimated_delivery_naive = estimated_delivery.astimezone(timezone.utc).replace(tzinfo=None)
            else:
                estimated_delivery_naive = estimated_delivery
        
        delivery = Delivery(
            order_id=order_id,
            provider_id=provider_id,
            status=DeliveryStatus.PENDING,
            pickup_address=pickup_address,
            delivery_address=delivery_address,
            estimated_delivery_date=estimated_delivery_naive,
            delivery_instructions=special_instructions,
            delivery_metadata=metadata or {},
        )
        
        self.db.add(delivery)
        await self.db.commit()
        await self.db.refresh(delivery)
        
        # Add initial tracking event
        await self._add_tracking_event(
            delivery_id=delivery.id,
            event_type=DeliveryEventType.CREATED,
            description="Delivery order created",
        )
        
        # Emit event
        await event_dispatcher.dispatch_async(
            DeliveryCreatedEvent(
                delivery_id=delivery.id,
                order_id=order_id,
                provider_id=provider_id,
            )
        )
        
        logger.info(f"Created delivery {delivery.id} for order {order_id}")
        return delivery
    
    async def assign_for_pickup(
        self,
        delivery_id: UUID,
        driver_info: Optional[dict] = None,
    ) -> Tuple[bool, str]:
        """Mark delivery as assigned for pickup"""
        delivery = await self.get_by_id(delivery_id)
        if not delivery:
            return False, "Delivery not found"
        
        # Status remains PENDING until pickup starts - provider_id assignment is the "assignment"
        # No need to change status here as PENDING with provider_id means it's assigned
        await self.db.commit()
        
        await self._add_tracking_event(
            delivery_id=delivery_id,
            event_type=DeliveryEventType.NOTE_ADDED,
            description="Delivery assigned for pickup",
            metadata=driver_info,
        )
        
        return True, "Delivery assigned"
    
    async def start_pickup(
        self,
        delivery_id: UUID,
        location: Optional[dict] = None,
    ) -> Tuple[bool, str]:
        """Mark delivery as picked up from seller"""
        delivery = await self.get_by_id(delivery_id)
        if not delivery:
            return False, "Delivery not found"
        
        delivery.status = DeliveryStatus.PICKED_UP
        delivery.picked_up_at = datetime.now(timezone.utc)
        await self.db.commit()
        
        await self._add_tracking_event(
            delivery_id=delivery_id,
            event_type=DeliveryEventType.PICKED_UP,
            description="Package picked up from seller",
            location=location,
        )
        
        return True, "Package picked up"
    
    async def start_transit(
        self,
        delivery_id: UUID,
        location: Optional[dict] = None,
    ) -> Tuple[bool, str]:
        """Mark delivery as in transit"""
        delivery = await self.get_by_id(delivery_id)
        if not delivery:
            return False, "Delivery not found"
        
        delivery.status = DeliveryStatus.IN_TRANSIT
        await self.db.commit()
        
        await self._add_tracking_event(
            delivery_id=delivery_id,
            event_type=DeliveryEventType.IN_TRANSIT,
            description="Package in transit",
            location=location,
        )
        
        # Emit event
        await event_dispatcher.dispatch_async(
            DeliveryInTransitEvent(
                delivery_id=delivery_id,
                order_id=delivery.order_id,
            )
        )
        
        return True, "Delivery in transit"
    
    async def mark_out_for_delivery(
        self,
        delivery_id: UUID,
        location: Optional[dict] = None,
    ) -> Tuple[bool, str]:
        """Mark delivery as out for delivery"""
        delivery = await self.get_by_id(delivery_id)
        if not delivery:
            return False, "Delivery not found"
        
        delivery.status = DeliveryStatus.OUT_FOR_DELIVERY
        await self.db.commit()
        
        await self._add_tracking_event(
            delivery_id=delivery_id,
            event_type=DeliveryEventType.OUT_FOR_DELIVERY,
            description="Package out for delivery",
            location=location,
        )
        
        return True, "Package out for delivery"
    
    async def mark_delivered(
        self,
        delivery_id: UUID,
        proof_of_delivery: Optional[dict] = None,
        location: Optional[dict] = None,
        signature_image: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """Mark delivery as delivered (pending confirmations)"""
        delivery = await self.get_by_id(delivery_id)
        if not delivery:
            return False, "Delivery not found"
        
        delivery.status = DeliveryStatus.DELIVERED
        delivery.delivered_at = datetime.now(timezone.utc)
        delivery.proof_of_delivery = proof_of_delivery
        
        if signature_image:
            if delivery.metadata is None:
                delivery.metadata = {}
            delivery.metadata["signature_image"] = signature_image
        
        await self.db.commit()
        
        await self._add_tracking_event(
            delivery_id=delivery_id,
            event_type=DeliveryEventType.DELIVERED,
            description="Package delivered - awaiting confirmation",
            location=location,
            metadata=proof_of_delivery,
        )
        
        return True, "Delivery marked as delivered"
    
    async def confirm_delivery(
        self,
        delivery_id: UUID,
        confirmed_by: ConfirmedBy,
        user_id: UUID,
        is_satisfied: bool = True,
        notes: Optional[str] = None,
        photos: Optional[List[str]] = None,
    ) -> Tuple[bool, str]:
        """Add delivery confirmation (dual confirmation system)"""
        delivery = await self.get_by_id(delivery_id)
        if not delivery:
            return False, "Delivery not found"
        
        # Check if already confirmed by this party
        existing = await self.db.execute(
            select(DeliveryConfirmation).where(
                and_(
                    DeliveryConfirmation.delivery_id == delivery_id,
                    DeliveryConfirmation.confirmed_by == confirmed_by,
                )
            )
        )
        if existing.scalar_one_or_none():
            return False, f"Already confirmed by {confirmed_by.value}"
        
        # Create confirmation
        confirmation = DeliveryConfirmation(
            delivery_id=delivery_id,
            confirmed_by=confirmed_by,
            user_id=user_id,
            is_satisfied=is_satisfied,
            notes=notes,
            photos=photos,
        )
        
        self.db.add(confirmation)
        
        # Update delivery confirmation flags
        if confirmed_by == ConfirmedBy.BUYER:
            delivery.buyer_confirmed = True
            delivery.buyer_confirmed_at = datetime.now(timezone.utc)
        elif confirmed_by == ConfirmedBy.DELIVERY_PROVIDER:
            delivery.provider_confirmed = True
            delivery.provider_confirmed_at = datetime.now(timezone.utc)
        
        await self.db.commit()
        
        # Add tracking event
        await self._add_tracking_event(
            delivery_id=delivery_id,
            event_type=DeliveryEventType.CONFIRMED,
            description=f"Delivery confirmed by {confirmed_by.value}",
        )
        
        # Check if both confirmations received
        if delivery.buyer_confirmed and delivery.provider_confirmed:
            delivery.status = DeliveryStatus.CONFIRMED
            await self.db.commit()
            
            # Emit confirmed event
            await event_dispatcher.dispatch_async(
                DeliveryConfirmedEvent(
                    delivery_id=delivery_id,
                    order_id=delivery.order_id,
                    buyer_confirmed=True,
                    provider_confirmed=True,
                )
            )
            
            return True, "Delivery fully confirmed by both parties"
        
        return True, f"Confirmation recorded from {confirmed_by.value}"
    
    async def mark_failed(
        self,
        delivery_id: UUID,
        reason: str,
        location: Optional[dict] = None,
    ) -> Tuple[bool, str]:
        """Mark delivery as failed"""
        delivery = await self.get_by_id(delivery_id)
        if not delivery:
            return False, "Delivery not found"
        
        delivery.status = DeliveryStatus.FAILED
        await self.db.commit()
        
        await self._add_tracking_event(
            delivery_id=delivery_id,
            event_type=DeliveryEventType.FAILED,
            description=f"Delivery failed: {reason}",
            location=location,
        )
        
        return True, "Delivery marked as failed"
    
    async def add_location_update(
        self,
        delivery_id: UUID,
        location: dict,
        description: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """Add location tracking update"""
        delivery = await self.get_by_id(delivery_id)
        if not delivery:
            return False, "Delivery not found"
        
        delivery.current_location = location
        await self.db.commit()
        
        await self._add_tracking_event(
            delivery_id=delivery_id,
            event_type=DeliveryEventType.LOCATION_UPDATE,
            description=description or "Location updated",
            location=location,
        )
        
        return True, "Location updated"
    
    async def run_ai_validation(
        self,
        delivery_id: UUID,
        validation_result: dict,
    ) -> Tuple[bool, str]:
        """Record AI validation result for delivery"""
        delivery = await self.get_by_id(delivery_id)
        if not delivery:
            return False, "Delivery not found"
        
        delivery.ai_validated = True
        delivery.ai_validation_score = validation_result.get("score", 0)
        delivery.ai_validation_result = validation_result
        
        await self.db.commit()
        
        logger.info(
            f"AI validation for delivery {delivery_id}: "
            f"score={delivery.ai_validation_score}"
        )
        
        return True, "AI validation recorded"
    
    async def _add_tracking_event(
        self,
        delivery_id: UUID,
        event_type: DeliveryEventType,
        description: str,
        location: Optional[dict] = None,
        metadata: Optional[dict] = None,
    ) -> DeliveryTrackingEvent:
        """Add tracking event to delivery"""
        event = DeliveryTrackingEvent(
            delivery_id=delivery_id,
            event_type=event_type,
            description=description,
            location=location,
            metadata=metadata,
        )
        
        self.db.add(event)
        await self.db.commit()
        await self.db.refresh(event)
        
        return event
    
    async def get_tracking_events(
        self,
        delivery_id: UUID,
    ) -> List[DeliveryTrackingEvent]:
        """Get all tracking events for a delivery"""
        result = await self.db.execute(
            select(DeliveryTrackingEvent)
            .where(DeliveryTrackingEvent.delivery_id == delivery_id)
            .order_by(DeliveryTrackingEvent.created_at.asc())
        )
        return list(result.scalars().all())
    
    async def list_deliveries(
        self,
        provider_id: Optional[UUID] = None,
        status: Optional[DeliveryStatus] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Delivery]:
        """List deliveries with filters"""
        query = select(Delivery).where(Delivery.is_deleted == False)
        
        if provider_id:
            query = query.where(Delivery.provider_id == provider_id)
        if status:
            query = query.where(Delivery.status == status)
        
        query = query.offset(skip).limit(limit).order_by(Delivery.created_at.desc())
        
        result = await self.db.execute(query)
        return list(result.scalars().all())


async def get_delivery_service(db: AsyncSession) -> DeliveryService:
    """Dependency for getting DeliveryService"""
    return DeliveryService(db)
