"""
Notifications API Routes
Endpoints for user notifications
"""
from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.core.logging import get_logger
from app.models.user import User
from app.services.notification_service import NotificationService, NotificationType

logger = get_logger(__name__)
router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("")
async def get_my_notifications(
    unread_only: bool = Query(False, description="Only return unread notifications"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get notifications for the current user.
    """
    notifications = await NotificationService.get_user_notifications(
        user_id=current_user.id,
        unread_only=unread_only,
        skip=skip,
        limit=limit,
    )
    
    unread_count = await NotificationService.get_unread_count(current_user.id)
    
    return {
        "notifications": notifications,
        "unread_count": unread_count,
        "total": len(notifications),
    }


@router.get("/unread-count")
async def get_unread_count(
    current_user: User = Depends(get_current_active_user),
):
    """
    Get count of unread notifications.
    """
    count = await NotificationService.get_unread_count(current_user.id)
    return {"unread_count": count}


@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Mark a notification as read.
    """
    success = await NotificationService.mark_as_read(
        user_id=current_user.id,
        notification_id=notification_id,
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    return {"success": True, "message": "Notification marked as read"}


@router.post("/read-all")
async def mark_all_read(
    current_user: User = Depends(get_current_active_user),
):
    """
    Mark all notifications as read.
    """
    count = await NotificationService.mark_all_as_read(current_user.id)
    return {"success": True, "marked_count": count}


@router.get("/types")
async def get_notification_types():
    """
    Get list of notification types.
    """
    return {
        "types": [t.value for t in NotificationType]
    }
