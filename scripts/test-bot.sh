#!/bin/bash
# scripts/test-bot.sh
# Скрипт для тестирования Telegram бота

echo "🤖 Тестирование Telegram бота SQUARE..."

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Проверяем переменные окружения
echo -e "${BLUE}📋 Проверка переменных окружения...${NC}"

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo -e "${RED}❌ TELEGRAM_BOT_TOKEN не установлен${NC}"
    echo "Установите токен бота: export TELEGRAM_BOT_TOKEN=your_token"
    exit 1
else
    echo -e "${GREEN}✅ TELEGRAM_BOT_TOKEN установлен${NC}"
fi

# Проверяем доступность сервера
echo -e "${BLUE}🔍 Проверка доступности API сервера...${NC}"

API_URL="http://localhost:3001"
if curl -s "$API_URL/health" > /dev/null; then
    echo -e "${GREEN}✅ API сервер доступен${NC}"
else
    echo -e "${RED}❌ API сервер недоступен. Запустите сервер: npm run dev${NC}"
    exit 1
fi

# Проверяем подключение к базе данных
echo -e "${BLUE}🗄️ Проверка подключения к базе данных...${NC}"

if docker exec telegram-crm-db pg_isready -U postgres -d telegram_crm > /dev/null 2>&1; then
    echo -e "${GREEN}✅ База данных доступна${NC}"
else
    echo -e "${RED}❌ База данных недоступна. Запустите: docker-compose up -d postgres${NC}"
    exit 1
fi

# Проверяем наличие таблиц бота
echo -e "${BLUE}📊 Проверка таблиц бота...${NC}"

BOT_TABLES=$(docker exec -i telegram-crm-db psql -U postgres -d telegram_crm -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'bot_%';" 2>/dev/null)

if [ "$BOT_TABLES" -ge 5 ]; then
    echo -e "${GREEN}✅ Таблицы бота найдены ($BOT_TABLES таблиц)${NC}"
else
    echo -e "${YELLOW}⚠️ Таблицы бота не найдены. Применяем миграцию...${NC}"
    docker exec -i telegram-crm-db psql -U postgres -d telegram_crm < scripts/bot_database_migration.sql
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Миграция применена успешно${NC}"
    else
        echo -e "${RED}❌ Ошибка применения миграции${NC}"
        exit 1
    fi
fi

# Тестируем Telegram Bot API
echo -e "${BLUE}🤖 Тестирование Telegram Bot API...${NC}"

BOT_INFO=$(curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe")
if echo "$BOT_INFO" | grep -q '"ok":true'; then
    BOT_USERNAME=$(echo "$BOT_INFO" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
    echo -e "${GREEN}✅ Telegram Bot API работает${NC}"
    echo -e "${GREEN}🤖 Бот: @$BOT_USERNAME${NC}"
else
    echo -e "${RED}❌ Ошибка Telegram Bot API${NC}"
    echo "$BOT_INFO"
    exit 1
fi

# Тестируем API endpoints бота
echo -e "${BLUE}🔌 Тестирование API endpoints бота...${NC}"

# Test bot connection
echo -n "Тестирование /api/bot/test... "
TEST_RESPONSE=$(curl -s -H "Authorization: Bearer $(echo 'admin@example.com:admin123456' | base64)" "$API_URL/api/bot/test" 2>/dev/null)
if echo "$TEST_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
    echo "Ответ: $TEST_RESPONSE"
fi

# Test webhook info
echo -n "Тестирование /api/bot/webhook/info... "
WEBHOOK_RESPONSE=$(curl -s -H "Authorization: Bearer $(echo 'admin@example.com:admin123456' | base64)" "$API_URL/api/bot/webhook/info" 2>/dev/null)
if echo "$WEBHOOK_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

# Test stats
echo -n "Тестирование /api/bot/stats... "
STATS_RESPONSE=$(curl -s -H "Authorization: Bearer $(echo 'admin@example.com:admin123456' | base64)" "$API_URL/api/bot/stats" 2>/dev/null)
if echo "$STATS_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${RED}❌${NC}"
fi

# Проверяем настройки бота в БД
echo -e "${BLUE}⚙️ Проверка настроек бота...${NC}"

SETTINGS_COUNT=$(docker exec -i telegram-crm-db psql -U postgres -d telegram_crm -t -c "SELECT COUNT(*) FROM bot_settings;" 2>/dev/null | tr -d ' ')

if [ "$SETTINGS_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Найдено $SETTINGS_COUNT настроек бота${NC}"

    # Показываем ключевые настройки
    echo -e "${BLUE}📋 Ключевые настройки:${NC}"
    docker exec -i telegram-crm-db psql -U postgres -d telegram_crm -c "
        SELECT setting_key, setting_value
        FROM bot_settings
        WHERE setting_key IN ('yuan_rate', 'channel_username', 'api_limit_per_user', 'cdek_price')
        ORDER BY setting_key;
    " 2>/dev/null
else
    echo -e "${RED}❌ Настройки бота не найдены${NC}"
fi

# Тестируем POIZON API сервисы
echo -e "${BLUE}🔗 Тестирование POIZON API сервисов...${NC}"

POIZON_EXTRACT_URL="http://5.129.196.215:8001/extract-spu"
POIZON_PRODUCT_URL="http://5.129.196.215:8002/get-product-data"

echo -n "Проверка доступности extract-spu API... "
if curl -s --connect-timeout 5 "$POIZON_EXTRACT_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${YELLOW}⚠️ Недоступен${NC}"
fi

echo -n "Проверка доступности product-data API... "
if curl -s --connect-timeout 5 "$POIZON_PRODUCT_URL" > /dev/null 2>&1; then
    echo -e "${GREEN}✅${NC}"
else
    echo -e "${YELLOW}⚠️ Недоступен${NC}"
fi

# Тестируем создание тестового пользователя
echo -e "${BLUE}👤 Создание тестового пользователя...${NC}"

TEST_USER_RESULT=$(docker exec -i telegram-crm-db psql -U postgres -d telegram_crm -c "
    INSERT INTO bot_users (telegram_id, username, first_name)
    VALUES (12345678, 'test_user', 'Test User')
    ON CONFLICT (telegram_id) DO NOTHING
    RETURNING id;
" 2>/dev/null)

if echo "$TEST_USER_RESULT" | grep -q "INSERT\|1 row"; then
    echo -e "${GREEN}✅ Тестовый пользователь создан${NC}"
else
    echo -e "${YELLOW}⚠️ Тестовый пользователь уже существует${NC}"
fi

# Проверяем webhook URL (если установлен)
echo -e "${BLUE}🔗 Проверка webhook...${NC}"

WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo")
WEBHOOK_URL=$(echo "$WEBHOOK_INFO" | grep -o '"url":"[^"]*"' | cut -d'"' -f4)

if [ -n "$WEBHOOK_URL" ] && [ "$WEBHOOK_URL" != "" ]; then
    echo -e "${GREEN}✅ Webhook установлен: $WEBHOOK_URL${NC}"
else
    echo -e "${YELLOW}⚠️ Webhook не установлен${NC}"
    echo -e "${BLUE}💡 Для установки webhook выполните:${NC}"
    echo "curl -X POST \"https://api.telegram.org/bot\$TELEGRAM_BOT_TOKEN/setWebhook\" \\"
    echo "  -H \"Content-Type: application/json\" \\"
    echo "  -d '{\"url\":\"https://yourdomain.com/api/bot/webhook\"}'"
fi

# Финальная сводка
echo ""
echo -e "${BLUE}📋 СВОДКА ТЕСТИРОВАНИЯ:${NC}"
echo "================================"

# Подсчитываем пользователей бота
USER_COUNT=$(docker exec -i telegram-crm-db psql -U postgres -d telegram_crm -t -c "SELECT COUNT(*) FROM bot_users;" 2>/dev/null | tr -d ' ')
echo -e "👥 Пользователей бота: ${GREEN}$USER_COUNT${NC}"

# Подсчитываем расчеты
CALC_COUNT=$(docker exec -i telegram-crm-db psql -U postgres -d telegram_crm -t -c "SELECT COUNT(*) FROM product_calculations;" 2>/dev/null | tr -d ' ')
echo -e "🧮 Расчетов товаров: ${GREEN}$CALC_COUNT${NC}"

# Подсчитываем заказы
ORDER_COUNT=$(docker exec -i telegram-crm-db psql -U postgres -d telegram_crm -t -c "SELECT COUNT(*) FROM bot_orders;" 2>/dev/null | tr -d ' ')
echo -e "📦 Заказов: ${GREEN}$ORDER_COUNT${NC}"

echo ""
echo -e "${GREEN}✅ Тестирование завершено!${NC}"
echo ""
echo -e "${BLUE}🚀 Следующие шаги:${NC}"
echo "1. Установите webhook для получения сообщений от Telegram"
echo "2. Обновите admin_chat_* настройки с реальными Telegram ID администраторов"
echo "3. Протестируйте бота отправив ему команду /start"
echo "4. Проверьте функционал расчета стоимости с реальной ссылкой POIZON"
echo ""
echo -e "${BLUE}📚 Полезные команды:${NC}"
echo "# Просмотр логов бота:"
echo "tail -f backend/logs/app.log | grep -i bot"
echo ""
echo "# Мониторинг webhook запросов:"
echo "tail -f backend/logs/app.log | grep webhook"
echo ""
echo "# Проверка статистики в БД:"
echo "docker exec -i telegram-crm-db psql -U postgres -d telegram_crm -c 'SELECT * FROM bot_settings LIMIT 10;'"
echo ""
echo -e "${GREEN}🎉 Бот готов к использованию!${NC}"