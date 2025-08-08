import OpenAI from 'openai';
import logger from './logger.js';

// Ініціалізація клієнта OpenAI через офіційний SDK
const client = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120000, // 2 хвилини для складних запитів
  maxRetries: 3
}) : null;

/**
 * Створює запит до OpenAI GPT
 * @param {string} systemPrompt - системний промпт
 * @param {string} userPrompt - користувацький промпт
 * @param {boolean} stream - чи використовувати потоковий режим
 * @returns {Promise<string|ReadableStream>} - відповідь GPT
 */
const askGPT = async (systemPrompt, userPrompt, stream = false) => {
  try {
    if (!client) {
      throw new Error("OpenAI API key не налаштований");
    }

    logger.info('🤖 OpenAI Request initiated', { 
      systemPromptLength: systemPrompt?.length,
      userPromptLength: userPrompt?.length,
      stream,
      timestamp: new Date().toISOString()
    });

    const response = await client.chat.completions.create({
      model: "gpt-4",
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      stream: stream
    });

    if (stream) {
      return response;
    }

    const content = response.choices[0]?.message?.content || "";
    
    logger.info('✅ OpenAI Response received', {
      outputLength: content.length,
      success: true
    });

    return content;

  } catch (error) {
    logger.error("❌ OpenAI Error:", {
      error: error.message,
      stack: error.stack,
      systemPrompt: systemPrompt?.substring(0, 100) + '...',
      userPrompt: userPrompt?.substring(0, 100) + '...'
    });
    
    throw new Error(`Не вдалося отримати відповідь від OpenAI: ${error.message}`);
  }
};

/**
 * Створює структурований запит до GPT з простим промптом
 * @param {string} prompt - текст запиту
 * @returns {Promise<string>} - відповідь GPT
 */
const askGPTSimple = async (prompt) => {
  return await askGPT("Ти корисний асистент.", prompt, false);
};

/**
 * Перевіряє з'єднання з OpenAI
 * @returns {Promise<boolean>} - статус з'єднання
 */
const testOpenAIConnection = async () => {
  try {
    if (!client) {
      logger.error('🔴 OpenAI client not initialized - missing API key');
      return false;
    }
    
    await askGPTSimple("Test connection - reply with 'OK'");
    logger.info('🟢 OpenAI connection test successful');
    return true;
  } catch (error) {
    logger.error('🔴 OpenAI connection test failed:', error.message);
    return false;
  }
};

// ESM export
export { 
  askGPT, 
  askGPTSimple,
  testOpenAIConnection,
  client
};

// Default export для зворотної сумісності
export default { 
  askGPT, 
  askGPTSimple,
  testOpenAIConnection,
  client
};