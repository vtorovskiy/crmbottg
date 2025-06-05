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
          console.log('🔐 Attempting login...', { email })

          const response = await authApi.login({ email, password })

          if (!response.success) {
            throw new Error(response.message || 'Login failed')
          }

          const { user, token } = response.data

          // Сохраняем токен в localStorage
          localStorage.setItem('authToken', token)

          set({
            user,
            isAuthenticated: true,
            isLoading: false
          })

          console.log('✅ Login successful', { user: user.email })
          toast.success(`Добро пожаловать, ${user.email}!`)

        } catch (error: any) {
          console.error('❌ Login error:', error)

          // Очищаем состояние при ошибке
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false
          })

          // Определяем сообщение об ошибке
          let errorMessage = 'Ошибка входа в систему'

          if (error.response?.data?.message) {
            errorMessage = error.response.data.message
          } else if (error.message) {
            errorMessage = error.message
          } else if (error.response?.status === 401) {
            errorMessage = 'Неверный email или пароль'
          } else if (error.response?.status >= 500) {
            errorMessage = 'Ошибка сервера. Попробуйте позже.'
          } else if (error.code === 'NETWORK_ERROR') {
            errorMessage = 'Не удается подключиться к серверу'
          }

          toast.error(errorMessage)
          throw error
        }
      },

      logout: () => {
        try {
          // Вызываем API logout (может быть асинхронным)
          authApi.logout().catch(error => {
            console.warn('Logout API call failed:', error)
            // Не показываем ошибку пользователю, так как локальный logout все равно произойдет
          })
        } catch (error) {
          console.warn('Logout API call failed:', error)
        }

        // Очищаем локальное состояние
        localStorage.removeItem('authToken')

        set({
          user: null,
          isAuthenticated: false,
          isLoading: false
        })

        console.log('👋 User logged out')
        toast.success('Вы вышли из системы')
      },

      checkAuth: async () => {
        try {
          const token = localStorage.getItem('authToken')

          if (!token) {
            console.log('🔍 No auth token found')
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false
            })
            return
          }

          console.log('🔍 Checking auth with existing token...')

          const response = await authApi.getProfile()

          if (!response.success) {
            throw new Error('Profile fetch failed')
          }

          const user = response.data

          set({
            user,
            isAuthenticated: true,
            isLoading: false
          })

          console.log('✅ Auth check successful', { user: user.email })

        } catch (error: any) {
          console.warn('❌ Auth check failed:', error)

          // Токен недействителен или ошибка сервера
          localStorage.removeItem('authToken')

          set({
            user: null,
            isAuthenticated: false,
            isLoading: false
          })

          // Не показываем toast при проверке аутентификации
          // Пользователь просто будет перенаправлен на логин
        }
      },

      // Дополнительные методы для удобства
      getCurrentUser: () => {
        return get().user
      },

      isLoggedIn: () => {
        return get().isAuthenticated && !!get().user
      },

      hasRole: (role: string) => {
        const user = get().user
        return user?.role === role
      },

      updateUser: (updates: Partial<User>) => {
        const currentUser = get().user
        if (currentUser) {
          set({
            user: { ...currentUser, ...updates }
          })
        }
      },
    }),
    {
      name: 'auth-storage',
      // Сохраняем только основные данные, исключаем функции и loading состояние
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated
      }),
      // Восстанавливаем состояние при загрузке
      onRehydrateStorage: () => (state) => {
        if (state) {
          // После восстановления из localStorage всегда проверяем актуальность токена
          state.isLoading = true
        }
      },
    }
  )
)