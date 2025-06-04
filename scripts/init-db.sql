-- Initial database setup script
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create contact_fields table (for custom fields)
CREATE TABLE IF NOT EXISTS contact_fields (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('text', 'email', 'phone', 'textarea', 'select', 'date')),
    required BOOLEAN DEFAULT FALSE,
    position INTEGER DEFAULT 0,
    options TEXT[], -- For select fields
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    telegram_id VARCHAR(50) UNIQUE,
    telegram_username VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create contact_data table (for custom field values)
CREATE TABLE IF NOT EXISTS contact_data (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
    field_id INTEGER REFERENCES contact_fields(id) ON DELETE CASCADE,
    value TEXT,
    UNIQUE(contact_id, field_id)
);

-- Create deal_stages table
CREATE TABLE IF NOT EXISTS deal_stages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    position INTEGER DEFAULT 0,
    auto_transition_rules JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create deals table
CREATE TABLE IF NOT EXISTS deals (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    amount DECIMAL(15,2) DEFAULT 0,
    stage_id INTEGER REFERENCES deal_stages(id),
    probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
    products TEXT[],
    planned_close_date DATE,
    actual_close_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
    telegram_message_id INTEGER,
    content TEXT,
    type VARCHAR(50) DEFAULT 'text',
    direction VARCHAR(10) CHECK (direction IN ('incoming', 'outgoing')),
    file_path VARCHAR(500),
    file_name VARCHAR(255),
    file_size INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create files table
CREATE TABLE IF NOT EXISTS files (
    id SERIAL PRIMARY KEY,
    telegram_file_id VARCHAR(255),
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    size INTEGER,
    mime_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_contacts_telegram_id ON contacts(telegram_id);
CREATE INDEX IF NOT EXISTS idx_contacts_telegram_username ON contacts(telegram_username);
CREATE INDEX IF NOT EXISTS idx_messages_contact_id ON messages(contact_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage_id ON deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_contact_data_contact_id ON contact_data(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_data_field_id ON contact_data(field_id);

-- Insert default admin user (password: admin123456)
INSERT INTO users (email, password_hash, role)
VALUES ('admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2ukD2LB5OG', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert default contact fields
INSERT INTO contact_fields (name, type, required, position) VALUES
    ('Имя', 'text', true, 1),
    ('Телефон', 'phone', false, 2),
    ('Email', 'email', false, 3),
    ('Заметки', 'textarea', false, 4)
ON CONFLICT DO NOTHING;

-- Insert default deal stages
INSERT INTO deal_stages (name, position) VALUES
    ('Новый лид', 1),
    ('Переговоры', 2),
    ('Предложение', 3),
    ('Сделка закрыта', 4)
ON CONFLICT DO NOTHING;