// frontend/src/components/chat/ChatWindow.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Send, Smile, Paperclip, Image, ArrowDown, MoreVertical, Trash2, Copy, Reply } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'

import { messagesApi } from '@/services/api'
import MessageBubble from '@/components/chat/MessageBubble'
import LoadingSpinner from '@/components/common/LoadingSpinner'

interface Contact {
  id: number
  telegram_id: string
  telegram_username?: string
  display_name: string
  online_status: string
}

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

interface ChatWindowProps {
  contactId: number
  contact: Contact
}

const ChatWindow: React.FC<ChatWindowProps> = ({ contactId, contact }) => {
  const [messageText, setMessageText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [selectedMessages, setSelectedMessages] = useState<number[]>([])
  const [showMessageActions, setShowMessageActions] = useState<number | null>(null)

  const [isUserScrolling, setIsUserScrolling] = useState(false)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true)
  const lastMessageCountRef = useRef(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const queryClient = useQueryClient()

  // Загружаем историю сообщений
  const {
    data: messagesData,
    isLoading: messagesLoading,
    error: messagesError,
    refetch: refetchMessages
  } = useQuery({
    queryKey: ['messages', contactId],
    queryFn: () => messagesApi.getMessageHistory(contactId),
    refetchInterval: 5000, // Обновляем каждые 5 секунд
    enabled: !!contactId
  })

  // Мутация для отправки сообщения
  const sendMessageMutation = useMutation({
    mutationFn: (data: { contactId: number; content: string; type?: string }) =>
      messagesApi.sendMessage(data),
    onSuccess: () => {
      setMessageText('')
      queryClient.invalidateQueries({ queryKey: ['messages', contactId] })
      queryClient.invalidateQueries({ queryKey: ['contacts-list'] })
      scrollToBottom()
    },
    onError: (error) => {
      console.error('Send message error:', error)
      toast.error('Не удалось отправить сообщение')
    }
  })

  // Мутация для удаления сообщения
  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: number) => messagesApi.deleteMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', contactId] })
      queryClient.invalidateQueries({ queryKey: ['contacts-list'] })
      toast.success('Сообщение удалено')
    },
    onError: () => {
      toast.error('Не удалось удалить сообщение')
    }
  })

  const messages: Message[] = messagesData?.data?.messages || []

  // Прокрутка к концу при новых сообщениях
  const scrollToBottom = useCallback((force = false) => {
    if (!shouldAutoScroll && !force) return

    messagesEndRef.current?.scrollIntoView({
      behavior: force ? 'auto' : 'smooth'
    })
  }, [shouldAutoScroll])

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const { scrollTop, scrollHeight, clientHeight } = container
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50

    if (!isAtBottom && !isUserScrolling) {
      setIsUserScrolling(true)
      setShouldAutoScroll(false)
    }

    if (isAtBottom && isUserScrolling) {
      setIsUserScrolling(false)
      setShouldAutoScroll(true)
    }
  }, [isUserScrolling])

  useEffect(() => {
    const currentMessageCount = messages.length
    const isNewMessage = currentMessageCount > lastMessageCountRef.current

    if (isNewMessage) {
      const isFirstLoad = lastMessageCountRef.current === 0
      scrollToBottom(isFirstLoad)
    }

    lastMessageCountRef.current = currentMessageCount
  }, [messages.length, scrollToBottom])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Автоматическое изменение высоты textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [messageText])

  // Помечаем сообщения как прочитанные
  useEffect(() => {
    if (contactId && messages.some(m => m.direction === 'incoming' && !m.is_read)) {
      messagesApi.markAsRead(contactId).catch(console.error)
    }
  }, [contactId, messages])

  const handleSendMessage = async () => {
    const trimmedText = messageText.trim()
    if (!trimmedText || sendMessageMutation.isPending) return

    setIsTyping(true)
    setShouldAutoScroll(true)
    try {
      await sendMessageMutation.mutateAsync({
        contactId,
        content: trimmedText,
        type: 'text'
      })
    } finally {
      setIsTyping(false)
    }
    setTimeout(() => scrollToBottom(true), 100)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleDeleteMessage = (messageId: number) => {
    if (window.confirm('Удалить это сообщение?')) {
      deleteMessageMutation.mutate(messageId)
    }
  }

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    toast.success('Сообщение скопировано')
  }

  const formatMessageTime = (timeString: string) => {
    const date = new Date(timeString)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    if (isToday) {
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      })
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      }) + ' ' + date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  // Группируем сообщения по датам
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {}

    messages.forEach(message => {
      const date = new Date(message.created_at).toDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
    })

    return groups
  }

  const messageGroups = groupMessagesByDate(messages)

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    const isYesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString() === dateString

    if (isToday) return 'Сегодня'
    if (isYesterday) return 'Вчера'

    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    })
  }

  if (messagesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-gray-600">Загрузка сообщений...</p>
        </div>
      </div>
    )
  }

  if (messagesError) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Ошибка загрузки сообщений</p>
          <button
            onClick={() => refetchMessages()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Область сообщений */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{ scrollBehavior: 'smooth' }}
      >
        {isUserScrolling && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => {
              setShouldAutoScroll(true)
              setIsUserScrolling(false)
              scrollToBottom(true)
            }}
            className="fixed bottom-20 right-8 z-10 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-colors"
            title="Прокрутить к новым сообщениям"
          >
            <ArrowDown className="w-5 h-5" />
          </motion.button>
        )}
        {messages.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Начните диалог
              </h3>
              <p className="text-gray-600 max-w-sm">
                Это начало вашего диалога с {contact.display_name}.
                Отправьте первое сообщение!
              </p>
            </div>
          </div>
        ) : (
          Object.entries(messageGroups).map(([dateString, dateMessages]) => (
            <div key={dateString}>
              {/* Заголовок даты */}
              <div className="flex justify-center mb-4">
                <div className="px-3 py-1 bg-white rounded-full shadow-sm border border-gray-200">
                  <span className="text-xs text-gray-600 font-medium">
                    {formatDateHeader(dateString)}
                  </span>
                </div>
              </div>

              {/* Сообщения за день */}
              <div className="space-y-2">
                {dateMessages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${message.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="relative group max-w-xs lg:max-w-md">
                      <MessageBubble
                        message={message}
                        onDelete={() => handleDeleteMessage(message.id)}
                        onCopy={() => handleCopyMessage(message.content)}
                        showActions={showMessageActions === message.id}
                        onToggleActions={() =>
                          setShowMessageActions(
                            showMessageActions === message.id ? null : message.id
                          )
                        }
                      />

                      <div className="text-xs text-gray-500 mt-1 px-2">
                        {formatMessageTime(message.created_at)}
                        {message.direction === 'outgoing' && message.sender_admin && (
                          <span className="ml-2">• {message.sender_admin}</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Индикатор печати */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex justify-start"
          >
            <div className="bg-white rounded-2xl px-4 py-2 shadow-sm">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Поле ввода сообщения */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex items-end space-x-3">
          {/* Кнопка прикрепления файлов */}
          <button className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Поле ввода */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Сообщение для ${contact.display_name}...`}
              rows={1}
              className="w-full px-4 py-2 pr-12 text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none max-h-32"
              style={{ minHeight: '40px' }}
            />

            {/* Кнопка эмодзи */}
            <button className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors">
              <Smile className="w-4 h-4" />
            </button>
          </div>

          {/* Кнопка отправки */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sendMessageMutation.isPending}
            className={`
              flex-shrink-0 p-2 rounded-lg transition-all duration-200
              ${messageText.trim() 
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            {sendMessageMutation.isPending ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </motion.button>
        </div>

        {/* Информация о наборе текста */}
        <div className="mt-2 text-xs text-gray-500">
          <span>
            {contact.online_status === 'online' ? 'в сети' : 'не в сети'}
          </span>
          {messageText.length > 0 && (
            <span className="ml-2">
              Shift+Enter для новой строки
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatWindow