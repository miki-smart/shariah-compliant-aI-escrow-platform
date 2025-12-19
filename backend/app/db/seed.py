"""
Database Seed Script
Seeds initial users and data that correspond to Keycloak users
"""
import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select

from app.core.config import settings
from app.models.user import User, UserRole, UserStatus, BusinessType
from app.models.product import Product, ShariahCategory, ProductCategory, ProductStatus, HaramProductKeyword
from app.models.shariah_result import ShariahRule, ViolationType
from app.core.logging import get_logger
import bcrypt


def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


# Default passwords for seed users (matching Keycloak realm config)
USER_PASSWORDS = {
    "admin": "admin123",
    "bank_officer": "bank123",
    "shariah_officer": "shariah123",
    "delivery_user": "delivery123",
    "buyer_demo": "buyer123",
    "seller_demo": "seller123",
}

logger = get_logger(__name__)


# Keycloak user IDs (must match realm-config)
KEYCLOAK_USERS = {
    "admin": {
        "keycloak_id": UUID("11111111-1111-1111-1111-111111111111"),
        "email": "admin@escrow-platform.com",
        "username": "admin",
        "first_name": "Platform",
        "last_name": "Administrator",
        "role": UserRole.ADMIN,
        "status": UserStatus.ACTIVE,
        "business_type": None,
        "phone_number": "+60123456001",
    },
    "bank_officer": {
        "keycloak_id": UUID("22222222-2222-2222-2222-222222222222"),
        "email": "bank@islamicbank.com",
        "username": "bank_officer",
        "first_name": "Ahmad",
        "last_name": "Ibrahim",
        "role": UserRole.BANK,
        "status": UserStatus.ACTIVE,
        "business_name": "Islamic Bank Malaysia Berhad",
        "business_type": BusinessType.ISLAMIC_BANK,
        "business_registration_number": "IBK-199401001234",
        "phone_number": "+60123456002",
    },
    "shariah_officer": {
        "keycloak_id": UUID("33333333-3333-3333-3333-333333333333"),
        "email": "shariah@escrow-platform.com",
        "username": "shariah_officer",
        "first_name": "Dr. Yusuf",
        "last_name": "Al-Qaradawi",
        "role": UserRole.SHARIAH_OFFICER,
        "status": UserStatus.ACTIVE,
        "business_type": None,
        "shariah_certification": "Certified Islamic Finance Professional (CIFP)",
        "phone_number": "+60123456003",
    },
    "delivery_user": {
        "keycloak_id": UUID("44444444-4444-4444-4444-444444444444"),
        "email": "delivery@fastlogistics.com",
        "username": "delivery_user",
        "first_name": "Ali",
        "last_name": "Rahman",
        "role": UserRole.DELIVERY_PROVIDER,
        "status": UserStatus.ACTIVE,
        "business_name": "Fast Logistics Sdn Bhd",
        "business_type": BusinessType.LOGISTICS,
        "business_registration_number": "SSM-202401005555",
        "phone_number": "+60123456004",
    },
    "buyer_demo": {
        "keycloak_id": UUID("55555555-5555-5555-5555-555555555555"),
        "email": "buyer@msme-retail.com",
        "username": "buyer_demo",
        "first_name": "Hassan",
        "last_name": "Abdullah",
        "role": UserRole.BUYER,
        "status": UserStatus.ACTIVE,
        "business_name": "MSME Retail Shop",
        "business_type": BusinessType.RETAILER,
        "business_registration_number": "SSM-2024-001234",
        "phone_number": "+60123456005",
        "address_line_1": "123 Jalan Merdeka",
        "city": "Kuala Lumpur",
        "state": "Wilayah Persekutuan",
        "postal_code": "50000",
        "country": "MY",
    },
    "seller_demo": {
        "keycloak_id": UUID("66666666-6666-6666-6666-666666666666"),
        "email": "seller@wholesale-goods.com",
        "username": "seller_demo",
        "first_name": "Fatimah",
        "last_name": "Zahra",
        "role": UserRole.SELLER,
        "status": UserStatus.ACTIVE,
        "business_name": "Wholesale Goods Trading",
        "business_type": BusinessType.WHOLESALER,
        "business_registration_number": "SSM-2024-005678",
        "phone_number": "+60123456006",
        "address_line_1": "456 Jalan Industri",
        "city": "Shah Alam",
        "state": "Selangor",
        "postal_code": "40000",
        "country": "MY",
        "is_shariah_compliant": True,
    },
}


# Sample halal products for demo
SAMPLE_PRODUCTS = [
    {
        "name": "Organic Rice (25kg)",
        "description": "Premium organic rice from local farms. Halal certified.",
        "category": ProductCategory.FOOD_BEVERAGE,
        "shariah_category": ShariahCategory.HALAL,
        "price": Decimal("89.90"),
        "stock_quantity": 100,
        "sku": "RICE-ORG-25KG",
    },
    {
        "name": "Cooking Oil (5L)",
        "description": "Pure vegetable cooking oil. Halal certified.",
        "category": ProductCategory.FOOD_BEVERAGE,
        "shariah_category": ShariahCategory.HALAL,
        "price": Decimal("32.50"),
        "stock_quantity": 200,
        "sku": "OIL-VEG-5L",
    },
    {
        "name": "Office Furniture Set",
        "description": "Complete office furniture set including desk and chairs.",
        "category": ProductCategory.MANUFACTURING,
        "shariah_category": ShariahCategory.HALAL,
        "price": Decimal("1500.00"),
        "stock_quantity": 20,
        "sku": "FURN-OFF-SET",
    },
    {
        "name": "Industrial Equipment Parts",
        "description": "Replacement parts for manufacturing equipment.",
        "category": ProductCategory.MANUFACTURING,
        "shariah_category": ShariahCategory.HALAL,
        "price": Decimal("2500.00"),
        "stock_quantity": 15,
        "sku": "IND-PARTS-001",
    },
    {
        "name": "Textile Fabric Roll",
        "description": "High-quality cotton fabric for garment manufacturing.",
        "category": ProductCategory.CLOTHING_TEXTILE,
        "shariah_category": ShariahCategory.HALAL,
        "price": Decimal("450.00"),
        "stock_quantity": 50,
        "sku": "TEX-COT-ROLL",
    },
]


# Haram product keywords for Shariah validation
HARAM_KEYWORDS = [
    # Alcohol
    {"keyword": "alcohol", "category": "alcohol"},
    {"keyword": "wine", "category": "alcohol"},
    {"keyword": "beer", "category": "alcohol"},
    {"keyword": "vodka", "category": "alcohol"},
    {"keyword": "whisky", "category": "alcohol"},
    {"keyword": "whiskey", "category": "alcohol"},
    {"keyword": "rum", "category": "alcohol"},
    {"keyword": "gin", "category": "alcohol"},
    {"keyword": "brandy", "category": "alcohol"},
    {"keyword": "liquor", "category": "alcohol"},
    {"keyword": "spirits", "category": "alcohol"},
    {"keyword": "champagne", "category": "alcohol"},
    # Pork
    {"keyword": "pork", "category": "pork"},
    {"keyword": "ham", "category": "pork"},
    {"keyword": "bacon", "category": "pork"},
    {"keyword": "lard", "category": "pork"},
    {"keyword": "pig", "category": "pork"},
    {"keyword": "swine", "category": "pork"},
    # Gambling
    {"keyword": "gambling", "category": "gambling"},
    {"keyword": "casino", "category": "gambling"},
    {"keyword": "lottery", "category": "gambling"},
    {"keyword": "betting", "category": "gambling"},
    {"keyword": "poker", "category": "gambling"},
    # Tobacco
    {"keyword": "tobacco", "category": "tobacco"},
    {"keyword": "cigarette", "category": "tobacco"},
    {"keyword": "cigar", "category": "tobacco"},
    # Financial haram
    {"keyword": "interest", "category": "riba"},
    {"keyword": "usury", "category": "riba"},
]


# Shariah rules
SHARIAH_RULES = [
    {
        "rule_code": "SR001",
        "rule_name": "No Riba (Interest)",
        "description": "Transaction must not contain any form of interest or usury",
        "rule_category": "financial",
        "severity": "critical",
        "violation_type": ViolationType.RIBA,
        "condition": "no_interest_charges",
    },
    {
        "rule_code": "SR002",
        "rule_name": "No Gharar (Excessive Uncertainty)",
        "description": "Transaction must not have excessive uncertainty in terms",
        "rule_category": "contractual",
        "severity": "high",
        "violation_type": ViolationType.GHARAR,
        "condition": "clear_terms_defined",
    },
    {
        "rule_code": "SR003",
        "rule_name": "No Maisir (Gambling)",
        "description": "Transaction must not involve gambling or speculation",
        "rule_category": "ethical",
        "severity": "critical",
        "violation_type": ViolationType.MAISIR,
        "condition": "no_gambling_elements",
    },
    {
        "rule_code": "SR004",
        "rule_name": "Halal Products Only",
        "description": "Products must be halal (permissible under Islamic law)",
        "rule_category": "product",
        "severity": "critical",
        "violation_type": ViolationType.HARAM_PRODUCT,
        "condition": "product_is_halal",
    },
    {
        "rule_code": "SR005",
        "rule_name": "Valid Contract Type",
        "description": "Transaction must follow valid Islamic contract structure (Murabaha, Salam, Istisna)",
        "rule_category": "contractual",
        "severity": "high",
        "violation_type": ViolationType.CONTRACT_VIOLATION,
        "condition": "valid_islamic_contract",
    },
    {
        "rule_code": "SR006",
        "rule_name": "Clear Terms and Disclosure",
        "description": "All terms must be clearly disclosed to all parties",
        "rule_category": "transparency",
        "severity": "medium",
        "violation_type": ViolationType.GHARAR,
        "condition": "terms_disclosed",
    },
    {
        "rule_code": "SR007",
        "rule_name": "Ownership Before Sale",
        "description": "Seller must have ownership/possession of goods before sale",
        "rule_category": "ownership",
        "severity": "high",
        "violation_type": ViolationType.CONTRACT_VIOLATION,
        "condition": "seller_has_ownership",
    },
]


async def seed_users(db: AsyncSession) -> None:
    """Seed initial users from Keycloak configuration"""
    logger.info("Seeding users...")
    
    for name, user_data in KEYCLOAK_USERS.items():
        # Check if user already exists
        result = await db.execute(
            select(User).where(User.keycloak_id == user_data["keycloak_id"])
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            logger.info(f"User {name} already exists, skipping")
            continue
        
        user = User(
            keycloak_id=user_data["keycloak_id"],
            email=user_data["email"],
            username=user_data["username"],
            first_name=user_data["first_name"],
            last_name=user_data["last_name"],
            role=user_data["role"],
            status=user_data["status"],
            phone_number=user_data.get("phone_number"),
            business_name=user_data.get("business_name"),
            business_type=user_data.get("business_type"),
            business_registration_number=user_data.get("business_registration_number"),
            address_line_1=user_data.get("address_line_1"),
            city=user_data.get("city"),
            state=user_data.get("state"),
            postal_code=user_data.get("postal_code"),
            country=user_data.get("country", "MY"),
            shariah_certification=user_data.get("shariah_certification"),
            is_shariah_compliant=user_data.get("is_shariah_compliant", True),
            keycloak_attributes={
                "password_hash": hash_password(USER_PASSWORDS.get(name, "password123"))
            }
        )
        db.add(user)
        logger.info(f"Created user: {name} ({user_data['role'].value})")
    
    await db.commit()
    logger.info("Users seeded successfully")


async def seed_products(db: AsyncSession) -> None:
    """Seed sample products"""
    logger.info("Seeding products...")
    
    # Get seller user
    result = await db.execute(
        select(User).where(User.username == "seller_demo")
    )
    seller = result.scalar_one_or_none()
    
    if not seller:
        logger.warning("Seller user not found, skipping product seeding")
        return
    
    for product_data in SAMPLE_PRODUCTS:
        # Check if product already exists
        result = await db.execute(
            select(Product).where(Product.sku == product_data["sku"])
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            logger.info(f"Product {product_data['sku']} already exists, skipping")
            continue
        
        product = Product(
            seller_id=seller.id,
            name=product_data["name"],
            description=product_data["description"],
            category=product_data["category"],
            shariah_category=product_data["shariah_category"],
            price=product_data["price"],
            stock_quantity=product_data["stock_quantity"],
            sku=product_data["sku"],
            status=ProductStatus.ACTIVE,
            is_active=True,
        )
        db.add(product)
        logger.info(f"Created product: {product_data['name']}")
    
    await db.commit()
    logger.info("Products seeded successfully")


async def seed_haram_keywords(db: AsyncSession) -> None:
    """Seed haram product keywords"""
    logger.info("Seeding haram keywords...")
    
    for kw_data in HARAM_KEYWORDS:
        # Check if keyword already exists
        result = await db.execute(
            select(HaramProductKeyword).where(HaramProductKeyword.keyword == kw_data["keyword"])
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            continue
        
        haram_keyword = HaramProductKeyword(
            keyword=kw_data["keyword"],
            category=kw_data["category"],
            is_active=True,
        )
        db.add(haram_keyword)
    
    await db.commit()
    logger.info(f"Seeded {len(HARAM_KEYWORDS)} haram keywords")


async def seed_shariah_rules(db: AsyncSession) -> None:
    """Seed Shariah rules"""
    logger.info("Seeding Shariah rules...")
    
    for rule_data in SHARIAH_RULES:
        # Check if rule already exists
        result = await db.execute(
            select(ShariahRule).where(ShariahRule.rule_code == rule_data["rule_code"])
        )
        existing = result.scalar_one_or_none()
        
        if existing:
            logger.info(f"Rule {rule_data['rule_code']} already exists, skipping")
            continue
        
        rule = ShariahRule(
            rule_code=rule_data["rule_code"],
            rule_name=rule_data["rule_name"],
            description=rule_data["description"],
            rule_category=rule_data["rule_category"],
            severity=rule_data["severity"],
            violation_type=rule_data["violation_type"],
            condition=rule_data["condition"],
            is_active=True,
        )
        db.add(rule)
        logger.info(f"Created rule: {rule_data['rule_code']}")
    
    await db.commit()
    logger.info("Shariah rules seeded successfully")


async def run_seed():
    """Run all seed functions"""
    logger.info("Starting database seeding...")
    
    engine = create_async_engine(str(settings.DATABASE_URL), echo=True)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as db:
        try:
            await seed_users(db)
            await seed_products(db)
            await seed_haram_keywords(db)
            await seed_shariah_rules(db)
            logger.info("Database seeding completed successfully!")
        except Exception as e:
            logger.error(f"Seeding failed: {e}")
            await db.rollback()
            raise
    
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run_seed())
