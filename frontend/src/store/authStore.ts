// frontend/src/store/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import toast from 'react-hot-toast'
import { authApi } from '@/services/api'
import type { AuthState, User } from '@/types'

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (email: string, password: string) => {
        try {
          const response = await authApi.login({ email, password })
          const { user, token } = response.data

          // Сохраняем токен в localStorage
          localStorage.setItem('authToken', token)

          set({
            user,
            isAuthenticated: true,
            isLoading: false
          })

          toast.success('Добро пожаловать!')
        } catch (error: any) {
          const message = error.response?.data?.message || 'Ошибка входа'
          toast.error(message)
          throw error
        }
      },

      logout: () => {
        localStorage.removeItem('authToken')
        set({
          user: null,
          isAuthenticated: false,
          isLoading: false
        })
        toast.success('Вы вышли из системы')
      },

      checkAuth: async () => {
        try {
          const token = localStorage.getItem('authToken')
          if (!token) {
            set({ isLoading: false })
            return
          }

          const response = await authApi.getProfile()
          const user = response.data

          set({
            user,
            isAuthenticated: true,
            isLoading: false
          })
        } catch (error) {
          localStorage.removeItem('authToken')
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false
          })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }),
    }
  )
)

// frontend/src/store/chatStore.ts
import { create } from 'zustand'
import type { ChatState, Contact, Message } from '@/types'

export const useChatStore = create<ChatState>((set, get) => ({
  contacts: [],
  selectedContactId: null,
  messages: {},
  isLoading: false,
  searchQuery: '',

  setSelectedContact: (contactId) => {
    set({ selectedContactId: contactId })
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query })
  },

  addMessage: (message) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [message.contactId]: [
          ...(state.messages[message.contactId] || []),
          message
        ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      }
    }))
  },

  updateMessage: (messageId, updates) => {
    set((state) => {
      const newMessages = { ...state.messages }
      Object.keys(newMessages).forEach(contactId => {
        newMessages[parseInt(contactId)] = newMessages[parseInt(contactId)].map(msg =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        )
      })
      return { messages: newMessages }
    })
  },

  deleteMessage: (messageId) => {
    set((state) => {
      const newMessages = { ...state.messages }
      Object.keys(newMessages).forEach(contactId => {
        newMessages[parseInt(contactId)] = newMessages[parseInt(contactId)].filter(
          msg => msg.id !== messageId
        )
      })
      return { messages: newMessages }
    })
  },
}))

// frontend/src/services/api.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios'
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

class ApiService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_URL || '/api',
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
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor для обработки ошибок
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('authToken')
          window.location.href = '/login'
          toast.error('Сессия истекла. Войдите снова.')
        } else if (error.response?.status >= 500) {
          toast.error('Ошибка сервера. Попробуйте позже.')
        }
        return Promise.reject(error)
      }
    )
  }

  // Generic methods
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

  // Auth API
  auth = {
    login: (data: LoginForm) => this.post<{ user: User; token: string }>('/auth/login', data),
    getProfile: () => this.get<User>('/auth/profile'),
    logout: () => this.post('/auth/logout'),
  }

  // Contacts API
  contacts = {
    getAll: (params?: any) => this.get<PaginatedResponse<Contact>>('/contacts', params),
    getById: (id: number) => this.get<Contact>(`/contacts/${id}`),
    create: (data: any) => this.post<Contact>('/contacts', data),
    update: (id: number, data: any) => this.put<Contact>(`/contacts/${id}`, data),
    delete: (id: number) => this.delete(`/contacts/${id}`),
    search: (query: string) => this.get<Contact[]>(`/contacts/search?q=${encodeURIComponent(query)}`),
  }

  // Contact Fields API
  contactFields = {
    getAll: () => this.get<ContactField[]>('/contact-fields'),
    create: (data: any) => this.post<ContactField>('/contact-fields', data),
    update: (id: number, data: any) => this.put<ContactField>(`/contact-fields/${id}`, data),
    delete: (id: number) => this.delete(`/contact-fields/${id}`),
    reorder: (fields: Array<{ id: number; position: number }>) =>
      this.put('/contact-fields/reorder', { fields }),
  }

  // Deals API
  deals = {
    getAll: (params?: any) => this.get<PaginatedResponse<Deal>>('/deals', params),
    getById: (id: number) => this.get<Deal>(`/deals/${id}`),
    create: (data: any) => this.post<Deal>('/deals', data),
    update: (id: number, data: any) => this.put<Deal>(`/deals/${id}`, data),
    delete: (id: number) => this.delete(`/deals/${id}`),
    updateStage: (id: number, stageId: number) =>
      this.put(`/deals/${id}/stage`, { stageId }),
  }

  // Deal Stages API
  dealStages = {
    getAll: () => this.get<DealStage[]>('/deal-stages'),
    create: (data: any) => this.post<DealStage>('/deal-stages', data),
    update: (id: number, data: any) => this.put<DealStage>(`/deal-stages/${id}`, data),
    delete: (id: number) => this.delete(`/deal-stages/${id}`),
    reorder: (stages: Array<{ id: number; position: number }>) =>
      this.put('/deal-stages/reorder', { stages }),
  }

  // Messages API
  messages = {
    getByContact: (contactId: number, params?: any) =>
      this.get<Message[]>(`/messages/${contactId}`, params),
    send: (data: { contactId: number; content: string; type?: string }) =>
      this.post<Message>('/messages/send', data),
    delete: (id: number) => this.delete(`/messages/${id}`),
    markAsRead: (contactId: number) => this.put(`/messages/${contactId}/read`),
  }

  // Files API
  files = {
    upload: (file: File, contactId?: number) => {
      const formData = new FormData()
      formData.append('file', file)
      if (contactId) {
        formData.append('contactId', contactId.toString())
      }

      return this.api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    delete: (id: number) => this.delete(`/files/${id}`),
    download: (id: number) => this.api.get(`/files/${id}/download`, { responseType: 'blob' }),
  }

  // Stats API
  stats = {
    getDashboard: () => this.get<DashboardStats>('/stats/dashboard'),
    getContactsStats: (period?: string) => this.get(`/stats/contacts?period=${period || 'month'}`),
    getDealsStats: (period?: string) => this.get(`/stats/deals?period=${period || 'month'}`),
  }

  // Settings API
  settings = {
    getTelegramConfig: () => this.get('/settings/telegram'),
    updateTelegramConfig: (data: any) => this.put('/settings/telegram', data),
    testTelegramConnection: () => this.post('/settings/telegram/test'),
  }
}

export const api = new ApiService()

// Экспорт отдельных API модулей для удобства
export const authApi = api.auth
export const contactsApi = api.contacts
export const contactFieldsApi = api.contactFields
export const dealsApi = api.deals
export const dealStagesApi = api.dealStages
export const messagesApi = api.messages
export const filesApi = api.files
export const statsApi = api.stats
export const settingsApi = api.settings