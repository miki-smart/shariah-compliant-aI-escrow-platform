"""Update seed users with password hashes"""
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.models.user import User
import bcrypt

def hash_password(password: str) -> str:
    password_bytes = password.encode('utf-8')[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

USER_PASSWORDS = {
    'admin': 'admin123',
    'bank_officer': 'bank123',
    'shariah_officer': 'shariah123',
    'delivery_user': 'delivery123',
    'buyer_demo': 'buyer123',
    'seller_demo': 'seller123',
}

async def update_passwords():
    engine = create_async_engine(str(settings.DATABASE_URL))
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    async with async_session() as db:
        for username, password in USER_PASSWORDS.items():
            result = await db.execute(select(User).where(User.username == username))
            user = result.scalar_one_or_none()
            if user:
                attrs = user.keycloak_attributes or {}
                attrs['password_hash'] = hash_password(password)
                user.keycloak_attributes = attrs
                print(f'Updated password for {username}')
            else:
                print(f'User {username} not found')
        await db.commit()
        print('Done!')

if __name__ == '__main__':
    asyncio.run(update_passwords())
