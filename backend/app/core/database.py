"""
Database Configuration
Async SQLAlchemy setup with connection pooling and session management
"""
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    AsyncEngine,
    create_async_engine,
    async_sessionmaker,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool
from sqlalchemy import MetaData
from typing import AsyncGenerator
from contextlib import asynccontextmanager

from app.core.config import settings


# Naming conventions for constraints (important for Alembic migrations)
convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

metadata = MetaData(naming_convention=convention)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models"""
    metadata = metadata


def create_engine() -> AsyncEngine:
    """Create async SQLAlchemy engine with connection pooling"""
    return create_async_engine(
        str(settings.DATABASE_URL),
        echo=settings.DATABASE_ECHO,
        pool_size=settings.DATABASE_POOL_SIZE,
        max_overflow=settings.DATABASE_MAX_OVERFLOW,
        pool_timeout=settings.DATABASE_POOL_TIMEOUT,
        pool_pre_ping=True,  # Verify connections before use
    )


def create_test_engine() -> AsyncEngine:
    """Create engine for testing (no connection pooling)"""
    return create_async_engine(
        str(settings.DATABASE_URL),
        echo=True,
        poolclass=NullPool,
    )


# Global engine instance
engine = create_engine()

# Session factory
async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency for getting async database sessions.
    Use with FastAPI's Depends().
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def get_db_context() -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager for database sessions.
    Use for background tasks or non-request contexts.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database (create tables)"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Close database connections"""
    await engine.dispose()


class DatabaseSession:
    """
    Database session wrapper for service classes.
    Provides transaction management utilities.
    """
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def commit(self) -> None:
        """Commit the current transaction"""
        await self.session.commit()
    
    async def rollback(self) -> None:
        """Rollback the current transaction"""
        await self.session.rollback()
    
    async def refresh(self, instance) -> None:
        """Refresh instance from database"""
        await self.session.refresh(instance)
    
    async def flush(self) -> None:
        """Flush pending changes without committing"""
        await self.session.flush()
