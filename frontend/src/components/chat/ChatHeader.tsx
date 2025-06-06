// frontend/src/components/chat/ChatHeader.tsx
import React, { useState } from 'react'
import {
  ArrowLeft,
  Phone,
  Video,
  MoreVertical,
  Search,
  RefreshCw,
  User,
  MessageSquare,
  Archive,
  Star,
  Ban
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Contact {
  id: number
  telegram_id: string
  telegram_username?: string
  display_name: string
  online_status: 'online' | 'recently' | 'offline'
  avatar_url?: string
}

interface ChatHeaderProps {
  contact: Contact
  onBack: () => void
  onRefresh: () => void
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  contact,
  onBack,
  onRefresh
}) => {
  const [showMenu, setShowMenu] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-400'
      case 'recently': return 'bg-yellow-400'
      default: return 'bg-gray-300'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'в сети'
      case 'recently': return 'недавно был(а) в сети'
      default: return 'не в сети'
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  const handleTelegramOpen = () => {
    if (contact.telegram_username) {
      window.open(`https://t.me/${contact.telegram_username}`, '_blank')
    } else if (contact.telegram_id) {
      window.open(`https://t.me/user?id=${contact.telegram_id}`, '_blank')
    }
  }

  const menuItems = [
    {
      icon: <User className="w-4 h-4" />,
      label: 'Профиль контакта',
      action: () => {
        // TODO: Открыть профиль контакта
        console.log('Open contact profile')
      }
    },
    {
      icon: <Search className="w-4 h-4" />,
      label: 'Поиск в чате',
      action: () => setShowSearch(!showSearch)
    },
    {
      icon: <Star className="w-4 h-4" />,
      label: 'Добавить в избранное',
      action: () => {
        // TODO: Добавить в избранное
        console.log('Add to favorites')
      }
    },
    {
      icon: <Archive className="w-4 h-4" />,
      label: 'Архивировать чат',
      action: () => {
        // TODO: Архивировать
        console.log('Archive chat')
      }
    },
    {
      icon: <Ban className="w-4 h-4" />,
      label: 'Заблокировать',
      action: () => {
        // TODO: Заблокировать
        console.log('Block contact')
      },
      danger: true
    }
  ]

  return (
    <>
      <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          {/* Кнопка "Назад" (мобильная) */}
          <button
            onClick={onBack}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          {/* Аватар */}
          <div className="relative flex-shrink-0">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium cursor-pointer
              ${contact.avatar_url 
                ? 'bg-cover bg-center' 
                : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
              }
            `}
            style={contact.avatar_url ? { backgroundImage: `url(${contact.avatar_url})` } : {}}
            onClick={handleTelegramOpen}
            title="Открыть в Telegram"
            >
              {!contact.avatar_url && getInitials(contact.display_name)}
            </div>

            {/* Индикатор статуса */}
            <div className={`
              absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white rounded-full
              ${getStatusColor(contact.online_status)}
            `} />
          </div>

          {/* Информация о контакте */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h2
                className="text-lg font-semibold text-gray-900 truncate cursor-pointer hover:text-blue-600 transition-colors"
                onClick={handleTelegramOpen}
                title="Открыть в Telegram"
              >
                {contact.display_name}
              </h2>

              {contact.telegram_username && (
                <span className="text-sm text-gray-500">
                  @{contact.telegram_username}
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600">
              {getStatusText(contact.online_status)}
            </p>
          </div>
        </div>

        {/* Действия */}
        <div className="flex items-center space-x-2">
          {/* Поиск */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSearch(!showSearch)}
            className={`
              p-2 rounded-lg transition-colors
              ${showSearch 
                ? 'bg-blue-100 text-blue-600' 
                : 'hover:bg-gray-100 text-gray-600'
              }
            `}
            title="Поиск в чате"
          >
            <Search className="w-5 h-5" />
          </motion.button>

          {/* Обновить */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onRefresh}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
            title="Обновить сообщения"
          >
            <RefreshCw className="w-5 h-5" />
          </motion.button>

          {/* Телефон */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleTelegramOpen}
            className="hidden sm:block p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
            title="Открыть в Telegram"
          >
            <MessageSquare className="w-5 h-5" />
          </motion.button>

          {/* Меню */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowMenu(!showMenu)}
              className={`
                p-2 rounded-lg transition-colors
                ${showMenu 
                  ? 'bg-gray-100 text-gray-900' 
                  : 'hover:bg-gray-100 text-gray-600'
                }
              `}
              title="Меню"
            >
              <MoreVertical className="w-5 h-5" />
            </motion.button>

            {/* Выпадающее меню */}
            <AnimatePresence>
              {showMenu && (
                <>
                  {/* Overlay для закрытия меню */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />

                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20"
                  >
                    {menuItems.map((item, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          item.action()
                          setShowMenu(false)
                        }}
                        className={`
                          w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors
                          ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}
                        `}
                      >
                        {item.icon}
                        <span className="text-sm">{item.label}</span>
                      </button>
                    ))}

                    <div className="border-t border-gray-100 my-2" />

                    <div className="px-4 py-2">
                      <div className="text-xs text-gray-500">
                        <div>ID: {contact.telegram_id}</div>
                        {contact.telegram_username && (
                          <div>Username: @{contact.telegram_username}</div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Панель поиска */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-b border-gray-200 bg-gray-50 overflow-hidden"
          >
            <div className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск в этом чате..."
                  className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span>Поиск по:</span>
                  <label className="flex items-center space-x-1">
                    <input type="checkbox" defaultChecked className="rounded" />
                    <span>Текст</span>
                  </label>
                  <label className="flex items-center space-x-1">
                    <input type="checkbox" className="rounded" />
                    <span>Файлы</span>
                  </label>
                </div>

                <button
                  onClick={() => setShowSearch(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default ChatHeader