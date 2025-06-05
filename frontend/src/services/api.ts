// frontend/src/services/api.ts
import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios'
import toast from 'react-hot-toast'
import type {
  ApiResponse,
  PaginatedResponse,
  User,
  Contact,
  Deal,
  Message,
  ContactField,
  DealStage,
  DashboardStats,
  LoginForm
} from '@/types'

// Базовая конфигурация API
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

class ApiService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor для добавления токена
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }

        // Логируем все исходящие запросы в dev режиме
        if (import.meta.env.DEV) {
          console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
            data: config.data,
            headers: config.headers,
          })
        }

        return config
      },
      (error) => {
        console.error('❌ Request error:', error)
        return Promise.reject(error)
      }
    )

    // Response interceptor для обработки ошибок
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        // Логируем успешные ответы в dev режиме
        if (import.meta.env.DEV) {
          console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            data: response.data,
          })
        }
        return response
      },
      (error: AxiosError) => {
        // Логируем ошибки
        console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
          status: error.response?.status,
          data: error.response?.data,
          message: error.message,
        })

        // Обработка специфических статус кодов
        if (error.response?.status === 401) {
          // Токен истек или недействителен
          localStorage.removeItem('authToken')

          // Перенаправляем на логин только если не находимся уже на странице логина
          if (window.location.pathname !== '/login') {
            window.location.href = '/login'
            toast.error('Сессия истекла. Войдите снова.')
          }
        } else if (error.response?.status === 403) {
          toast.error('Недостаточно прав доступа')
        } else if (error.response?.status === 404) {
          toast.error('Ресурс не найден')
        } else if (error.response?.status >= 500) {
          toast.error('Ошибка сервера. Попробуйте позже.')
        } else if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
          toast.error('Ошибка подключения к серверу')
        }

        return Promise.reject(error)
      }
    )
  }

  // Generic методы для разных типов запросов
  private async get<T>(url: string, params?: any): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.api.get(url, { params })
    return response.data
  }

  private async post<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.api.post(url, data)
    return response.data
  }

  private async put<T>(url: string, data?: any): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.api.put(url, data)
    return response.data
  }

  private async delete<T>(url: string): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.api.delete(url)
    return response.data
  }

  // Метод для загрузки файлов
  private async upload<T>(url: string, formData: FormData): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  // ===== AUTH API =====
  auth = {
    login: async (data: LoginForm): Promise<ApiResponse<{ user: User; token: string }>> => {
      try {
        return await this.post<{ user: User; token: string }>('/auth/login', data)
      } catch (error: any) {
        // Специальная обработка ошибок логина
        const message = error.response?.data?.message || 'Ошибка входа в систему'
        throw new Error(message)
      }
    },

    getProfile: async (): Promise<ApiResponse<User>> => {
      return await this.get<User>('/auth/profile')
    },

    logout: async (): Promise<ApiResponse<void>> => {
      return await this.post<void>('/auth/logout')
    },
  }

  // ===== CONTACTS API =====
  contacts = {
    getAll: async (params?: {
      page?: number
      limit?: number
      search?: string
      telegramUsername?: string
    }): Promise<ApiResponse<PaginatedResponse<Contact>>> => {
      return await this.get<PaginatedResponse<Contact>>('/contacts', params)
    },

    getById: async (id: number): Promise<ApiResponse<Contact>> => {
      return await this.get<Contact>(`/contacts/${id}`)
    },

    create: async (data: {
      telegramId?: string
      telegramUsername?: string
      customFields: Record<string, any>
    }): Promise<ApiResponse<Contact>> => {
      return await this.post<Contact>('/contacts', data)
    },

    update: async (id: number, data: {
      telegramId?: string
      telegramUsername?: string
      customFields: Record<string, any>
    }): Promise<ApiResponse<Contact>> => {
      return await this.put<Contact>(`/contacts/${id}`, data)
    },

    delete: async (id: number): Promise<ApiResponse<void>> => {
      return await this.delete<void>(`/contacts/${id}`)
    },

    search: async (query: string): Promise<ApiResponse<Contact[]>> => {
      return await this.get<Contact[]>(`/contacts/search?q=${encodeURIComponent(query)}`)
    },
  }

  // ===== CONTACT FIELDS API =====
  contactFields = {
    getAll: async (): Promise<ApiResponse<ContactField[]>> => {
      return await this.get<ContactField[]>('/contact-fields')
    },

    create: async (data: {
      name: string
      type: string
      required?: boolean
      position?: number
      options?: string[]
    }): Promise<ApiResponse<ContactField>> => {
      return await this.post<ContactField>('/contact-fields', data)
    },

    update: async (id: number, data: {
      name?: string
      type?: string
      required?: boolean
      position?: number
      options?: string[]
    }): Promise<ApiResponse<ContactField>> => {
      return await this.put<ContactField>(`/contact-fields/${id}`, data)
    },

    delete: async (id: number): Promise<ApiResponse<void>> => {
      return await this.delete<void>(`/contact-fields/${id}`)
    },

    reorder: async (fields: Array<{ id: number; position: number }>): Promise<ApiResponse<void>> => {
      return await this.put<void>('/contact-fields/reorder', { fields })
    },
  }

  // ===== DEALS API =====
  deals = {
    getAll: async (params?: {
      page?: number
      limit?: number
      search?: string
      stageId?: number
      contactId?: number
    }): Promise<ApiResponse<PaginatedResponse<Deal>>> => {
      return await this.get<PaginatedResponse<Deal>>('/deals', params)
    },

    getById: async (id: number): Promise<ApiResponse<Deal>> => {
      return await this.get<Deal>(`/deals/${id}`)
    },

    create: async (data: {
      contactId: number
      title: string
      amount: number
      stageId: number
      probability?: number
      products?: string[]
      plannedCloseDate?: string
    }): Promise<ApiResponse<Deal>> => {
      return await this.post<Deal>('/deals', data)
    },

    update: async (id: number, data: {
      title?: string
      amount?: number
      stageId?: number
      probability?: number
      products?: string[]
      plannedCloseDate?: string
    }): Promise<ApiResponse<Deal>> => {
      return await this.put<Deal>(`/deals/${id}`, data)
    },

    delete: async (id: number): Promise<ApiResponse<void>> => {
      return await this.delete<void>(`/deals/${id}`)
    },

    updateStage: async (id: number, stageId: number): Promise<ApiResponse<Deal>> => {
      return await this.put<Deal>(`/deals/${id}/stage`, { stageId })
    },
  }

  // ===== DEAL STAGES API =====
  dealStages = {
    getAll: async (): Promise<ApiResponse<DealStage[]>> => {
      return await this.get<DealStage[]>('/deal-stages')
    },

    create: async (data: {
      name: string
      position?: number
      autoTransitionRules?: Record<string, any>
    }): Promise<ApiResponse<DealStage>> => {
      return await this.post<DealStage>('/deal-stages', data)
    },

    update: async (id: number, data: {
      name?: string
      position?: number
      autoTransitionRules?: Record<string, any>
    }): Promise<ApiResponse<DealStage>> => {
      return await this.put<DealStage>(`/deal-stages/${id}`, data)
    },

    delete: async (id: number): Promise<ApiResponse<void>> => {
      return await this.delete<void>(`/deal-stages/${id}`)
    },

    reorder: async (stages: Array<{ id: number; position: number }>): Promise<ApiResponse<void>> => {
      return await this.put<void>('/deal-stages/reorder', { stages })
    },
  }

  // ===== MESSAGES API =====
  messages = {
    getByContact: async (contactId: number, params?: {
      page?: number
      limit?: number
      search?: string
    }): Promise<ApiResponse<Message[]>> => {
      return await this.get<Message[]>(`/messages/${contactId}`, params)
    },

    send: async (data: {
      contactId: number
      content: string
      type?: string
    }): Promise<ApiResponse<Message>> => {
      return await this.post<Message>('/messages/send', data)
    },

    delete: async (id: number): Promise<ApiResponse<void>> => {
      return await this.delete<void>(`/messages/${id}`)
    },

    markAsRead: async (contactId: number): Promise<ApiResponse<void>> => {
      return await this.put<void>(`/messages/${contactId}/read`)
    },
  }

  // ===== FILES API =====
  files = {
    upload: async (file: File, contactId?: number): Promise<ApiResponse<any>> => {
      const formData = new FormData()
      formData.append('file', file)
      if (contactId) {
        formData.append('contactId', contactId.toString())
      }
      return await this.upload<any>('/files/upload', formData)
    },

    delete: async (id: number): Promise<ApiResponse<void>> => {
      return await this.delete<void>(`/files/${id}`)
    },

    download: async (id: number): Promise<Blob> => {
      const response = await this.api.get(`/files/${id}/download`, { responseType: 'blob' })
      return response.data
    },
  }

  // ===== STATS API =====
  stats = {
    getDashboard: async (): Promise<ApiResponse<DashboardStats>> => {
      return await this.get<DashboardStats>('/stats/dashboard')
    },

    getContactsStats: async (period: string = 'month'): Promise<ApiResponse<any>> => {
      return await this.get<any>(`/stats/contacts?period=${period}`)
    },

    getDealsStats: async (period: string = 'month'): Promise<ApiResponse<any>> => {
      return await this.get<any>(`/stats/deals?period=${period}`)
    },
  }

  // ===== SETTINGS API =====
  settings = {
    getTelegramConfig: async (): Promise<ApiResponse<any>> => {
      return await this.get<any>('/settings/telegram')
    },

    updateTelegramConfig: async (data: {
      botToken?: string
      webhookUrl?: string
      webhookSecret?: string
    }): Promise<ApiResponse<any>> => {
      return await this.put<any>('/settings/telegram', data)
    },

    testTelegramConnection: async (): Promise<ApiResponse<any>> => {
      return await this.post<any>('/settings/telegram/test')
    },
  }

  // ===== UTILITY METHODS =====

  // Проверка подключения к API
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.api.get('/health')
      return response.status === 200
    } catch (error) {
      console.error('Health check failed:', error)
      return false
    }
  }

  // Получение базового URL API
  getBaseURL(): string {
    return API_BASE_URL
  }

  // Метод для прямого доступа к axios instance (если нужен)
  getAxiosInstance(): AxiosInstance {
    return this.api
  }
}

// Создаем единственный экземпляр API сервиса
export const api = new ApiService()

// Экспортируем отдельные API модули для удобства использования
export const authApi = api.auth
export const contactsApi = api.contacts
export const contactFieldsApi = api.contactFields
export const dealsApi = api.deals
export const dealStagesApi = api.dealStages
export const messagesApi = api.messages
export const filesApi = api.files
export const statsApi = api.stats
export const settingsApi = api.settings

// Экспортируем основной объект API как default
export default api