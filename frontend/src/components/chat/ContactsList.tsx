// frontend/src/components/chat/ContactsList.tsx
import React from 'react'
import { motion } from 'framer-motion'
import {
  MessageCircle,
  Phone,
  MoreHorizontal,
  RefreshCw,
  Clock,
  CheckCheck,
  Image,
  FileText,
  Video,
  Mic
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

interface Contact {
  id: number
  telegram_id: string
  telegram_username?: string
  display_name: string
  last_message?: string
  last_message_type: string
  last_message_direction: 'incoming' | 'outgoing'
  last_message_time?: string
  unread_count: number
  online_status: 'online' | 'recently' | 'offline'
  avatar_url?: string
}

interface ContactsListProps {
  contacts: Contact[]
  selectedContactId: number | null
  onContactSelect: (contactId: number) => void
  searchQuery: string
  onRefresh: () => void
}

const ContactsList: React.FC<ContactsListProps> = ({
  contacts,
  selectedContactId,
  onContactSelect,
  searchQuery,
  onRefresh
}) => {

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
      case 'recently': return 'недавно'
      default: return 'не в сети'
    }
  }

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'photo': return <Image className="w-3 h-3" />
      case 'video': return <Video className="w-3 h-3" />
      case 'audio':
      case 'voice': return <Mic className="w-3 h-3" />
      case 'document': return <FileText className="w-3 h-3" />
      default: return null
    }
  }

  const formatLastMessageTime = (timeString?: string) => {
    if (!timeString) return ''

    try {
      const date = new Date(timeString)
      const now = new Date()
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

      if (diffInHours < 24) {
        return date.toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit'
        })
      } else if (diffInHours < 24 * 7) {
        return formatDistanceToNow(date, { addSuffix: true, locale: ru })
      } else {
        return date.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit'
        })
      }
    } catch {
      return ''
    }
  }

  const formatLastMessage = (contact: Contact) => {
    if (!contact.last_message) return 'Нет сообщений'

    const maxLength = 40
    let message = contact.last_message

    // Добавляем префикс для медиа
    if (contact.last_message_type !== 'text') {
      const typeMap = {
        photo: '📷 Фото',
        video: '🎥 Видео',
        audio: '🎵 Аудио',
        voice: '🎤 Голосовое',
        document: '📄 Документ',
        sticker: '😀 Стикер'
      }
      message = typeMap[contact.last_message_type as keyof typeof typeMap] || message
    }

    return message.length > maxLength
      ? message.substring(0, maxLength) + '...'
      : message
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  if (contacts.length === 0 && searchQuery) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-2">Ничего не найдено</p>
          <p className="text-sm text-gray-400">
            Попробуйте изменить запрос поиска
          </p>
        </div>
      </div>
    )
  }

  if (contacts.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-2">Нет активных чатов</p>
          <p className="text-sm text-gray-400 mb-4">
            Новые диалоги появятся здесь автоматически
          </p>
          <button
            onClick={onRefresh}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Обновить</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Заголовок если есть поиск */}
      {searchQuery && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
          <p className="text-sm text-gray-600">
            Найдено {contacts.length} {contacts.length === 1 ? 'результат' : 'результатов'}
          </p>
        </div>
      )}

      {/* Список контактов */}
      <div className="divide-y divide-gray-100">
        {contacts.map((contact, index) => (
          <motion.div
            key={contact.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.02 }}
            onClick={() => onContactSelect(contact.id)}
            className={`
              relative p-4 hover:bg-gray-50 cursor-pointer transition-all duration-200
              ${selectedContactId === contact.id 
                ? 'bg-blue-50 border-r-2 border-blue-500' 
                : 'hover:bg-gray-50'
              }
            `}
          >
            <div className="flex items-start space-x-3">
              {/* Аватар */}
              <div className="relative flex-shrink-0">
                <div className={`
                  w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium
                  ${contact.avatar_url 
                    ? 'bg-cover bg-center' 
                    : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'
                  }
                `}
                style={contact.avatar_url ? { backgroundImage: `url(${contact.avatar_url})` } : {}}
                >
                  {!contact.avatar_url && getInitials(contact.display_name)}
                </div>

                {/* Индикатор онлайн статуса */}
                <div className={`
                  absolute -bottom-0.5 -right-0.5 w-4 h-4 border-2 border-white rounded-full
                  ${getStatusColor(contact.online_status)}
                `} title={getStatusText(contact.online_status)} />
              </div>

              {/* Информация о контакте */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={`
                    text-sm font-medium truncate
                    ${selectedContactId === contact.id ? 'text-blue-900' : 'text-gray-900'}
                  `}>
                    {contact.display_name}
                  </h3>

                  <div className="flex items-center space-x-1 text-xs text-gray-500 flex-shrink-0 ml-2">
                    {contact.last_message_direction === 'outgoing' && (
                      <CheckCheck className="w-3 h-3 text-blue-500" />
                    )}
                    <span>{formatLastMessageTime(contact.last_message_time)}</span>
                  </div>
                </div>

                {/* Telegram username */}
                {contact.telegram_username && (
                  <p className="text-xs text-gray-500 mb-1">
                    @{contact.telegram_username}
                  </p>
                )}

                {/* Последнее сообщение */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1 min-w-0 flex-1">
                    {getMessageTypeIcon(contact.last_message_type)}
                    <p className={`
                      text-sm truncate
                      ${contact.unread_count > 0 
                        ? 'text-gray-900 font-medium' 
                        : 'text-gray-600'
                      }
                    `}>
                      {formatLastMessage(contact)}
                    </p>
                  </div>

                  {/* Счетчик непрочитанных */}
                  {contact.unread_count > 0 && (
                    <div className="flex-shrink-0 ml-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-white bg-blue-600 rounded-full">
                        {contact.unread_count > 99 ? '99+' : contact.unread_count}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Меню действий */}
              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    // TODO: Показать контекстное меню
                  }}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <MoreHorizontal className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Hover эффект */}
            {selectedContactId === contact.id && (
              <motion.div
                layoutId="selectedContact"
                className="absolute inset-0 bg-blue-50 rounded-lg -z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              />
            )}
          </motion.div>
        ))}
      </div>

      {/* Кнопка обновления внизу */}
      <div className="p-4 border-t border-gray-100 bg-white">
        <button
          onClick={onRefresh}
          className="w-full flex items-center justify-center space-x-2 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Обновить список</span>
        </button>
      </div>
    </div>
  )
}

export default ContactsList