// backend/src/services/botMessageHandler.ts
import { botService } from './botService'
import { poizonService } from './poizonService'
import { logger } from '@/utils/logger'
import type { TelegramMessage, TelegramCallbackQuery } from '@/types/telegram'
import { db } from '@/config/database'

interface UserSession {
  step: string
  data: Record<string, any>
}

// Хранилище сессий пользователей (в production лучше использовать Redis)
const userSessions = new Map<string, UserSession>()

// Категории товаров
const CATEGORIES = {
  'shoes': { name: '👟 Обувь', emoji: '👟' },
  'boots': { name: '🥾 Ботинки', emoji: '🥾' },
  'tshirts': { name: '👕 Футболки', emoji: '👕' },
  'jackets': { name: '🧥 Куртки', emoji: '🧥' },
  'shorts': { name: '🩳 Шорты', emoji: '🩳' },
  'pants': { name: '👖 Штаны', emoji: '👖' },
  'accessories': { name: '🎒 Аксессуары', emoji: '🎒' },
  'bags': { name: '👜 Сумки', emoji: '👜' }
}

class BotMessageHandler {

  // =============== ОСНОВНОЙ ОБРАБОТЧИК ===============

  async handleMessage(message: TelegramMessage): Promise<void> {
    try {
      const user = await botService.findOrCreateUser(message.from!)
      const chatId = message.chat.id
      const text = message.text || ''

      // Логируем действие пользователя
      await botService.logUserAction(user.id, 'message_received', {
        text: text.substring(0, 100),
        chat_id: chatId
      })

      // Обрабатываем команды
      if (text.startsWith('/')) {
        await this.handleCommand(chatId, text, user)
        return
      }

      // Получаем текущую сессию пользователя
      const session = userSessions.get(user.telegram_id) || { step: 'menu', data: {} }

      // Обрабатываем на основе текущего шага
      switch (session.step) {
        case 'waiting_url':
          await this.handleUrlInput(chatId, text, user, session)
          break

        case 'menu':
        default:
          await this.showMainMenu(chatId)
          break
      }

    } catch (error) {
      logger.error('Error handling bot message', error)
      await botService.sendMessage(message.chat.id,
        '❌ Произошла ошибка. Попробуйте позже или обратитесь в поддержку.'
      )
    }
  }

  // =============== ОБРАБОТКА CALLBACK QUERY ===============

  async handleCallbackQuery(callbackQuery: TelegramCallbackQuery): Promise<void> {
    try {
      const user = await botService.findOrCreateUser(callbackQuery.from)
      const chatId = callbackQuery.message?.chat.id!
      const data = callbackQuery.data!

      // Логируем действие
      await botService.logUserAction(user.id, 'callback_query', { data })

      if (data === 'check_subscription') {
        await this.handleSubscriptionCheck(chatId, user)
      } else if (data === 'understood') {
        await this.showMainMenu(chatId)
      } else if (data === 'need_help') {
        await this.showPoizonInfo(chatId)
      } else if (data === 'calculate_cost') {
        await this.startCalculation(chatId, user)
      } else if (data === 'reviews') {
        await this.showReviews(chatId)
      } else if (data === 'what_is_poizon') {
        await this.showPoizonInfo(chatId)
      } else if (data === 'call_operator') {
        await this.callOperator(chatId, user)
      } else if (data === 'my_orders') {
        await this.showMyOrders(chatId, user)
      } else if (data === 'main_menu') {
        await this.showMainMenu(chatId)
      } else if (data === 'cancel') {
        await this.cancelOperation(chatId, user)
      } else if (data.startsWith('category_')) {
        await this.handleCategorySelection(chatId, data, user)
      } else if (data.startsWith('size_')) {
        await this.handleSizeSelection(chatId, data, user)
      } else if (data === 'order_standard') {
        await this.handleOrderConfirmation(chatId, user, 'standard')
      } else if (data === 'order_express') {
        await this.handleOrderConfirmation(chatId, user, 'express')
      } else if (data === 'recalculate') {
        await this.startCalculation(chatId, user)
      }

      // Отвечаем на callback query
      await this.answerCallbackQuery(callbackQuery.id)

    } catch (error) {
      logger.error('Error handling callback query', error)
      await this.answerCallbackQuery(callbackQuery.id, 'Произошла ошибка')
    }
  }

  // =============== КОМАНДЫ ===============

  async handleCommand(chatId: number, command: string, user: any): Promise<void> {
    const cmd = command.split(' ')[0].toLowerCase()

    try {
      switch (cmd) {
        case '/start':
          await this.handleStart(chatId, user)
          break

        case '/help':
          await this.handleHelpCommand(chatId)
          break

        case '/admin_settings':
          await this.handleAdminSettings(chatId, user)
          break

        case '/set_rate':
          await this.handleSetRate(chatId, command, user)
          break

        case '/stats':
          await this.handleStatsCommand(chatId, user)
          break

        default:
          await this.handleUnknownCommand(chatId, command)
          break
      }

      // Логируем выполненную команду
      await botService.logUserAction(user.id, 'command_executed', {
        command: cmd,
        full_command: command
      })

    } catch (error) {
      await this.handleError(chatId, error as Error, `command_${cmd}`)
    }
  }

  // =============== КОМАНДА /START ===============

  async handleStart(chatId: number, user: any): Promise<void> {
    const channelUsername = botService.getSetting('channel_username', 'erauqss')
    const isSubscribed = await botService.checkSubscription(user.telegram_id, channelUsername)

    if (!isSubscribed) {
      await this.showSubscriptionRequired(chatId, channelUsername)
    } else {
      await this.showWelcomeMessage(chatId)
    }
  }

  async showSubscriptionRequired(chatId: number, channelUsername: string): Promise<void> {
    const text = `
Привет! 👋

Это бот SQUARE, мы занимаемся доставкой с POIZON.

Чтобы пользоваться данным ботом необходимо быть подписанным на канал @${channelUsername}
    `

    const keyboard = {
      inline_keyboard: [
        [{ text: '🔗 Подписаться на канал', url: `https://t.me/${channelUsername}` }],
        [{ text: '✅ Подписался', callback_data: 'check_subscription' }]
      ]
    }

    await botService.sendMessage(chatId, text, { reply_markup: keyboard })
  }

  async handleSubscriptionCheck(chatId: number, user: any): Promise<void> {
    const channelUsername = botService.getSetting('channel_username', 'erauqss')
    const isSubscribed = await botService.checkSubscription(user.telegram_id, channelUsername)

    if (isSubscribed) {
      await this.showWelcomeMessage(chatId)
    } else {
      await botService.sendMessage(chatId,
        '❌ Вы еще не подписались на канал. Пожалуйста, подпишитесь и попробуйте снова.'
      )
    }
  }

  async showWelcomeMessage(chatId: number): Promise<void> {
    const text = `
🎉 Добро пожаловать в SQUARE!

Мы поможем вам заказать любые товары с POIZON:
• 🔍 Быстрый расчет стоимости
• 🚚 Надежная доставка
• 📦 Отслеживание заказов
• 💬 Персональная поддержка
    `

    const keyboard = {
      inline_keyboard: [
        [{ text: '✅ Я понял, как вы работаете', callback_data: 'understood' }],
        [{ text: '❓ Ничего не понятно', callback_data: 'need_help' }]
      ]
    }

    await botService.sendMessage(chatId, text, { reply_markup: keyboard })
  }

  // =============== ГЛАВНОЕ МЕНЮ ===============

  async showMainMenu(chatId: number): Promise<void> {
    const text = `
🏠 Главное меню SQUARE

Выберите действие:
    `

    const keyboard = {
      inline_keyboard: [
        [{ text: '🧮 Рассчитать стоимость', callback_data: 'calculate_cost' }],
        [{ text: '⭐ Отзывы', callback_data: 'reviews' }],
        [{ text: '❓ Что такое POIZON?', callback_data: 'what_is_poizon' }],
        [{ text: '👨‍💼 Позвать оператора', callback_data: 'call_operator' }],
        [{ text: '📦 Мои заказы', callback_data: 'my_orders' }]
      ]
    }

    await botService.sendMessage(chatId, text, { reply_markup: keyboard })
  }

  // =============== РАСЧЕТ СТОИМОСТИ ===============

  async startCalculation(chatId: number, user: any): Promise<void> {
    // Проверяем лимит API
    const canUseApi = await botService.checkApiLimit(user.id, 'extract-spu')
    if (!canUseApi) {
      const limit = botService.getSetting('api_limit_per_user', '50')
      await botService.sendMessage(chatId,
        `❌ Вы достигли дневного лимита в ${limit} расчетов.\nПопробуйте завтра или обратитесь к оператору.`
      )
      return
    }

    const text = `
🔗 Отправьте ссылку на товар с POIZON

Как скопировать ссылку:
[В будущем здесь будет GIF]

Пример ссылки:
【得物】得物er-0Y3B7W6D发现一件好物， 1 CZ1111 
ål7KoaBgå https://dw4.co/t/A/1sHU86GGg Nike Air Max 97
    `

    const keyboard = {
      inline_keyboard: [
        [{ text: '❌ Отмена', callback_data: 'cancel' }]
      ]
    }

    await botService.sendMessage(chatId, text, { reply_markup: keyboard })

    // Сохраняем состояние пользователя
    userSessions.set(user.telegram_id, {
      step: 'waiting_url',
      data: {}
    })
  }

  async handleUrlInput(chatId: number, text: string, user: any, session: UserSession): Promise<void> {
    try {
      // Парсим URL из текста с китайскими символами
      const urlRegex = /https?:\/\/[^\s\u4e00-\u9fff]+/gi
      const urls = text.match(urlRegex)

      if (!urls || urls.length === 0) {
        await botService.sendMessage(chatId,
          '❌ Не найдена ссылка на товар. Попробуйте еще раз или нажмите Отмена.'
        )
        return
      }

      const url = urls[0]
      await botService.sendMessage(chatId, '⏳ Получаем информацию о товаре...')

      // Увеличиваем счетчик API
      await botService.incrementApiUsage(user.id, 'extract-spu')

      // Получаем SPU ID
      const spuId = await poizonService.extractSpu(url)

      if (!spuId) {
        await botService.sendMessage(chatId,
          '❌ Не удалось обработать ссылку. Проверьте корректность ссылки.'
        )
        return
      }

      // Увеличиваем счетчик API
      await botService.incrementApiUsage(user.id, 'get-product-data')

      // Получаем данные товара
      const productData = await poizonService.getProductData(spuId)

      if (!productData) {
        await botService.sendMessage(chatId,
          '❌ Не удалось получить информацию о товаре.'
        )
        return
      }

      // Сохраняем данные в сессию
      session.data = {
        url,
        spuId,
        productData: { product: productData }
      }
      session.step = 'category_selection'
      userSessions.set(user.telegram_id, session)

      await this.showCategorySelection(chatId)

    } catch (error) {
      logger.error('Error processing POIZON URL', error)
      await botService.sendMessage(chatId,
        '❌ Произошла ошибка при обработке ссылки. Попробуйте позже.'
      )
    }
  }

  async showCategorySelection(chatId: number): Promise<void> {
    const text = '📱 Выберите категорию товара:'

    const keyboard = {
      inline_keyboard: [
        [
          { text: CATEGORIES.shoes.name, callback_data: 'category_shoes' },
          { text: CATEGORIES.boots.name, callback_data: 'category_boots' }
        ],
        [
          { text: CATEGORIES.tshirts.name, callback_data: 'category_tshirts' },
          { text: CATEGORIES.jackets.name, callback_data: 'category_jackets' }
        ],
        [
          { text: CATEGORIES.shorts.name, callback_data: 'category_shorts' },
          { text: CATEGORIES.pants.name, callback_data: 'category_pants' }
        ],
        [
          { text: CATEGORIES.accessories.name, callback_data: 'category_accessories' },
          { text: CATEGORIES.bags.name, callback_data: 'category_bags' }
        ],
        [{ text: '❌ Отмена', callback_data: 'cancel' }]
      ]
    }

    await botService.sendMessage(chatId, text, { reply_markup: keyboard })
  }

  async handleCategorySelection(chatId: number, callbackData: string, user: any): Promise<void> {
    const category = callbackData.replace('category_', '')
    const session = userSessions.get(user.telegram_id)

    if (!session || !session.data.productData) {
      await this.showMainMenu(chatId)
      return
    }

    session.data.selectedCategory = category
    session.step = 'size_selection'
    userSessions.set(user.telegram_id, session)

    await this.showProductWithSizes(chatId, session.data)
  }

  async showProductWithSizes(chatId: number, sessionData: any): Promise<void> {
    const { productData } = sessionData
    const product = productData.product

    // Отправляем фото товара
    if (product.image && product.image.src) {
      const imageUrl = product.image.src.startsWith('//')
        ? `https:${product.image.src}`
        : product.image.src

      const caption = `📦 ${product.title}\n\nВыберите размер:`

      await botService.sendPhoto(chatId, imageUrl, { caption })
    }

    // Создаем кнопки размеров
    const variants = product.variants || []
    const availableVariants = variants.filter((v: any) => v.available)

    if (availableVariants.length === 0) {
      await botService.sendMessage(chatId,
        '❌ К сожалению, этот товар сейчас недоступен.'
      )
      return
    }

    // Группируем кнопки по 4 в ряд
    const sizeButtons: any[][] = []
    for (let i = 0; i < availableVariants.length; i += 4) {
      const row = availableVariants.slice(i, i + 4).map((variant: any) => ({
        text: variant.option2 || variant.options?.find((o: any) => o.name === 'Size')?.value || 'N/A',
        callback_data: `size_${variant.id}`
      }))
      sizeButtons.push(row)
    }

    sizeButtons.push([
      { text: '🔙 Назад к категориям', callback_data: 'calculate_cost' },
      { text: '❌ Отмена', callback_data: 'cancel' }
    ])

    const keyboard = { inline_keyboard: sizeButtons }
    await botService.sendMessage(chatId, 'Выберите размер:', { reply_markup: keyboard })
  }

  async handleSizeSelection(chatId: number, callbackData: string, user: any): Promise<void> {
    const variantId = callbackData.replace('size_', '')
    const session = userSessions.get(user.telegram_id)

    if (!session || !session.data.productData) {
      await this.showMainMenu(chatId)
      return
    }

    const product = session.data.productData.product
    const selectedVariant = product.variants.find((v: any) => v.id === variantId)

    if (!selectedVariant) {
      await botService.sendMessage(chatId, '❌ Размер не найден.')
      return
    }

    session.data.selectedVariant = selectedVariant
    userSessions.set(user.telegram_id, session)

    await this.showPriceCalculation(chatId, session.data, user)
  }

  async showPriceCalculation(chatId: number, sessionData: any, user: any): Promise<void> {
    const { productData, selectedCategory, selectedVariant } = sessionData
    const product = productData.product

    // Получаем настройки для расчета
    const yuanRate = parseFloat(botService.getSetting('yuan_rate', '13.20'))
    const cdekPrice = parseFloat(botService.getSetting('cdek_price', '500'))
    const markup = parseFloat(botService.getSetting(`markup_${selectedCategory}`, '500'))
    const shipping = parseFloat(botService.getSetting(`shipping_${selectedCategory}`, '600'))
    const expressExtra = parseFloat(botService.getSetting(`express_extra_${selectedCategory}`, '400'))

    // Цена товара в юанях
    const priceYuan = parseFloat(selectedVariant.price)

    // Расчет стоимости
    const productRubPrice = priceYuan * yuanRate
    const standardTotal = Math.round(productRubPrice + markup + shipping + cdekPrice)
    const expressTotal = Math.round(standardTotal + expressExtra)

    // Сохраняем расчет
    sessionData.calculation = {
      priceYuan,
      standardTotal,
      expressTotal
    }

    const size = selectedVariant.option2 || selectedVariant.options?.find((o: any) => o.name === 'Size')?.value || 'N/A'

    const text = `
💰 Расчет стоимости

📦 ${product.title}
📏 Размер: ${size}

🚚 СТАНДАРТНАЯ ДОСТАВКА: ${standardTotal.toLocaleString('ru-RU')}₽
⚡ ЭКСПРЕСС ДОСТАВКА: ${expressTotal.toLocaleString('ru-RU')}₽
    `

    const keyboard = {
      inline_keyboard: [
        [{ text: '✅ Оформить заказ', callback_data: 'order_standard' }],
        [{ text: '🔄 Пересчитать товар', callback_data: 'recalculate' }],
        [{ text: '🏠 В главное меню', callback_data: 'main_menu' }]
      ]
    }

    await botService.sendMessage(chatId, text, { reply_markup: keyboard })

    // Сохраняем расчет в базу
    await botService.saveCalculation({
      user_id: user.id,
      spu_id: sessionData.spuId,
      product_title: product.title,
      category: selectedCategory,
      size,
      original_price: priceYuan,
      calculated_price_standard: standardTotal,
      calculated_price_express: expressTotal,
      product_data: productData
    })
  }

  // =============== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ===============

  private getStatusEmoji(status: string): string {
    const statusEmojis: Record<string, string> = {
      'pending': '🟡',
      'confirmed': '🔵',
      'paid': '🟢',
      'shipped': '📦',
      'delivered': '✅',
      'cancelled': '❌'
    }
    return statusEmojis[status] || '⚪'
  }

  private getStatusText(status: string): string {
    const statusTexts: Record<string, string> = {
      'pending': 'В обработке',
      'confirmed': 'Подтвержден',
      'paid': 'Оплачен',
      'shipped': 'Отправлен',
      'delivered': 'Доставлен',
      'cancelled': 'Отменен'
    }
    return statusTexts[status] || 'Неизвестно'
  }

  private async answerCallbackQuery(queryId: string, text?: string): Promise<void> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callback_query_id: queryId,
          text: text || '',
          show_alert: false
        })
      })

      if (!response.ok) {
        logger.warn('Failed to answer callback query', {
          queryId: queryId.substring(0, 10),
          status: response.status
        })
      }
    } catch (error) {
      logger.warn('Error answering callback query', { queryId: queryId.substring(0, 10), error })
    }
  }

  // =============== ОБРАБОТКА ЗАКАЗОВ ===============

  async handleOrderConfirmation(chatId: number, user: any, deliveryType: string): Promise<void> {
    const session = userSessions.get(user.telegram_id)

    if (!session || !session.data.calculation) {
      await this.showMainMenu(chatId)
      return
    }

    const { productData, selectedVariant, selectedCategory, calculation } = session.data
    const product = productData.product
    const size = selectedVariant.option2 || selectedVariant.options?.find((o: any) => o.name === 'Size')?.value || 'N/A'
    const amount = deliveryType === 'express' ? calculation.expressTotal : calculation.standardTotal

    // Создаем заказ в базе
    const order = await botService.createOrder({
      user_id: user.id,
      product_title: product.title,
      product_size: size,
      category: selectedCategory,
      status: 'pending',
      amount,
      delivery_type: deliveryType
    })

    // Уведомляем пользователя
    const text = `
📝 Заказ оформляется...

Ваш заказ принят в обработку!
🆔 Номер заказа: ${order.order_number}

Сейчас с вами свяжется оператор для уточнения деталей.
    `

    const keyboard = {
      inline_keyboard: [
        [{ text: '🏠 В главное меню', callback_data: 'main_menu' }]
      ]
    }

    await botService.sendMessage(chatId, text, { reply_markup: keyboard })

    // Уведомляем администраторов
    await this.notifyAdminsAboutNewOrder(order, user, session.data)

    // Очищаем сессию
    userSessions.delete(user.telegram_id)
  }

  async notifyAdminsAboutNewOrder(order: any, user: any, sessionData: any): Promise<void> {
    const adminIds = [
      botService.getSetting('admin_chat_1'),
      botService.getSetting('admin_chat_2'),
      botService.getSetting('admin_chat_3')
    ].filter(id => id && id.trim())

    const { productData, selectedVariant } = sessionData
    const size = selectedVariant.option2 || selectedVariant.options?.find((o: any) => o.name === 'Size')?.value || 'N/A'
    const username = user.username ? `@${user.username}` : user.first_name || 'Пользователь'

    const text = `
🆕 НОВЫЙ ЗАКАЗ ${order.order_number}

👤 Клиент: ${username} (ID: ${user.telegram_id})
📦 Товар: ${order.product_title}
📏 Размер: ${size}
💰 Сумма: ${order.amount.toLocaleString('ru-RU')}₽ (${order.delivery_type === 'express' ? 'экспресс' : 'стандарт'})

🔗 Ссылка: ${sessionData.url}
    `

    for (const adminId of adminIds) {
      try {
        await botService.sendMessage(adminId, text)
      } catch (error) {
        logger.error('Failed to notify admin', { adminId, error })
      }
    }
  }

  // =============== ИНФОРМАЦИОННЫЕ РАЗДЕЛЫ ===============

  async showReviews(chatId: number): Promise<void> {
    const reviewsUrl = botService.getSetting('reviews_url', 'https://your-reviews-site.com')

    const text = `
⭐ Отзывы наших клиентов

Посмотрите отзывы на нашем сайте:
🌐 ${reviewsUrl}

У нас более 300,000 довольных клиентов!
    `

    const keyboard = {
      inline_keyboard: [
        [{ text: '🏠 В главное меню', callback_data: 'main_menu' }]
      ]
    }

    await botService.sendMessage(chatId, text, { reply_markup: keyboard })
  }

  async showPoizonInfo(chatId: number): Promise<void> {
    const links = [
      botService.getSetting('poizon_info_url_1', 'https://link1.com'),
      botService.getSetting('poizon_info_url_2', 'https://link2.com'),
      botService.getSetting('poizon_info_url_3', 'https://link3.com')
    ]

    const text = `
❓ Что такое POIZON?

POIZON (得物) - крупнейшая китайская платформа для покупки оригинальных кроссовок и одежды.

Полезные ссылки:
📖 ${links[0]} - Подробная инструкция
🎥 ${links[1]} - Видео обзор
📱 ${links[2]} - Как пользоваться
    `

    const keyboard = {
      inline_keyboard: [
        [{ text: '🏠 В главное меню', callback_data: 'main_menu' }]
      ]
    }

    await botService.sendMessage(chatId, text, { reply_markup: keyboard })
  }

  async callOperator(chatId: number, user: any): Promise<void> {
    const text = `
👨‍💼 Подключение к оператору...

Сейчас с вами свяжется наш менеджер.
Ожидаемое время ответа: до 15 минут.
    `

    const keyboard = {
      inline_keyboard: [
        [{ text: '🏠 В главное меню', callback_data: 'main_menu' }]
      ]
    }

    await botService.sendMessage(chatId, text, { reply_markup: keyboard })

    // Уведомляем администраторов
    const adminIds = [
      botService.getSetting('admin_chat_1'),
      botService.getSetting('admin_chat_2'),
      botService.getSetting('admin_chat_3')
    ].filter(id => id && id.trim())

    const username = user.username ? `@${user.username}` : user.first_name || 'Пользователь'
    const now = new Date()
    const time = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

    const adminText = `
🆘 ВЫЗОВ ОПЕРАТОРА

👤 Клиент: ${username} (ID: ${user.telegram_id})
⏰ Время: ${time}
💬 Требуется консультация
    `

    for (const adminId of adminIds) {
      try {
        await botService.sendMessage(adminId, adminText)
      } catch (error) {
        logger.error('Failed to notify admin about operator call', { adminId, error })
      }
    }

    // Логируем действие
    await botService.logUserAction(user.id, 'operator_called', {
      timestamp: now.toISOString()
    })
  }

  async showMyOrders(chatId: number, user: any): Promise<void> {
    const orders = await botService.getOrdersByUser(user.id)

    if (orders.length === 0) {
      const text = `
📦 Мои заказы

У вас пока нет заказов.
Начните с расчета стоимости товара!
      `

      const keyboard = {
        inline_keyboard: [
          [{ text: '🧮 Рассчитать стоимость', callback_data: 'calculate_cost' }],
          [{ text: '🏠 В главное меню', callback_data: 'main_menu' }]
        ]
      }

      await botService.sendMessage(chatId, text, { reply_markup: keyboard })
      return
    }

    let text = '📦 Ваши заказы:\n\n'

    orders.slice(0, 5).forEach(order => {
      const statusEmoji = this.getStatusEmoji(order.status)
      const date = new Date((order as any).created_at || new Date()).toLocaleDateString('ru-RU')

      text += `${statusEmoji} ${order.order_number} от ${date}\n`
      text += `${order.product_title}, размер ${order.product_size}\n`
      text += `💰 ${order.amount.toLocaleString('ru-RU')}₽ | 📊 ${this.getStatusText(order.status)}\n`

      if (order.track_number) {
        text += `🚚 Трек: ${order.track_number}\n`
      } else {
        text += `🚚 Трек: отсутствует\n`
      }
      text += '\n'
    })

    const keyboard = {
      inline_keyboard: [
        [{ text: '🔄 Обновить статусы', callback_data: 'my_orders' }],
        [{ text: '🏠 В главное меню', callback_data: 'main_menu' }]
      ]
    }

    await botService.sendMessage(chatId, text, { reply_markup: keyboard })
  }

  async cancelOperation(chatId: number, user: any): Promise<void> {
    userSessions.delete(user.telegram_id)
    await this.showMainMenu(chatId)
  }

  // =============== АДМИН ФУНКЦИИ ===============

  async handleAdminSettings(chatId: number, user: any): Promise<void> {
    const adminIds = [
      botService.getSetting('admin_chat_1'),
      botService.getSetting('admin_chat_2'),
      botService.getSetting('admin_chat_3')
    ]

    if (!adminIds.includes(user.telegram_id)) {
      await botService.sendMessage(chatId, '❌ У вас нет прав администратора.')
      return
    }

    const stats = await botService.getStats()
    const yuanRate = botService.getSetting('yuan_rate', '13.20')

    const text = `
⚙️ Панель администратора

Текущие настройки:
💱 Курс ¥: ${yuanRate}₽
📊 Активных пользователей: ${stats.activeUsers || 0}
📈 Всего пользователей: ${stats.totalUsers || 0}
🧮 Расчетов сегодня: ${stats.todayApiRequests || 0}

Команды:
/set_rate [число] - изменить курс
/stats - подробная статистика
    `

    await botService.sendMessage(chatId, text)
  }

  async handleSetRate(chatId: number, command: string, user: any): Promise<void> {
    const adminIds = [
      botService.getSetting('admin_chat_1'),
      botService.getSetting('admin_chat_2'),
      botService.getSetting('admin_chat_3')
    ]

    if (!adminIds.includes(user.telegram_id)) {
      await botService.sendMessage(chatId, '❌ У вас нет прав администратора.')
      return
    }

    const parts = command.split(' ')
    if (parts.length !== 2) {
      await botService.sendMessage(chatId, '❌ Неверный формат. Используйте: /set_rate 13.50')
      return
    }

    const newRate = parseFloat(parts[1])
    if (isNaN(newRate) || newRate <= 0) {
      await botService.sendMessage(chatId, '❌ Неверное значение курса.')
      return
    }

    await botService.updateSetting('yuan_rate', newRate.toString(), user.id)
    await botService.sendMessage(chatId, `✅ Курс обновлен: 1¥ = ${newRate}₽`)

    logger.info('Yuan rate updated by admin', {
      adminId: user.telegram_id,
      newRate,
      oldRate: botService.getSetting('yuan_rate')
    })
  }

  async handleStatsCommand(chatId: number, user: any): Promise<void> {
    const adminIds = [
      botService.getSetting('admin_chat_1'),
      botService.getSetting('admin_chat_2'),
      botService.getSetting('admin_chat_3')
    ]

    if (!adminIds.includes(user.telegram_id)) {
      await botService.sendMessage(chatId, '❌ У вас нет прав администратора.')
      return
    }

    const stats = await botService.getStats()
    const settings = {
      yuanRate: botService.getSetting('yuan_rate', '13.20'),
      apiLimit: botService.getSetting('api_limit_per_user', '50'),
      cdekPrice: botService.getSetting('cdek_price', '500')
    }

    const text = `
📊 Подробная статистика SQUARE Bot

👥 Пользователи:
• Всего: ${stats.totalUsers || 0}
• Активных (7 дней): ${stats.activeUsers || 0}
• Новых сегодня: ${stats.newUsersToday || 0}

🧮 Расчеты:
• Всего: ${stats.totalCalculations || 0}
• Сегодня: ${stats.todayCalculations || 0}
• API запросов сегодня: ${stats.todayApiRequests || 0}

📦 Заказы:
• Всего: ${stats.totalOrders || 0}
• Pending: ${stats.pendingOrders || 0}
• Завершенных: ${stats.completedOrders || 0}

💰 Настройки:
• Курс ¥: ${settings.yuanRate}₽
• Лимит API: ${settings.apiLimit}/день
• СДЭК: ${settings.cdekPrice}₽

📈 Популярные категории:
${stats.popularCategories?.map((cat: any, i: number) => 
  `${i + 1}. ${cat.category}: ${cat.count} расчетов`
).join('\n') || 'Нет данных'}
    `

    await botService.sendMessage(chatId, text)
  }

  // =============== ДОПОЛНИТЕЛЬНЫЕ КОМАНДЫ ===============

  async handleUnknownCommand(chatId: number, command: string): Promise<void> {
    const text = `
❓ Неизвестная команда: ${command}

Доступные команды:
/start - Начать работу с ботом
/help - Справка по использованию

Для администраторов:
/admin_settings - Панель настроек
/set_rate [число] - Изменить курс юаня
/stats - Подробная статистика
    `

    const keyboard = {
      inline_keyboard: [
        [{ text: '🏠 В главное меню', callback_data: 'main_menu' }]
      ]
    }

    await botService.sendMessage(chatId, text, { reply_markup: keyboard })
  }

  async handleHelpCommand(chatId: number): Promise<void> {
    const text = `
📋 Справка по использованию SQUARE Bot

🚀 Основные функции:
• 🧮 Расчет стоимости товаров с POIZON
• 📦 Оформление заказов
• 📊 Отслеживание статуса заказов
• 💬 Связь с операторами

📝 Как заказать:
1. Нажмите "Рассчитать стоимость"
2. Отправьте ссылку на товар с POIZON
3. Выберите категорию и размер
4. Получите расчет стоимости
5. Оформите заказ

🔗 Как скопировать ссылку с POIZON:
• Откройте товар в приложении POIZON
• Нажмите "Поделиться"
• Скопируйте и отправьте всю строку боту

❓ Нужна помощь?
Нажмите "Позвать оператора" в главном меню
    `

    const keyboard = {
      inline_keyboard: [
        [{ text: '🧮 Рассчитать стоимость', callback_data: 'calculate_cost' }],
        [{ text: '🏠 В главное меню', callback_data: 'main_menu' }]
      ]
    }

    await botService.sendMessage(chatId, text, { reply_markup: keyboard })
  }

  // =============== ОБРАБОТКА ОШИБОК ===============

  async handleError(chatId: number, error: Error, context: string): Promise<void> {
    logger.error(`Bot error in ${context}`, error)

    const text = `
❌ Произошла ошибка

Мы уже знаем о проблеме и работаем над ее устранением.
Попробуйте позже или обратитесь к оператору.
    `

    const keyboard = {
      inline_keyboard: [
        [{ text: '👨‍💼 Позвать оператора', callback_data: 'call_operator' }],
        [{ text: '🏠 В главное меню', callback_data: 'main_menu' }]
      ]
    }

    try {
      await botService.sendMessage(chatId, text, { reply_markup: keyboard })
    } catch (sendError) {
      logger.error('Failed to send error message', sendError)
    }
  }

  // =============== ИНИЦИАЛИЗАЦИЯ ===============

  async initialize(): Promise<void> {
    try {
      // Загружаем настройки бота
      await botService.loadSettings()

      logger.info('Bot message handler initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize bot message handler', error)
      throw error
    }
  }

  // =============== СЕССИИ ПОЛЬЗОВАТЕЛЕЙ ===============

  getSession(telegramId: string): UserSession {
    return userSessions.get(telegramId) || { step: 'menu', data: {} }
  }

  setSession(telegramId: string, session: UserSession): void {
    userSessions.set(telegramId, session)
  }

  clearSession(telegramId: string): void {
    userSessions.delete(telegramId)
  }

  // =============== ДОПОЛНИТЕЛЬНЫЕ УТИЛИТЫ ===============

  async broadcastMessage(message: string, targetType: 'all' | 'active' | 'recent' = 'active'): Promise<{
    sent: number
    failed: number
  }> {
    try {
      // Получаем список пользователей в зависимости от типа
      let userQuery = 'SELECT telegram_id FROM bot_users WHERE 1=1'

      if (targetType === 'active') {
        userQuery += ' AND last_activity > NOW() - INTERVAL \'7 days\''
      } else if (targetType === 'recent') {
        userQuery += ' AND registration_date > NOW() - INTERVAL \'30 days\''
      }

      const result = await db.query(userQuery)
      const users = result.rows

      let sent = 0
      let failed = 0

      for (const user of users) {
        try {
          await botService.sendMessage(user.telegram_id, message)
          sent++

          // Небольшая задержка между отправками
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (error) {
          failed++
          logger.warn('Failed to send broadcast message', {
            telegramId: user.telegram_id,
            error
          })
        }
      }

      logger.info('Broadcast completed', {
        targetType,
        totalUsers: users.length,
        sent,
        failed
      })

      return { sent, failed }
    } catch (error) {
      logger.error('Error in broadcast message', error)
      return { sent: 0, failed: 0 }
    }
  }

  async exportUsers(format: 'csv' | 'json' = 'csv'): Promise<string> {
    try {
      const query = `
        SELECT 
          telegram_id,
          username,
          first_name,
          last_name,
          registration_date,
          last_activity,
          total_calculations,
          total_orders,
          is_subscribed
        FROM bot_users
        ORDER BY registration_date DESC
      `

      const result = await db.query(query)
      const users = result.rows

      if (format === 'json') {
        return JSON.stringify(users, null, 2)
      }

      // CSV format
      const headers = [
        'telegram_id',
        'username',
        'first_name',
        'last_name',
        'registration_date',
        'last_activity',
        'total_calculations',
        'total_orders',
        'is_subscribed'
      ].join(',')

      const csvRows = users.map(user =>
        Object.values(user).map(value =>
          typeof value === 'string' && value.includes(',')
            ? `"${value}"`
            : value
        ).join(',')
      )

      return [headers, ...csvRows].join('\n')
    } catch (error) {
      logger.error('Error exporting users', error)
      throw error
    }
  }

  async getDetailedUserStats(telegramId: string): Promise<any> {
    try {
      const userQuery = `
        SELECT 
          bu.*,
          COUNT(pc.id) as total_calculations,
          COUNT(bo.id) as total_orders,
          COALESCE(SUM(bo.amount), 0) as total_order_amount
        FROM bot_users bu
        LEFT JOIN product_calculations pc ON bu.id = pc.user_id
        LEFT JOIN bot_orders bo ON bu.id = bo.user_id
        WHERE bu.telegram_id = $1
        GROUP BY bu.id
      `

      const ordersQuery = `
        SELECT bo.*, pc.category
        FROM bot_orders bo
        LEFT JOIN product_calculations pc ON bo.calculation_id = pc.id
        WHERE bo.user_id = (SELECT id FROM bot_users WHERE telegram_id = $1)
        ORDER BY bo.created_at DESC
        LIMIT 10
      `

      const apiUsageQuery = `
        SELECT 
          api_endpoint,
          SUM(request_count) as total_requests,
          MAX(request_date) as last_request_date
        FROM api_usage
        WHERE user_id = (SELECT id FROM bot_users WHERE telegram_id = $1)
        GROUP BY api_endpoint
      `

      const [userResult, ordersResult, apiResult] = await Promise.all([
        db.query(userQuery, [telegramId]),
        db.query(ordersQuery, [telegramId]),
        db.query(apiUsageQuery, [telegramId])
      ])

      if (userResult.rows.length === 0) {
        return null
      }

      return {
        user: userResult.rows[0],
        recentOrders: ordersResult.rows,
        apiUsage: apiResult.rows
      }
    } catch (error) {
      logger.error('Error getting detailed user stats', error)
      return null
    }
  }
}

export const botMessageHandler = new BotMessageHandler()