import OpenAI from 'openai';
import logger from './logger.js';

// Ініціалізація клієнта GPT-5 через офіційний SDK
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120000, // 2 хвилини для складних запитів
  maxRetries: 3
});

/**
 * Створює інстанс GPT-5 для генерації відповіді
 * @param {string} prompt - текст запиту
 * @returns {Promise<string>} - відповідь GPT-5
 */
const askGPT5 = async (prompt) => {
  try {
    logger.info('🤖 GPT-5 Request initiated', { 
      promptLength: prompt?.length,
      timestamp: new Date().toISOString()
    });

    const response = await client.responses.create({
      model: "gpt-5",
      input: prompt,
    });

    logger.info('✅ GPT-5 Response received', {
      outputLength: response.output_text?.length,
      success: true
    });

    return response.output_text;

  } catch (error) {
    logger.error("❌ Kaminskyi AI Error:", {
      error: error.message,
      stack: error.stack,
      prompt: prompt?.substring(0, 100) + '...'
    });
    
    throw new Error("Не вдалося отримати відповідь від Kaminskyi AI.");
  }
};

/**
 * Створює структурований запит до GPT-5 з системним та користувацьким промптом
 * @param {string} systemPrompt - системний промпт
 * @param {string} userPrompt - користувацький промпт
 * @returns {Promise<string>} - відповідь GPT-5
 */
const askGPT5WithSystem = async (systemPrompt, userPrompt) => {
  const combinedPrompt = `System: ${systemPrompt}\n\nUser: ${userPrompt}`;
  return await askGPT5(combinedPrompt);
};

/**
 * Перевіряє з'єднання з GPT-5
 * @returns {Promise<boolean>} - статус з'єднання
 */
const testGPT5Connection = async () => {
  try {
    await askGPT5("Test connection");
    logger.info('🟢 GPT-5 connection test successful');
    return true;
  } catch (error) {
    logger.error('🔴 GPT-5 connection test failed:', error.message);
    return false;
  }
};

// ESM export
export { 
  askGPT5, 
  askGPT5WithSystem,
  testGPT5Connection 
};

// Default export для зворотної сумісності
export default { 
  askGPT5, 
  askGPT5WithSystem,
  testGPT5Connection 
};