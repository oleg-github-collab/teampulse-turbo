import logger from './logger.js';

// In-memory storage для rate limiting (в production краще Redis)
const rateLimitStore = new Map();

/**
 * Оцінює кількість токенів на базі символів
 * @param {number} charCount - кількість символів
 * @returns {number} - приблизна кількість токенів
 */
export function estimateTokensFromChars(charCount) {
  // Українські тексти: ~4 символи на токен
  return Math.ceil(charCount / 4);
}

/**
 * Перевіряє та споживає токени для rate limiting
 * @param {string} identifier - унікальний ідентифікатор (IP)
 * @param {string} service - назва сервісу ('negotiation', 'salary')
 * @param {number} tokensNeeded - потрібна кількість токенів
 * @param {number} dailyLimit - денний ліміт токенів
 * @param {number} timeoutHours - таймаут в годинах
 * @returns {Object} - результат перевірки
 */
export function checkAndConsume(identifier, service, tokensNeeded, dailyLimit, timeoutHours) {
  const key = `${identifier}:${service}`;
  const now = Date.now();
  const timeoutMs = timeoutHours * 60 * 60 * 1000;
  
  let userStats = rateLimitStore.get(key);
  
  // Ініціалізація або скидання після таймауту
  if (!userStats || (now - userStats.lastReset) > timeoutMs) {
    userStats = {
      tokensUsed: 0,
      requestCount: 0,
      lastReset: now,
      lastRequest: now
    };
  }
  
  // Перевірка ліміту
  if (userStats.tokensUsed + tokensNeeded > dailyLimit) {
    const hoursLeft = Math.ceil((timeoutMs - (now - userStats.lastReset)) / (60 * 60 * 1000));
    
    logger.warn('Rate limit exceeded', {
      identifier,
      service,
      tokensUsed: userStats.tokensUsed,
      tokensNeeded,
      dailyLimit,
      hoursLeft
    });
    
    return {
      ok: false,
      error: `Перевищено денний ліміт. Спробуйте через ${hoursLeft} год.`
    };
  }
  
  // Споживання токенів
  userStats.tokensUsed += tokensNeeded;
  userStats.requestCount += 1;
  userStats.lastRequest = now;
  
  rateLimitStore.set(key, userStats);
  
  logger.info('Tokens consumed', {
    identifier,
    service,
    tokensNeeded,
    totalUsed: userStats.tokensUsed,
    dailyLimit,
    remaining: dailyLimit - userStats.tokensUsed
  });
  
  return {
    ok: true,
    tokensRemaining: dailyLimit - userStats.tokensUsed,
    requestCount: userStats.requestCount
  };
}

/**
 * Отримує статистику використання для користувача
 * @param {string} identifier - унікальний ідентифікатор
 * @param {string} service - назва сервісу
 * @returns {Object} - статистика використання
 */
export function getUsageStats(identifier, service) {
  const key = `${identifier}:${service}`;
  const userStats = rateLimitStore.get(key);
  
  if (!userStats) {
    return {
      tokensUsed: 0,
      requestCount: 0,
      lastRequest: null
    };
  }
  
  return {
    tokensUsed: userStats.tokensUsed,
    requestCount: userStats.requestCount,
    lastRequest: new Date(userStats.lastRequest)
  };
}

/**
 * Очищає застарілі записи (рекомендується викликати періодично)
 */
export function cleanupExpiredEntries() {
  const now = Date.now();
  const maxAge = 25 * 60 * 60 * 1000; // 25 годин
  let cleaned = 0;
  
  for (const [key, stats] of rateLimitStore.entries()) {
    if (now - stats.lastReset > maxAge) {
      rateLimitStore.delete(key);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    logger.info('Rate limit cleanup completed', { entriesRemoved: cleaned });
  }
}

// Автоматичне очищення кожні 6 годин
setInterval(cleanupExpiredEntries, 6 * 60 * 60 * 1000);