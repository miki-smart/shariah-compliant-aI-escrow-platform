"""
Domain Events System
Event-driven architecture for loose coupling between modules
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional, Type
from uuid import UUID, uuid4
import asyncio
import logging
from enum import Enum

logger = logging.getLogger(__name__)


class EventPriority(int, Enum):
    """Event processing priority"""
    LOW = 1
    NORMAL = 5
    HIGH = 10
    CRITICAL = 100


@dataclass
class DomainEvent(ABC):
    """
    Base class for all domain events.
    Events are immutable records of something that happened.
    """
    event_id: UUID = field(default_factory=uuid4)
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    correlation_id: Optional[str] = None
    causation_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    @property
    @abstractmethod
    def event_type(self) -> str:
        """Return the event type identifier"""
        pass
    
    @property
    def priority(self) -> EventPriority:
        """Event processing priority"""
        return EventPriority.NORMAL
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary"""
        return {
            "event_id": str(self.event_id),
            "event_type": self.event_type,
            "occurred_at": self.occurred_at.isoformat(),
            "correlation_id": self.correlation_id,
            "causation_id": self.causation_id,
            "metadata": self.metadata,
            "data": self._get_data(),
        }
    
    @abstractmethod
    def _get_data(self) -> Dict[str, Any]:
        """Get event-specific data"""
        pass


# ============== Order Events ==============

@dataclass
class OrderCreatedEvent(DomainEvent):
    """Emitted when a new order is created"""
    order_id: UUID = None
    buyer_id: UUID = None
    seller_id: UUID = None
    product_id: UUID = None
    total_amount: float = 0.0
    financing_requested: bool = False
    
    @property
    def event_type(self) -> str:
        return "order.created"
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "order_id": str(self.order_id),
            "buyer_id": str(self.buyer_id),
            "seller_id": str(self.seller_id),
            "product_id": str(self.product_id),
            "total_amount": self.total_amount,
            "financing_requested": self.financing_requested,
        }


@dataclass
class OrderStatusChangedEvent(DomainEvent):
    """Emitted when order status changes"""
    order_id: UUID = None
    from_status: str = None
    to_status: str = None
    changed_by: Optional[UUID] = None
    reason: Optional[str] = None
    
    @property
    def event_type(self) -> str:
        return "order.status_changed"
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "order_id": str(self.order_id),
            "from_status": self.from_status,
            "to_status": self.to_status,
            "changed_by": str(self.changed_by) if self.changed_by else None,
            "reason": self.reason,
        }


@dataclass
class OrderCancelledEvent(DomainEvent):
    """Emitted when order is cancelled"""
    order_id: UUID = None
    cancelled_by: UUID = None
    reason: str = None
    
    @property
    def event_type(self) -> str:
        return "order.cancelled"
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.HIGH
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "order_id": str(self.order_id),
            "cancelled_by": str(self.cancelled_by),
            "reason": self.reason,
        }


@dataclass
class OrderApprovedEvent(DomainEvent):
    """Emitted when order is approved (bank approval for financing)"""
    order_id: UUID = None
    bank_id: UUID = None
    approved_amount: float = 0.0
    
    @property
    def event_type(self) -> str:
        return "order.approved"
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.HIGH
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "order_id": str(self.order_id),
            "bank_id": str(self.bank_id) if self.bank_id else None,
            "approved_amount": self.approved_amount,
        }


@dataclass
class OrderCompletedEvent(DomainEvent):
    """Emitted when order is completed"""
    order_id: UUID = None
    
    @property
    def event_type(self) -> str:
        return "order.completed"
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.HIGH
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "order_id": str(self.order_id),
        }


@dataclass
class OrderRejectedEvent(DomainEvent):
    """Emitted when order is rejected"""
    order_id: UUID = None
    rejected_by: UUID = None
    reason: str = None
    
    @property
    def event_type(self) -> str:
        return "order.rejected"
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.HIGH
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "order_id": str(self.order_id),
            "rejected_by": str(self.rejected_by) if self.rejected_by else None,
            "reason": self.reason,
        }


# ============== Shariah Events ==============

@dataclass
class ShariahValidationRequestedEvent(DomainEvent):
    """Emitted when Shariah validation is requested"""
    order_id: UUID = None
    product_id: UUID = None
    
    @property
    def event_type(self) -> str:
        return "shariah.validation_requested"
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "order_id": str(self.order_id),
            "product_id": str(self.product_id),
        }


@dataclass
class ShariahValidatedEvent(DomainEvent):
    """Emitted when Shariah validation completes"""
    order_id: UUID = None
    status: str = None  # compliant, non_compliant, requires_review
    violations: List[Dict] = field(default_factory=list)
    
    @property
    def event_type(self) -> str:
        return "shariah.validated"
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.HIGH
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "order_id": str(self.order_id),
            "status": self.status,
            "violations": self.violations,
        }


@dataclass
class ShariahViolationDetectedEvent(DomainEvent):
    """Emitted when a Shariah violation is detected"""
    order_id: UUID = None
    violation_type: str = None
    description: str = None
    severity: str = "high"
    
    @property
    def event_type(self) -> str:
        return "shariah.violation_detected"
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.CRITICAL
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "order_id": str(self.order_id),
            "violation_type": self.violation_type,
            "description": self.description,
            "severity": self.severity,
        }


# ============== AI Events ==============

@dataclass
class AIEvaluationRequestedEvent(DomainEvent):
    """Emitted when AI evaluation is requested"""
    order_id: UUID = None
    buyer_id: UUID = None
    
    @property
    def event_type(self) -> str:
        return "ai.evaluation_requested"
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "order_id": str(self.order_id),
            "buyer_id": str(self.buyer_id),
        }


@dataclass
class AIEvaluatedEvent(DomainEvent):
    """Emitted when AI evaluation completes"""
    order_id: UUID = None
    decision: str = None  # ALLOW, BLOCK, REVIEW
    risk_score: float = 0.0
    confidence: float = 0.0
    explanation: str = None
    
    @property
    def event_type(self) -> str:
        return "ai.evaluated"
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.HIGH
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "order_id": str(self.order_id),
            "decision": self.decision,
            "risk_score": self.risk_score,
            "confidence": self.confidence,
            "explanation": self.explanation,
        }


# ============== Escrow Events ==============

@dataclass
class EscrowCreatedEvent(DomainEvent):
    """Emitted when escrow is created"""
    escrow_id: UUID = None
    order_id: UUID = None
    total_amount: float = 0.0
    
    @property
    def event_type(self) -> str:
        return "escrow.created"
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "escrow_id": str(self.escrow_id),
            "order_id": str(self.order_id),
            "total_amount": self.total_amount,
        }


@dataclass
class EscrowLockedEvent(DomainEvent):
    """Emitted when escrow funds are locked"""
    escrow_id: UUID = None
    order_id: UUID = None
    amount: float = 0.0
    bank_amount: float = 0.0
    buyer_amount: float = 0.0
    
    @property
    def event_type(self) -> str:
        return "escrow.locked"
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.HIGH
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "escrow_id": str(self.escrow_id),
            "order_id": str(self.order_id),
            "amount": self.amount,
            "bank_amount": self.bank_amount,
            "buyer_amount": self.buyer_amount,
        }


@dataclass
class EscrowReleasedEvent(DomainEvent):
    """Emitted when escrow is released to seller"""
    escrow_id: UUID = None
    order_id: UUID = None
    seller_id: UUID = None
    amount: float = 0.0
    
    @property
    def event_type(self) -> str:
        return "escrow.released"
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.CRITICAL
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "escrow_id": str(self.escrow_id),
            "order_id": str(self.order_id),
            "seller_id": str(self.seller_id),
            "amount": self.amount,
        }


@dataclass
class EscrowRevertedEvent(DomainEvent):
    """Emitted when escrow is reverted to bank/buyer"""
    escrow_id: UUID = None
    order_id: UUID = None
    reason: str = None
    
    @property
    def event_type(self) -> str:
        return "escrow.reverted"
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.CRITICAL
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "escrow_id": str(self.escrow_id),
            "order_id": str(self.order_id),
            "reason": self.reason,
        }


@dataclass
class EscrowFrozenEvent(DomainEvent):
    """Emitted when escrow is frozen"""
    escrow_id: UUID = None
    order_id: UUID = None
    reason: str = None
    
    @property
    def event_type(self) -> str:
        return "escrow.frozen"
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.HIGH
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "escrow_id": str(self.escrow_id),
            "order_id": str(self.order_id),
            "reason": self.reason,
        }


@dataclass
class FundsTransferredEvent(DomainEvent):
    """Emitted when funds are transferred"""
    escrow_id: UUID = None
    order_id: UUID = None
    from_account: str = None
    to_account: str = None
    amount: float = 0.0
    transfer_type: str = None  # lock, release, revert
    
    @property
    def event_type(self) -> str:
        return "escrow.funds_transferred"
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.HIGH
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "escrow_id": str(self.escrow_id),
            "order_id": str(self.order_id),
            "from_account": self.from_account,
            "to_account": self.to_account,
            "amount": self.amount,
            "transfer_type": self.transfer_type,
        }


# ============== Delivery Events ==============

@dataclass
class DeliveryCreatedEvent(DomainEvent):
    """Emitted when delivery is created"""
    delivery_id: UUID = None
    order_id: UUID = None
    provider_id: Optional[UUID] = None
    
    @property
    def event_type(self) -> str:
        return "delivery.created"
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "delivery_id": str(self.delivery_id),
            "order_id": str(self.order_id),
            "provider_id": str(self.provider_id) if self.provider_id else None,
        }


@dataclass
class DeliveryConfirmedByBuyerEvent(DomainEvent):
    """Emitted when buyer confirms delivery"""
    delivery_id: UUID = None
    order_id: UUID = None
    buyer_id: UUID = None
    
    @property
    def event_type(self) -> str:
        return "delivery.confirmed_by_buyer"
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.HIGH
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "delivery_id": str(self.delivery_id),
            "order_id": str(self.order_id),
            "buyer_id": str(self.buyer_id),
        }


@dataclass
class DeliveryConfirmedByProviderEvent(DomainEvent):
    """Emitted when delivery provider confirms delivery"""
    delivery_id: UUID = None
    order_id: UUID = None
    provider_id: UUID = None
    reference: str = None
    
    @property
    def event_type(self) -> str:
        return "delivery.confirmed_by_provider"
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.HIGH
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "delivery_id": str(self.delivery_id),
            "order_id": str(self.order_id),
            "provider_id": str(self.provider_id),
            "reference": self.reference,
        }


@dataclass
class DeliveryValidatedEvent(DomainEvent):
    """Emitted when AI validates the delivery"""
    delivery_id: UUID = None
    order_id: UUID = None
    validation_status: str = None
    validation_score: float = 0.0
    
    @property
    def event_type(self) -> str:
        return "delivery.validated"
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.HIGH
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "delivery_id": str(self.delivery_id),
            "order_id": str(self.order_id),
            "validation_status": self.validation_status,
            "validation_score": self.validation_score,
        }


@dataclass
class DeliveryInTransitEvent(DomainEvent):
    """Emitted when delivery is in transit"""
    delivery_id: UUID = None
    order_id: UUID = None
    provider_id: UUID = None
    tracking_number: str = None
    
    @property
    def event_type(self) -> str:
        return "delivery.in_transit"
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "delivery_id": str(self.delivery_id),
            "order_id": str(self.order_id),
            "provider_id": str(self.provider_id) if self.provider_id else None,
            "tracking_number": self.tracking_number,
        }


@dataclass
class DeliveryConfirmedEvent(DomainEvent):
    """Emitted when delivery is confirmed"""
    delivery_id: UUID = None
    order_id: UUID = None
    confirmed_by: UUID = None
    confirmation_type: str = None  # buyer, provider, both
    
    @property
    def event_type(self) -> str:
        return "delivery.confirmed"
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.HIGH
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "delivery_id": str(self.delivery_id),
            "order_id": str(self.order_id),
            "confirmed_by": str(self.confirmed_by) if self.confirmed_by else None,
            "confirmation_type": self.confirmation_type,
        }


# ============== Bank Events ==============

@dataclass
class BankApprovalRequestedEvent(DomainEvent):
    """Emitted when bank approval is requested"""
    order_id: UUID = None
    bank_id: UUID = None
    amount: float = 0.0
    ai_risk_score: float = 0.0
    
    @property
    def event_type(self) -> str:
        return "bank.approval_requested"
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "order_id": str(self.order_id),
            "bank_id": str(self.bank_id),
            "amount": self.amount,
            "ai_risk_score": self.ai_risk_score,
        }


@dataclass
class BankApprovedEvent(DomainEvent):
    """Emitted when bank approves financing"""
    order_id: UUID = None
    bank_id: UUID = None
    approved_amount: float = 0.0
    
    @property
    def event_type(self) -> str:
        return "bank.approved"
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.HIGH
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "order_id": str(self.order_id),
            "bank_id": str(self.bank_id),
            "approved_amount": self.approved_amount,
        }


@dataclass
class BankRejectedEvent(DomainEvent):
    """Emitted when bank rejects financing"""
    order_id: UUID = None
    bank_id: UUID = None
    reason: str = None
    
    @property
    def event_type(self) -> str:
        return "bank.rejected"
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.HIGH
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "order_id": str(self.order_id),
            "bank_id": str(self.bank_id),
            "reason": self.reason,
        }


# ============== User Events ==============

@dataclass
class UserCreatedEvent(DomainEvent):
    """Emitted when a new user is created"""
    user_id: UUID = None
    keycloak_id: UUID = None
    role: str = None
    email: str = None
    
    @property
    def event_type(self) -> str:
        return "user.created"
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "user_id": str(self.user_id),
            "keycloak_id": str(self.keycloak_id),
            "role": self.role,
            "email": self.email,
        }


@dataclass
class UserSyncedFromKeycloakEvent(DomainEvent):
    """Emitted when user is synced from Keycloak"""
    user_id: UUID = None
    keycloak_id: UUID = None
    sync_type: str = None  # created, updated
    
    @property
    def event_type(self) -> str:
        return "user.synced_from_keycloak"
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "user_id": str(self.user_id),
            "keycloak_id": str(self.keycloak_id),
            "sync_type": self.sync_type,
        }


# ============== Dispute Events ==============

@dataclass
class DisputeCreatedEvent(DomainEvent):
    """Emitted when a dispute is created"""
    dispute_id: UUID = None
    order_id: UUID = None
    initiator_id: UUID = None
    dispute_type: str = None
    
    @property
    def event_type(self) -> str:
        return "dispute.created"
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.HIGH
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "dispute_id": str(self.dispute_id),
            "order_id": str(self.order_id),
            "initiator_id": str(self.initiator_id),
            "dispute_type": self.dispute_type,
        }


@dataclass
class DisputeResolvedEvent(DomainEvent):
    """Emitted when a dispute is resolved"""
    dispute_id: UUID = None
    order_id: UUID = None
    resolution: str = None
    resolved_by: UUID = None
    
    @property
    def event_type(self) -> str:
        return "dispute.resolved"
    
    @property
    def priority(self) -> EventPriority:
        return EventPriority.HIGH
    
    def _get_data(self) -> Dict[str, Any]:
        return {
            "dispute_id": str(self.dispute_id),
            "order_id": str(self.order_id),
            "resolution": self.resolution,
            "resolved_by": str(self.resolved_by),
        }


# ============== Event Handler ==============

EventHandler = Callable[[DomainEvent], Any]
AsyncEventHandler = Callable[[DomainEvent], Any]


class EventDispatcher:
    """
    Central event dispatcher.
    Routes events to registered handlers.
    """
    
    def __init__(self):
        self._handlers: Dict[str, List[EventHandler]] = {}
        self._async_handlers: Dict[str, List[AsyncEventHandler]] = {}
        self._global_handlers: List[EventHandler] = []
        self._async_global_handlers: List[AsyncEventHandler] = []
    
    def subscribe(
        self,
        event_type: str,
        handler: EventHandler,
        is_async: bool = False
    ) -> None:
        """Subscribe a handler to an event type"""
        if is_async:
            if event_type not in self._async_handlers:
                self._async_handlers[event_type] = []
            self._async_handlers[event_type].append(handler)
        else:
            if event_type not in self._handlers:
                self._handlers[event_type] = []
            self._handlers[event_type].append(handler)
    
    def subscribe_all(self, handler: EventHandler, is_async: bool = False) -> None:
        """Subscribe a handler to all events"""
        if is_async:
            self._async_global_handlers.append(handler)
        else:
            self._global_handlers.append(handler)
    
    def unsubscribe(self, event_type: str, handler: EventHandler) -> None:
        """Unsubscribe a handler from an event type"""
        if event_type in self._handlers:
            self._handlers[event_type].remove(handler)
        if event_type in self._async_handlers:
            self._async_handlers[event_type].remove(handler)
    
    def dispatch(self, event: DomainEvent) -> None:
        """Dispatch an event synchronously"""
        event_type = event.event_type
        logger.debug(f"Dispatching event: {event_type} ({event.event_id})")
        
        # Global handlers
        for handler in self._global_handlers:
            try:
                handler(event)
            except Exception as e:
                logger.error(f"Error in global handler for {event_type}: {e}")
        
        # Type-specific handlers
        if event_type in self._handlers:
            for handler in self._handlers[event_type]:
                try:
                    handler(event)
                except Exception as e:
                    logger.error(f"Error in handler for {event_type}: {e}")
    
    async def dispatch_async(self, event: DomainEvent) -> None:
        """Dispatch an event asynchronously"""
        event_type = event.event_type
        logger.debug(f"Dispatching async event: {event_type} ({event.event_id})")
        
        # Global async handlers
        for handler in self._async_global_handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(event)
                else:
                    handler(event)
            except Exception as e:
                logger.error(f"Error in async global handler for {event_type}: {e}")
        
        # Type-specific async handlers
        if event_type in self._async_handlers:
            for handler in self._async_handlers[event_type]:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(event)
                    else:
                        handler(event)
                except Exception as e:
                    logger.error(f"Error in async handler for {event_type}: {e}")
        
        # Also dispatch to sync handlers
        self.dispatch(event)


# Global event dispatcher instance
event_dispatcher = EventDispatcher()


def on_event(event_type: str, is_async: bool = False):
    """Decorator to register event handlers"""
    def decorator(handler: EventHandler):
        event_dispatcher.subscribe(event_type, handler, is_async)
        return handler
    return decorator


def on_all_events(is_async: bool = False):
    """Decorator to register global event handlers"""
    def decorator(handler: EventHandler):
        event_dispatcher.subscribe_all(handler, is_async)
        return handler
    return decorator
