"""
Application Configuration
Centralized settings management using Pydantic
"""
from pydantic_settings import BaseSettings
from pydantic import Field, PostgresDsn, AnyHttpUrl
from typing import Optional, List
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Application
    APP_NAME: str = "Shariah-Compliant AI Escrow Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    
    # Database
    DATABASE_URL: PostgresDsn = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/escrow_db"
    )
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DATABASE_POOL_TIMEOUT: int = 30
    DATABASE_ECHO: bool = False
    
    # Keycloak
    KEYCLOAK_SERVER_URL: AnyHttpUrl = Field(default="http://localhost:8080")
    KEYCLOAK_REALM: str = "escrow-platform"
    KEYCLOAK_CLIENT_ID: str = "escrow-backend"
    KEYCLOAK_CLIENT_SECRET: Optional[str] = None
    KEYCLOAK_ADMIN_USERNAME: str = "admin"
    KEYCLOAK_ADMIN_PASSWORD: str = "admin"
    
    # JWT
    JWT_ALGORITHM: str = "RS256"
    JWT_AUDIENCE: str = "escrow-backend"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Business Rules
    DELIVERY_CONFIRMATION_WINDOW_HOURS: int = 72
    ESCROW_RELEASE_VALIDATION_HOURS: int = 24
    DISPUTE_RESOLUTION_DAYS: int = 14
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()
