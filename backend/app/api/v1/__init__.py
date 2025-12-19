"""
API v1 Router
Aggregates all v1 API routes
"""
from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.products import router as products_router

# Create main v1 router
router = APIRouter()

# Include sub-routers
router.include_router(auth_router)
router.include_router(products_router)

# Future routers will be added here:
# router.include_router(orders_router)
# router.include_router(escrow_router)
# router.include_router(shariah_router)
# router.include_router(ai_router)
# router.include_router(delivery_router)
