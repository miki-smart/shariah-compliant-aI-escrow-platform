"""
Base Model
Common fields and utilities for all domain models
"""
from sqlalchemy import Column, DateTime, Boolean, event
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declared_attr, Mapped, mapped_column
from datetime import datetime, timezone
import uuid
from typing import Optional

from app.core.database import Base


class TimestampMixin:
    """Mixin for created_at and updated_at timestamps"""
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class SoftDeleteMixin:
    """Mixin for soft delete functionality"""
    
    deleted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )
    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    
    def soft_delete(self) -> None:
        """Mark record as deleted"""
        self.deleted_at = datetime.now(timezone.utc)
        self.is_deleted = True
    
    def restore(self) -> None:
        """Restore soft-deleted record"""
        self.deleted_at = None
        self.is_deleted = False


class BaseModel(Base, TimestampMixin, SoftDeleteMixin):
    """
    Base model class with common fields.
    All domain models should inherit from this.
    """
    __abstract__ = True
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    
    @declared_attr
    def __tablename__(cls) -> str:
        """Generate table name from class name (snake_case)"""
        import re
        name = cls.__name__
        return re.sub(r'(?<!^)(?=[A-Z])', '_', name).lower() + 's'
    
    def to_dict(self) -> dict:
        """Convert model to dictionary"""
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
        }
    
    def __repr__(self) -> str:
        """String representation"""
        return f"<{self.__class__.__name__}(id={self.id})>"


class AuditMixin:
    """Mixin for audit fields (who created/updated)"""
    
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    updated_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )


class VersionedMixin:
    """Mixin for optimistic locking"""
    
    version: Mapped[int] = mapped_column(
        default=1,
        nullable=False,
    )


# Utility functions for model operations
def generate_uuid() -> uuid.UUID:
    """Generate a new UUID"""
    return uuid.uuid4()


def utc_now() -> datetime:
    """Get current UTC timestamp"""
    return datetime.now(timezone.utc)
