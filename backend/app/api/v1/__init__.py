"""
API v1 Router
Aggregates all v1 API routes
"""
from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.escrow import router as escrow_router
from app.api.v1.shariah import router as shariah_router
from app.api.v1.audit import router as audit_router
from app.api.v1.release import router as release_router
from app.api.v1.ai import router as ai_router
from app.api.v1.transactions import router as transactions_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.payments import router as payments_router

# Create main v1 router
router = APIRouter()

# Include sub-routers
router.include_router(auth_router)
router.include_router(escrow_router)
router.include_router(shariah_router)
router.include_router(audit_router)
router.include_router(release_router)
router.include_router(ai_router)
router.include_router(transactions_router)
router.include_router(notifications_router)
router.include_router(payments_router)

