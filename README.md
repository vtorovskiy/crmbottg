Современная CRM система с интеграцией Telegram Bot API для управления клиентами, сделками и сообщениями.

## 🚀 Возможности

- 💬 **Telegram интеграция**: Прием и отправка сообщений через бота
- 👥 **Управление контактами**: Кастомные поля, автоматическое создание
- 🎯 **Система сделок**: Настраиваемая воронка продаж с Kanban
- 📁 **Файлы и медиа**: Поддержка всех типов файлов без ограничений
- 📊 **Аналитика**: Статистика по контактам и сделкам
- 📱 **Адаптивный дизайн**: Полная поддержка мобильных устройств

## 🛠 Технологический стек

### Backend
- **Node.js** + **Express.js** + **TypeScript**
- **PostgreSQL** с пулом соединений
- **Telegram Bot API** с webhook
- **Multer** для загрузки файлов
- **JWT** аутентификация
- **Rate limiting** и безопасность

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** для стилизации
- **Zustand** для state management
- **React Query** для API кэширования
- **React Hook Form** для форм
- **Framer Motion** для анимаций

## 📋 Требования

- **Node.js** 18+ 
- **PostgreSQL** 12+
- **Ubuntu Server** (рекомендуется)
- **Telegram Bot Token**

## ⚙️ Установка и настройка

### 1. Клонирование репозитория
```bash
git clone <repository-url>
cd telegram-crm
```

### 2. Настройка Backend
```bash
cd backend
npm install

# Создать .env файл
cp .env.example .env
# Заполнить переменные окружения

# Настроить базу данных
npm run migrate
npm run seed

# Запуск в dev режиме
npm run dev
```

### 3. Настройка Frontend  
```bash
cd frontend
npm install

# Создать .env файл
cp .env.example .env.local
# VITE_API_URL=http://localhost:3001/api

# Запуск в dev режиме
npm run dev
```

### 4. Настройка Telegram Bot

1. Создать бота через [@BotFather](https://t.me/botfather)
2. Получить токен и добавить в `.env`
3. Настроить webhook:
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://yourdomain.com/api/telegram/webhook"}'
```

### 5. Настройка Production

```bash
# Запуск через Docker
docker-compose up -d

# Или ручная установка
npm run build
npm start
```

## 🐳 Docker Development

```bash
# Запуск всех сервисов
docker-compose up -d

# Только база данных
docker-compose up -d postgres redis

# Просмотр логов
docker-compose logs -f backend
```

## 📁 Структура проекта

```
telegram-crm/
├── backend/                 # Backend API
│   ├── src/
│   │   ├── controllers/     # Контроллеры API
│   │   ├── services/        # Бизнес-логика
│   │   ├── models/          # Модели данных
│   │   ├── middleware/      # Middleware функции
│   │   ├── routes/          # API маршруты
│   │   ├── utils/           # Утилиты
│   │   ├── config/          # Конфигурация
│   │   └── types/           # TypeScript типы
│   ├── uploads/             # Загруженные файлы
│   └── logs/                # Логи приложения
├── frontend/                # React приложение
│   ├── src/
│   │   ├── components/      # React компоненты
│   │   ├── pages/           # Страницы
│   │   ├── hooks/           # Кастомные хуки
│   │   ├── services/        # API сервисы
│   │   ├── store/           # State management
│   │   ├── utils/           # Утилиты
│   │   ├── types/           # TypeScript типы
│   │   └── styles/          # CSS стили
│   └── public/              # Статичные файлы
├── docs/                    # Документация
├── scripts/                 # Скрипты деплоя
└── docker-compose.yml       # Docker конфигурация
```

## 🔧 API Endpoints

### Аутентификация
- `POST /api/auth/login` - Вход в систему
- `GET /api/auth/profile` - Профиль пользователя
- `POST /api/auth/logout` - Выход

### Контакты
- `GET /api/contacts` - Список контактов
- `POST /api/contacts` - Создание контакта
- `PUT /api/contacts/:id` - Обновление контакта
- `DELETE /api/contacts/:id` - Удаление контакта

### Сделки
- `GET /api/deals` - Список сделок
- `POST /api/deals` - Создание сделки
- `PUT /api/deals/:id` - Обновление сделки
- `PUT /api/deals/:id/stage` - Изменение этапа

### Сообщения
- `GET /api/messages/:contactId` - История сообщений
- `POST /api/messages/send` - Отправка сообщения
- `DELETE /api/messages/:id` - Удаление сообщения

### Telegram
- `POST /api/telegram/webhook` - Webhook для бота

## 📊 Мониторинг

- **Health Check**: `GET /health`
- **Логи**: `./backend/logs/app.log`
- **Метрики**: CPU, память, время ответа API
- **Database Health**: Проверка соединения с БД

## 🔐 Безопасность

- JWT токены с истечением
- Rate limiting (100 req/15min)
- Валидация всех входящих данных
- HTTPS обязателен в production
- Проверка подписи Telegram webhook
- Защита от XSS и CSRF

## 🚀 Производительность

- Connection pooling для PostgreSQL
- Кэширование API запросов
- Оптимизация изображений
- Code splitting на frontend
- Gzip сжатие
- CDN для статичных файлов

## 🔄 Backup & Recovery

```bash
# Backup базы данных
pg_dump telegram_crm > backup_$(date +%Y%m%d).sql

# Восстановление
psql telegram_crm < backup_20241201.sql

# Backup файлов
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/
```

## 📈 Масштабирование

- Горизонтальное масштабирование через Load Balancer
- Redis для кэширования
- CDN для статичных файлов
- Database read replicas
- Микросервисная архитектура

## 🧪 Тестирование

```bash
# Backend тесты
cd backend
npm test
npm run test:coverage

# Frontend тесты  
cd frontend
npm test
npm run test:ui
```

## 📝 Логирование

- Структурированные JSON логи
- Различные уровни: debug, info, warn, error
- Ротация логов по размеру
- Интеграция с внешними сервисами мониторинга

## 🤝 Разработка

1. Форкнуть репозиторий
2. Создать feature ветку
3. Следовать code style и conventions
4. Написать тесты для новой функциональности
5. Создать Pull Request

## 📄 Лицензия

MIT License

## 📞 Поддержка

- Email: support@example.com
- Telegram: @support_bot
- Issues: GitHub Issues

---

**Совет**: Всегда используйте HTTPS в production и регулярно обновляйте зависимости для безопасности.