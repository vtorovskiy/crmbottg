// frontend/src/components/chat/MessageBubble.tsx
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MoreVertical,
  Copy,
  Trash2,
  Reply,
  Forward,
  Download,
  Image,
  FileText,
  Video,
  Mic,
  CheckCheck,
  Check
} from 'lucide-react'

interface Message {
  id: number
  telegram_message_id?: number
  content: string
  type: string
  direction: 'incoming' | 'outgoing'
  file_path?: string
  file_name?: string
  file_size?: number
  is_read: boolean
  created_at: string
  sender_admin?: string
}

interface MessageBubbleProps {
  message: Message
  onDelete: () => void
  onCopy: () => void
  showActions: boolean
  onToggleActions: () => void
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onDelete,
  onCopy,
  showActions,
  onToggleActions
}) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  const isOutgoing = message.direction === 'outgoing'
  const isMedia = ['photo', 'video', 'audio', 'voice', 'document', 'sticker'].includes(message.type)

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'photo': return <Image className="w-4 h-4" />
      case 'video': return <Video className="w-4 h-4" />
      case 'audio':
      case 'voice': return <Mic className="w-4 h-4" />
      case 'document': return <FileText className="w-4 h-4" />
      default: return <FileText className="w-4 h-4" />
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''

    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const renderMessageContent = () => {
    // Текстовое сообщение
    if (message.type === 'text') {
      return (
        <div className="whitespace-pre-wrap break-words">
          {message.content}
        </div>
      )
    }

    // Фото
    if (message.type === 'photo' && message.file_path) {
      return (
        <div className="relative">
          {!imageLoaded && !imageError && (
            <div className="w-48 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
              <Image className="w-8 h-8 text-gray-400" />
            </div>
          )}

          <img
            src={message.file_path}
            alt="Изображение"
            className={`max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity ${
              imageLoaded ? 'block' : 'hidden'
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true)
              setImageLoaded(false)
            }}
            onClick={() => window.open(message.file_path, '_blank')}
          />

          {imageError && (
            <div className="w-48 h-32 bg-gray-200 rounded-lg flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Image className="w-8 h-8 mx-auto mb-2" />
                <p className="text-xs">Не удалось загрузить</p>
              </div>
            </div>
          )}

          {message.content && (
            <div className="mt-2 text-sm">
              {message.content}
            </div>
          )}
        </div>
      )
    }

    // Файлы (документы, аудио, видео)
    if (isMedia) {
      return (
        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex-shrink-0 p-2 bg-gray-200 rounded-lg">
            {getFileIcon(message.type)}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {message.file_name || `${message.type.toUpperCase()} файл`}
            </p>

            {message.file_size && (
              <p className="text-xs text-gray-500">
                {formatFileSize(message.file_size)}
              </p>
            )}

            {message.content && (
              <p className="text-sm text-gray-700 mt-1">
                {message.content}
              </p>
            )}
          </div>

          {message.file_path && (
            <button
              onClick={() => window.open(message.file_path, '_blank')}
              className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              title="Скачать файл"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }

    // Стикер
    if (message.type === 'sticker') {
      return (
        <div className="text-4xl">
          {message.content || '😀'}
        </div>
      )
    }

    // Fallback для неизвестных типов
    return (
      <div className="flex items-center space-x-2 text-gray-600">
        {getFileIcon(message.type)}
        <span className="text-sm">
          {message.content || `${message.type.toUpperCase()} сообщение`}
        </span>
      </div>
    )
  }

  const bubbleActions = [
    {
      icon: <Copy className="w-4 h-4" />,
      label: 'Копировать',
      action: onCopy,
      show: true
    },
    {
      icon: <Reply className="w-4 h-4" />,
      label: 'Ответить',
      action: () => console.log('Reply'), // TODO: Implement reply
      show: true
    },
    {
      icon: <Forward className="w-4 h-4" />,
      label: 'Переслать',
      action: () => console.log('Forward'), // TODO: Implement forward
      show: true
    },
    {
      icon: <Trash2 className="w-4 h-4" />,
      label: 'Удалить',
      action: onDelete,
      show: isOutgoing, // Можно удалять только свои сообщения
      danger: true
    }
  ]

  return (
    <div className="relative group">
      {/* Основное сообщение */}
      <motion.div
        whileHover={{ scale: 1.01 }}
        className={`
          relative rounded-2xl px-4 py-2 max-w-xs lg:max-w-md break-words
          ${isOutgoing
            ? 'bg-blue-600 text-white ml-auto'
            : 'bg-white text-gray-900 shadow-sm border border-gray-200'
          }
          ${message.type === 'sticker' ? 'bg-transparent shadow-none border-none p-1' : ''}
        `}
      >
        {renderMessageContent()}

        {/* Индикатор прочтения (только для исходящих) */}
        {isOutgoing && (
          <div className="flex justify-end mt-1">
            {message.is_read ? (
              <CheckCheck className="w-3 h-3 text-blue-200" />
            ) : (
              <Check className="w-3 h-3 text-blue-200" />
            )}
          </div>
        )}
      </motion.div>

      {/* Кнопка действий */}
      <div className={`
        absolute top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200
        ${isOutgoing ? 'left-0 -translate-x-full -ml-2' : 'right-0 translate-x-full -mr-2'}
      `}>
        <button
          onClick={onToggleActions}
          className="p-1.5 bg-white rounded-full shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <MoreVertical className="w-3 h-3 text-gray-600" />
        </button>
      </div>

      {/* Меню действий */}
      <AnimatePresence>
        {showActions && (
          <div className={`
            absolute top-0 z-20
            ${isOutgoing ? 'right-full mr-2' : 'left-full ml-2'}
          `}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.1 }}
              className="bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-32"
            >
              {bubbleActions
                .filter(action => action.show)
                .map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      action.action()
                      onToggleActions()
                    }}
                    className={`
                      w-full flex items-center space-x-2 px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors
                      ${action.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}
                    `}
                  >
                    {action.icon}
                    <span>{action.label}</span>
                  </button>
                ))}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Overlay для закрытия меню */}
      {showActions && (
        <div
          className="fixed inset-0 z-10"
          onClick={onToggleActions}
        />
      )}
    </div>
  )
}

export default MessageBubble