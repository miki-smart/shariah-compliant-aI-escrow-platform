"""
Delivery Management API endpoints
For delivery service providers to manage order deliveries
"""
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.api.v1.auth import require_role
from app.models.user import User, UserRole
from app.models.delivery import Delivery, DeliveryStatus, DeliveryTrackingEvent, PhotoVerificationStatus
from app.models.order import Order, OrderStatus
from app.services.delivery_service import DeliveryService
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/delivery", tags=["Delivery"])


# ============ Schemas ============

class LocationUpdate(BaseModel):
    """Location data for tracking"""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    address: Optional[str] = None
    city: Optional[str] = None
    notes: Optional[str] = None


class DeliveryStatusUpdate(BaseModel):
    """Request to update delivery status"""
    status: str = Field(..., description="New status: assigned, picked_up, in_transit, out_for_delivery, delivered, failed")
    location: Optional[LocationUpdate] = None
    notes: Optional[str] = None
    proof_of_delivery: Optional[dict] = None
    signature_image: Optional[str] = None
    failure_reason: Optional[str] = None


class DeliveryAssignRequest(BaseModel):
    """Request to assign delivery to driver"""
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    vehicle_number: Optional[str] = None
    estimated_pickup: Optional[datetime] = None


class TrackingEventResponse(BaseModel):
    """Tracking event response"""
    id: UUID
    event_type: str
    description: str
    location: Optional[dict] = None
    timestamp: datetime
    
    class Config:
        from_attributes = True


class DeliveryResponse(BaseModel):
    """Delivery information response"""
    id: UUID
    order_id: UUID
    tracking_number: str
    status: str
    pickup_address: Optional[dict] = None
    delivery_address: Optional[dict] = None
    estimated_delivery: Optional[datetime] = None
    actual_delivery: Optional[datetime] = None
    picked_up_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    special_instructions: Optional[str] = None
    proof_of_delivery: Optional[dict] = None
    provider_id: Optional[UUID] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Related data
    order_number: Optional[str] = None
    buyer_name: Optional[str] = None
    seller_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class DeliveryListResponse(BaseModel):
    """List of deliveries"""
    deliveries: List[DeliveryResponse]
    total: int
    page: int
    page_size: int


# ============ Helper Functions ============

def to_delivery_response(delivery: Delivery, order: Optional[Order] = None) -> DeliveryResponse:
    """Convert Delivery model to response"""
    return DeliveryResponse(
        id=delivery.id,
        order_id=delivery.order_id,
        tracking_number=delivery.tracking_number,
        status=delivery.status.value if delivery.status else "unknown",
        pickup_address=delivery.pickup_address,
        delivery_address=delivery.delivery_address,
        estimated_delivery=delivery.estimated_delivery,
        actual_delivery=delivery.actual_delivery,
        picked_up_at=delivery.picked_up_at,
        delivered_at=delivery.delivered_at,
        special_instructions=delivery.special_instructions,
        proof_of_delivery=delivery.proof_of_delivery,
        provider_id=delivery.provider_id,
        created_at=delivery.created_at,
        updated_at=delivery.updated_at,
        order_number=order.order_number if order else None,
        buyer_name=order.buyer.full_name if order and order.buyer else None,
        seller_name=order.seller.company_name if order and order.seller else None,
    )


# ============ Delivery Provider Endpoints ============

@router.get(
    "/assigned",
    response_model=DeliveryListResponse,
    summary="Get assigned deliveries",
    description="Get all deliveries assigned to the current delivery provider"
)
async def get_assigned_deliveries(
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DELIVERY_PROVIDER, UserRole.ADMIN]))
):
    """Get deliveries assigned to the current delivery provider."""
    query = select(Delivery).options(
        selectinload(Delivery.order).selectinload(Order.buyer),
        selectinload(Delivery.order).selectinload(Order.seller),
    ).where(
        and_(
            Delivery.is_deleted == False,
            Delivery.provider_id == current_user.id
        )
    )
    
    # Apply status filter
    if status_filter:
        try:
            status_enum = DeliveryStatus(status_filter)
            query = query.where(Delivery.status == status_enum)
        except ValueError:
            pass
    
    # Order by created_at desc
    query = query.order_by(Delivery.created_at.desc())
    
    # Get total count
    count_result = await db.execute(
        select(Delivery.id).where(
            and_(
                Delivery.is_deleted == False,
                Delivery.provider_id == current_user.id
            )
        )
    )
    total = len(count_result.all())
    
    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    result = await db.execute(query)
    deliveries = result.scalars().all()
    
    return DeliveryListResponse(
        deliveries=[to_delivery_response(d, d.order) for d in deliveries],
        total=total,
        page=page,
        page_size=page_size
    )


@router.get(
    "/pending-pickup",
    response_model=List[DeliveryResponse],
    summary="Get pending pickups",
    description="Get deliveries pending pickup"
)
async def get_pending_pickups(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DELIVERY_PROVIDER, UserRole.ADMIN]))
):
    """Get deliveries that are pending pickup."""
    result = await db.execute(
        select(Delivery).options(
            selectinload(Delivery.order).selectinload(Order.buyer),
            selectinload(Delivery.order).selectinload(Order.seller),
        ).where(
            and_(
                Delivery.is_deleted == False,
                Delivery.provider_id == current_user.id,
                Delivery.status.in_([DeliveryStatus.PENDING, DeliveryStatus.ASSIGNED])
            )
        ).order_by(Delivery.created_at.asc())
    )
    deliveries = result.scalars().all()
    
    return [to_delivery_response(d, d.order) for d in deliveries]


@router.get(
    "/in-transit",
    response_model=List[DeliveryResponse],
    summary="Get in-transit deliveries",
    description="Get deliveries currently in transit"
)
async def get_in_transit_deliveries(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DELIVERY_PROVIDER, UserRole.ADMIN]))
):
    """Get deliveries that are in transit."""
    result = await db.execute(
        select(Delivery).options(
            selectinload(Delivery.order).selectinload(Order.buyer),
            selectinload(Delivery.order).selectinload(Order.seller),
        ).where(
            and_(
                Delivery.is_deleted == False,
                Delivery.provider_id == current_user.id,
                Delivery.status.in_([
                    DeliveryStatus.PICKED_UP,
                    DeliveryStatus.IN_TRANSIT,
                    DeliveryStatus.OUT_FOR_DELIVERY
                ])
            )
        ).order_by(Delivery.estimated_delivery.asc())
    )
    deliveries = result.scalars().all()
    
    return [to_delivery_response(d, d.order) for d in deliveries]


@router.get(
    "/{delivery_id}",
    response_model=DeliveryResponse,
    summary="Get delivery details",
    description="Get details of a specific delivery"
)
async def get_delivery(
    delivery_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get delivery details."""
    result = await db.execute(
        select(Delivery).options(
            selectinload(Delivery.order).selectinload(Order.buyer),
            selectinload(Delivery.order).selectinload(Order.seller),
            selectinload(Delivery.tracking_events),
        ).where(
            and_(Delivery.id == delivery_id, Delivery.is_deleted == False)
        )
    )
    delivery = result.scalar_one_or_none()
    
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery not found"
        )
    
    # Check access
    if current_user.role not in [UserRole.ADMIN, UserRole.BANK]:
        if delivery.provider_id != current_user.id:
            if delivery.order:
                if delivery.order.buyer_id != current_user.id and delivery.order.seller_id != current_user.id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="You don't have access to this delivery"
                    )
    
    return to_delivery_response(delivery, delivery.order)


@router.get(
    "/{delivery_id}/tracking",
    response_model=List[TrackingEventResponse],
    summary="Get tracking events",
    description="Get tracking history for a delivery"
)
async def get_tracking_events(
    delivery_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get tracking events for a delivery."""
    # Verify delivery exists and user has access
    delivery_result = await db.execute(
        select(Delivery).where(
            and_(Delivery.id == delivery_id, Delivery.is_deleted == False)
        )
    )
    delivery = delivery_result.scalar_one_or_none()
    
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery not found"
        )
    
    # Get tracking events
    result = await db.execute(
        select(DeliveryTrackingEvent).where(
            DeliveryTrackingEvent.delivery_id == delivery_id
        ).order_by(DeliveryTrackingEvent.timestamp.desc())
    )
    events = result.scalars().all()
    
    return [
        TrackingEventResponse(
            id=e.id,
            event_type=e.event_type.value if e.event_type else "unknown",
            description=e.description,
            location=e.location,
            timestamp=e.timestamp
        )
        for e in events
    ]


@router.post(
    "/{delivery_id}/status",
    response_model=DeliveryResponse,
    summary="Update delivery status",
    description="Update the status of a delivery"
)
async def update_delivery_status(
    delivery_id: UUID,
    request: DeliveryStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DELIVERY_PROVIDER, UserRole.ADMIN]))
):
    """Update delivery status (for delivery providers)."""
    service = DeliveryService(db)
    
    delivery = await service.get_by_id(delivery_id)
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery not found"
        )
    
    # Check ownership
    if current_user.role != UserRole.ADMIN and delivery.provider_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this delivery"
        )
    
    location_dict = None
    if request.location:
        location_dict = request.location.dict(exclude_none=True)
    
    # Handle status updates
    status_action = request.status.lower()
    success = False
    message = ""
    
    if status_action == "assigned":
        success, message = await service.assign_for_pickup(
            delivery_id,
            driver_info={"updated_by": str(current_user.id)}
        )
    elif status_action == "picked_up":
        success, message = await service.start_pickup(delivery_id, location_dict)
    elif status_action == "in_transit":
        success, message = await service.start_transit(delivery_id, location_dict)
    elif status_action == "out_for_delivery":
        success, message = await service.mark_out_for_delivery(delivery_id, location_dict)
    elif status_action == "delivered":
        success, message = await service.mark_delivered(
            delivery_id,
            proof_of_delivery=request.proof_of_delivery,
            location=location_dict,
            signature_image=request.signature_image
        )
    elif status_action == "failed":
        success, message = await service.mark_failed(
            delivery_id,
            reason=request.failure_reason or "Delivery failed",
            location=location_dict
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {request.status}"
        )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    # Refresh delivery
    await db.refresh(delivery)
    
    # Get order for response
    order_result = await db.execute(
        select(Order).options(
            selectinload(Order.buyer),
            selectinload(Order.seller),
        ).where(Order.id == delivery.order_id)
    )
    order = order_result.scalar_one_or_none()
    
    logger.info(f"Delivery {delivery_id} status updated to {request.status} by {current_user.email}")
    
    return to_delivery_response(delivery, order)


@router.post(
    "/{delivery_id}/location",
    response_model=dict,
    summary="Update location",
    description="Add a location update for tracking"
)
async def add_location_update(
    delivery_id: UUID,
    request: LocationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DELIVERY_PROVIDER, UserRole.ADMIN]))
):
    """Add a location update for the delivery."""
    service = DeliveryService(db)
    
    delivery = await service.get_by_id(delivery_id)
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery not found"
        )
    
    # Check ownership
    if current_user.role != UserRole.ADMIN and delivery.provider_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this delivery"
        )
    
    location_dict = request.dict(exclude_none=True)
    
    success, message = await service.add_location_update(
        delivery_id,
        location=location_dict,
        description=request.notes or "Location update"
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    return {"success": True, "message": "Location updated"}


@router.post(
    "/{delivery_id}/confirm",
    response_model=DeliveryResponse,
    summary="Confirm delivery",
    description="Delivery provider confirms successful delivery"
)
async def confirm_delivery_provider(
    delivery_id: UUID,
    notes: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DELIVERY_PROVIDER, UserRole.ADMIN]))
):
    """Delivery provider confirms the delivery."""
    from app.models.delivery import ConfirmedBy
    
    service = DeliveryService(db)
    
    delivery = await service.get_by_id(delivery_id)
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery not found"
        )
    
    success, message = await service.confirm_delivery(
        delivery_id,
        confirmed_by=ConfirmedBy.PROVIDER,
        confirmer_id=current_user.id,
        notes=notes or "Confirmed by delivery provider"
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    await db.refresh(delivery)
    
    # Get order
    order_result = await db.execute(
        select(Order).options(
            selectinload(Order.buyer),
            selectinload(Order.seller),
        ).where(Order.id == delivery.order_id)
    )
    order = order_result.scalar_one_or_none()
    
    return to_delivery_response(delivery, order)


# ============ Track by Tracking Number (Public) ============

@router.get(
    "/track/{tracking_number}",
    response_model=dict,
    summary="Track delivery",
    description="Track delivery by tracking number (public endpoint)"
)
async def track_delivery(
    tracking_number: str,
    db: AsyncSession = Depends(get_db)
):
    """Public endpoint to track delivery by tracking number."""
    service = DeliveryService(db)
    
    delivery = await service.get_by_tracking_number(tracking_number)
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery not found"
        )
    
    # Get tracking events
    events = await service.get_tracking_events(delivery.id)
    
    return {
        "tracking_number": delivery.tracking_number,
        "status": delivery.status.value if delivery.status else "unknown",
        "estimated_delivery": delivery.estimated_delivery,
        "actual_delivery": delivery.actual_delivery,
        "events": [
            {
                "event_type": e.event_type.value if e.event_type else "unknown",
                "description": e.description,
                "timestamp": e.timestamp,
                "location": e.location
            }
            for e in events
        ]
    }


# ============ Stats Endpoint ============

@router.get(
    "/stats",
    response_model=dict,
    summary="Get delivery stats",
    description="Get delivery statistics for the provider"
)
async def get_delivery_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DELIVERY_PROVIDER, UserRole.ADMIN]))
):
    """Get delivery statistics."""
    # Base query for current provider
    base_condition = and_(
        Delivery.is_deleted == False,
        Delivery.provider_id == current_user.id
    ) if current_user.role != UserRole.ADMIN else Delivery.is_deleted == False
    
    # Get counts by status
    stats = {}
    for status_val in DeliveryStatus:
        result = await db.execute(
            select(Delivery.id).where(
                and_(base_condition, Delivery.status == status_val)
            )
        )
        stats[status_val.value] = len(result.all())
    
    # Total
    total_result = await db.execute(
        select(Delivery.id).where(base_condition)
    )
    stats["total"] = len(total_result.all())
    
    # Calculate summary
    stats["pending_pickup"] = stats.get("pending", 0) + stats.get("assigned", 0)
    stats["active"] = stats.get("picked_up", 0) + stats.get("in_transit", 0) + stats.get("out_for_delivery", 0)
    stats["completed"] = stats.get("delivered", 0) + stats.get("confirmed", 0)
    
    return stats


# ============ Photo Verification Schemas ============

class PhotoUploadRequest(BaseModel):
    """Request to upload verification photo"""
    photo_base64: str = Field(..., description="Base64 encoded photo")
    photo_type: str = Field(..., description="Type: 'pickup' or 'delivery'")
    notes: Optional[str] = None
    location: Optional[LocationUpdate] = None


class PhotoVerificationResponse(BaseModel):
    """Response from photo verification"""
    success: bool
    is_match: bool
    similarity_score: float  # 0 or 1
    message: str
    verification_type: str
    fraud_detected: bool = False
    next_step: Optional[str] = None
    details: Optional[dict] = None


class SellerConfirmPickupRequest(BaseModel):
    """Seller confirms pickup after photo verification"""
    notes: Optional[str] = None


class EscrowReleaseCheckResponse(BaseModel):
    """Response for escrow release eligibility check"""
    can_release: bool
    reason: str
    verification_status: dict


# ============ Photo Verification Endpoints ============

@router.post(
    "/{delivery_id}/verify-photo",
    response_model=PhotoVerificationResponse,
    summary="Upload and verify pickup photo (Provider)",
    description="Delivery provider uploads photo at pickup for AI similarity check"
)
async def verify_pickup_photo_endpoint(
    delivery_id: UUID,
    request: PhotoUploadRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DELIVERY_PROVIDER, UserRole.ADMIN]))
):
    """
    Verify photo similarity for PICKUP (Seller → Provider).
    
    Flow:
    1. Provider uploads photo when picking up from seller
    2. AI compares photo with product listing image
    3. Returns similarity score (1=match, 0=no match)
    4. If no match, flags as fraud and blocks process
    """
    from app.services.similarity_service import SimilarityService
    import base64
    
    # Validate photo type - this endpoint only handles pickup
    if request.photo_type != "pickup":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This endpoint is for pickup photos only. Use /verify-delivery-photo for delivery."
        )
    
    # Get delivery
    result = await db.execute(
        select(Delivery).where(
            and_(Delivery.id == delivery_id, Delivery.is_deleted == False)
        )
    )
    delivery = result.scalar_one_or_none()
    
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery not found"
        )
    
    # Decode base64 photo
    try:
        photo_data = base64.b64decode(request.photo_base64)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid base64 image: {str(e)}"
        )
    
    # Pickup from seller - check if already verified
    if delivery.pickup_photo_verified:
        return PhotoVerificationResponse(
            success=True,
            is_match=True,
            similarity_score=1.0,
            message="Pickup photo already verified",
            verification_type="pickup",
            fraud_detected=False,
            next_step="Wait for seller to request confirmation"
        )
    
    # Check if max attempts reached
    if delivery.pickup_photo_attempts >= delivery.max_photo_attempts:
        return PhotoVerificationResponse(
            success=False,
            is_match=False,
            similarity_score=0.0,
            message=f"Maximum verification attempts ({delivery.max_photo_attempts}) reached. Order will be cancelled.",
            verification_type="pickup",
            fraud_detected=True,
            next_step="Order cancelled due to verification failures.",
            details={"attempts": delivery.pickup_photo_attempts, "max_attempts": delivery.max_photo_attempts}
        )
    
    is_match, check_result = await SimilarityService.verify_pickup_photo(
        db, delivery_id, photo_data, current_user.id
    )
    
    # Generate a mock photo URL (in production, upload to S3/cloud storage)
    photo_url = f"https://storage.example.com/pickups/{delivery_id}_{check_result.uploaded_image_hash}.jpg"
    
    # Update delivery with verification result
    delivery.record_pickup_photo_verification(
        photo_url=photo_url,
        photo_hash=check_result.uploaded_image_hash,
        similarity_score=check_result.similarity_score,
        is_verified=is_match
    )
    await db.commit()
    
    # Reload to get updated attempts count
    await db.refresh(delivery)
    attempts_remaining = delivery.pickup_attempts_remaining
    
    # Send notifications
    from app.services.notification_service import NotificationService
    
    if is_match:
        # Notify provider of success and seller that confirmation request is available
        await NotificationService.notify_photo_verified(
            delivery_id=delivery_id,
            order_id=delivery.order_id,
            verification_type="pickup",
            provider_id=current_user.id,
            next_step="Seller will request pickup confirmation"
        )
        await NotificationService.notify_seller_pickup_pending(
            delivery_id=delivery_id,
            order_id=delivery.order_id,
            seller_id=delivery.order.seller_id if delivery.order else current_user.id
        )
        
        return PhotoVerificationResponse(
            success=True,
            is_match=True,
            similarity_score=1.0,
            message="Product photo matches listing. Waiting for seller to request confirmation.",
            verification_type="pickup",
            fraud_detected=False,
            next_step="Seller must request pickup confirmation",
            details=check_result.to_dict()
        )
    else:
        # Failed verification - check if more attempts available
        if attempts_remaining > 0:
            return PhotoVerificationResponse(
                success=False,
                is_match=False,
                similarity_score=0.0,
                message=f"Photo does not match. {attempts_remaining} attempt(s) remaining.",
                verification_type="pickup",
                fraud_detected=False,
                next_step=f"Please try again. {attempts_remaining} attempt(s) left.",
                details={
                    **check_result.to_dict(),
                    "attempts_used": delivery.pickup_photo_attempts,
                    "attempts_remaining": attempts_remaining
                }
            )
        else:
            # Max attempts reached - flag as fraud
            # Get order for notification
            order_result = await db.execute(
                select(Order).where(Order.id == delivery.order_id)
            )
            order = order_result.scalar_one_or_none()
            
            # Send fraud alert to all parties
            if order:
                await NotificationService.notify_fraud_detected(
                    delivery_id=delivery_id,
                    order_id=delivery.order_id,
                    fraud_type="pickup_photo_mismatch_max_attempts",
                    buyer_id=order.buyer_id,
                    seller_id=order.seller_id,
                    provider_id=current_user.id,
                    details={**check_result.to_dict(), "max_attempts_reached": True}
                )
            
            return PhotoVerificationResponse(
                success=False,
                is_match=False,
                similarity_score=0.0,
                message="FRAUD ALERT: Maximum verification attempts reached. Order will be cancelled.",
                verification_type="pickup",
                fraud_detected=True,
                next_step="Order cancelled. Contact support.",
                details={**check_result.to_dict(), "max_attempts_reached": True}
            )


@router.post(
    "/{delivery_id}/verify-delivery-photo",
    response_model=PhotoVerificationResponse,
    summary="Buyer uploads delivery verification photo",
    description="Buyer takes photo when receiving product for AI similarity verification"
)
async def verify_delivery_photo_by_buyer(
    delivery_id: UUID,
    request: PhotoUploadRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.BUYER, UserRole.ADMIN]))
):
    """
    Verify photo similarity for DELIVERY (Provider → Buyer).
    
    Flow:
    1. Buyer takes photo when receiving product from delivery provider
    2. AI compares photo with product listing image
    3. Returns similarity score (1=match, 0=no match)
    4. If no match, flags as fraud and blocks process
    
    Prerequisites:
    - Pickup photo must be verified
    - Seller must have confirmed pickup
    """
    from app.services.similarity_service import SimilarityService
    import base64
    
    # Get delivery with order
    result = await db.execute(
        select(Delivery).where(
            and_(Delivery.id == delivery_id, Delivery.is_deleted == False)
        )
    )
    delivery = result.scalar_one_or_none()
    
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery not found"
        )
    
    # Get order to verify buyer
    order_result = await db.execute(
        select(Order).where(Order.id == delivery.order_id)
    )
    order = order_result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Verify current user is the buyer (or admin)
    if current_user.role != UserRole.ADMIN and str(order.buyer_id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the buyer of this order can upload delivery verification photo"
        )
    
    # Decode base64 photo
    try:
        photo_data = base64.b64decode(request.photo_base64)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid base64 image: {str(e)}"
        )
    
    # Check prerequisites
    if not delivery.pickup_photo_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pickup photo must be verified first"
        )
    
    if not delivery.provider_confirmed_pickup:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Delivery provider must confirm pickup first"
        )
    
    if delivery.delivery_photo_verified:
        return PhotoVerificationResponse(
            success=True,
            is_match=True,
            similarity_score=1.0,
            message="Delivery photo already verified",
            verification_type="delivery",
            fraud_detected=False,
            next_step="Complete delivery confirmation"
        )
    
    # Check if max attempts reached
    if delivery.delivery_photo_attempts >= delivery.max_photo_attempts:
        return PhotoVerificationResponse(
            success=False,
            is_match=False,
            similarity_score=0.0,
            message=f"Maximum verification attempts ({delivery.max_photo_attempts}) reached. Order will be cancelled.",
            verification_type="delivery",
            fraud_detected=True,
            next_step="Order cancelled due to verification failures.",
            details={"attempts": delivery.delivery_photo_attempts, "max_attempts": delivery.max_photo_attempts}
        )
    
    is_match, check_result = await SimilarityService.verify_delivery_photo(
        db, delivery_id, photo_data, current_user.id
    )
    
    # Generate a mock photo URL
    photo_url = f"https://storage.example.com/deliveries/{delivery_id}_{check_result.uploaded_image_hash}.jpg"
    
    # Update delivery with verification result
    delivery.record_delivery_photo_verification(
        photo_url=photo_url,
        photo_hash=check_result.uploaded_image_hash,
        similarity_score=check_result.similarity_score,
        is_verified=is_match
    )
    await db.commit()
    
    # Reload to get updated attempts count
    await db.refresh(delivery)
    attempts_remaining = delivery.delivery_attempts_remaining
    
    # Send notifications
    from app.services.notification_service import NotificationService
    
    if is_match:
        # Notify buyer of success
        await NotificationService.notify_photo_verified(
            delivery_id=delivery_id,
            order_id=delivery.order_id,
            verification_type="delivery",
            provider_id=current_user.id,  # Using buyer_id here
            next_step="Complete delivery confirmation"
        )
        
        return PhotoVerificationResponse(
            success=True,
            is_match=True,
            similarity_score=1.0,
            message="Delivery photo verified! Product matches listing. Please confirm receipt.",
            verification_type="delivery",
            fraud_detected=False,
            next_step="Confirm delivery receipt",
            details=check_result.to_dict()
        )
    else:
        # Failed verification - check if more attempts available
        if attempts_remaining > 0:
            return PhotoVerificationResponse(
                success=False,
                is_match=False,
                similarity_score=0.0,
                message=f"Photo does not match. {attempts_remaining} attempt(s) remaining.",
                verification_type="delivery",
                fraud_detected=False,
                next_step=f"Please try again. {attempts_remaining} attempt(s) left.",
                details={
                    **check_result.to_dict(),
                    "attempts_used": delivery.delivery_photo_attempts,
                    "attempts_remaining": attempts_remaining
                }
            )
        else:
            # Max attempts reached - flag as fraud
            await NotificationService.notify_fraud_detected(
                delivery_id=delivery_id,
                order_id=delivery.order_id,
                fraud_type="delivery_photo_mismatch_max_attempts",
                buyer_id=order.buyer_id,
                seller_id=order.seller_id,
                provider_id=delivery.provider_id,
                details={**check_result.to_dict(), "max_attempts_reached": True}
            )
            
            return PhotoVerificationResponse(
                success=False,
                is_match=False,
                similarity_score=0.0,
                message="FRAUD ALERT: Maximum verification attempts reached. Order will be cancelled.",
                verification_type="delivery",
                fraud_detected=True,
                next_step="Order cancelled. Contact support.",
                details={**check_result.to_dict(), "max_attempts_reached": True}
            )


@router.post(
    "/{delivery_id}/seller-confirm-pickup",
    response_model=dict,
    summary="Seller requests pickup confirmation from provider",
    description="Seller requests delivery provider to confirm they have picked up the correct product"
)
async def seller_request_pickup_confirmation(
    delivery_id: UUID,
    request: SellerConfirmPickupRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.SELLER, UserRole.ADMIN]))
):
    """
    Seller requests pickup confirmation after photo verification passes.
    This is step 2 of the pickup process:
    1. Provider takes photo → AI verifies (score=1)
    2. Seller requests pickup confirmation (this endpoint)
    3. Provider confirms pickup
    4. Provider can then proceed with delivery
    """
    # Get delivery with order
    result = await db.execute(
        select(Delivery).options(
            selectinload(Delivery.order)
        ).where(
            and_(Delivery.id == delivery_id, Delivery.is_deleted == False)
        )
    )
    delivery = result.scalar_one_or_none()
    
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery not found"
        )
    
    # Verify seller owns this order
    if delivery.order and delivery.order.seller_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not the seller for this order"
        )
    
    # Check if pickup photo was verified
    if not delivery.pickup_photo_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pickup photo must be verified before seller can request confirmation"
        )
    
    # Check if already requested
    if delivery.seller_requested_pickup_confirmation:
        return {
            "success": True,
            "message": "Pickup confirmation already requested",
            "requested_at": delivery.seller_requested_pickup_at.isoformat() if delivery.seller_requested_pickup_at else None,
            "provider_confirmed": delivery.provider_confirmed_pickup
        }
    
    # Request confirmation
    delivery.request_pickup_confirmation_from_provider()
    
    await db.commit()
    
    # Notify provider
    from app.services.notification_service import NotificationService
    await NotificationService.notify_provider_pickup_confirmation_requested(
        delivery_id=delivery_id,
        order_id=delivery.order_id,
        provider_id=delivery.provider_id
    )
    
    logger.info(f"Seller {current_user.id} requested pickup confirmation for delivery {delivery_id}")
    
    return {
        "success": True,
        "message": "Pickup confirmation requested. Waiting for provider to confirm.",
        "requested_at": delivery.seller_requested_pickup_at.isoformat(),
        "next_step": "Delivery provider must confirm pickup"
    }


@router.post(
    "/{delivery_id}/provider-confirm-pickup",
    response_model=dict,
    summary="Provider confirms product pickup",
    description="Delivery provider confirms pickup after seller request"
)
async def provider_confirm_pickup(
    delivery_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DELIVERY_PROVIDER, UserRole.ADMIN]))
):
    """
    Delivery provider confirms pickup after seller requests.
    This is step 3 of the pickup process:
    1. Provider takes photo → AI verifies (score=1)
    2. Seller requests pickup confirmation
    3. Provider confirms pickup (this endpoint)
    4. Provider can then proceed with delivery
    """
    # Get delivery
    result = await db.execute(
        select(Delivery).where(
            and_(Delivery.id == delivery_id, Delivery.is_deleted == False)
        )
    )
    delivery = result.scalar_one_or_none()
    
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery not found"
        )
    
    # Verify provider is assigned to this delivery
    if delivery.provider_id and str(delivery.provider_id) != str(current_user.id) and current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not the provider for this delivery"
        )
    
    # Check if seller requested confirmation
    if not delivery.seller_requested_pickup_confirmation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Seller must request pickup confirmation first"
        )
    
    # Check if already confirmed
    if delivery.provider_confirmed_pickup:
        return {
            "success": True,
            "message": "Pickup already confirmed by provider",
            "confirmed_at": delivery.provider_confirmed_pickup_at.isoformat() if delivery.provider_confirmed_pickup_at else None
        }
    
    # Confirm pickup
    delivery.confirm_pickup_by_provider()
    
    # Update status to picked_up
    delivery.status = DeliveryStatus.PICKED_UP
    delivery.actual_pickup_date = datetime.now(timezone.utc)
    
    # Add tracking event
    tracking_event = DeliveryTrackingEvent(
        delivery_id=delivery.id,
        event_type="picked_up",
        event_status="completed",
        event_description="Product picked up from seller - verified and confirmed by provider",
        event_timestamp=datetime.now(timezone.utc),
        source="provider"
    )
    db.add(tracking_event)
    
    await db.commit()
    
    logger.info(f"Provider {current_user.id} confirmed pickup for delivery {delivery_id}")
    
    return {
        "success": True,
        "message": "Pickup confirmed. You can now proceed with delivery.",
        "confirmed_at": delivery.provider_confirmed_pickup_at.isoformat(),
        "next_step": "Deliver to buyer. Buyer will take delivery photo for verification."
    }


@router.get(
    "/{delivery_id}/verification-status",
    response_model=dict,
    summary="Get photo verification status",
    description="Check the status of all photo verifications for a delivery"
)
async def get_verification_status(
    delivery_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current verification status for a delivery."""
    result = await db.execute(
        select(Delivery).where(
            and_(Delivery.id == delivery_id, Delivery.is_deleted == False)
        )
    )
    delivery = result.scalar_one_or_none()
    
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery not found"
        )
    
    return {
        "delivery_id": str(delivery.id),
        "photo_verification_status": delivery.photo_verification_status.value if delivery.photo_verification_status else "pending",
        "pickup": {
            "photo_uploaded": delivery.pickup_photo_url is not None,
            "photo_verified": delivery.pickup_photo_verified,
            "similarity_score": delivery.pickup_similarity_score,
            "verified_at": delivery.pickup_verified_at.isoformat() if delivery.pickup_verified_at else None,
            "attempts_used": delivery.pickup_photo_attempts,
            "attempts_remaining": delivery.pickup_attempts_remaining,
            "max_attempts": delivery.max_photo_attempts,
            "seller_requested_confirmation": delivery.seller_requested_pickup_confirmation,
            "seller_requested_at": delivery.seller_requested_pickup_at.isoformat() if delivery.seller_requested_pickup_at else None,
            "provider_confirmed": delivery.provider_confirmed_pickup,
            "provider_confirmed_at": delivery.provider_confirmed_pickup_at.isoformat() if delivery.provider_confirmed_pickup_at else None
        },
        "delivery": {
            "photo_uploaded": delivery.delivery_photo_url is not None,
            "photo_verified": delivery.delivery_photo_verified,
            "similarity_score": delivery.delivery_similarity_score,
            "verified_at": delivery.delivery_verified_at.isoformat() if delivery.delivery_verified_at else None,
            "attempts_used": delivery.delivery_photo_attempts,
            "attempts_remaining": delivery.delivery_attempts_remaining,
            "max_attempts": delivery.max_photo_attempts,
            "buyer_confirmed": delivery.buyer_confirmed,
            "buyer_confirmed_at": delivery.buyer_confirmed_at.isoformat() if delivery.buyer_confirmed_at else None,
            "provider_confirmed": delivery.provider_confirmed,
            "provider_confirmed_at": delivery.provider_confirmed_at.isoformat() if delivery.provider_confirmed_at else None
        },
        "fraud_detected": delivery.fraud_detected,
        "fraud_type": delivery.fraud_type,
        "can_release_escrow": delivery.can_release_escrow,
        "escrow_release_requirements": {
            "pickup_photo_verified": delivery.pickup_photo_verified,
            "delivery_photo_verified": delivery.delivery_photo_verified,
            "provider_confirmed_pickup": delivery.provider_confirmed_pickup,
            "buyer_confirmed_delivery": delivery.buyer_confirmed,
            "provider_confirmed_delivery": delivery.provider_confirmed,
            "no_fraud_detected": not delivery.fraud_detected
        }
    }


@router.post(
    "/{delivery_id}/complete-delivery",
    response_model=dict,
    summary="Complete delivery with all verifications",
    description="Final step: Provider confirms delivery after photo verification and buyer confirms receipt"
)
async def complete_delivery_with_verification(
    delivery_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.DELIVERY_PROVIDER, UserRole.ADMIN]))
):
    """
    Complete delivery after all verifications are done.
    Triggers escrow release if all conditions are met.
    """
    from app.services.escrow_service import EscrowService
    
    # Get delivery
    result = await db.execute(
        select(Delivery).options(
            selectinload(Delivery.order)
        ).where(
            and_(Delivery.id == delivery_id, Delivery.is_deleted == False)
        )
    )
    delivery = result.scalar_one_or_none()
    
    if not delivery:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery not found"
        )
    
    # Check all verification requirements
    if not delivery.pickup_photo_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pickup photo not verified"
        )
    
    if not delivery.seller_confirmed_pickup:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Seller has not confirmed pickup"
        )
    
    if not delivery.delivery_photo_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Delivery photo not verified"
        )
    
    if not delivery.buyer_confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Buyer has not confirmed delivery"
        )
    
    if delivery.fraud_detected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot complete: Fraud detected ({delivery.fraud_type})"
        )
    
    # Mark provider confirmation
    if not delivery.provider_confirmed:
        delivery.confirm_by_provider(
            reference=f"COMPLETE-{delivery_id}",
            data={"completed_by": str(current_user.id)}
        )
    
    # Update delivery status
    delivery.status = DeliveryStatus.DELIVERED
    delivery.actual_delivery_date = datetime.now(timezone.utc)
    
    # Add tracking event
    tracking_event = DeliveryTrackingEvent(
        delivery_id=delivery.id,
        event_type="delivered",
        event_status="completed",
        event_description="Delivery completed - all verifications passed",
        event_timestamp=datetime.now(timezone.utc),
        source="provider"
    )
    db.add(tracking_event)
    
    await db.commit()
    
    # Check if escrow can be released
    can_release = delivery.can_release_escrow
    escrow_message = ""
    
    if can_release and delivery.order:
        try:
            # Trigger escrow release
            escrow_released = await EscrowService.release_funds_async(
                db, delivery.order_id, reason="All delivery verifications completed"
            )
            escrow_message = "Escrow funds released to seller"
            
            # Update order status
            delivery.order.status = OrderStatus.SETTLED
            await db.commit()
            
            logger.info(f"Escrow released for delivery {delivery_id}")
        except Exception as e:
            logger.error(f"Failed to release escrow for delivery {delivery_id}: {e}")
            escrow_message = f"Delivery complete but escrow release pending: {str(e)}"
    else:
        escrow_message = "Delivery complete. Escrow release pending additional requirements."
    
    return {
        "success": True,
        "message": "Delivery completed successfully",
        "delivery_id": str(delivery_id),
        "status": delivery.status.value,
        "escrow_status": escrow_message,
        "can_release_escrow": can_release,
        "verification_summary": {
            "pickup_verified": delivery.pickup_photo_verified,
            "seller_confirmed": delivery.seller_confirmed_pickup,
            "delivery_verified": delivery.delivery_photo_verified,
            "buyer_confirmed": delivery.buyer_confirmed,
            "provider_confirmed": delivery.provider_confirmed
        }
    }

