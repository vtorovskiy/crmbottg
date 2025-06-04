const bcrypt = require('bcrypt');

const password = 'admin123456';
const hash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2ukD2LB5OG';

console.log('Testing password:', password);
console.log('Against hash:', hash);

bcrypt.compare(password, hash, (err, result) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Password match:', result);
    
    if (result) {
      console.log('✅ Пароль ПРАВИЛЬНЫЙ!');
    } else {
      console.log('❌ Пароль НЕПРАВИЛЬНЫЙ!');
      
      // Попробуем другие возможные пароли
      const variants = ['admin123456', 'admin', 'password', '123456'];
      
      variants.forEach(variant => {
        const syncResult = bcrypt.compareSync(variant, hash);
        console.log(`Trying "${variant}": ${syncResult}`);
      });
    }
  }
});
