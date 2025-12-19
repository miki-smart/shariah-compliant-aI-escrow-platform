"""
External Shariah Compliance Service
Integrates with external AI service for text and image compliance checking
"""
import httpx
import base64
from typing import Optional, Dict, Any, Tuple
from enum import Enum
from dataclasses import dataclass
from io import BytesIO

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class ShariahDecision(str, Enum):
    """Shariah compliance decision from external service"""
    HALAL = "HALAL"
    HARAM = "HARAM"
    MASHBOOH = "MASHBOOH"  # Doubtful


@dataclass
class ShariahCheckResult:
    """Result from Shariah compliance check"""
    decision: ShariahDecision
    reason: str
    detected_issues: list
    confidence: float
    raw_response: Optional[Dict[str, Any]] = None
    
    @property
    def is_compliant(self) -> bool:
        return self.decision == ShariahDecision.HALAL
    
    @property
    def is_haram(self) -> bool:
        return self.decision == ShariahDecision.HARAM
    
    @property
    def requires_review(self) -> bool:
        return self.decision == ShariahDecision.MASHBOOH
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "decision": self.decision.value,
            "reason": self.reason,
            "detected_issues": self.detected_issues,
            "confidence": self.confidence,
            "is_compliant": self.is_compliant,
            "is_haram": self.is_haram,
            "requires_review": self.requires_review,
        }


class ExternalShariahComplianceService:
    """
    Service for calling external Shariah compliance checking API.
    
    External service endpoints:
    - POST /check-text: Check text content for Shariah compliance
    - POST /check-image: Check images for Shariah compliance (e.g., alcohol detection)
    """
    
    def __init__(self):
        self.base_url = settings.SHARIAH_COMPLIANCE_SERVICE_URL
        self.check_text_endpoint = settings.SHARIAH_CHECK_TEXT_ENDPOINT
        self.check_image_endpoint = settings.SHARIAH_CHECK_IMAGE_ENDPOINT
        self.timeout = 30.0  # seconds
    
    async def check_text(self, text: str) -> ShariahCheckResult:
        """
        Check text content for Shariah compliance.
        
        Args:
            text: Text to check (product name, description, etc.)
            
        Returns:
            ShariahCheckResult with decision and details
            
        Example input: "ወለድ 12% ብድር" (Interest-based loan)
        Example output: {
            "decision": "HARAM",
            "reason": "Interest-based loan (riba)",
            "detected_issues": ["interest"],
            "confidence": 0.9
        }
        """
        try:
            url = f"{self.base_url}{self.check_text_endpoint}"
            
            logger.info(f"Checking text for Shariah compliance: {text[:100]}...")
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    url,
                    data=text,
                    headers={"Content-Type": "text/plain"}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return self._parse_response(data)
                else:
                    logger.error(
                        f"Shariah text check failed: {response.status_code} - {response.text}"
                    )
                    # Return a default "requires review" result on error
                    return ShariahCheckResult(
                        decision=ShariahDecision.MASHBOOH,
                        reason=f"External service error: {response.status_code}",
                        detected_issues=[],
                        confidence=0.0,
                        raw_response={"error": response.text}
                    )
                    
        except httpx.TimeoutException:
            logger.error("Shariah text check timed out")
            return ShariahCheckResult(
                decision=ShariahDecision.MASHBOOH,
                reason="Service timeout - manual review required",
                detected_issues=[],
                confidence=0.0,
            )
        except Exception as e:
            logger.error(f"Shariah text check error: {str(e)}")
            return ShariahCheckResult(
                decision=ShariahDecision.MASHBOOH,
                reason=f"Service error: {str(e)}",
                detected_issues=[],
                confidence=0.0,
            )
    
    async def check_image(
        self,
        image_data: bytes,
        filename: str = "image.jpg",
        content_type: str = "image/jpeg"
    ) -> ShariahCheckResult:
        """
        Check image for Shariah compliance (e.g., alcohol, haram products).
        
        Args:
            image_data: Raw image bytes
            filename: Original filename
            content_type: MIME type of the image
            
        Returns:
            ShariahCheckResult with decision and details
            
        Example: Upload image of alcohol bottles
        Example output: {
            "decision": "HARAM",
            "reason": "Alcohol bottles detected visually",
            "detected_issues": ["alcohol"],
            "confidence": 0.95
        }
        """
        try:
            url = f"{self.base_url}{self.check_image_endpoint}"
            
            logger.info(f"Checking image for Shariah compliance: {filename}")
            
            # Prepare multipart form data
            files = {
                "file": (filename, image_data, content_type)
            }
            
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, files=files)
                
                if response.status_code == 200:
                    data = response.json()
                    return self._parse_image_response(data)
                else:
                    logger.error(
                        f"Shariah image check failed: {response.status_code} - {response.text}"
                    )
                    return ShariahCheckResult(
                        decision=ShariahDecision.MASHBOOH,
                        reason=f"External service error: {response.status_code}",
                        detected_issues=[],
                        confidence=0.0,
                        raw_response={"error": response.text}
                    )
                    
        except httpx.TimeoutException:
            logger.error("Shariah image check timed out")
            return ShariahCheckResult(
                decision=ShariahDecision.MASHBOOH,
                reason="Service timeout - manual review required",
                detected_issues=[],
                confidence=0.0,
            )
        except Exception as e:
            logger.error(f"Shariah image check error: {str(e)}")
            return ShariahCheckResult(
                decision=ShariahDecision.MASHBOOH,
                reason=f"Service error: {str(e)}",
                detected_issues=[],
                confidence=0.0,
            )
    
    async def check_image_base64(
        self,
        base64_image: str,
        filename: str = "image.jpg"
    ) -> ShariahCheckResult:
        """
        Check base64-encoded image for Shariah compliance.
        
        Args:
            base64_image: Base64-encoded image string
            filename: Original filename for MIME type detection
            
        Returns:
            ShariahCheckResult with decision and details
        """
        try:
            # Decode base64
            image_data = base64.b64decode(base64_image)
            
            # Determine content type from filename
            content_type = "image/jpeg"
            if filename.lower().endswith(".png"):
                content_type = "image/png"
            elif filename.lower().endswith(".gif"):
                content_type = "image/gif"
            elif filename.lower().endswith(".webp"):
                content_type = "image/webp"
            
            return await self.check_image(image_data, filename, content_type)
            
        except Exception as e:
            logger.error(f"Failed to decode base64 image: {str(e)}")
            return ShariahCheckResult(
                decision=ShariahDecision.MASHBOOH,
                reason=f"Invalid image data: {str(e)}",
                detected_issues=[],
                confidence=0.0,
            )
    
    async def check_product(
        self,
        name: str,
        description: Optional[str] = None,
        image_data: Optional[bytes] = None,
        image_filename: Optional[str] = None,
    ) -> Tuple[ShariahCheckResult, Optional[ShariahCheckResult]]:
        """
        Comprehensive product Shariah compliance check.
        Checks both text (name + description) and optionally the product image.
        
        Args:
            name: Product name
            description: Product description
            image_data: Optional product image bytes
            image_filename: Optional image filename
            
        Returns:
            Tuple of (text_result, image_result or None)
        """
        # Check text content
        text_to_check = name
        if description:
            text_to_check = f"{name}\n{description}"
        
        text_result = await self.check_text(text_to_check)
        
        # Check image if provided
        image_result = None
        if image_data and image_filename:
            image_result = await self.check_image(image_data, image_filename)
        
        return text_result, image_result
    
    def _parse_response(self, data: Dict[str, Any]) -> ShariahCheckResult:
        """Parse response from /check-text endpoint"""
        decision_str = data.get("decision", "MASHBOOH").upper()
        
        try:
            decision = ShariahDecision(decision_str)
        except ValueError:
            decision = ShariahDecision.MASHBOOH
        
        return ShariahCheckResult(
            decision=decision,
            reason=data.get("reason", "No reason provided"),
            detected_issues=data.get("detected_issues", []),
            confidence=float(data.get("confidence", 0.0)),
            raw_response=data,
        )
    
    def _parse_image_response(self, data: Dict[str, Any]) -> ShariahCheckResult:
        """Parse response from /check-image endpoint"""
        # Handle nested agent_decision format
        if "agent_decision" in data:
            agent_data = data.get("agent_decision", "")
            # Parse JSON string if needed
            if isinstance(agent_data, str):
                try:
                    import json
                    agent_data = json.loads(agent_data)
                except:
                    pass
            
            if isinstance(agent_data, dict):
                decision_str = agent_data.get("decision", "MASHBOOH").upper()
                reason = agent_data.get("reason", data.get("reason", "No reason provided"))
                detected_issues = agent_data.get("detected_issues", [])
                confidence = float(agent_data.get("confidence", data.get("ocr_confidence", 0.0)))
            else:
                decision_str = "MASHBOOH"
                reason = str(agent_data)
                detected_issues = data.get("vision_detected", [])
                confidence = float(data.get("ocr_confidence", 0.0))
        else:
            decision_str = data.get("decision", "MASHBOOH").upper()
            reason = data.get("reason", "No reason provided")
            detected_issues = data.get("detected_issues", data.get("vision_detected", []))
            confidence = float(data.get("confidence", data.get("ocr_confidence", 0.0)))
        
        try:
            decision = ShariahDecision(decision_str)
        except ValueError:
            decision = ShariahDecision.MASHBOOH
        
        return ShariahCheckResult(
            decision=decision,
            reason=reason,
            detected_issues=detected_issues,
            confidence=confidence,
            raw_response=data,
        )


# Singleton instance
_shariah_compliance_service: Optional[ExternalShariahComplianceService] = None


def get_shariah_compliance_service() -> ExternalShariahComplianceService:
    """Get singleton instance of External Shariah Compliance Service"""
    global _shariah_compliance_service
    if _shariah_compliance_service is None:
        _shariah_compliance_service = ExternalShariahComplianceService()
    return _shariah_compliance_service
