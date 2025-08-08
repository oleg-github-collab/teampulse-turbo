const OpenAI = require("openai");

// Ініціалізація клієнта GPT-5 через офіційний SDK
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Створює інстанс GPT-5 для генерації відповіді
 * @param {string} prompt - текст запиту
 * @returns {Promise<string>} - відповідь GPT-5
 */
const askGPT5 = async (prompt) => {
  try {
    const response = await client.responses.create({
      model: "gpt-5",
      input: prompt,
    });

    return response.output_text;
  } catch (error) {
    console.error("Kaminskyi AI Error:", error);
    throw new Error("Не вдалося отримати відповідь від Kaminskyi AI.");
  }
};

module.exports = { askGPT5 };
