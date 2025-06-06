-- Исправление схемы таблицы messages
-- Выполнить в PostgreSQL для исправления ON CONFLICT проблемы

BEGIN;

-- Проверяем структуру таблицы messages
\d messages;

-- Добавляем отсутствующие поля если их нет
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sender_admin VARCHAR(255);

-- Добавляем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_messages_contact_created ON messages(contact_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_direction_read ON messages(direction, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_telegram_id ON messages(telegram_message_id);

-- Обновляем существующие записи
UPDATE messages
SET is_read = true
WHERE direction = 'outgoing' AND is_read IS NULL;

UPDATE messages
SET is_read = false
WHERE direction = 'incoming' AND is_read IS NULL;

-- Проверяем что все поля на месте
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;

COMMIT;

-- Тестовый запрос для проверки
SELECT
    COUNT(*) as total_messages,
    COUNT(*) FILTER (WHERE direction = 'incoming') as incoming,
    COUNT(*) FILTER (WHERE direction = 'outgoing') as outgoing,
    COUNT(*) FILTER (WHERE is_read = false AND direction = 'incoming') as unread
FROM messages;