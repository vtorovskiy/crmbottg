// frontend/src/pages/auth/LoginPage.tsx
import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LogIn, Mail, Lock, AlertCircle, Eye, EyeOff, MessageSquare } from 'lucide-react'
import { motion } from 'framer-motion'
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
  const [showPassword, setShowPassword] = useState(false)

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
      toast.success('Добро пожаловать!')
    } catch (error: any) {
      console.error('Login error:', error)
      // Error уже обработан в authStore
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Фоновая анимация */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-yellow-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto h-20 w-20 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl flex items-center justify-center shadow-xl"
          >
            <MessageSquare className="h-10 w-10 text-white" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-6 text-3xl font-bold text-gray-900"
          >
            Добро пожаловать
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-2 text-sm text-gray-600"
          >
            Войдите в CRM систему для управления клиентами и Telegram ботом
          </motion.p>
        </motion.div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="bg-white/80 backdrop-blur-sm py-8 px-6 shadow-2xl rounded-2xl border border-white/20"
        >
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* Email Input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
            >
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
                className="bg-white/50 border-gray-200 focus:bg-white transition-all duration-200"
              />
            </motion.div>

            {/* Password Input */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <div className="relative">
                <Input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  label="Пароль"
                  placeholder="Введите пароль"
                  error={errors.password?.message}
                  leftIcon={<Lock className="w-5 h-5" />}
                  disabled={isSubmitting}
                  autoComplete="current-password"
                  className="bg-white/50 border-gray-200 focus:bg-white transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </motion.div>

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.9 }}
            >
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl"
                loading={isSubmitting}
                disabled={isSubmitting}
                leftIcon={!isSubmitting ? <LogIn className="w-5 h-5" /> : undefined}
              >
                {isSubmitting ? 'Вход в систему...' : 'Войти в систему'}
              </Button>
            </motion.div>
          </form>

          {/* Demo Credentials Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.0 }}
            className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100"
          >
            <div className="flex items-start">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="flex-shrink-0"
              >
                <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5 mr-3" />
              </motion.div>
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">
                  Демонстрационный доступ
                </h4>
                <p className="text-sm text-blue-700 mb-2">
                  Для входа в систему используйте:
                </p>
                <div className="text-sm font-mono bg-white/80 p-3 rounded-lg border border-blue-200 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-blue-600">Email:</span>
                    <span className="text-gray-900 select-all">admin@example.com</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">Пароль:</span>
                    <span className="text-gray-900 select-all">admin123456</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="text-center"
        >
          <p className="text-xs text-gray-500">
            © 2024 Telegram CRM System. Разработано с ❤️ для управления клиентами.
          </p>
        </motion.div>
      </div>

      {/* Добавляем CSS для анимации blob через обычный style тег */}
      <style>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}

export default LoginPage