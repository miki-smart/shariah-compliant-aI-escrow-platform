"""
Shariah Compliance API Routes
Endpoints for Shariah validation and compliance operations
"""
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone
import secrets
import hashlib

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.dependencies import get_current_active_user, require_roles
from app.core.logging import get_logger
from app.models.user import User, UserRole
from app.models.order import Order, OrderStatus, ShariahStatus
from app.models.product import Product
from app.models.shariah_result import ShariahResult, ShariahComplianceStatus, ViolationType
from app.services.shariah_service import ShariahService, DEFAULT_SHARIAH_RULES
from app.schemas.shariah import (
    ShariahValidationRequest,
    ShariahReviewRequest,
    ShariahResultResponse,
    ShariahStatusResponse,
    ShariahCertificateResponse,
    ProductKeywordCheckRequest,
    ProductKeywordCheckResponse,
    ShariahRuleResponse,
    ShariahRulesListResponse,
    ViolationResponse,
)

logger = get_logger(__name__)
router = APIRouter(prefix="/shariah", tags=["Shariah Compliance"])


# ============ Helper Functions ============

def result_to_response(result: ShariahResult) -> ShariahResultResponse:
    """Convert ShariahResult model to response schema"""
    violations = None
    if result.violations:
        violations = [
            ViolationResponse(
                rule_code=v.get("rule_code", ""),
                rule_name=v.get("rule_name", ""),
                description=v.get("description", ""),
                severity=v.get("severity", "medium"),
                violation_type=v.get("violation_type", "other"),
            )
            for v in result.violations
        ]
    
    return ShariahResultResponse(
        id=result.id,
        order_id=result.order_id,
        status=result.status,
        compliance_score=result.compliance_score,
        product_is_halal=result.product_is_halal,
        product_category_compliant=result.product_category_compliant,
        haram_products_detected=result.haram_products_detected,
        haram_indicators=result.haram_indicators,
        transaction_compliant=result.transaction_compliant,
        contract_type_valid=result.contract_type_valid,
        no_riba_detected=result.no_riba_detected,
        no_gharar_detected=result.no_gharar_detected,
        no_maisir_detected=result.no_maisir_detected,
        violations=violations,
        violation_count=result.violation_count,
        primary_violation_type=result.primary_violation_type,
        validation_method=result.validation_method,
        rules_applied=result.rules_applied,
        principles_validated=result.principles_validated,
        requires_manual_review=result.requires_manual_review,
        review_reason=result.review_reason,
        reviewed_by=result.reviewed_by,
        reviewed_at=result.reviewed_at,
        review_notes=result.review_notes,
        review_decision=result.review_decision,
        explanation=result.explanation,
        validated_at=result.validated_at,
        created_at=result.created_at,
        updated_at=result.updated_at,
    )


async def get_order_or_404(db: AsyncSession, order_id: UUID) -> Order:
    """Get order by ID or raise 404"""
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.is_deleted == False)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order {order_id} not found"
        )
    return order


# ============ Shariah Endpoints ============

@router.post("/validate/{order_id}", response_model=ShariahResultResponse)
async def validate_order(
    order_id: UUID,
    force_revalidation: bool = Query(False, description="Force revalidation even if already validated"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Validate an order against Shariah compliance rules.
    
    This endpoint:
    1. Checks product against haram categories and keywords
    2. Validates transaction structure against Islamic contract principles
    3. Checks for riba, gharar, and maisir
    4. Returns compliance status and any violations
    
    The validation is rule-based and completes within 1 second.
    """
    order = await get_order_or_404(db, order_id)
    
    # Check authorization
    if current_user.role not in [UserRole.ADMIN, UserRole.BANK]:
        if current_user.id not in [order.buyer_id, order.seller_id]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to validate this order"
            )
    
    # Check if already validated (unless force_revalidation)
    if not force_revalidation:
        existing_result = await db.execute(
            select(ShariahResult).where(ShariahResult.order_id == order_id)
        )
        existing = existing_result.scalar_one_or_none()
        if existing and existing.status != ShariahComplianceStatus.PENDING:
            return result_to_response(existing)
    
    # Perform validation
    shariah_service = ShariahService(db)
    
    try:
        result = await shariah_service.validate_order(order_id)
        
        # Update escrow release condition if escrow exists
        from app.models.escrow import Escrow
        escrow_result = await db.execute(
            select(Escrow).where(Escrow.order_id == order_id, Escrow.is_deleted == False)
        )
        escrow = escrow_result.scalar_one_or_none()
        if escrow:
            is_compliant = result.status == ShariahComplianceStatus.COMPLIANT
            escrow.update_release_condition("shariah_compliant", is_compliant)
            await db.commit()
        
        logger.info(f"Shariah validation completed for order {order_id}: {result.status}")
        return result_to_response(result)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Shariah validation error for order {order_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Shariah validation failed. Please try again."
        )


@router.get("/{order_id}/status", response_model=ShariahStatusResponse)
async def get_shariah_status(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get Shariah compliance status for an order.
    
    Returns a simplified status view for UI display.
    """
    order = await get_order_or_404(db, order_id)
    
    # Check authorization
    if current_user.role not in [UserRole.ADMIN, UserRole.BANK]:
        if current_user.id not in [order.buyer_id, order.seller_id]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this order's Shariah status"
            )
    
    result = await db.execute(
        select(ShariahResult).where(ShariahResult.order_id == order_id)
    )
    shariah_result = result.scalar_one_or_none()
    
    if not shariah_result:
        return ShariahStatusResponse(
            order_id=order_id,
            status=ShariahComplianceStatus.PENDING,
            is_compliant=False,
            violation_count=0,
            primary_violation=None,
            validated_at=None,
            requires_review=False,
            can_proceed=False,
        )
    
    is_compliant = shariah_result.status == ShariahComplianceStatus.COMPLIANT
    can_proceed = shariah_result.status in [
        ShariahComplianceStatus.COMPLIANT,
    ]
    
    primary_violation = None
    if shariah_result.primary_violation_type:
        primary_violation = shariah_result.primary_violation_type.value
    
    return ShariahStatusResponse(
        order_id=order_id,
        status=shariah_result.status,
        is_compliant=is_compliant,
        violation_count=shariah_result.violation_count,
        primary_violation=primary_violation,
        validated_at=shariah_result.validated_at,
        requires_review=shariah_result.requires_manual_review,
        can_proceed=can_proceed,
    )


@router.get("/{order_id}/result", response_model=ShariahResultResponse)
async def get_shariah_result(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get detailed Shariah validation result for an order.
    """
    order = await get_order_or_404(db, order_id)
    
    # Check authorization
    if current_user.role not in [UserRole.ADMIN, UserRole.BANK]:
        if current_user.id not in [order.buyer_id, order.seller_id]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this order's Shariah result"
            )
    
    result = await db.execute(
        select(ShariahResult).where(ShariahResult.order_id == order_id)
    )
    shariah_result = result.scalar_one_or_none()
    
    if not shariah_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shariah validation not found for order {order_id}. Please trigger validation first."
        )
    
    return result_to_response(shariah_result)


@router.get("/{order_id}/certificate", response_model=ShariahCertificateResponse)
async def get_shariah_certificate(
    order_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get Shariah compliance certificate for a compliant order.
    
    Certificate is only available for orders with COMPLIANT status.
    """
    order = await get_order_or_404(db, order_id)
    
    # Check authorization
    if current_user.role not in [UserRole.ADMIN, UserRole.BANK]:
        if current_user.id not in [order.buyer_id, order.seller_id]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this order's certificate"
            )
    
    result = await db.execute(
        select(ShariahResult).where(ShariahResult.order_id == order_id)
    )
    shariah_result = result.scalar_one_or_none()
    
    if not shariah_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shariah validation not found for order {order_id}"
        )
    
    if shariah_result.status != ShariahComplianceStatus.COMPLIANT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Certificate only available for compliant orders. Current status: {shariah_result.status.value}"
        )
    
    # Get product info
    product_result = await db.execute(
        select(Product).where(Product.id == order.product_id)
    )
    product = product_result.scalar_one_or_none()
    
    # Get buyer and seller info
    buyer_result = await db.execute(select(User).where(User.id == order.buyer_id))
    seller_result = await db.execute(select(User).where(User.id == order.seller_id))
    buyer = buyer_result.scalar_one_or_none()
    seller = seller_result.scalar_one_or_none()
    
    # Generate certificate ID and verification code
    cert_data = f"{order_id}{shariah_result.validated_at.isoformat()}"
    verification_code = hashlib.sha256(cert_data.encode()).hexdigest()[:16].upper()
    certificate_id = f"CERT-{secrets.token_hex(4).upper()}"
    
    return ShariahCertificateResponse(
        certificate_id=certificate_id,
        order_id=order_id,
        order_number=order.order_number,
        status=shariah_result.status,
        compliance_score=shariah_result.compliance_score,
        is_compliant=True,
        product_name=product.name if product else "Unknown",
        product_category=product.category if product else "Unknown",
        order_amount=float(order.total_amount),
        currency=order.currency,
        contract_type=order.contract_type.value,
        buyer_name=buyer.full_name if buyer else "Unknown",
        seller_name=seller.business_name if seller and hasattr(seller, 'business_name') else (seller.full_name if seller else "Unknown"),
        validation_method=shariah_result.validation_method,
        principles_validated=shariah_result.principles_validated or [],
        rules_applied=shariah_result.rules_applied or [],
        validated_at=shariah_result.validated_at,
        certificate_issued_at=datetime.now(timezone.utc),
        valid_until=None,  # Certificate valid indefinitely for this order
        verification_code=verification_code,
        issued_by="Shariah Escrow Platform",
    )


@router.post("/{order_id}/review", response_model=ShariahResultResponse)
async def review_shariah_result(
    order_id: UUID,
    request: ShariahReviewRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.BANK)),
):
    """
    Perform manual review on a Shariah validation result.
    
    Only available for orders with REQUIRES_REVIEW status.
    Accessible by: Admin or Bank only
    """
    order = await get_order_or_404(db, order_id)
    
    result = await db.execute(
        select(ShariahResult).where(ShariahResult.order_id == order_id)
    )
    shariah_result = result.scalar_one_or_none()
    
    if not shariah_result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shariah validation not found for order {order_id}"
        )
    
    if shariah_result.status != ShariahComplianceStatus.REQUIRES_REVIEW:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Manual review only available for orders requiring review. Current status: {shariah_result.status.value}"
        )
    
    # Process review decision
    if request.decision.lower() == "approve":
        shariah_result.status = ShariahComplianceStatus.COMPLIANT
        order.shariah_status = ShariahStatus.COMPLIANT
    elif request.decision.lower() == "reject":
        shariah_result.status = ShariahComplianceStatus.NON_COMPLIANT
        order.shariah_status = ShariahStatus.NON_COMPLIANT
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Decision must be 'approve' or 'reject'"
        )
    
    shariah_result.reviewed_by = current_user.id
    shariah_result.reviewed_at = datetime.now(timezone.utc)
    shariah_result.review_notes = request.notes
    shariah_result.review_decision = request.decision.lower()
    shariah_result.requires_manual_review = False
    
    # Update escrow release condition
    from app.models.escrow import Escrow
    escrow_result = await db.execute(
        select(Escrow).where(Escrow.order_id == order_id, Escrow.is_deleted == False)
    )
    escrow = escrow_result.scalar_one_or_none()
    if escrow:
        is_compliant = request.decision.lower() == "approve"
        escrow.update_release_condition("shariah_compliant", is_compliant)
    
    await db.commit()
    await db.refresh(shariah_result)
    
    logger.info(f"Manual Shariah review completed for order {order_id}: {request.decision}")
    
    return result_to_response(shariah_result)


@router.post("/check-keywords", response_model=ProductKeywordCheckResponse)
async def check_product_keywords(
    request: ProductKeywordCheckRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Check product name and description for haram keywords.
    
    Useful for quick validation before creating an order.
    """
    shariah_service = ShariahService(db)
    
    result = await shariah_service.check_product_keywords(
        request.product_name,
        request.description or ""
    )
    
    # Determine risk level
    keyword_count = len(result["found_keywords"])
    if keyword_count == 0:
        risk_level = "low"
    elif keyword_count <= 2:
        risk_level = "medium"
    elif keyword_count <= 5:
        risk_level = "high"
    else:
        risk_level = "critical"
    
    return ProductKeywordCheckResponse(
        is_clean=result["is_clean"],
        found_keywords=result["found_keywords"],
        recommendation=result["recommendation"],
        risk_level=risk_level,
    )


@router.get("/rules", response_model=ShariahRulesListResponse)
async def get_shariah_rules(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Get list of Shariah rules used for validation.
    """
    rules = [
        ShariahRuleResponse(
            code=rule["code"],
            name=rule["name"],
            description=rule["description"],
            category=rule["category"],
            severity=rule["severity"],
            is_active=True,
        )
        for rule in DEFAULT_SHARIAH_RULES
    ]
    
    return ShariahRulesListResponse(
        rules=rules,
        total=len(rules),
    )


@router.get("/results")
async def get_all_shariah_results(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filter: Optional[ShariahComplianceStatus] = Query(None, description="Filter by status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.BANK)),
):
    """
    Get all Shariah validation results. Bank/Admin only.
    """
    query = select(ShariahResult)
    
    if status_filter:
        query = query.where(ShariahResult.status == status_filter)
    
    # Count
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0
    
    # Paginate
    query = query.order_by(ShariahResult.created_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    results = result.scalars().all()
    
    return {
        "results": [result_to_response(r) for r in results],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/stats")
async def get_shariah_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.BANK)),
):
    """
    Get Shariah compliance statistics. Bank/Admin only.
    """
    # Count by status
    status_counts = {}
    for s in ShariahComplianceStatus:
        count_query = select(func.count()).select_from(ShariahResult).where(
            ShariahResult.status == s
        )
        result = await db.execute(count_query)
        count = result.scalar() or 0
        if count > 0:
            status_counts[s.value] = count
    
    # Total count
    total_query = select(func.count()).select_from(ShariahResult)
    total_result = await db.execute(total_query)
    total = total_result.scalar() or 0
    
    # Compliant count
    compliant_count = status_counts.get(ShariahComplianceStatus.COMPLIANT.value, 0)
    
    # Non-compliant count
    non_compliant_count = status_counts.get(ShariahComplianceStatus.NON_COMPLIANT.value, 0)
    
    # Requires review count
    review_count = status_counts.get(ShariahComplianceStatus.REQUIRES_REVIEW.value, 0)
    
    # Compliance rate
    compliance_rate = (compliant_count / total * 100) if total > 0 else 100.0
    
    # Average compliance score
    avg_score_query = select(func.avg(ShariahResult.compliance_score))
    avg_result = await db.execute(avg_score_query)
    avg_score = avg_result.scalar() or 0
    
    return {
        "total_validations": total,
        "compliant": compliant_count,
        "non_compliant": non_compliant_count,
        "requires_review": review_count,
        "compliance_rate": round(compliance_rate, 2),
        "average_compliance_score": round(float(avg_score), 2),
        "by_status": status_counts,
    }


# ============ External AI Compliance Checking Endpoints ============

from pydantic import BaseModel, Field
from fastapi import File, UploadFile


class TextComplianceRequest(BaseModel):
    """Request to check text for Shariah compliance"""
    text: str = Field(..., description="Text to check for compliance (product name, description, etc.)")


class TextComplianceResponse(BaseModel):
    """Response from text compliance check"""
    is_compliant: bool
    decision: str  # HALAL, HARAM, MASHBOOH
    reason: str
    detected_issues: list
    confidence: float
    requires_review: bool


class ImageComplianceRequest(BaseModel):
    """Request to check image for Shariah compliance (base64)"""
    image_base64: str = Field(..., description="Base64-encoded image")
    filename: str = Field(default="image.jpg", description="Original filename")


class ImageComplianceResponse(BaseModel):
    """Response from image compliance check"""
    is_compliant: bool
    decision: str  # HALAL, HARAM, MASHBOOH
    reason: str
    detected_issues: list
    confidence: float
    requires_review: bool


@router.post("/check-text", response_model=TextComplianceResponse)
async def check_text_compliance(
    request: TextComplianceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Check text content for Shariah compliance using external AI service.
    
    This endpoint checks text (product names, descriptions, etc.) for:
    - Interest/riba-related terms
    - Haram product mentions (alcohol, pork, gambling, etc.)
    - Other prohibited content
    
    Example input: "ወለድ 12% ብድር" (Interest-based loan)
    Returns: HARAM decision with reason "Interest-based loan (riba)"
    """
    service = ShariahService(db)
    
    try:
        result = await service.check_text_compliance(request.text)
        
        logger.info(
            f"Text compliance check: {result['decision']} (confidence: {result['confidence']})",
            extra={"user_id": str(current_user.id), "text_length": len(request.text)}
        )
        
        return TextComplianceResponse(**result)
        
    except Exception as e:
        logger.error(f"Text compliance check error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Compliance check failed: {str(e)}"
        )


@router.post("/check-image", response_model=ImageComplianceResponse)
async def check_image_compliance_base64(
    request: ImageComplianceRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Check image for Shariah compliance using external AI service (base64 input).
    
    This endpoint checks images for:
    - Alcohol bottles/products
    - Pork/haram meat products
    - Gambling materials
    - Other prohibited items
    
    Send image as base64-encoded string in request body.
    """
    service = ShariahService(db)
    
    try:
        result = await service.check_image_compliance_base64(
            request.image_base64,
            request.filename
        )
        
        logger.info(
            f"Image compliance check: {result['decision']} (confidence: {result['confidence']})",
            extra={"user_id": str(current_user.id), "filename": request.filename}
        )
        
        return ImageComplianceResponse(**result)
        
    except Exception as e:
        logger.error(f"Image compliance check error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Compliance check failed: {str(e)}"
        )


@router.post("/check-image-upload", response_model=ImageComplianceResponse)
async def check_image_compliance_upload(
    file: UploadFile = File(..., description="Image file to check"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Check uploaded image for Shariah compliance using external AI service.
    
    This endpoint accepts direct file upload (multipart/form-data).
    Supports JPG, PNG, GIF, WEBP formats.
    
    Example: Upload image of alcohol bottles
    Returns: HARAM decision with detected_issues: ["alcohol"]
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
        )
    
    # Read file content
    try:
        image_data = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read file: {str(e)}"
        )
    
    service = ShariahService(db)
    
    try:
        result = await service.check_image_compliance(
            image_data,
            file.filename or "upload.jpg"
        )
        
        logger.info(
            f"Image upload compliance check: {result['decision']} (confidence: {result['confidence']})",
            extra={"user_id": str(current_user.id), "filename": file.filename}
        )
        
        return ImageComplianceResponse(**result)
        
    except Exception as e:
        logger.error(f"Image upload compliance check error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Compliance check failed: {str(e)}"
        )


class ProductComplianceCheckRequest(BaseModel):
    """Request to check product for Shariah compliance"""
    name: str = Field(..., description="Product name")
    description: Optional[str] = Field(None, description="Product description")
    image_base64: Optional[str] = Field(None, description="Optional product image (base64)")
    image_filename: Optional[str] = Field(None, description="Image filename")


class ProductComplianceCheckResponse(BaseModel):
    """Response from product compliance check"""
    overall_compliant: bool
    overall_decision: str
    text_check: TextComplianceResponse
    image_check: Optional[ImageComplianceResponse] = None
    recommendation: str


@router.post("/check-product", response_model=ProductComplianceCheckResponse)
async def check_product_compliance(
    request: ProductComplianceCheckRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Comprehensive product Shariah compliance check.
    
    Checks both text (name + description) and optionally the product image.
    Use this endpoint when creating or updating products to ensure compliance.
    
    Returns overall compliance status based on both text and image analysis.
    """
    service = ShariahService(db)
    
    try:
        # Check text content
        text_to_check = request.name
        if request.description:
            text_to_check = f"{request.name}\n{request.description}"
        
        text_result = await service.check_text_compliance(text_to_check)
        text_response = TextComplianceResponse(**text_result)
        
        # Check image if provided
        image_response = None
        if request.image_base64:
            image_result = await service.check_image_compliance_base64(
                request.image_base64,
                request.image_filename or "product.jpg"
            )
            image_response = ImageComplianceResponse(**image_result)
        
        # Determine overall compliance
        overall_compliant = text_response.is_compliant
        overall_decision = text_response.decision
        
        if image_response:
            # Image takes precedence if it detects haram
            if not image_response.is_compliant:
                overall_compliant = False
                if image_response.decision == "HARAM":
                    overall_decision = "HARAM"
                elif text_response.decision != "HARAM":
                    overall_decision = image_response.decision
        
        # Generate recommendation
        if overall_decision == "HARAM":
            recommendation = "Product is NOT compliant with Shariah. Do not list this product."
        elif overall_decision == "MASHBOOH":
            recommendation = "Product requires manual review before listing."
        else:
            recommendation = "Product is Shariah compliant. Safe to list."
        
        logger.info(
            f"Product compliance check: {overall_decision}",
            extra={
                "user_id": str(current_user.id),
                "product_name": request.name,
                "has_image": request.image_base64 is not None
            }
        )
        
        return ProductComplianceCheckResponse(
            overall_compliant=overall_compliant,
            overall_decision=overall_decision,
            text_check=text_response,
            image_check=image_response,
            recommendation=recommendation,
        )
        
    except Exception as e:
        logger.error(f"Product compliance check error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Compliance check failed: {str(e)}"
        )
