"""
Order & Trade Orchestration Service
Coordinates AI, Shariah, Escrow, and Delivery modules
Acts as the system orchestrator
"""
from sqlalchemy.orm import Session
from app.models.order import Order, OrderStatus
from app.models.product import Product
from app.models.user import User
from app.services.shariah_service import ShariahService
from app.services.ai_service import AIService
from app.services.escrow_service import EscrowService
from app.services.delivery_service import DeliveryService
from app.core.logging import get_logger
from typing import Optional
from uuid import UUID
from decimal import Decimal

logger = get_logger(__name__)


class OrchestrationService:
    """Order and trade orchestration service"""
    
    @staticmethod
    def create_order(
        db: Session,
        buyer_id: UUID,
        product_id: UUID,
        quantity: float,
        financing_requested: bool = False,
        notes: Optional[str] = None
    ) -> Order:
        """
        Create a new order and initiate the transaction flow
        Flow: OrderCreated -> ShariahValidation -> AIEvaluation -> BankReview -> EscrowLock
        """
        # Validate product
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ValueError(f"Product {product_id} not found")
        
        if not product.is_active:
            raise ValueError("Product is not active")
        
        # Validate buyer
        buyer = db.query(User).filter(User.id == buyer_id).first()
        if not buyer:
            raise ValueError(f"Buyer {buyer_id} not found")
        
        # Calculate total amount
        product_price = Decimal(str(product.price))
        total_amount = product_price * Decimal(str(quantity))
        
        # Create order
        order = Order(
            buyer_id=buyer_id,
            seller_id=product.seller_id,
            product_id=product_id,
            quantity=quantity,
            total_amount=total_amount,
            status=OrderStatus.CREATED,
            financing_requested=str(financing_requested),
            notes=notes
        )
        
        db.add(order)
        db.commit()
        db.refresh(order)
        
        logger.info(f"Order created: {order.id} by buyer {buyer_id}")
        
        # Event: OrderCreated
        # Automatically trigger Shariah validation
        try:
            OrchestrationService.validate_shariah(db, order.id)
        except Exception as e:
            logger.error(f"Shariah validation failed for order {order.id}: {e}")
            # Order remains in CREATED status if validation fails
        
        return order
    
    @staticmethod
    def validate_shariah(db: Session, order_id: UUID) -> Order:
        """
        Trigger Shariah validation
        Event: ShariahValidated
        """
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        # Validate Shariah compliance
        shariah_result = ShariahService.validate_order(db, order_id)
        
        # If haram detected, block immediately
        if shariah_result.haram_products_detected:
            logger.warning(
                f"Order {order_id} blocked due to Shariah violation: "
                f"haram products detected"
            )
            return order
        
        # If compliant, proceed to AI evaluation
        if shariah_result.compliant and order.status == OrderStatus.SHARIAH_APPROVED:
            try:
                OrchestrationService.evaluate_ai_risk(db, order_id)
            except Exception as e:
                logger.error(f"AI evaluation failed for order {order_id}: {e}")
        
        return order
    
    @staticmethod
    def evaluate_ai_risk(db: Session, order_id: UUID) -> Order:
        """
        Trigger AI risk evaluation
        Event: AIRiskEvaluated
        """
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        # Evaluate using AI
        ai_decision = AIService.evaluate_order(db, order_id)
        
        # If fraud detected or blocked, stop transaction
        if ai_decision.fraud_detected or ai_decision.decision == "BLOCK":
            logger.warning(
                f"Order {order_id} blocked by AI: "
                f"fraud={ai_decision.fraud_detected}, "
                f"decision={ai_decision.decision}"
            )
            return order
        
        # If ALLOW, order moves to BANK_PENDING for bank review
        if ai_decision.decision == "ALLOW":
            order.status = OrderStatus.BANK_PENDING
            db.commit()
            db.refresh(order)
        
        return order
    
    @staticmethod
    def bank_approve_financing(
        db: Session,
        order_id: UUID,
        bank_id: UUID
    ) -> Order:
        """
        Bank approves financing
        Event: BankApproved -> EscrowLocked
        """
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        if order.status != OrderStatus.BANK_PENDING:
            raise ValueError(
                f"Cannot approve order in status: {order.status}. "
                f"Expected: {OrderStatus.BANK_PENDING}"
            )
        
        # Update order
        order.bank_id = bank_id
        order.status = OrderStatus.BANK_APPROVED
        
        db.commit()
        db.refresh(order)
        
        logger.info(f"Bank {bank_id} approved financing for order {order_id}")
        
        # Lock funds in escrow
        try:
            escrow = EscrowService.lock_funds(db, order_id, bank_id)
            logger.info(f"Escrow locked for order {order_id}: {escrow.id}")
        except Exception as e:
            logger.error(f"Failed to lock escrow for order {order_id}: {e}")
            raise
        
        return order
    
    @staticmethod
    def bank_reject_financing(
        db: Session,
        order_id: UUID,
        bank_id: UUID,
        reason: Optional[str] = None
    ) -> Order:
        """
        Bank rejects financing
        """
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        order.bank_id = bank_id
        order.status = OrderStatus.BANK_REJECTED
        
        if reason:
            if order.notes:
                order.notes += f"\nBank rejection: {reason}"
            else:
                order.notes = f"Bank rejection: {reason}"
        
        db.commit()
        db.refresh(order)
        
        logger.info(f"Bank {bank_id} rejected financing for order {order_id}: {reason}")
        
        return order
    
    @staticmethod
    def process_delivery_confirmation(
        db: Session,
        order_id: UUID,
        buyer_confirmed: bool
    ) -> Order:
        """
        Process delivery confirmation from buyer
        Flow: DeliveryConfirmed -> AIValidation -> EscrowRelease
        """
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        if order.status != OrderStatus.DELIVERED:
            raise ValueError(
                f"Cannot confirm delivery for order in status: {order.status}. "
                f"Expected: {OrderStatus.DELIVERED}"
            )
        
        # Confirm delivery
        delivery = DeliveryService.confirm_delivery(
            db, order_id, buyer_confirmed
        )
        
        if not buyer_confirmed:
            # Buyer rejected delivery - freeze escrow
            EscrowService.freeze_escrow(
                db, order_id, reason="Buyer rejected delivery"
            )
            return order
        
        # Validate delivery using AI
        ai_validated = AIService.validate_delivery(db, order_id)
        
        if ai_validated:
            DeliveryService.validate_delivery_ai(db, order_id, True)
            
            # Release escrow
            escrow = EscrowService.release_funds(db, order_id)
            logger.info(f"Escrow released for order {order_id}: {escrow.id}")
        else:
            # AI detected anomaly - freeze escrow
            DeliveryService.validate_delivery_ai(db, order_id, False)
            EscrowService.freeze_escrow(
                db, order_id, reason="AI validation failed"
            )
        
        return order
    
    @staticmethod
    def handle_shariah_violation_post_approval(
        db: Session,
        order_id: UUID
    ) -> Order:
        """
        Handle Shariah violation detected after approval
        Revert escrow to bank
        """
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        # Revert escrow
        escrow = EscrowService.revert_funds(
            db, order_id, reason="Shariah violation detected post-approval"
        )
        
        logger.warning(
            f"Shariah violation post-approval for order {order_id}. "
            f"Escrow reverted: {escrow.id}"
        )
        
        return order
    
    @staticmethod
    def handle_delivery_failure(
        db: Session,
        order_id: UUID,
        liable_party: str = "Provider"
    ) -> Order:
        """
        Handle delivery failure
        Freeze escrow and assign liability
        """
        order = db.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        # Update delivery status
        DeliveryService.update_delivery_status(
            db, order_id, DeliveryStatus.FAILED
        )
        
        # Assign liability
        DeliveryService.assign_liability(db, order_id, liable_party)
        
        # Freeze escrow
        EscrowService.freeze_escrow(
            db, order_id, reason=f"Delivery failed. Liability: {liable_party}"
        )
        
        logger.warning(
            f"Delivery failure for order {order_id}. "
            f"Liability assigned to: {liable_party}"
        )
        
        return order
    
    @staticmethod
    def get_order(db: Session, order_id: UUID) -> Order:
        """Get order with all related data"""
        order = db.query(Order).filter(Order.id == order_id).first()
        
        if not order:
            raise ValueError(f"Order {order_id} not found")
        
        return order

