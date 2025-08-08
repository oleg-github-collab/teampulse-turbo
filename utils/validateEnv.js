import logger from './logger.js';

// Конфігурація змінних оточення
const ENV_CONFIG = {
  required: [
    'OPENAI_API_KEY'
  ],
  optional: [
    'PORT',
    'NODE_ENV',
    'LOG_LEVEL',
    'ALLOWED_ORIGINS',
    'SESSION_SECRET',
    'JWT_SECRET'
  ],
  defaults: {
    PORT: '3000',
    NODE_ENV: 'development',
    LOG_LEVEL: 'info',
    SESSION_SECRET: 'default-session-secret-change-in-production',
    JWT_SECRET: 'default-jwt-secret-change-in-production'
  }
};

// Валідатори для специфічних змінних
const validators = {
  OPENAI_API_KEY: (value) => {
    if (!value) return 'OPENAI_API_KEY не встановлено';
    if (!value.startsWith('sk-') && !value.startsWith('sk-proj-')) {
      return 'Невалідний формат OPENAI_API_KEY (повинен починатися з sk-)';
    }
    if (value.length < 20) {
      return 'OPENAI_API_KEY занадто короткий';
    }
    return null;
  },
  
  PORT: (value) => {
    if (!value) return null;
    const port = parseInt(value);
    if (isNaN(port) || port < 1 || port > 65535) {
      return 'PORT повинен бути числом між 1 та 65535';
    }
    return null;
  },
  
  NODE_ENV: (value) => {
    if (!value) return null;
    const validEnvs = ['development', 'production', 'test'];
    if (!validEnvs.includes(value)) {
      return `NODE_ENV повинен бути одним з: ${validEnvs.join(', ')}`;
    }
    return null;
  },
  
  LOG_LEVEL: (value) => {
    if (!value) return null;
    const validLevels = ['error', 'warn', 'info', 'debug', 'verbose'];
    if (!validLevels.includes(value)) {
      return `LOG_LEVEL повинен бути одним з: ${validLevels.join(', ')}`;
    }
    return null;
  },
  
  ALLOWED_ORIGINS: (value) => {
    if (!value) return null;
    // Перевірка чи це валідні URL або домени
    const origins = value.split(',').map(o => o.trim());
    for (const origin of origins) {
      if (origin !== '*' && !origin.match(/^https?:\/\/.+/) && !origin.match(/^[a-zA-Z0-9.-]+$/)) {
        return `Невалідний ALLOWED_ORIGINS: ${origin}`;
      }
    }
    return null;
  }
};

function validateEnv() {
  console.log('🔍 Перевірка змінних оточення...');
  
  const errors = [];
  const warnings = [];
  
  // Перевірка обов'язкових змінних
  ENV_CONFIG.required.forEach(key => {
    const value = process.env[key];
    
    if (!value) {
      errors.push(`❌ Відсутня обов'язкова змінна: ${key}`);
      return;
    }
    
    // Запуск валідатора якщо є
    if (validators[key]) {
      const error = validators[key](value);
      if (error) {
        errors.push(`❌ ${error}`);
      }
    }
  });
  
  // Перевірка опціональних змінних
  ENV_CONFIG.optional.forEach(key => {
    const value = process.env[key];
    
    if (value && validators[key]) {
      const error = validators[key](value);
      if (error) {
        errors.push(`❌ ${error}`);
      }
    }
    
    // Встановлення значень за замовчуванням
    if (!value && ENV_CONFIG.defaults[key]) {
      process.env[key] = ENV_CONFIG.defaults[key];
      warnings.push(`⚠️ Використано значення за замовчуванням для ${key}: ${ENV_CONFIG.defaults[key]}`);
    }
  });
  
  // Перевірка production безпеки
  if (process.env.NODE_ENV === 'production') {
    if (process.env.SESSION_SECRET === ENV_CONFIG.defaults.SESSION_SECRET) {
      warnings.push('⚠️ Використовується SESSION_SECRET за замовчуванням в production!');
    }
    
    if (process.env.JWT_SECRET === ENV_CONFIG.defaults.JWT_SECRET) {
      warnings.push('⚠️ Використовується JWT_SECRET за замовчуванням в production!');
    }
    
    if (!process.env.ALLOWED_ORIGINS) {
      warnings.push('⚠️ ALLOWED_ORIGINS не встановлено для production');
    }
  }
  
  // Виведення результатів
  if (warnings.length > 0) {
    warnings.forEach(warning => console.warn(warning));
  }
  
  if (errors.length > 0) {
    console.error('\n💥 Помилки валідації змінних оточення:');
    errors.forEach(error => console.error(error));
    console.error('\n📋 Приклад .env файлу:');
    console.error('OPENAI_API_KEY=sk-your-key-here');
    console.error('NODE_ENV=development');
    console.error('PORT=3000');
    console.error('LOG_LEVEL=info');
    console.error('ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com');
    console.error('SESSION_SECRET=your-secret-session-key');
    console.error('JWT_SECRET=your-secret-jwt-key');
    process.exit(1);
  }
  
  // Успішна валідація
  console.log('✅ Всі змінні оточення валідні');
  console.log(`🌍 Режим: ${process.env.NODE_ENV}`);
  console.log(`🔑 OpenAI ключ: ${process.env.OPENAI_API_KEY.substring(0, 10)}...`);
  
  // Логування через winston якщо доступний
  if (logger) {
    logger.info('Environment validation completed', {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      logLevel: process.env.LOG_LEVEL,
      hasApiKey: !!process.env.OPENAI_API_KEY,
      warningsCount: warnings.length
    });
  }
  
  return true;
}

// Функція для отримання конфігурації (корисно для дебагу)
export const getEnvConfig = () => ({
  required: ENV_CONFIG.required,
  optional: ENV_CONFIG.optional,
  current: Object.fromEntries(
    [...ENV_CONFIG.required, ...ENV_CONFIG.optional]
      .map(key => [key, process.env[key] ? '***SET***' : 'NOT_SET'])
  )
});

// Функція для безпечного виведення env (без секретів)
export const getSafeEnv = () => {
  const safeKeys = ['NODE_ENV', 'PORT', 'LOG_LEVEL'];
  return Object.fromEntries(
    safeKeys.map(key => [key, process.env[key]])
  );
};

export default validateEnv;