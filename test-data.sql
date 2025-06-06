-- Скрипт для создания тестовых данных для проверки чата
-- Выполнить в PostgreSQL

BEGIN;

-- Создаем тестового контакта если его нет
INSERT INTO contacts (telegram_id, telegram_username, created_at, updated_at)
VALUES ('123456789', 'test_user', NOW(), NOW())
ON CONFLICT (telegram_id) DO NOTHING;

-- Получаем ID тестового контакта
WITH test_contact AS (
  SELECT id FROM contacts WHERE telegram_id = '123456789' LIMIT 1
)
-- Добавляем имя для контакта
INSERT INTO contact_data (contact_id, field_id, value)
SELECT
  tc.id,
  cf.id,
  'Тестовый Пользователь'
FROM test_contact tc, contact_fields cf
WHERE cf.name = 'Имя'
ON CONFLICT (contact_id, field_id) DO UPDATE SET value = 'Тестовый Пользователь';

-- Создаем несколько тестовых сообщений
WITH test_contact AS (
  SELECT id FROM contacts WHERE telegram_id = '123456789' LIMIT 1
)
INSERT INTO messages (contact_id, content, type, direction, is_read, created_at)
SELECT
  tc.id,
  content,
  'text',
  direction,
  is_read,
  created_at
FROM test_contact tc,
(VALUES
  ('Привет! Как дела?', 'incoming', false, NOW() - INTERVAL '2 hours'),
  ('Здравствуйте! Всё хорошо, спасибо!', 'outgoing', true, NOW() - INTERVAL '1 hour 50 minutes'),
  ('Отлично! Хотел узнать о ваших услугах', 'incoming', false, NOW() - INTERVAL '1 hour 30 minutes'),
  ('Конечно! С радостью расскажу. Чем именно интересуетесь?', 'outgoing', true, NOW() - INTERVAL '1 hour 20 minutes'),
  ('Интересует доставка с POIZON', 'incoming', false, NOW() - INTERVAL '1 hour'),
  ('Понятно! Мы занимаемся доставкой товаров с POIZON. Есть вопросы?', 'outgoing', true, NOW() - INTERVAL '50 minutes')
) AS test_messages(content, direction, is_read, created_at);

-- Создаем второго тестового контакта
INSERT INTO contacts (telegram_id, telegram_username, created_at, updated_at)
VALUES ('987654321', 'another_user', NOW() - INTERVAL '1 day', NOW() - INTERVAL '3 hours')
ON CONFLICT (telegram_id) DO NOTHING;

-- Добавляем имя для второго контакта
WITH test_contact2 AS (
  SELECT id FROM contacts WHERE telegram_id = '987654321' LIMIT 1
)
INSERT INTO contact_data (contact_id, field_id, value)
SELECT
  tc.id,
  cf.id,
  'Злой магазин'
FROM test_contact2 tc, contact_fields cf
WHERE cf.name = 'Имя'
ON CONFLICT (contact_id, field_id) DO UPDATE SET value = 'Злой магазин';

-- Создаем сообщения для второго контакта
WITH test_contact2 AS (
  SELECT id FROM contacts WHERE telegram_id = '987654321' LIMIT 1
)
INSERT INTO messages (contact_id, content, type, direction, is_read, created_at)
SELECT
  tc.id,
  content,
  'text',
  direction,
  is_read,
  created_at
FROM test_contact2 tc,
(VALUES
  ('Добро пожаловать в SQUARE!', 'outgoing', true, NOW() - INTERVAL '3 hours'),
  ('Спасибо!', 'incoming', true, NOW() - INTERVAL '2 hours 50 minutes'),
  ('Если есть вопросы - пишите!', 'outgoing', true, NOW() - INTERVAL '2 hours 40 minutes')
) AS test_messages2(content, direction, is_read, created_at);

COMMIT;

-- Проверяем созданные данные
SELECT
  c.telegram_username,
  cd.value as name,
  COUNT(m.id) as message_count,
  MAX(m.created_at) as last_message
FROM contacts c
LEFT JOIN contact_data cd ON c.id = cd.contact_id
  AND cd.field_id = (SELECT id FROM contact_fields WHERE name = 'Имя' LIMIT 1)
LEFT JOIN messages m ON c.id = m.contact_id
WHERE c.telegram_id IN ('123456789', '987654321')
GROUP BY c.id, c.telegram_username, cd.value
ORDER BY last_message DESC;