// frontend/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from 'react-query'
import { ReactQueryDevtools } from 'react-query/devtools'
import { Toaster } from 'react-hot-toast'

import App from './App'
import './styles/index.css'

// React Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false
        }
        return failureCount < 3
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#000',
              border: '1px solid #e9ecef',
              borderRadius: '0.5rem',
            },
            success: {
              iconTheme: {
                primary: '#28a745',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#dc3545',
                secondary: '#fff',
              },
            },
          }}
        />
      </BrowserRouter>
      {import.meta.env.DEV && <ReactQueryDevtools />}
    </QueryClientProvider>
  </React.StrictMode>
)

// frontend/src/App.tsx
import React, { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

// Layouts
import AuthLayout from '@/components/layouts/AuthLayout'
import DashboardLayout from '@/components/layouts/DashboardLayout'

// Components
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorBoundary from '@/components/common/ErrorBoundary'

// Lazy-loaded pages для оптимизации
const LoginPage = React.lazy(() => import('@/pages/auth/LoginPage'))
const DashboardPage = React.lazy(() => import('@/pages/dashboard/DashboardPage'))
const ChatPage = React.lazy(() => import('@/pages/chat/ChatPage'))
const ContactsPage = React.lazy(() => import('@/pages/contacts/ContactsPage'))
const DealsPage = React.lazy(() => import('@/pages/deals/DealsPage'))
const SettingsPage = React.lazy(() => import('@/pages/settings/SettingsPage'))

// Route protection component
interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={
            <AuthLayout>
              <Suspense fallback={<LoadingSpinner />}>
                <LoginPage />
              </Suspense>
            </AuthLayout>
          } />

          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout>
                <Suspense fallback={<LoadingSpinner />}>
                  <Routes>
                    <Route index element={<Navigate to="/dashboard" replace />} />
                    <Route path="dashboard" element={<DashboardPage />} />
                    <Route path="chat/*" element={<ChatPage />} />
                    <Route path="contacts/*" element={<ContactsPage />} />
                    <Route path="deals/*" element={<DealsPage />} />
                    <Route path="settings/*" element={<SettingsPage />} />
                  </Routes>
                </Suspense>
              </DashboardLayout>
            </ProtectedRoute>
          } />

          {/* Catch all - redirect to dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </ErrorBoundary>
  )
}

export default App

// frontend/src/types/index.ts
// Global TypeScript types

export interface User {
  id: number
  email: string
  role: 'admin'
  createdAt: string
  updatedAt: string
}

export interface Contact {
  id: number
  telegramId?: string
  telegramUsername?: string
  customFields: Record<string, any>
  createdAt: string
  updatedAt: string
  lastMessageAt?: string
  messagesCount: number
  dealsCount: number
}

export interface ContactField {
  id: number
  name: string
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'date'
  required: boolean
  position: number
  options?: string[] // для select полей
  createdAt: string
}

export interface Deal {
  id: number
  contactId: number
  title: string
  amount: number
  stageId: number
  probability: number
  products?: string[]
  createdAt: string
  updatedAt: string
  plannedCloseDate?: string
  actualCloseDate?: string
  contact?: Contact
  stage?: DealStage
}

export interface DealStage {
  id: number
  name: string
  position: number
  autoTransitionRules?: Record<string, any>
  createdAt: string
}

export interface Message {
  id: number
  contactId: number
  telegramMessageId?: number
  content: string
  type: 'text' | 'photo' | 'document' | 'video' | 'audio' | 'voice' | 'sticker'
  direction: 'incoming' | 'outgoing'
  filePath?: string
  fileName?: string
  fileSize?: number
  createdAt: string
  contact?: Contact
}

export interface FileUpload {
  id: number
  telegramFileId?: string
  filename: string
  filePath: string
  size: number
  mimeType: string
  createdAt: string
}

export interface DashboardStats {
  contactsThisMonth: number
  totalContacts: number
  activeDeals: number
  totalDealsAmount: number
  messagesThisMonth: number
  conversionRate: number
  topProducts: Array<{
    name: string
    count: number
    amount: number
  }>
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  errors?: Array<{
    field: string
    message: string
  }>
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form types
export interface LoginForm {
  email: string
  password: string
}

export interface ContactForm {
  customFields: Record<string, any>
}

export interface DealForm {
  contactId: number
  title: string
  amount: number
  stageId: number
  probability: number
  products?: string[]
  plannedCloseDate?: string
}

export interface MessageForm {
  contactId: number
  content: string
  type?: 'text'
}

export interface ContactFieldForm {
  name: string
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'date'
  required: boolean
  options?: string[]
}

export interface DealStageForm {
  name: string
  position: number
  autoTransitionRules?: Record<string, any>
}

// Store types
export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export interface ChatState {
  contacts: Contact[]
  selectedContactId: number | null
  messages: Record<number, Message[]>
  isLoading: boolean
  searchQuery: string
  setSelectedContact: (contactId: number | null) => void
  setSearchQuery: (query: string) => void
  addMessage: (message: Message) => void
  updateMessage: (messageId: number, updates: Partial<Message>) => void
  deleteMessage: (messageId: number) => void
}

// Utility types
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface TableColumn<T> {
  key: keyof T | string
  title: string
  sortable?: boolean
  render?: (value: any, row: T) => React.ReactNode
  width?: string
}

export interface FilterOptions {
  search?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  [key: string]: any
}