import React from 'react'

const DashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Контакты за месяц</h3>
          <p className="text-2xl font-bold text-gray-900">10</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Активные сделки</h3>
          <p className="text-2xl font-bold text-gray-900">5</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Сумма сделок</h3>
          <p className="text-2xl font-bold text-gray-900">₽100,000</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Всего контактов</h3>
          <p className="text-2xl font-bold text-gray-900">50</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Добро пожаловать в CRM!</h2>
        <p className="text-gray-600">
          Система успешно запущена. Backend работает на порту 3001, Frontend на порту 3000.
        </p>
      </div>
    </div>
  )
}

export default DashboardPage
