"""
Audit Service
Handles audit logging for regulatory compliance
"""
from typing import Optional, List, Any
from uuid import UUID
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.audit import (
    AuditLog,
    SystemLog,
    AuditAction,
    EntityType,
    ActorType,
)
from app.core.logging import get_logger

logger = get_logger(__name__)


class AuditService:
    """Service for audit logging operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def log_action(
        self,
        action: AuditAction,
        entity_type: EntityType,
        entity_id: UUID,
        description: str,
        actor_type: ActorType = ActorType.SYSTEM,
        actor_id: Optional[UUID] = None,
        actor_name: Optional[str] = None,
        old_values: Optional[dict] = None,
        new_values: Optional[dict] = None,
        reason: Optional[str] = None,
        correlation_id: Optional[str] = None,
        request_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        related_entities: Optional[dict] = None,
        success: bool = True,
        error_message: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> AuditLog:
        """
        Create an audit log entry.
        This is the primary method for logging auditable actions.
        """
        audit_log = AuditLog.create_log(
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            description=description,
            actor_type=actor_type,
            actor_id=actor_id,
            old_values=old_values,
            new_values=new_values,
            reason=reason,
            correlation_id=correlation_id,
            request_id=request_id,
            ip_address=ip_address,
            related_entities=related_entities,
            success=success,
            error_message=error_message,
            metadata=metadata,
        )
        audit_log.actor_name = actor_name
        
        self.db.add(audit_log)
        await self.db.commit()
        await self.db.refresh(audit_log)
        
        logger.debug(f"Audit log created: {action.value} on {entity_type.value}:{entity_id}")
        return audit_log
    
    async def log_order_created(
        self,
        order_id: UUID,
        buyer_id: UUID,
        seller_id: UUID,
        actor_id: Optional[UUID] = None,
        correlation_id: Optional[str] = None,
    ) -> AuditLog:
        """Log order creation"""
        return await self.log_action(
            action=AuditAction.ORDER_CREATED,
            entity_type=EntityType.ORDER,
            entity_id=order_id,
            description=f"Order created by buyer {buyer_id} from seller {seller_id}",
            actor_type=ActorType.USER if actor_id else ActorType.SYSTEM,
            actor_id=actor_id,
            correlation_id=correlation_id,
            related_entities={
                "buyer_id": str(buyer_id),
                "seller_id": str(seller_id),
            },
        )
    
    async def log_order_status_change(
        self,
        order_id: UUID,
        from_status: str,
        to_status: str,
        actor_type: ActorType = ActorType.SYSTEM,
        actor_id: Optional[UUID] = None,
        reason: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ) -> AuditLog:
        """Log order status change"""
        return await self.log_action(
            action=AuditAction.ORDER_STATUS_CHANGED,
            entity_type=EntityType.ORDER,
            entity_id=order_id,
            description=f"Order status changed from {from_status} to {to_status}",
            actor_type=actor_type,
            actor_id=actor_id,
            old_values={"status": from_status},
            new_values={"status": to_status},
            reason=reason,
            correlation_id=correlation_id,
        )
    
    async def log_escrow_action(
        self,
        action: AuditAction,
        escrow_id: UUID,
        order_id: UUID,
        description: str,
        actor_type: ActorType = ActorType.SYSTEM,
        actor_id: Optional[UUID] = None,
        amount: Optional[float] = None,
        correlation_id: Optional[str] = None,
    ) -> AuditLog:
        """Log escrow-related action"""
        metadata = {"order_id": str(order_id)}
        if amount is not None:
            metadata["amount"] = amount
        
        return await self.log_action(
            action=action,
            entity_type=EntityType.ESCROW,
            entity_id=escrow_id,
            description=description,
            actor_type=actor_type,
            actor_id=actor_id,
            correlation_id=correlation_id,
            related_entities={"order_id": str(order_id)},
            metadata=metadata,
        )
    
    async def log_ai_decision(
        self,
        decision_id: UUID,
        order_id: UUID,
        decision: str,
        risk_score: float,
        explanation: str,
        correlation_id: Optional[str] = None,
    ) -> AuditLog:
        """Log AI governance decision"""
        return await self.log_action(
            action=AuditAction.AI_DECISION_MADE,
            entity_type=EntityType.AI_DECISION,
            entity_id=decision_id,
            description=f"AI decision: {decision} (risk score: {risk_score})",
            actor_type=ActorType.AI,
            correlation_id=correlation_id,
            related_entities={"order_id": str(order_id)},
            metadata={
                "decision": decision,
                "risk_score": risk_score,
                "explanation": explanation,
            },
        )
    
    async def log_shariah_validation(
        self,
        result_id: UUID,
        order_id: UUID,
        status: str,
        violations: List[dict],
        correlation_id: Optional[str] = None,
    ) -> AuditLog:
        """Log Shariah compliance validation"""
        action = (
            AuditAction.SHARIAH_VIOLATION
            if status == "non_compliant"
            else AuditAction.SHARIAH_VALIDATED
        )
        
        return await self.log_action(
            action=action,
            entity_type=EntityType.SHARIAH_RESULT,
            entity_id=result_id,
            description=f"Shariah validation: {status}",
            actor_type=ActorType.SYSTEM,
            correlation_id=correlation_id,
            related_entities={"order_id": str(order_id)},
            metadata={
                "status": status,
                "violation_count": len(violations),
                "violations": violations,
            },
        )
    
    async def get_audit_logs(
        self,
        entity_type: Optional[EntityType] = None,
        entity_id: Optional[UUID] = None,
        action: Optional[AuditAction] = None,
        actor_id: Optional[UUID] = None,
        correlation_id: Optional[str] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[AuditLog]:
        """Query audit logs with filters"""
        query = select(AuditLog)
        
        conditions = []
        if entity_type:
            conditions.append(AuditLog.entity_type == entity_type)
        if entity_id:
            conditions.append(AuditLog.entity_id == entity_id)
        if action:
            conditions.append(AuditLog.action == action)
        if actor_id:
            conditions.append(AuditLog.actor_id == actor_id)
        if correlation_id:
            conditions.append(AuditLog.correlation_id == correlation_id)
        if from_date:
            conditions.append(AuditLog.created_at >= from_date)
        if to_date:
            conditions.append(AuditLog.created_at <= to_date)
        
        if conditions:
            query = query.where(and_(*conditions))
        
        query = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
        
        result = await self.db.execute(query)
        return list(result.scalars().all())
    
    async def get_entity_history(
        self,
        entity_type: EntityType,
        entity_id: UUID,
    ) -> List[AuditLog]:
        """Get complete audit history for an entity"""
        result = await self.db.execute(
            select(AuditLog)
            .where(
                and_(
                    AuditLog.entity_type == entity_type,
                    AuditLog.entity_id == entity_id,
                )
            )
            .order_by(AuditLog.created_at.asc())
        )
        return list(result.scalars().all())


async def get_audit_service(db: AsyncSession) -> AuditService:
    """Dependency for getting AuditService"""
    return AuditService(db)
