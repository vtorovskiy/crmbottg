// frontend/src/pages/ChatPage.tsx
import React, { useState, useEffect } from 'react'
import { Search, Users, MessageSquare, Phone, MoreVertical } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { messagesApi } from '@/services/api'
import ContactsList from '@/components/chat/ContactsList'
import ChatWindow from '@/components/chat/ChatWindow'
import ChatHeader from '@/components/chat/ChatHeader'
import LoadingSpinner from '@/components/common/LoadingSpinner'

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

const ChatPage: React.FC = () => {
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isMobileContactsOpen, setIsMobileContactsOpen] = useState(false)

  // Загружаем список контактов
  const {
    data: contactsData,
    isLoading: contactsLoading,
    error: contactsError,
    refetch: refetchContacts
  } = useQuery({
    queryKey: ['contacts-list'],
    queryFn: () => messagesApi.getContactsList(),
    refetchInterval: 10000, // Обновляем каждые 10 секунд
  })

  // Загружаем статистику
  const { data: statsData } = useQuery({
    queryKey: ['messages-stats'],
    queryFn: () => messagesApi.getStats(),
    refetchInterval: 30000, // Обновляем каждые 30 секунд
  })

  const contacts: Contact[] = contactsData?.data || []
  const stats = statsData?.data || {}

  // Фильтруем контакты по поисковому запросу
  const filteredContacts = contacts.filter(contact => 
    contact.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.telegram_username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.last_message?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Выбранный контакт
  const selectedContact = contacts.find(c => c.id === selectedContactId)

  // Обработка ошибок
  useEffect(() => {
    if (contactsError) {
      toast.error('Не удалось загрузить список контактов')
      console.error('Contacts loading error:', contactsError)
    }
  }, [contactsError])

  // Автоматически выбираем первый контакт на десктопе
  useEffect(() => {
    if (contacts.length > 0 && !selectedContactId && window.innerWidth >= 1024) {
      setSelectedContactId(contacts[0].id)
    }
  }, [contacts, selectedContactId])

  const handleContactSelect = (contactId: number) => {
    setSelectedContactId(contactId)
    setIsMobileContactsOpen(false)
  }

  const handleBackToContacts = () => {
    setSelectedContactId(null)
    setIsMobileContactsOpen(true)
  }

  if (contactsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-gray-600">Загрузка чатов...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Левая панель - Список контактов */}
      <div className={`
        w-full lg:w-80 xl:w-96 border-r border-gray-200 flex flex-col bg-gray-50
        ${selectedContactId && window.innerWidth < 1024 ? 'hidden' : 'flex'}
      `}>
        {/* Заголовок панели */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-6 h-6 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">Сообщения</h2>
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 rounded-lg">
                <Users className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">
                  {contacts.length}
                </span>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Поиск */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Поиск по чатам..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
          </div>
        </div>

        {/* Статистика */}
        {stats.unread_messages > 0 && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
            <p className="text-sm text-blue-700">
              <span className="font-medium">{stats.unread_messages}</span> непрочитанных сообщений
            </p>
          </div>
        )}

        {/* Список контактов */}
        <ContactsList
          contacts={filteredContacts}
          selectedContactId={selectedContactId}
          onContactSelect={handleContactSelect}
          searchQuery={searchQuery}
          onRefresh={refetchContacts}
        />
      </div>

      {/* Правая панель - Чат */}
      <div className={`
        flex-1 flex flex-col
        ${!selectedContactId && window.innerWidth < 1024 ? 'hidden' : 'flex'}
      `}>
        {selectedContact ? (
          <>
            {/* Заголовок чата */}
            <ChatHeader
              contact={selectedContact}
              onBack={handleBackToContacts}
              onRefresh={() => refetchContacts()}
            />

            {/* Окно чата */}
            <ChatWindow
              contactId={selectedContactId!}
              contact={selectedContact}
            />
          </>
        ) : (
          /* Пустое состояние */
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center max-w-md mx-auto px-6"
            >
              <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-10 h-10 text-gray-400" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Выберите чат
              </h3>
              
              <p className="text-gray-600 mb-6">
                Выберите диалог из списка слева, чтобы начать общение с клиентом.
              </p>

              {contacts.length === 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-sm text-yellow-800">
                    Пока нет активных диалогов. Новые чаты появятся здесь, когда клиенты напишут боту.
                  </p>
                </div>
              )}

              <div className="flex justify-center space-x-4 mt-6">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => refetchContacts()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Обновить
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  Настройки
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </div>

      {/* Мобильная кнопка "Назад к чатам" */}
      {selectedContactId && (
        <button
          onClick={handleBackToContacts}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
        >
          <Users className="w-5 h-5 text-gray-600" />
        </button>
      )}
    </div>
  )
}

export default ChatPage