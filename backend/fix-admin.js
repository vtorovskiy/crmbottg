const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'telegram_crm',
  user: 'postgres',
  password: 'postgres'
});

async function fixAdmin() {
  try {
    const password = 'admin123456';
    const saltRounds = 12;
    
    console.log('🔐 Генерируем новый хеш для пароля:', password);
    
    // Создаем правильный хеш
    const passwordHash = await bcrypt.hash(password, saltRounds);
    console.log('✅ Новый хеш создан:', passwordHash);
    
    // Проверяем что хеш работает
    const isValid = await bcrypt.compare(password, passwordHash);
    console.log('🧪 Проверка хеша:', isValid ? '✅ РАБОТАЕТ' : '❌ НЕ РАБОТАЕТ');
    
    if (!isValid) {
      throw new Error('Созданный хеш не работает!');
    }
    
    // Обновляем пользователя в БД
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, email, role',
      [passwordHash, 'admin@example.com']
    );
    
    if (result.rows.length === 0) {
      // Если пользователя нет, создаем
      const createResult = await pool.query(
        'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role',
        ['admin@example.com', passwordHash, 'admin']
      );
      console.log('👤 Admin пользователь создан:', createResult.rows[0]);
    } else {
      console.log('👤 Admin пользователь обновлен:', result.rows[0]);
    }
    
    console.log('\n🎉 ГОТОВО! Теперь можно входить с:');
    console.log('📧 Email: admin@example.com');
    console.log('🔑 Password: admin123456');
    
  } catch (error) {
    console.error('❌ Ошибка:', error);
  } finally {
    await pool.end();
  }
}

fixAdmin();
