"""
Notification Service
Handles sending and storing notifications for users
"""
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func

from app.core.logging import get_logger

logger = get_logger(__name__)


class NotificationType(str, Enum):
    """Types of notifications"""
    ORDER_CREATED = "order_created"
    ORDER_FUNDED = "order_funded"
    ORDER_DELIVERED = "order_delivered"
    ORDER_SETTLED = "order_settled"
    ORDER_CANCELLED = "order_cancelled"
    ORDER_REFUNDED = "order_refunded"
    SHARIAH_COMPLIANT = "shariah_compliant"
    SHARIAH_VIOLATION = "shariah_violation"
    AI_APPROVED = "ai_approved"
    AI_REJECTED = "ai_rejected"
    ESCROW_LOCKED = "escrow_locked"
    ESCROW_RELEASED = "escrow_released"
    ESCROW_FROZEN = "escrow_frozen"
    DISPUTE_OPENED = "dispute_opened"
    DISPUTE_RESOLVED = "dispute_resolved"
    SYSTEM_ALERT = "system_alert"
    # Photo verification notifications
    PHOTO_VERIFIED = "photo_verified"
    PHOTO_VERIFICATION_FAILED = "photo_verification_failed"
    FRAUD_DETECTED = "fraud_detected"
    PICKUP_CONFIRMED = "pickup_confirmed"
    DELIVERY_CONFIRMED = "delivery_confirmed"


# In-memory notification store (for MVP - would use database in production)
_notifications_store: List[dict] = []


class NotificationService:
    """Service for managing notifications"""
    
    @staticmethod
    async def create_notification(
        user_id: UUID,
        notification_type: NotificationType,
        title: str,
        message: str,
        order_id: Optional[UUID] = None,
        data: Optional[dict] = None,
    ) -> dict:
        """
        Create a new notification for a user.
        """
        notification = {
            "id": str(UUID(int=len(_notifications_store) + 1)),
            "user_id": str(user_id),
            "type": notification_type.value,
            "title": title,
            "message": message,
            "order_id": str(order_id) if order_id else None,
            "data": data or {},
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        
        _notifications_store.append(notification)
        
        logger.info(f"Notification created for user {user_id}: {title}")
        
        return notification
    
    @staticmethod
    async def get_user_notifications(
        user_id: UUID,
        unread_only: bool = False,
        skip: int = 0,
        limit: int = 50,
    ) -> List[dict]:
        """
        Get notifications for a user.
        """
        user_notifications = [
            n for n in _notifications_store 
            if n["user_id"] == str(user_id)
        ]
        
        if unread_only:
            user_notifications = [n for n in user_notifications if not n["read"]]
        
        # Sort by created_at descending
        user_notifications.sort(key=lambda x: x["created_at"], reverse=True)
        
        return user_notifications[skip:skip + limit]
    
    @staticmethod
    async def mark_as_read(
        user_id: UUID,
        notification_id: str,
    ) -> bool:
        """
        Mark a notification as read.
        """
        for n in _notifications_store:
            if n["id"] == notification_id and n["user_id"] == str(user_id):
                n["read"] = True
                return True
        return False
    
    @staticmethod
    async def mark_all_as_read(user_id: UUID) -> int:
        """
        Mark all notifications for a user as read.
        """
        count = 0
        for n in _notifications_store:
            if n["user_id"] == str(user_id) and not n["read"]:
                n["read"] = True
                count += 1
        return count
    
    @staticmethod
    async def get_unread_count(user_id: UUID) -> int:
        """
        Get count of unread notifications for a user.
        """
        return sum(
            1 for n in _notifications_store 
            if n["user_id"] == str(user_id) and not n["read"]
        )
    
    @staticmethod
    async def notify_order_status_change(
        order_id: UUID,
        new_status: str,
        buyer_id: UUID,
        seller_id: UUID,
        bank_id: Optional[UUID] = None,
    ) -> List[dict]:
        """
        Send notifications for order status change to relevant parties.
        """
        notifications = []
        
        # Determine notification type and message
        status_info = {
            "funded": (NotificationType.ORDER_FUNDED, "Order Funded", "Your order has been funded and escrow is locked."),
            "delivered": (NotificationType.ORDER_DELIVERED, "Order Delivered", "The order has been marked as delivered."),
            "settled": (NotificationType.ORDER_SETTLED, "Payment Released", "Payment has been released from escrow."),
            "cancelled": (NotificationType.ORDER_CANCELLED, "Order Cancelled", "The order has been cancelled."),
            "refunded": (NotificationType.ORDER_REFUNDED, "Order Refunded", "The order has been refunded."),
        }
        
        info = status_info.get(new_status.lower())
        if not info:
            return notifications
        
        notification_type, title, message = info
        
        # Notify buyer
        n = await NotificationService.create_notification(
            user_id=buyer_id,
            notification_type=notification_type,
            title=title,
            message=message,
            order_id=order_id,
        )
        notifications.append(n)
        
        # Notify seller
        n = await NotificationService.create_notification(
            user_id=seller_id,
            notification_type=notification_type,
            title=title,
            message=message,
            order_id=order_id,
        )
        notifications.append(n)
        
        # Notify bank if applicable
        if bank_id and new_status.lower() in ["settled", "refunded"]:
            n = await NotificationService.create_notification(
                user_id=bank_id,
                notification_type=notification_type,
                title=title,
                message=f"Bank notification: {message}",
                order_id=order_id,
            )
            notifications.append(n)
        
        return notifications
    
    @staticmethod
    async def notify_shariah_result(
        order_id: UUID,
        is_compliant: bool,
        buyer_id: UUID,
        seller_id: UUID,
        violation_reason: Optional[str] = None,
    ) -> List[dict]:
        """
        Send notifications for Shariah compliance result.
        """
        notifications = []
        
        if is_compliant:
            notification_type = NotificationType.SHARIAH_COMPLIANT
            title = "Shariah Compliance Verified"
            message = "Your order has passed Shariah compliance validation."
        else:
            notification_type = NotificationType.SHARIAH_VIOLATION
            title = "Shariah Compliance Issue"
            message = f"Your order has a Shariah compliance issue: {violation_reason or 'Please review.'}"
        
        # Notify buyer
        n = await NotificationService.create_notification(
            user_id=buyer_id,
            notification_type=notification_type,
            title=title,
            message=message,
            order_id=order_id,
        )
        notifications.append(n)
        
        # Notify seller
        n = await NotificationService.create_notification(
            user_id=seller_id,
            notification_type=notification_type,
            title=title,
            message=message,
            order_id=order_id,
        )
        notifications.append(n)
        
        return notifications

    @staticmethod
    async def notify_fraud_detected(
        delivery_id: UUID,
        order_id: UUID,
        fraud_type: str,
        buyer_id: UUID,
        seller_id: UUID,
        provider_id: Optional[UUID] = None,
        details: Optional[dict] = None,
    ) -> List[dict]:
        """
        Send fraud alert notifications when photo verification fails.
        Notifies delivery provider, seller, buyer, and system admins.
        """
        notifications = []
        
        fraud_messages = {
            "pickup_photo_mismatch": "Product photo at pickup does not match listing. Possible wrong item.",
            "delivery_photo_mismatch": "Product photo at delivery does not match listing. Possible tampering.",
        }
        
        message = fraud_messages.get(fraud_type, f"Fraud detected: {fraud_type}")
        
        # Notify delivery provider (primary alert)
        if provider_id:
            n = await NotificationService.create_notification(
                user_id=provider_id,
                notification_type=NotificationType.FRAUD_DETECTED,
                title="⚠️ FRAUD ALERT: Photo Verification Failed",
                message=f"{message} Delivery process blocked. Please contact support.",
                order_id=order_id,
                data={
                    "delivery_id": str(delivery_id),
                    "fraud_type": fraud_type,
                    "severity": "high",
                    "action_required": "Contact support immediately",
                    **(details or {})
                }
            )
            notifications.append(n)
        
        # Notify seller
        n = await NotificationService.create_notification(
            user_id=seller_id,
            notification_type=NotificationType.FRAUD_DETECTED,
            title="⚠️ Delivery Alert: Photo Verification Issue",
            message=f"A photo verification issue was detected for your order. {message}",
            order_id=order_id,
            data={
                "delivery_id": str(delivery_id),
                "fraud_type": fraud_type,
                **(details or {})
            }
        )
        notifications.append(n)
        
        # Notify buyer
        n = await NotificationService.create_notification(
            user_id=buyer_id,
            notification_type=NotificationType.FRAUD_DETECTED,
            title="⚠️ Order Alert: Verification Issue",
            message=f"There was a verification issue with your order delivery. Our team is investigating.",
            order_id=order_id,
            data={
                "delivery_id": str(delivery_id),
                "fraud_type": fraud_type,
                **(details or {})
            }
        )
        notifications.append(n)
        
        logger.warning(f"FRAUD ALERT sent for delivery {delivery_id}: {fraud_type}")
        
        return notifications
    
    @staticmethod
    async def notify_photo_verified(
        delivery_id: UUID,
        order_id: UUID,
        verification_type: str,  # "pickup" or "delivery"
        provider_id: UUID,
        next_step: str,
    ) -> dict:
        """
        Send notification when photo verification succeeds.
        """
        title = f"✅ {verification_type.title()} Photo Verified"
        message = f"Product photo verified successfully. {next_step}"
        
        return await NotificationService.create_notification(
            user_id=provider_id,
            notification_type=NotificationType.PHOTO_VERIFIED,
            title=title,
            message=message,
            order_id=order_id,
            data={
                "delivery_id": str(delivery_id),
                "verification_type": verification_type,
                "next_step": next_step,
            }
        )
    
    @staticmethod
    async def notify_seller_pickup_pending(
        delivery_id: UUID,
        order_id: UUID,
        seller_id: UUID,
    ) -> dict:
        """
        Notify seller that pickup photo was verified and their confirmation is needed.
        """
        return await NotificationService.create_notification(
            user_id=seller_id,
            notification_type=NotificationType.PICKUP_CONFIRMED,
            title="📦 Pickup Confirmation Required",
            message="Delivery provider has picked up your product and photo verification passed. Please confirm the pickup.",
            order_id=order_id,
            data={
                "delivery_id": str(delivery_id),
                "action_required": "Confirm pickup in delivery management",
            }
        )

    @staticmethod
    async def notify_provider_pickup_confirmation_requested(
        delivery_id: UUID,
        order_id: UUID,
        provider_id: UUID,
        seller_name: str = "Seller",
    ) -> dict:
        """
        Notify delivery provider that seller has requested pickup confirmation.
        Provider needs to confirm they have picked up the item.
        """
        return await NotificationService.create_notification(
            user_id=provider_id,
            notification_type=NotificationType.PICKUP_CONFIRMED,
            title="📦 Pickup Confirmation Requested",
            message=f"{seller_name} has requested you to confirm the pickup. Please confirm that you have collected the item.",
            order_id=order_id,
            data={
                "delivery_id": str(delivery_id),
                "action_required": "Confirm pickup in your delivery assignments",
            }
        )

