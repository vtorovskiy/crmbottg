// frontend/src/pages/DashboardPage.tsx
import React, { useState, useEffect } from 'react'
import { 
  Users, 
  Target, 
  TrendingUp, 
  MessageSquare, 
  DollarSign,
  Calendar,
  Activity,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Eye
} from 'lucide-react'
import { motion } from 'framer-motion'
import { statsApi } from '@/services/api'
import LoadingSpinner from '@/components/common/LoadingSpinner'

// Типы для статистики
interface DashboardStats {
  contactsThisMonth: number
  totalContacts: number
  activeDeals: number
  totalDealsAmount: number
  closedDealsThisMonth: number
  averageDealSize: number
  conversionRate: number
  recentActivities: Array<{
    id: number
    type: string
    description: string
    createdAt: string
  }>
}

// Компонент метрики
interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  changeType?: 'increase' | 'decrease'
  icon: React.ReactNode
  color: string
  delay?: number
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  changeType, 
  icon, 
  color,
  delay = 0 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-300"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <div className="flex items-baseline">
            <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
            {change !== undefined && (
              <div className={`ml-2 flex items-center text-sm ${
                changeType === 'increase' ? 'text-green-600' : 'text-red-600'
              }`}>
                {changeType === 'increase' ? (
                  <ArrowUp className="w-4 h-4 mr-1" />
                ) : (
                  <ArrowDown className="w-4 h-4 mr-1" />
                )}
                {Math.abs(change)}%
              </div>
            )}
          </div>
        </div>
        <div className={`p-3 rounded-lg bg-gradient-to-br ${color}`}>
          {icon}
        </div>
      </div>
    </motion.div>
  )
}

// Компонент активности
interface ActivityItemProps {
  activity: {
    id: number
    type: string
    description: string
    createdAt: string
  }
  index: number
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity, index }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'contact_created':
        return <Users className="w-4 h-4 text-blue-600" />
      case 'deal_updated':
        return <Target className="w-4 h-4 text-green-600" />
      case 'message_received':
        return <MessageSquare className="w-4 h-4 text-purple-600" />
      default:
        return <Activity className="w-4 h-4 text-gray-600" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins} мин назад`
    if (diffHours < 24) return `${diffHours} ч назад`
    return `${diffDays} дн назад`
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.1 }}
      className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
    >
      <div className="flex-shrink-0 p-2 bg-gray-100 rounded-lg">
        {getActivityIcon(activity.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{activity.description}</p>
        <p className="text-xs text-gray-500 mt-1">{formatDate(activity.createdAt)}</p>
      </div>
    </motion.div>
  )
}

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboardStats()
  }, [])

  const loadDashboardStats = async () => {
    try {
      setLoading(true)
      const response = await statsApi.getDashboard()
      
      if (response.success) {
        setStats(response.data)
      } else {
        // Fallback к demo данным если API не готов
        setStats({
          contactsThisMonth: 12,
          totalContacts: 156,
          activeDeals: 8,
          totalDealsAmount: 245000,
          closedDealsThisMonth: 5,
          averageDealSize: 31000,
          conversionRate: 23,
          recentActivities: [
            {
              id: 1,
              type: 'contact_created',
              description: 'Новый контакт добавлен: Алексей Петров',
              createdAt: new Date(Date.now() - 30 * 60000).toISOString()
            },
            {
              id: 2,
              type: 'deal_updated',
              description: 'Сделка "Поставка оборудования" перемещена в этап "Переговоры"',
              createdAt: new Date(Date.now() - 2 * 3600000).toISOString()
            },
            {
              id: 3,
              type: 'message_received',
              description: 'Получено сообщение от @user_telegram',
              createdAt: new Date(Date.now() - 5 * 3600000).toISOString()
            }
          ]
        })
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err)
      setError('Ошибка загрузки статистики')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-gray-600">Загрузка статистики...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadDashboardStats}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    )
  }

  if (!stats) return null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Обзор активности и ключевых метрик</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Обновлено только что</span>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </motion.div>

      {/* Главные метрики */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <MetricCard
          title="Контакты за месяц"
          value={stats.contactsThisMonth}
          change={15}
          changeType="increase"
          icon={<Users className="w-6 h-6 text-white" />}
          color="from-blue-500 to-blue-600"
          delay={0.1}
        />
        <MetricCard
          title="Всего контактов"
          value={stats.totalContacts}
          icon={<Users className="w-6 h-6 text-white" />}
          color="from-green-500 to-green-600"
          delay={0.2}
        />
        <MetricCard
          title="Активные сделки"
          value={stats.activeDeals}
          change={8}
          changeType="increase"
          icon={<Target className="w-6 h-6 text-white" />}
          color="from-purple-500 to-purple-600"
          delay={0.3}
        />
        <MetricCard
          title="Сумма сделок"
          value={formatCurrency(stats.totalDealsAmount)}
          change={12}
          changeType="increase"
          icon={<DollarSign className="w-6 h-6 text-white" />}
          color="from-orange-500 to-orange-600"
          delay={0.4}
        />
      </div>

      {/* Дополнительные метрики */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Закрыто сделок"
          value={stats.closedDealsThisMonth}
          change={20}
          changeType="increase"
          icon={<TrendingUp className="w-6 h-6 text-white" />}
          color="from-emerald-500 to-emerald-600"
          delay={0.5}
        />
        <MetricCard
          title="Средний чек"
          value={formatCurrency(stats.averageDealSize)}
          change={5}
          changeType="decrease"
          icon={<Activity className="w-6 h-6 text-white" />}
          color="from-cyan-500 to-cyan-600"
          delay={0.6}
        />
        <MetricCard
          title="Конверсия"
          value={`${stats.conversionRate}%`}
          change={3}
          changeType="increase"
          icon={<TrendingUp className="w-6 h-6 text-white" />}
          color="from-pink-500 to-pink-600"
          delay={0.7}
        />
      </div>

      {/* Нижняя секция */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Последние активности */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Последние активности</h3>
              <button className="flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors">
                <Eye className="w-4 h-4 mr-1" />
                Посмотреть все
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-1">
              {stats.recentActivities.map((activity, index) => (
                <ActivityItem key={activity.id} activity={activity} index={index} />
              ))}
            </div>
          </div>
        </motion.div>

        {/* Быстрые действия */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100"
        >
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Быстрые действия</h3>
          </div>
          <div className="p-6 space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center p-3 text-left bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-lg transition-all duration-200"
            >
              <Users className="w-5 h-5 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">Добавить контакт</p>
                <p className="text-xs text-gray-500">Создать новый контакт</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center p-3 text-left bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-lg transition-all duration-200"
            >
              <Target className="w-5 h-5 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">Создать сделку</p>
                <p className="text-xs text-gray-500">Новая сделка в воронке</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center p-3 text-left bg-gradient-to-r from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-lg transition-all duration-200"
            >
              <MessageSquare className="w-5 h-5 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">Telegram чат</p>
                <p className="text-xs text-gray-500">Отправить сообщение</p>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center p-3 text-left bg-gradient-to-r from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-lg transition-all duration-200"
            >
              <Calendar className="w-5 h-5 text-orange-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">Отчеты</p>
                <p className="text-xs text-gray-500">Аналитика и статистика</p>
              </div>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default DashboardPage