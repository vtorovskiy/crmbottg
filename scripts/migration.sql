-- Исправленная миграция для улучшения структуры таблицы messages
-- Выполнить: docker exec -i telegram-crm-db psql -U postgres -d telegram_crm < scripts/fixed_migration.sql

BEGIN;

-- Добавляем недостающие поля в таблицу messages
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS sent_by_user_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS reply_to_message_id INTEGER,
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Добавляем комментарии к полям
COMMENT ON COLUMN messages.sent_by_user_id IS 'ID админа который отправил сообщение (для исходящих)';
COMMENT ON COLUMN messages.is_read IS 'Прочитано ли входящее сообщение админом';
COMMENT ON COLUMN messages.reply_to_message_id IS 'ID сообщения на которое отвечают';
COMMENT ON COLUMN messages.edited_at IS 'Время редактирования сообщения';
COMMENT ON COLUMN messages.metadata IS 'Дополнительные данные (размер файла, mime type и т.д.)';

-- Обновляем существующие исходящие сообщения
UPDATE messages
SET is_read = true
WHERE direction = 'outgoing' AND is_read IS NULL;

-- Создаем индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_messages_contact_id_created_at ON messages(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_direction_is_read ON messages(direction, is_read) WHERE direction = 'incoming';
CREATE INDEX IF NOT EXISTS idx_messages_content_search ON messages USING gin(to_tsvector('russian', content));
CREATE INDEX IF NOT EXISTS idx_messages_sent_by_user ON messages(sent_by_user_id) WHERE sent_by_user_id IS NOT NULL;

-- Добавляем триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_messages_updated_at ON messages;
CREATE TRIGGER trigger_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_messages_updated_at();

-- Создаем функцию для автоматического создания контакта из Telegram сообщения
CREATE OR REPLACE FUNCTION create_contact_from_telegram(
  p_telegram_id VARCHAR,
  p_telegram_username VARCHAR DEFAULT NULL,
  p_first_name VARCHAR DEFAULT NULL,
  p_last_name VARCHAR DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  contact_id INTEGER;
BEGIN
  -- Ищем существующий контакт
  SELECT id INTO contact_id
  FROM contacts
  WHERE telegram_id = p_telegram_id;

  -- Если не найден, создаем новый
  IF contact_id IS NULL THEN
    INSERT INTO contacts (telegram_id, telegram_username, created_at, updated_at)
    VALUES (p_telegram_id, p_telegram_username, NOW(), NOW())
    RETURNING id INTO contact_id;

    -- Добавляем в лог
    INSERT INTO contact_data (contact_id, field_id, value)
    SELECT contact_id, cf.id,
           CASE cf.name
             WHEN 'Имя' THEN COALESCE(p_first_name, 'Пользователь')
             WHEN 'Телефон' THEN NULL
             WHEN 'Email' THEN NULL
             WHEN 'Заметки' THEN 'Контакт создан автоматически из Telegram'
           END
    FROM contact_fields cf
    WHERE cf.name IN ('Имя', 'Телефон', 'Email', 'Заметки')
      AND COALESCE(
        CASE cf.name
          WHEN 'Имя' THEN COALESCE(p_first_name, 'Пользователь')
          WHEN 'Заметки' THEN 'Контакт создан автоматически из Telegram'
        END, ''
      ) != '';
  ELSE
    -- Обновляем username если изменился
    UPDATE contacts
    SET telegram_username = p_telegram_username, updated_at = NOW()
    WHERE id = contact_id
      AND (telegram_username != p_telegram_username OR telegram_username IS NULL);
  END IF;

  RETURN contact_id;
END;
$$ LANGUAGE plpgsql;

-- Создаем представление для удобного получения информации о чатах
-- 🔧 ИСПРАВЛЕНО: приведение типов для telegram_id
CREATE OR REPLACE VIEW chat_list AS
SELECT
  c.id as contact_id,
  c.telegram_id,
  c.telegram_username,

  -- Отображаемое имя
  COALESCE(
    c.telegram_username,
    (SELECT value FROM contact_data cd
     JOIN contact_fields cf ON cd.field_id = cf.id
     WHERE cd.contact_id = c.id AND cf.name = 'Имя'
     LIMIT 1),
    CONCAT('User_', c.telegram_id)
  ) as display_name,

  -- Последнее сообщение
  latest_msg.content as last_message,
  latest_msg.type as last_message_type,
  latest_msg.direction as last_message_direction,
  latest_msg.created_at as last_message_time,

  -- Непрочитанные сообщения
  COALESCE(unread.count, 0) as unread_count,

  -- Онлайн статус (🔧 ИСПРАВЛЕНО: приведение типов)
  CASE
    WHEN bu.last_activity > NOW() - INTERVAL '5 minutes' THEN 'online'
    WHEN bu.last_activity > NOW() - INTERVAL '1 hour' THEN 'recently'
    ELSE 'offline'
  END as online_status,

  -- Метки времени
  c.created_at as contact_created_at,
  c.updated_at as contact_updated_at

FROM contacts c

-- Информация о пользователе бота (🔧 ИСПРАВЛЕНО: приведение типов)
LEFT JOIN bot_users bu ON c.telegram_id = bu.telegram_id::VARCHAR

-- Последнее сообщение
LEFT JOIN LATERAL (
  SELECT content, type, direction, created_at
  FROM messages
  WHERE contact_id = c.id
  ORDER BY created_at DESC
  LIMIT 1
) latest_msg ON true

-- Количество непрочитанных
LEFT JOIN LATERAL (
  SELECT COUNT(*) as count
  FROM messages
  WHERE contact_id = c.id
    AND direction = 'incoming'
    AND (is_read IS NULL OR is_read = false)
) unread ON true

-- Только контакты с сообщениями
WHERE EXISTS (
  SELECT 1 FROM messages WHERE contact_id = c.id
);

COMMIT;

-- Проверяем результат
SELECT 'Migration completed successfully!' as status;

-- Показываем структуру таблицы messages
\d messages

-- Проверяем представление
SELECT COUNT(*) as contact_count FROM chat_list;