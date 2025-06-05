// frontend/src/types/index.ts

// ===== API Response Types =====
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  errors?: Array<{
    field: string
    message: string
    value?: any
  }>
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ===== Authentication Types =====
export interface User {
  id: number
  email: string
  role: string
  createdAt: string
  updatedAt: string
}

export interface LoginForm {
  email: string
  password: string
}

export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

// ===== Contacts Types =====
export interface ContactField {
  id: number
  name: string
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'date'
  required: boolean
  position: number
  options?: string[]
  createdAt: string
}

export interface Contact {
  id: number
  telegramId?: string
  telegramUsername?: string
  customFields: Record<string, any>
  createdAt: string
  updatedAt: string
  lastMessageAt?: string
  unreadCount?: number
}

export interface ContactFormData {
  telegramId?: string
  telegramUsername?: string
  customFields: Record<string, any>
}

// ===== Deals Types =====
export interface DealStage {
  id: number
  name: string
  position: number
  autoTransitionRules?: Record<string, any>
  createdAt: string
}

export interface Deal {
  id: number
  contactId: number
  contact?: Contact
  title: string
  amount: number
  stageId: number
  stage?: DealStage
  probability: number
  products: string[]
  plannedCloseDate?: string
  actualCloseDate?: string
  createdAt: string
  updatedAt: string
}

export interface DealFormData {
  contactId: number
  title: string
  amount: number
  stageId: number
  probability: number
  products: string[]
  plannedCloseDate?: string
}

// ===== Messages Types =====
export interface Message {
  id: number
  contactId: number
  telegramMessageId?: number
  content: string
  type: 'text' | 'photo' | 'video' | 'audio' | 'document' | 'sticker'
  direction: 'incoming' | 'outgoing'
  filePath?: string
  fileName?: string
  fileSize?: number
  createdAt: string
  status?: 'sending' | 'sent' | 'delivered' | 'failed'
}

export interface SendMessageData {
  contactId: number
  content: string
  type?: string
}

// ===== Files Types =====
export interface FileUpload {
  id: number
  telegramFileId?: string
  filename: string
  filePath: string
  size: number
  mimeType: string
  createdAt: string
}

// ===== Chat State Types =====
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

// ===== Dashboard Types =====
export interface DashboardStats {
  contactsThisMonth: number
  totalContacts: number
  activeDeals: number
  totalDealsAmount: number
  closedDealsThisMonth: number
  averageDealSize: number
  conversionRate: number
  topProducts: Array<{
    name: string
    count: number
    revenue: number
  }>
  recentActivities: Array<{
    id: number
    type: 'contact_created' | 'deal_updated' | 'message_received'
    description: string
    createdAt: string
    contactId?: number
  }>
}

// ===== Settings Types =====
export interface TelegramSettings {
  botToken?: string
  webhookUrl?: string
  webhookSecret?: string
  isConfigured: boolean
  lastUpdate?: string
}

export interface SystemSettings {
  telegram: TelegramSettings
  general: {
    companyName: string
    currency: 'RUB' | 'USD' | 'EUR'
    timezone: string
  }
}

// ===== Form Types =====
export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'date' | 'number'
  required?: boolean
  placeholder?: string
  options?: Array<{ value: string; label: string }>
  validation?: {
    min?: number
    max?: number
    pattern?: string
    message?: string
  }
}

// ===== Filter Types =====
export interface ContactFilters {
  search?: string
  telegramUsername?: string
  hasUnreadMessages?: boolean
  createdAfter?: string
  createdBefore?: string
}

export interface DealFilters {
  search?: string
  stageId?: number
  contactId?: number
  minAmount?: number
  maxAmount?: number
  createdAfter?: string
  createdBefore?: string
}

export interface MessageFilters {
  search?: string
  type?: string
  direction?: 'incoming' | 'outgoing'
  dateFrom?: string
  dateTo?: string
}

// ===== Utility Types =====
export type SortOrder = 'asc' | 'desc'

export interface SortConfig {
  field: string
  order: SortOrder
}

export interface TableColumn<T = any> {
  key: keyof T
  label: string
  sortable?: boolean
  width?: string
  render?: (value: any, item: T) => React.ReactNode
}

// ===== Error Types =====
export interface ApiError {
  message: string
  status?: number
  code?: string
  details?: any
}

// ===== Loading States =====
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

// ===== Navigation Types =====
export interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<any>
  description?: string
  badge?: number
  children?: NavItem[]
}

// ===== Theme Types =====
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'
export type InputSize = 'sm' | 'md' | 'lg'

// ===== Webhook Types =====
export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
  edited_message?: TelegramMessage
  callback_query?: TelegramCallbackQuery
}

export interface TelegramMessage {
  message_id: number
  from: TelegramUser
  chat: TelegramChat
  date: number
  text?: string
  photo?: TelegramPhoto[]
  document?: TelegramDocument
  video?: TelegramVideo
  audio?: TelegramAudio
  voice?: TelegramVoice
  sticker?: TelegramSticker
}

export interface TelegramUser {
  id: number
  is_bot: boolean
  first_name: string
  last_name?: string
  username?: string
  language_code?: string
}

export interface TelegramChat {
  id: number
  type: 'private' | 'group' | 'supergroup' | 'channel'
  title?: string
  username?: string
  first_name?: string
  last_name?: string
}

export interface TelegramPhoto {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  file_size?: number
}

export interface TelegramDocument {
  file_id: string
  file_unique_id: string
  file_name?: string
  mime_type?: string
  file_size?: number
}

export interface TelegramVideo {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  duration: number
  file_name?: string
  mime_type?: string
  file_size?: number
}

export interface TelegramAudio {
  file_id: string
  file_unique_id: string
  duration: number
  performer?: string
  title?: string
  file_name?: string
  mime_type?: string
  file_size?: number
}

export interface TelegramVoice {
  file_id: string
  file_unique_id: string
  duration: number
  mime_type?: string
  file_size?: number
}

export interface TelegramSticker {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  is_animated: boolean
  is_video: boolean
  file_size?: number
}

export interface TelegramCallbackQuery {
  id: string
  from: TelegramUser
  message?: TelegramMessage
  data?: string
}