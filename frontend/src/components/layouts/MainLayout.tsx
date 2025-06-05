// frontend/src/components/layouts/MainLayout.tsx - ПОЛНАЯ ИСПРАВНАЯ ВЕРСИЯ
import React, { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Target,
  MessageSquare,
  Settings,
  Menu,
  X,
  LogOut,
  User,
  Bell,
  Search,
  ChevronDown
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { useAuthStore } from '@/store/authStore'

// Конфигурация навигации
const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Главная панель',
    badge: null
  },
  {
    name: 'Контакты',
    href: '/contacts',
    icon: Users,
    description: 'Управление контактами',
    badge: 156
  },
  {
    name: 'Сделки',
    href: '/deals',
    icon: Target,
    description: 'Воронка продаж',
    badge: 8
  },
  {
    name: 'Чат',
    href: '/chat',
    icon: MessageSquare,
    description: 'Telegram сообщения',
    badge: 3
  },
  {
    name: 'Настройки',
    href: '/settings',
    icon: Settings,
    description: 'Настройки системы',
    badge: null
  }
]

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNavigation = (href: string) => {
    navigate(href)
    setSidebarOpen(false)
  }

  // Определяем активную страницу
  const currentPage = navigation.find(item => location.pathname === item.href)

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar - Always visible on large screens */}
      <div className="hidden lg:flex lg:flex-col lg:w-72 lg:bg-white/95 lg:backdrop-blur-xl lg:shadow-2xl lg:border-r lg:border-gray-200/50">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b border-gray-200/50">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl flex items-center justify-center shadow-lg">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div className="ml-3">
                <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Telegram CRM
                </span>
                <div className="text-xs text-gray-500">Management System</div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="px-6 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-6 py-2 space-y-1 overflow-y-auto">
            {navigation.map((item, index) => {
              const isActive = location.pathname === item.href
              const Icon = item.icon

              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href)}
                  className={`
                    group flex items-center w-full px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 text-left relative overflow-hidden
                    ${isActive 
                      ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-lg' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className={`
                    mr-3 w-5 h-5 transition-all duration-200
                    ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}
                  `} />
                  <span className="flex-1">{item.name}</span>
                  {item.badge && (
                    <span className={`
                      ml-auto px-2 py-1 text-xs rounded-full font-medium
                      ${isActive 
                        ? 'bg-white/20 text-white' 
                        : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                      }
                    `}>
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* User section */}
          <div className="p-6 border-t border-gray-200/50">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.email || 'Пользователь'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.role || 'admin'}
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                  >
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Выйти из системы
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <motion.div
        initial={false}
        animate={{ x: sidebarOpen ? 0 : '-100%' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white/95 backdrop-blur-xl shadow-2xl border-r border-gray-200/50"
      >
        <div className="flex flex-col h-full">
          {/* Logo and Close button */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200/50">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-xl flex items-center justify-center shadow-lg">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div className="ml-3">
                <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  Telegram CRM
                </span>
                <div className="text-xs text-gray-500">Management System</div>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="px-6 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск..."
                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-6 py-2 space-y-1 overflow-y-auto">
            {navigation.map((item, index) => {
              const isActive = location.pathname === item.href
              const Icon = item.icon

              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href)}
                  className={`
                    group flex items-center w-full px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 text-left relative overflow-hidden
                    ${isActive 
                      ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-white shadow-lg' 
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className={`
                    mr-3 w-5 h-5 transition-all duration-200
                    ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-600'}
                  `} />
                  <span className="flex-1">{item.name}</span>
                  {item.badge && (
                    <span className={`
                      ml-auto px-2 py-1 text-xs rounded-full font-medium
                      ${isActive 
                        ? 'bg-white/20 text-white' 
                        : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                      }
                    `}>
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* User section */}
          <div className="p-6 border-t border-gray-200/50">
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.email || 'Пользователь'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user?.role || 'admin'}
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                  >
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Выйти из системы
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="bg-white/80 backdrop-blur-xl shadow-sm border-b border-gray-200/50">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                {/* Mobile menu button */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-200"
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Page title */}
                <div className="ml-4 lg:ml-0">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                    {currentPage?.name || 'Dashboard'}
                  </h1>
                  {currentPage?.description && (
                    <p className="text-sm text-gray-500">
                      {currentPage.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Header actions */}
              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                </button>

                {/* Status indicator */}
                <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-green-50 rounded-full">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-700 font-medium">Система онлайн</span>
                </div>

                {/* User menu (desktop) */}
                <div className="hidden lg:flex items-center space-x-3">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                    <p className="text-xs text-gray-500">{user?.role}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Выйти
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default MainLayout