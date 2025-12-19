"""
Audit API Routes
Endpoints for viewing audit logs and compliance reports
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from uuid import UUID
from typing import Optional, List
from datetime import datetime, timedelta, timezone

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models.user import User, UserRole
from app.models.audit import AuditLog, AuditAction, EntityType, ActorType
from app.models.order import Order
from app.schemas.audit import (
    AuditLogResponse,
    AuditLogListResponse,
    AuditLogSummary,
    OrderAuditTrail,
    AuditActionEnum,
    EntityTypeEnum,
    ActorTypeEnum
)


router = APIRouter(prefix="/audit", tags=["Audit"])


def audit_log_to_response(log: AuditLog) -> AuditLogResponse:
    """Convert AuditLog model to response schema"""
    return AuditLogResponse(
        id=log.id,
        action=AuditActionEnum(log.action.value),
        entity_type=EntityTypeEnum(log.entity_type.value),
        entity_id=log.entity_id,
        actor_type=ActorTypeEnum(log.actor_type.value),
        actor_id=log.actor_id,
        actor_name=log.actor_name,
        old_values=log.old_values,
        new_values=log.new_values,
        changes=log.changes,
        description=log.description,
        reason=log.reason,
        correlation_id=log.correlation_id,
        success=log.success,
        error_message=log.error_message,
        ip_address=str(log.ip_address) if log.ip_address else None,
        created_at=log.created_at,
    )


@router.get(
    "/logs",
    response_model=AuditLogListResponse,
    summary="Get audit logs",
    description="Get paginated audit logs with optional filters"
)
async def get_audit_logs(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    entity_type: Optional[EntityTypeEnum] = Query(None, description="Filter by entity type"),
    entity_id: Optional[UUID] = Query(None, description="Filter by entity ID"),
    action: Optional[AuditActionEnum] = Query(None, description="Filter by action"),
    actor_type: Optional[ActorTypeEnum] = Query(None, description="Filter by actor type"),
    actor_id: Optional[UUID] = Query(None, description="Filter by actor ID"),
    success: Optional[bool] = Query(None, description="Filter by success status"),
    start_date: Optional[datetime] = Query(None, description="Filter from date"),
    end_date: Optional[datetime] = Query(None, description="Filter to date"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.BANK)),
):
    """
    Get paginated audit logs.
    
    Accessible by: Bank or Admin only
    """
    # Build query
    query = select(AuditLog)
    
    # Apply filters
    if entity_type:
        query = query.where(AuditLog.entity_type == EntityType(entity_type.value))
    if entity_id:
        query = query.where(AuditLog.entity_id == entity_id)
    if action:
        query = query.where(AuditLog.action == AuditAction(action.value))
    if actor_type:
        query = query.where(AuditLog.actor_type == ActorType(actor_type.value))
    if actor_id:
        query = query.where(AuditLog.actor_id == actor_id)
    if success is not None:
        query = query.where(AuditLog.success == success)
    if start_date:
        query = query.where(AuditLog.created_at >= start_date)
    if end_date:
        query = query.where(AuditLog.created_at <= end_date)
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Get paginated results
    offset = (page - 1) * page_size
    query = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(page_size)
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    total_pages = (total + page_size - 1) // page_size
    
    return AuditLogListResponse(
        logs=[audit_log_to_response(log) for log in logs],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/logs/{log_id}",
    response_model=AuditLogResponse,
    summary="Get audit log detail",
    description="Get a specific audit log entry"
)
async def get_audit_log(
    log_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.BANK)),
):
    """
    Get a specific audit log entry by ID.
    
    Accessible by: Bank or Admin only
    """
    stmt = select(AuditLog).where(AuditLog.id == log_id)
    result = await db.execute(stmt)
    log = result.scalar_one_or_none()
    
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audit log not found"
        )
    
    return audit_log_to_response(log)


@router.get(
    "/order/{order_id}",
    response_model=OrderAuditTrail,
    summary="Get order audit trail",
    description="Get complete audit trail for an order"
)
async def get_order_audit_trail(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.BANK)),
):
    """
    Get complete audit trail for an order.
    
    Includes all events, timeline, and participants.
    
    Accessible by: Bank or Admin only
    """
    # Verify order exists
    order_stmt = select(Order).where(Order.id == order_id)
    order_result = await db.execute(order_stmt)
    order = order_result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    # Get all audit logs for this order
    stmt = (
        select(AuditLog)
        .where(
            and_(
                AuditLog.entity_type == EntityType.ORDER,
                AuditLog.entity_id == order_id
            )
        )
        .order_by(AuditLog.created_at.asc())
    )
    result = await db.execute(stmt)
    logs = result.scalars().all()
    
    # Also get related entity logs (escrow, shariah, ai, delivery)
    related_stmt = select(AuditLog).where(
        AuditLog.related_entities.has_key('order_id'),
        func.cast(AuditLog.related_entities['order_id'], str) == str(order_id)
    ).order_by(AuditLog.created_at.asc())
    
    # Build timeline
    events = [audit_log_to_response(log) for log in logs]
    
    timeline = []
    for log in logs:
        timeline.append({
            "timestamp": log.created_at.isoformat(),
            "action": log.action.value,
            "description": log.description,
            "actor": log.actor_name or log.actor_type.value,
            "success": log.success,
        })
    
    # Get unique participants
    participants_set = {}
    for log in logs:
        if log.actor_id:
            actor_key = str(log.actor_id)
            if actor_key not in participants_set:
                participants_set[actor_key] = {
                    "id": str(log.actor_id),
                    "name": log.actor_name,
                    "type": log.actor_type.value,
                    "actions_count": 0,
                }
            participants_set[actor_key]["actions_count"] += 1
    
    participants = list(participants_set.values())
    
    # Compliance summary
    shariah_events = [l for l in logs if "shariah" in l.action.value.lower()]
    ai_events = [l for l in logs if "ai" in l.action.value.lower()]
    
    compliance_summary = {
        "shariah_validation": "compliant" if any(
            l.action == AuditAction.SHARIAH_VALIDATED and l.success 
            for l in logs
        ) else "pending",
        "ai_evaluation": "approved" if any(
            l.action == AuditAction.AI_DECISION_MADE and l.success 
            for l in logs
        ) else "pending",
        "total_events": len(logs),
        "error_events": len([l for l in logs if not l.success]),
    }
    
    return OrderAuditTrail(
        order_id=order_id,
        events=events,
        timeline=timeline,
        participants=participants,
        compliance_summary=compliance_summary,
    )


@router.get(
    "/summary",
    response_model=AuditLogSummary,
    summary="Get audit summary",
    description="Get summary statistics of audit logs"
)
async def get_audit_summary(
    days: int = Query(7, ge=1, le=90, description="Number of days to summarize"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.BANK)),
):
    """
    Get summary statistics of audit logs.
    
    Provides metrics for monitoring and compliance.
    
    Accessible by: Bank or Admin only
    """
    now = datetime.now(timezone.utc)
    start_date = now - timedelta(days=days)
    
    # Total count
    total_stmt = select(func.count()).select_from(AuditLog).where(
        AuditLog.created_at >= start_date
    )
    total_result = await db.execute(total_stmt)
    total_logs = total_result.scalar() or 0
    
    # Count by action
    action_counts = {}
    for action in AuditAction:
        count_stmt = select(func.count()).select_from(AuditLog).where(
            and_(
                AuditLog.action == action,
                AuditLog.created_at >= start_date
            )
        )
        count_result = await db.execute(count_stmt)
        count = count_result.scalar() or 0
        if count > 0:
            action_counts[action.value] = count
    
    # Count by entity type
    entity_counts = {}
    for entity_type in EntityType:
        count_stmt = select(func.count()).select_from(AuditLog).where(
            and_(
                AuditLog.entity_type == entity_type,
                AuditLog.created_at >= start_date
            )
        )
        count_result = await db.execute(count_stmt)
        count = count_result.scalar() or 0
        if count > 0:
            entity_counts[entity_type.value] = count
    
    # Count by actor type
    actor_counts = {}
    for actor_type in ActorType:
        count_stmt = select(func.count()).select_from(AuditLog).where(
            and_(
                AuditLog.actor_type == actor_type,
                AuditLog.created_at >= start_date
            )
        )
        count_result = await db.execute(count_stmt)
        count = count_result.scalar() or 0
        if count > 0:
            actor_counts[actor_type.value] = count
    
    # Success rate
    success_stmt = select(func.count()).select_from(AuditLog).where(
        and_(
            AuditLog.success == True,
            AuditLog.created_at >= start_date
        )
    )
    success_result = await db.execute(success_stmt)
    success_count = success_result.scalar() or 0
    success_rate = (success_count / total_logs * 100) if total_logs > 0 else 100.0
    
    # Recent errors
    error_stmt = (
        select(AuditLog)
        .where(
            and_(
                AuditLog.success == False,
                AuditLog.created_at >= start_date
            )
        )
        .order_by(AuditLog.created_at.desc())
        .limit(10)
    )
    error_result = await db.execute(error_stmt)
    recent_errors = [audit_log_to_response(log) for log in error_result.scalars().all()]
    
    return AuditLogSummary(
        total_logs=total_logs,
        logs_by_action=action_counts,
        logs_by_entity=entity_counts,
        logs_by_actor_type=actor_counts,
        success_rate=round(success_rate, 2),
        recent_errors=recent_errors,
        time_range={
            "start": start_date,
            "end": now,
        },
    )


@router.get(
    "/actions",
    response_model=List[str],
    summary="Get available actions",
    description="Get list of all audit action types"
)
async def get_audit_actions(
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.BANK)),
):
    """Get list of all audit action types."""
    return [action.value for action in AuditAction]


@router.get(
    "/entity-types",
    response_model=List[str],
    summary="Get entity types",
    description="Get list of all auditable entity types"
)
async def get_entity_types(
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.BANK)),
):
    """Get list of all auditable entity types."""
    return [entity.value for entity in EntityType]
