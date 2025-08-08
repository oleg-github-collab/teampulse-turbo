module.exports = function validateEnv() {
    const required = ['OPENAI_API_KEY'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      console.error(`❌ Відсутні обов'язкові змінні оточення: ${missing.join(', ')}`);
      process.exit(1);
    }
    
    // Валідація OpenAI API ключа
    if (!process.env.OPENAI_API_KEY.startsWith('sk-')) {
      console.error('❌ Невалідний формат OPENAI_API_KEY');
      process.exit(1);
    }
  };