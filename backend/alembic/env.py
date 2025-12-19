"""
Alembic Environment Configuration
Handles async migrations with SQLAlchemy
"""
import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Import your models' Base and all models for autogenerate
from app.core.database import Base
from app.core.config import settings

# Import all models so Alembic can see them
from app.models import (
    User, UserDocument,
    Product, ProductReview, HaramProductKeyword,
    Order, OrderStatusHistory,
    Escrow, EscrowTransaction,
    Delivery, DeliveryTrackingEvent, DeliveryConfirmation,
    ShariahResult, ShariahRule,
    AIDecision,
    AuditLog, SystemLog,
    Dispute, DisputeMessage, DisputeTimeline,
)

# this is the Alembic Config object
config = context.config

# Override sqlalchemy.url with our settings
config.set_main_option("sqlalchemy.url", str(settings.DATABASE_URL))

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Add your model's MetaData object here for 'autogenerate' support
target_metadata = Base.metadata

# Tables to exclude from migrations (Keycloak tables)
EXCLUDE_TABLES = {
    # Keycloak system tables
    "admin_event_entity", "associated_policy", "authentication_execution",
    "authentication_flow", "authenticator_config", "authenticator_config_entry",
    "broker_link", "client", "client_attributes", "client_auth_flow_bindings",
    "client_initial_access", "client_node_registrations", "client_scope",
    "client_scope_attributes", "client_scope_client", "client_scope_role_mapping",
    "client_session", "client_session_auth_status", "client_session_note",
    "client_session_prot_mapper", "client_session_role", "client_user_session_note",
    "component", "component_config", "composite_role", "credential",
    "databasechangelog", "databasechangeloglock", "default_client_scope",
    "event_entity", "fed_user_attribute", "fed_user_consent",
    "fed_user_consent_cl_scope", "fed_user_credential", "fed_user_group_membership",
    "fed_user_required_action", "fed_user_role_mapping", "federated_identity",
    "federated_user", "group_attribute", "group_role_mapping",
    "identity_provider", "identity_provider_config", "identity_provider_mapper",
    "idp_mapper_config", "keycloak_group", "keycloak_role", "migration_model",
    "offline_client_session", "offline_user_session", "policy_config",
    "protocol_mapper", "protocol_mapper_config", "realm", "realm_attribute",
    "realm_default_groups", "realm_enabled_event_types", "realm_events_listeners",
    "realm_localizations", "realm_required_credential", "realm_smtp_config",
    "realm_supported_locales", "redirect_uris", "required_action_config",
    "required_action_provider", "resource_attribute", "resource_policy",
    "resource_scope", "resource_server", "resource_server_perm_ticket",
    "resource_server_policy", "resource_server_resource", "resource_server_scope",
    "resource_uris", "role_attribute", "scope_mapping", "scope_policy",
    "user_attribute", "user_consent", "user_consent_client_scope", "user_entity",
    "user_federation_config", "user_federation_mapper", "user_federation_mapper_config",
    "user_federation_provider", "user_group_membership", "user_required_action",
    "user_role_mapping", "user_session", "user_session_note", "username_login_failure",
    "web_origins",
}


def include_object(object, name, type_, reflected, compare_to):
    """Filter out Keycloak tables from migrations"""
    if type_ == "table" and name in EXCLUDE_TABLES:
        return False
    return True


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.
    
    This configures the context with just a URL and not an Engine,
    though an Engine is acceptable here as well. By skipping the Engine
    creation we don't even need a DBAPI to be available.
    
    Calls to context.execute() here emit the given string to the
    script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    """Run migrations with the given connection"""
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        compare_server_default=True,
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """
    Run migrations in 'online' mode with async engine.
    
    In this scenario we need to create an Engine and associate a
    connection with the context.
    """
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
