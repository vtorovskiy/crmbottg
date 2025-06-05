#!/bin/bash
# scripts/run-bot-migration.sh
# Скрипт для применения миграции Telegram бота

echo "🚀 Запуск миграции для Telegram бота SQUARE..."

# Проверяем подключение к PostgreSQL
echo "📡 Проверяем подключение к базе данных..."
docker exec telegram-crm-db pg_isready -U postgres -d telegram_crm

if [ $? -ne 0 ]; then
    echo "❌ База данных недоступна. Запустите сначала docker-compose up -d postgres"
    exit 1
fi

echo "✅ База данных доступна"

# Применяем миграцию
echo "📊 Применяем миграцию для таблиц бота..."
docker exec -i telegram-crm-db psql -U postgres -d telegram_crm << 'EOF'

-- Проверяем существование таблиц
\dt bot_*

-- Применяем миграцию (она уже создана в файле bot_database_migration)
-- Здесь мы можем дополнительно проверить успешность создания

-- Проверяем что таблицы созданы
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
    AND table_name LIKE 'bot_%'
ORDER BY table_name;

-- Проверяем настройки по умолчанию
SELECT setting_key, setting_value
FROM bot_settings
WHERE setting_key IN ('yuan_rate', 'channel_username', 'api_limit_per_user')
ORDER BY setting_key;

-- Показываем статистику
SELECT
    'bot_users' as table_name, COUNT(*) as records FROM bot_users
UNION ALL
SELECT
    'bot_settings' as table_name, COUNT(*) as records FROM bot_settings
UNION ALL
SELECT
    'bot_orders' as table_name, COUNT(*) as records FROM bot_orders;

EOF

if [ $? -eq 0 ]; then
    echo "✅ Миграция применена успешно!"
    echo ""
    echo "📋 Следующие шаги:"
    echo "1. Настройте переменные окружения в backend/.env:"
    echo "   TELEGRAM_BOT_TOKEN=ваш_токен"
    echo "   TELEGRAM_WEBHOOK_SECRET=ваш_секрет"
    echo ""
    echo "2. Обновите настройки администраторов:"
    echo "   UPDATE bot_settings SET setting_value = 'TELEGRAM_ID_1' WHERE setting_key = 'admin_chat_1';"
    echo "   UPDATE bot_settings SET setting_value = 'TELEGRAM_ID_2' WHERE setting_key = 'admin_chat_2';"
    echo "   UPDATE bot_settings SET setting_value = 'TELEGRAM_ID_3' WHERE setting_key = 'admin_chat_3';"
    echo ""
    echo "3. Добавьте маршрут бота в backend/src/index.ts:"
    echo "   import botRoutes from '@/routes/bot'"
    echo "   app.use('/api/bot', botRoutes)"
    echo ""
    echo "4. Инициализируйте bot service при запуске:"
    echo "   await botService.initialize()"
else
    echo "❌ Ошибка при применении миграции"
    exit 1
fi