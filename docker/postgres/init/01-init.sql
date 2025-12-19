-- Initialize escrow database extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schema for better organization (optional)
-- CREATE SCHEMA IF NOT EXISTS escrow;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE escrow_db TO escrow_user;
