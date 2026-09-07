-- Variant Hub Database Migration
-- Complete database schema for the centralized operations platform
-- Single SQL file with all tables

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) UNIQUE,
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'user',
    status VARCHAR(50) DEFAULT 'active',
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Adicionar coluna phone se não existir (para tabelas já criadas)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50) UNIQUE;

-- Criar índice para phone após adicionar a coluna
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- ============================================
-- CONFIGURATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(100),
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_configurations_key ON configurations(key);
CREATE INDEX IF NOT EXISTS idx_configurations_category ON configurations(category);

-- ============================================
-- INTEGRATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- whatsapp, instagram, facebook, telegram, tiktok, openai, gemini, claude
    status VARCHAR(50) DEFAULT 'active',
    config JSONB NOT NULL,
    credentials JSONB,
    webhook_url TEXT,
    connection_status VARCHAR(50) DEFAULT 'unknown', -- online, offline, unknown
    last_check TIMESTAMP WITH TIME ZONE,
    last_sync TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);


-- Garantir colunas adicionais (seguro: IF NOT EXISTS)
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS connection_status VARCHAR(50) DEFAULT 'unknown';
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS last_check TIMESTAMP WITH TIME ZONE;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS last_sync TIMESTAMP WITH TIME ZONE;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE integrations ADD COLUMN IF NOT EXISTS webhook_url TEXT;
CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);
CREATE INDEX IF NOT EXISTS idx_integrations_connection_status ON integrations(connection_status);

-- ============================================
-- WHATSAPP CONVERSATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jid VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    last_message TEXT,
    last_message_timestamp TIMESTAMP WITH TIME ZONE,
    unread_count INTEGER DEFAULT 0,
    integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_jid ON whatsapp_conversations(jid);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_integration_id ON whatsapp_conversations(integration_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_conversations_timestamp ON whatsapp_conversations(last_message_timestamp DESC);

-- ============================================
-- WHATSAPP MESSAGES
-- ============================================

CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jid VARCHAR(255) NOT NULL,
    message_content TEXT,
    direction VARCHAR(20) NOT NULL, -- inbound, outbound
    sender_type VARCHAR(20), -- user, contact
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    push_name VARCHAR(255),
    integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_jid ON whatsapp_messages(jid);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_integration_id ON whatsapp_messages(integration_id);

-- ============================================
-- ORDERS
-- ============================================

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50),
    customer_email VARCHAR(255),
    items JSONB NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, preparing, shipped, delivered
    origin_channel VARCHAR(50), -- instagram, facebook, telegram, tiktok, whatsapp, organic
    integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_origin_channel ON orders(origin_channel);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- ============================================
-- CUSTOMERS
-- ============================================

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255),
    origin_channel VARCHAR(50),
    stage VARCHAR(50) DEFAULT 'new_lead', -- new_lead, in_negotiation, first_purchase, recurring, inactive
    total_orders INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    last_order_date TIMESTAMP WITH TIME ZONE,
    integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_stage ON customers(stage);
CREATE INDEX IF NOT EXISTS idx_customers_origin_channel ON customers(origin_channel);

-- ============================================
-- PRODUCTS
-- ============================================

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10,2) NOT NULL,
    stock INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'available', -- available, low_stock, out_of_stock
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- ============================================
-- CHANNEL STATS (CACHE)
-- ============================================

CREATE TABLE IF NOT EXISTS channel_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_type VARCHAR(50) NOT NULL, -- instagram, facebook, telegram, tiktok
    stats_date DATE NOT NULL,
    reach INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2),
    clicks_to_whatsapp INTEGER DEFAULT 0,
    leads_generated INTEGER DEFAULT 0,
    integration_id UUID REFERENCES integrations(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(channel_type, stats_date)
);

CREATE INDEX IF NOT EXISTS idx_channel_stats_type_date ON channel_stats(channel_type, stats_date);

-- ============================================
-- LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level VARCHAR(20) NOT NULL, -- info, warning, error, debug
    message TEXT NOT NULL,
    context JSONB,
    source VARCHAR(100), -- system, api, frontend
    user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_source ON logs(source);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_configurations_updated_at ON configurations;
CREATE TRIGGER update_configurations_updated_at BEFORE UPDATE ON configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_integrations_updated_at ON integrations;
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_whatsapp_conversations_updated_at ON whatsapp_conversations;
CREATE TRIGGER update_whatsapp_conversations_updated_at BEFORE UPDATE ON whatsapp_conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_channel_stats_updated_at ON channel_stats;
CREATE TRIGGER update_channel_stats_updated_at BEFORE UPDATE ON channel_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- USUARIO ADMIN PADRAO
-- (A senha NAO e verificada nesta versao do login; basta o email existir no banco.)
-- ============================================
INSERT INTO users (email, password_hash, name, role, status)
VALUES ('admin@variant.app', 'demo-password-hash', 'Admin Variant Hub', 'admin', 'active')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- ROW LEVEL SECURITY PARA TABELA USERS
-- ============================================

-- Habilitar RLS na tabela users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Política para permitir INSERT (registro) para usuários anônimos e autenticados
CREATE POLICY "Allow public insert on users" ON users
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Política para permitir SELECT (login) para usuários anônimos e autenticados
CREATE POLICY "Allow public select on users" ON users
FOR SELECT
TO anon, authenticated
USING (true);

-- Política para permitir UPDATE para usuários autenticados
CREATE POLICY "Allow authenticated update on users" ON users
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
