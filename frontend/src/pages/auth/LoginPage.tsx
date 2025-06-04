import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LogIn, Mail, Lock, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

import { useAuthStore } from '@/store/authStore'
import Button from '@/components/common/Button'
import Input from '@/components/common/Input'
import type { LoginForm } from '@/types'

const loginSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
})

const LoginPage: React.FC = () => {
  const { login, isAuthenticated, isLoading } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  // Redirect if already authenticated
  if (isAuthenticated && !isLoading) {
    return <Navigate to="/dashboard" replace />
  }

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true)

    try {
      await login(data.email, data.password)
      toast.success('Вход выполнен успешно!')
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.response?.data?.message || 'Ошибка входа в систему')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gray-900 rounded-xl flex items-center justify-center">
            <LogIn className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Вход в CRM систему
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Управление клиентами и Telegram ботом
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white py-8 px-6 shadow-lg rounded-xl border border-gray-200">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Email Input */}
            <Input
              {...register('email')}
              type="email"
              label="Email адрес"
              placeholder="admin@example.com"
              error={errors.email?.message}
              leftIcon={<Mail className="w-5 h-5" />}
              disabled={isSubmitting}
              autoComplete="email"
              autoFocus
            />

            {/* Password Input */}
            <Input
              {...register('password')}
              type="password"
              label="Пароль"
              placeholder="Введите пароль"
              error={errors.password?.message}
              leftIcon={<Lock className="w-5 h-5" />}
              disabled={isSubmitting}
              autoComplete="current-password"
            />

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              loading={isSubmitting}
              disabled={isSubmitting}
            >
              Войти в систему
            </Button>
          </form>

          {/* Demo Credentials Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-1">
                  Демо доступ
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  Для первого входа используйте:
                </p>
                <div className="text-sm font-mono bg-white p-2 rounded border">
                  <div>Email: admin@example.com</div>
                  <div>Пароль: admin123456</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            © 2024 Telegram CRM System. Все права защищены.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage