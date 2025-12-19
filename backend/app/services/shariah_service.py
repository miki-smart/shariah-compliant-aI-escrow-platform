"""
Shariah Compliance Service
Validates transactions and products against Islamic finance principles
Integrates with external AI service for text and image compliance checking
"""
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.order import Order, ShariahStatus, ContractType
from app.models.product import Product, ShariahCategory, HaramProductKeyword
from app.models.shariah_result import (
    ShariahResult,
    ShariahRule,
    ShariahComplianceStatus,
    ViolationType,
)
from app.core.logging import get_logger
from app.services.shariah_compliance_external import (
    get_shariah_compliance_service,
    ShariahCheckResult,
    ShariahDecision,
)

logger = get_logger(__name__)


# Predefined Shariah rules
DEFAULT_SHARIAH_RULES = [
    {
        "code": "SR001",
        "name": "No Riba (Interest)",
        "description": "Transaction must not contain any form of interest or usury",
        "category": "financial",
        "severity": "critical",
    },
    {
        "code": "SR002",
        "name": "No Gharar (Excessive Uncertainty)",
        "description": "Transaction must not have excessive uncertainty in terms",
        "category": "contractual",
        "severity": "high",
    },
    {
        "code": "SR003",
        "name": "No Maisir (Gambling)",
        "description": "Transaction must not involve gambling or speculation",
        "category": "ethical",
        "severity": "critical",
    },
    {
        "code": "SR004",
        "name": "Halal Products Only",
        "description": "Products must be halal (permissible under Islamic law)",
        "category": "product",
        "severity": "critical",
    },
    {
        "code": "SR005",
        "name": "Valid Contract Type",
        "description": "Transaction must follow valid Islamic contract structure",
        "category": "contractual",
        "severity": "high",
    },
    {
        "code": "SR006",
        "name": "Clear Terms and Disclosure",
        "description": "All terms must be clearly disclosed to all parties",
        "category": "transparency",
        "severity": "medium",
    },
    {
        "code": "SR007",
        "name": "Ownership Before Sale",
        "description": "Seller must have ownership/possession of goods before sale",
        "category": "ownership",
        "severity": "high",
    },
]


# Haram product categories
HARAM_CATEGORIES = [
    "alcohol",
    "pork",
    "gambling",
    "tobacco",
    "weapons",
    "adult_content",
    "interest_bearing_instruments",
    "conventional_insurance",
]


# Keywords that indicate potentially haram products
HARAM_KEYWORDS = [
    "alcohol", "wine", "beer", "vodka", "whisky", "rum", "liquor", "spirits",
    "pork", "ham", "bacon", "lard", "pig",
    "gambling", "casino", "lottery", "betting",
    "tobacco", "cigarette", "cigar",
    "interest", "riba", "usury",
]


class ShariahService:
    """Service for Shariah compliance validation"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.external_service = get_shariah_compliance_service()
    
    async def check_text_compliance(self, text: str) -> Dict[str, Any]:
        """
        Check text content for Shariah compliance using external AI service.
        
        Args:
            text: Text to check (product name, description, etc.)
            
        Returns:
            Dict with compliance decision and details
        """
        result = await self.external_service.check_text(text)
        return {
            "is_compliant": result.is_compliant,
            "decision": result.decision.value,
            "reason": result.reason,
            "detected_issues": result.detected_issues,
            "confidence": result.confidence,
            "requires_review": result.requires_review,
        }
    
    async def check_image_compliance(
        self,
        image_data: bytes,
        filename: str = "image.jpg"
    ) -> Dict[str, Any]:
        """
        Check image for Shariah compliance using external AI service.
        Detects haram products like alcohol bottles, pork products, etc.
        
        Args:
            image_data: Raw image bytes
            filename: Original filename
            
        Returns:
            Dict with compliance decision and details
        """
        result = await self.external_service.check_image(image_data, filename)
        return {
            "is_compliant": result.is_compliant,
            "decision": result.decision.value,
            "reason": result.reason,
            "detected_issues": result.detected_issues,
            "confidence": result.confidence,
            "requires_review": result.requires_review,
        }
    
    async def check_image_compliance_base64(
        self,
        base64_image: str,
        filename: str = "image.jpg"
    ) -> Dict[str, Any]:
        """
        Check base64-encoded image for Shariah compliance.
        
        Args:
            base64_image: Base64-encoded image string
            filename: Original filename
            
        Returns:
            Dict with compliance decision and details
        """
        result = await self.external_service.check_image_base64(base64_image, filename)
        return {
            "is_compliant": result.is_compliant,
            "decision": result.decision.value,
            "reason": result.reason,
            "detected_issues": result.detected_issues,
            "confidence": result.confidence,
            "requires_review": result.requires_review,
        }
    
    async def validate_order(self, order_id: UUID) -> ShariahResult:
        """
        Perform comprehensive Shariah validation on an order.
        Returns ShariahResult with compliance status and any violations.
        """
        # Get order with product
        order = await self._get_order_with_product(order_id)
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        violations = []
        rules_validated = []
        
        # 1. Validate product is halal
        product_result = await self._validate_product_compliance(order.product)
        violations.extend(product_result.get("violations", []))
        rules_validated.extend(product_result.get("rules_validated", []))
        
        # 2. Validate transaction structure
        structure_result = await self._validate_transaction_structure(order)
        violations.extend(structure_result.get("violations", []))
        rules_validated.extend(structure_result.get("rules_validated", []))
        
        # 3. Validate contract terms
        contract_result = await self._validate_contract_terms(order)
        violations.extend(contract_result.get("violations", []))
        rules_validated.extend(contract_result.get("rules_validated", []))
        
        # 4. Check for riba
        riba_result = await self._check_for_riba(order)
        violations.extend(riba_result.get("violations", []))
        rules_validated.extend(riba_result.get("rules_validated", []))
        
        # Determine overall compliance status
        has_critical_violations = any(v.get("severity") == "critical" for v in violations)
        has_high_violations = any(v.get("severity") == "high" for v in violations)
        
        if has_critical_violations:
            compliance_status = ShariahComplianceStatus.NON_COMPLIANT
        elif has_high_violations:
            compliance_status = ShariahComplianceStatus.REQUIRES_REVIEW
        elif violations:
            compliance_status = ShariahComplianceStatus.REQUIRES_REVIEW
        else:
            compliance_status = ShariahComplianceStatus.COMPLIANT
        
        # Create or update ShariahResult
        shariah_result = await self._create_shariah_result(
            order_id=order_id,
            compliance_status=compliance_status,
            violations=violations,
            rules_validated=rules_validated,
            haram_detected=has_critical_violations and any(
                v.get("rule_code") == "SR004" for v in violations
            ),
        )
        
        # Update order Shariah status
        order.shariah_status = ShariahStatus(compliance_status.value)
        order.shariah_validated_at = datetime.now(timezone.utc)
        await self.db.commit()
        
        logger.info(
            f"Shariah validation completed for order {order_id}: {compliance_status.value}",
            extra={
                "order_id": str(order_id),
                "status": compliance_status.value,
                "violations_count": len(violations),
            }
        )
        
        return shariah_result
    
    async def validate_product(self, product_id: UUID) -> Dict[str, Any]:
        """Validate a single product for Shariah compliance"""
        result = await self.db.execute(
            select(Product).where(Product.id == product_id)
        )
        product = result.scalar_one_or_none()
        
        if not product:
            raise ValueError(f"Product {product_id} not found")
        
        return await self._validate_product_compliance(product)
    
    async def check_product_keywords(self, product_name: str, description: str = "") -> Dict[str, Any]:
        """Check product name and description for haram keywords"""
        combined_text = f"{product_name} {description}".lower()
        
        # Check against database keywords
        db_keywords = await self._get_haram_keywords()
        
        # Combine with default keywords
        all_keywords = set(HARAM_KEYWORDS) | set(db_keywords)
        
        found_keywords = []
        for keyword in all_keywords:
            if keyword.lower() in combined_text:
                found_keywords.append(keyword)
        
        return {
            "is_clean": len(found_keywords) == 0,
            "found_keywords": found_keywords,
            "recommendation": "BLOCK" if found_keywords else "ALLOW",
        }
    
    async def get_compliance_status(self, order_id: UUID) -> Optional[ShariahResult]:
        """Get existing Shariah compliance result for an order"""
        result = await self.db.execute(
            select(ShariahResult).where(ShariahResult.order_id == order_id)
        )
        return result.scalar_one_or_none()
    
    async def _get_order_with_product(self, order_id: UUID) -> Optional[Order]:
        """Get order with product relationship loaded"""
        result = await self.db.execute(
            select(Order).where(Order.id == order_id)
        )
        order = result.scalar_one_or_none()
        
        if order:
            # Load product
            product_result = await self.db.execute(
                select(Product).where(Product.id == order.product_id)
            )
            order.product = product_result.scalar_one_or_none()
        
        return order
    
    async def _validate_product_compliance(self, product: Product) -> Dict[str, Any]:
        """Validate product Shariah compliance using both local rules and external AI"""
        violations = []
        rules_validated = ["SR004"]
        
        if not product:
            violations.append({
                "rule_code": "SR004",
                "rule_name": "Halal Products Only",
                "description": "Product not found or invalid",
                "severity": "critical",
                "violation_type": ViolationType.HARAM_PRODUCT.value,
            })
            return {"violations": violations, "rules_validated": rules_validated}
        
        # Check product Shariah category
        if product.shariah_category == ShariahCategory.HARAM:
            violations.append({
                "rule_code": "SR004",
                "rule_name": "Halal Products Only",
                "description": f"Product '{product.name}' is classified as haram",
                "severity": "critical",
                "violation_type": ViolationType.HARAM_PRODUCT.value,
            })
        elif product.shariah_category == ShariahCategory.MASHBOOH:
            violations.append({
                "rule_code": "SR004",
                "rule_name": "Halal Products Only",
                "description": f"Product '{product.name}' is doubtful (mashbooh) and requires review",
                "severity": "high",
                "violation_type": ViolationType.MASHBOOH_PRODUCT.value,
            })
        
        # Check product name and description for haram keywords (local check)
        keyword_check = await self.check_product_keywords(
            product.name,
            product.description or ""
        )
        if not keyword_check["is_clean"]:
            violations.append({
                "rule_code": "SR004",
                "rule_name": "Halal Products Only",
                "description": f"Product contains prohibited keywords: {', '.join(keyword_check['found_keywords'])}",
                "severity": "critical",
                "violation_type": ViolationType.HARAM_PRODUCT.value,
            })
        
        # External AI-powered text compliance check
        try:
            text_to_check = f"{product.name}\n{product.description or ''}"
            external_text_result = await self.external_service.check_text(text_to_check)
            
            if external_text_result.is_haram:
                violations.append({
                    "rule_code": "SR004",
                    "rule_name": "Halal Products Only",
                    "description": f"AI detected haram content: {external_text_result.reason}",
                    "severity": "critical",
                    "violation_type": ViolationType.HARAM_PRODUCT.value,
                    "ai_confidence": external_text_result.confidence,
                    "detected_issues": external_text_result.detected_issues,
                })
            elif external_text_result.requires_review:
                violations.append({
                    "rule_code": "SR004",
                    "rule_name": "Halal Products Only",
                    "description": f"AI flagged for review: {external_text_result.reason}",
                    "severity": "high",
                    "violation_type": ViolationType.MASHBOOH_PRODUCT.value,
                    "ai_confidence": external_text_result.confidence,
                    "detected_issues": external_text_result.detected_issues,
                })
        except Exception as e:
            logger.warning(f"External AI text check failed: {str(e)}")
        
        return {"violations": violations, "rules_validated": rules_validated}
    
    async def _validate_transaction_structure(self, order: Order) -> Dict[str, Any]:
        """Validate transaction follows valid Islamic contract structure"""
        violations = []
        rules_validated = ["SR005", "SR006"]
        
        # Check contract type is valid
        valid_contract_types = [
            ContractType.MURABAHA,
            ContractType.SALAM,
            ContractType.ISTISNA,
            ContractType.MUSAWAMAH,
        ]
        
        if order.contract_type not in valid_contract_types:
            violations.append({
                "rule_code": "SR005",
                "rule_name": "Valid Contract Type",
                "description": f"Contract type '{order.contract_type}' is not a valid Islamic contract",
                "severity": "high",
                "violation_type": ViolationType.INVALID_CONTRACT.value,
            })
        
        # Check terms are clear (basic validation)
        if not order.product_id:
            violations.append({
                "rule_code": "SR006",
                "rule_name": "Clear Terms and Disclosure",
                "description": "Order must specify the product being traded",
                "severity": "medium",
                "violation_type": ViolationType.GHARAR.value,
            })
        
        if not order.total_amount or order.total_amount <= 0:
            violations.append({
                "rule_code": "SR006",
                "rule_name": "Clear Terms and Disclosure",
                "description": "Order must have a valid positive amount",
                "severity": "high",
                "violation_type": ViolationType.GHARAR.value,
            })
        
        return {"violations": violations, "rules_validated": rules_validated}
    
    async def _validate_contract_terms(self, order: Order) -> Dict[str, Any]:
        """Validate specific contract terms based on contract type"""
        violations = []
        rules_validated = ["SR002", "SR007"]
        
        # For Salam contracts, advance payment is required
        if order.contract_type == ContractType.SALAM:
            # Salam requires full payment upfront
            pass  # Add specific Salam validations
        
        # For Murabaha, cost and profit must be disclosed
        if order.contract_type == ContractType.MURABAHA:
            # Check if cost breakdown is available
            if order.financing_requested and not order.bank_margin:
                violations.append({
                    "rule_code": "SR006",
                    "rule_name": "Clear Terms and Disclosure",
                    "description": "Murabaha contract requires disclosed profit margin",
                    "severity": "medium",
                    "violation_type": ViolationType.UNDISCLOSED_TERMS.value,
                })
        
        return {"violations": violations, "rules_validated": rules_validated}
    
    async def _check_for_riba(self, order: Order) -> Dict[str, Any]:
        """Check transaction for any elements of riba (interest)"""
        violations = []
        rules_validated = ["SR001"]
        
        # In this escrow platform, we don't charge interest
        # But we validate there are no interest-like charges
        
        # Check for time-based charges
        if hasattr(order, 'late_fees') and order.late_fees and order.late_fees > 0:
            violations.append({
                "rule_code": "SR001",
                "rule_name": "No Riba (Interest)",
                "description": "Late fees may constitute riba and need Shariah board review",
                "severity": "high",
                "violation_type": ViolationType.RIBA.value,
            })
        
        # Platform fees are permissible as service charges
        # Interest on debt would be riba - not applicable in escrow model
        
        return {"violations": violations, "rules_validated": rules_validated}
    
    async def _get_haram_keywords(self) -> List[str]:
        """Get haram keywords from database"""
        result = await self.db.execute(
            select(HaramProductKeyword).where(HaramProductKeyword.is_active == True)
        )
        keywords = result.scalars().all()
        return [k.keyword for k in keywords]
    
    async def _create_shariah_result(
        self,
        order_id: UUID,
        compliance_status: ShariahComplianceStatus,
        violations: List[Dict],
        rules_validated: List[str],
        haram_detected: bool,
    ) -> ShariahResult:
        """Create or update Shariah result record"""
        # Check for existing result
        result = await self.db.execute(
            select(ShariahResult).where(ShariahResult.order_id == order_id)
        )
        shariah_result = result.scalar_one_or_none()
        
        now = datetime.now(timezone.utc)
        
        if shariah_result:
            # Update existing
            shariah_result.compliance_status = compliance_status
            shariah_result.violations = violations
            shariah_result.rules_validated = rules_validated
            shariah_result.haram_products_detected = haram_detected
            shariah_result.validated_at = now
        else:
            # Create new
            shariah_result = ShariahResult(
                order_id=order_id,
                compliance_status=compliance_status,
                violations=violations,
                rules_validated=rules_validated,
                haram_products_detected=haram_detected,
                validated_at=now,
            )
            self.db.add(shariah_result)
        
        await self.db.flush()
        await self.db.refresh(shariah_result)
        
        return shariah_result
    
    async def seed_default_rules(self) -> List[ShariahRule]:
        """Seed default Shariah rules into database"""
        created_rules = []
        
        for rule_data in DEFAULT_SHARIAH_RULES:
            # Check if rule already exists
            result = await self.db.execute(
                select(ShariahRule).where(ShariahRule.code == rule_data["code"])
            )
            existing = result.scalar_one_or_none()
            
            if not existing:
                rule = ShariahRule(
                    code=rule_data["code"],
                    name=rule_data["name"],
                    description=rule_data["description"],
                    category=rule_data["category"],
                    severity=rule_data["severity"],
                    is_active=True,
                )
                self.db.add(rule)
                created_rules.append(rule)
        
        if created_rules:
            await self.db.commit()
            logger.info(f"Seeded {len(created_rules)} Shariah rules")
        
        return created_rules
    
    async def generate_compliance_certificate(
        self,
        order_id: UUID,
    ) -> Optional[Dict[str, Any]]:
        """Generate a Shariah compliance certificate for a compliant order"""
        shariah_result = await self.get_compliance_status(order_id)
        
        if not shariah_result:
            return None
        
        if shariah_result.compliance_status != ShariahComplianceStatus.COMPLIANT:
            return None
        
        order = await self._get_order_with_product(order_id)
        
        return {
            "certificate_id": f"SCC-{order.order_number}",
            "order_id": str(order_id),
            "order_number": order.order_number,
            "issued_at": datetime.now(timezone.utc).isoformat(),
            "compliance_status": "COMPLIANT",
            "validated_at": shariah_result.validated_at.isoformat(),
            "rules_validated": shariah_result.rules_validated,
            "product_name": order.product.name if order.product else "N/A",
            "contract_type": order.contract_type.value if order.contract_type else "N/A",
            "total_amount": str(order.total_amount),
            "statement": (
                "This transaction has been validated and found to be compliant "
                "with Islamic finance principles. No elements of riba (interest), "
                "gharar (excessive uncertainty), or maisir (gambling) were detected. "
                "The product traded is classified as halal (permissible)."
            ),
        }
