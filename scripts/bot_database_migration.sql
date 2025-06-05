-- Миграция для создания таблиц Telegram бота SQUARE
BEGIN;

-- Пользователи бота
CREATE TABLE IF NOT EXISTS bot_users (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone VARCHAR(20),
    is_subscribed BOOLEAN DEFAULT true,
    total_calculations INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    registration_date TIMESTAMP DEFAULT NOW(),
    last_activity TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Расчеты товаров
CREATE TABLE IF NOT EXISTS product_calculations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES bot_users(id) ON DELETE CASCADE,
    spu_id VARCHAR(100) NOT NULL,
    product_title VARCHAR(500),
    category VARCHAR(50),
    size VARCHAR(20),
    original_price DECIMAL(10,2),
    calculated_price_standard DECIMAL(10,2),
    calculated_price_express DECIMAL(10,2),
    poizon_url TEXT,
    product_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Заказы через бота
CREATE TABLE IF NOT EXISTS bot_orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES bot_users(id) ON DELETE CASCADE,
    calculation_id INTEGER REFERENCES product_calculations(id),
    order_number VARCHAR(50) UNIQUE DEFAULT 'SQ-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('bot_orders_id_seq')::text, 4, '0'),
    product_title VARCHAR(500),
    product_size VARCHAR(20),
    category VARCHAR(50),
    crm_deal_id INTEGER,
    status VARCHAR(50) DEFAULT 'pending',
    amount DECIMAL(10,2),
    delivery_type VARCHAR(20),
    track_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Настройки бота
CREATE TABLE IF NOT EXISTS bot_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    updated_by INTEGER REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Статистика использования API
CREATE TABLE IF NOT EXISTS api_usage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES bot_users(id) ON DELETE CASCADE,
    api_endpoint VARCHAR(100),
    request_date DATE DEFAULT CURRENT_DATE,
    request_count INTEGER DEFAULT 1,
    last_request_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, api_endpoint, request_date)
);

-- Логирование действий пользователей
CREATE TABLE IF NOT EXISTS bot_user_actions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES bot_users(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    action_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_bot_users_telegram_id ON bot_users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_product_calculations_user_id ON product_calculations(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_orders_user_id ON bot_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_bot_orders_order_number ON bot_orders(order_number);

-- Настройки по умолчанию
INSERT INTO bot_settings (setting_key, setting_value) VALUES
('yuan_rate', '13.20'),
('cdek_price', '500'),
('api_limit_per_user', '50'),
('markup_shoes', '1000'),
('markup_boots', '1200'),
('markup_tshirts', '500'),
('markup_jackets', '800'),
('markup_shorts', '400'),
('markup_pants', '600'),
('markup_accessories', '300'),
('markup_bags', '700'),
('shipping_shoes', '800'),
('shipping_boots', '900'),
('shipping_tshirts', '600'),
('shipping_jackets', '700'),
('shipping_shorts', '500'),
('shipping_pants', '650'),
('shipping_accessories', '400'),
('shipping_bags', '750'),
('express_extra_shoes', '600'),
('express_extra_boots', '700'),
('express_extra_tshirts', '400'),
('express_extra_jackets', '500'),
('express_extra_shorts', '350'),
('express_extra_pants', '450'),
('express_extra_accessories', '250'),
('express_extra_bags', '500'),
('admin_chat_1', 'TELEGRAM_ID_ADMIN_1'),
('admin_chat_2', 'TELEGRAM_ID_ADMIN_2'),
('admin_chat_3', 'TELEGRAM_ID_ADMIN_3'),
('channel_username', 'erauqss'),
('reviews_url', 'https://your-reviews-site.com')
ON CONFLICT (setting_key) DO NOTHING;

COMMIT;
