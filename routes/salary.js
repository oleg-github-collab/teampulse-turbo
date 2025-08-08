import express from "express";
import multer from "multer";
import { extractTextFromBuffer } from "../utils/textExtract.js";
import { salarySystemPrompt, salaryUserPrompt } from "../utils/prompts.js";
import { estimateTokensFromChars, checkAndConsume } from "../utils/rateLimiter.js";
import logger from '../utils/logger.js';
import OpenAI from "openai";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

// OpenAI клієнт
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

router.post("/", async (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const payload = req.body;
    
    // Validate payload
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ 
        ok: false, 
        error: "Невалідні дані. Очікується JSON об'єкт." 
      });
    }

    logger.info('Salary analysis request', { 
      ip, 
      hasData: !!payload 
    });

    
    const check = checkAndConsume(ip, "salary", 5000, DAILY_LIMIT, TIMEOUT_HOURS);
    if (!check.ok) return res.status(429).json({ ok: false, error: check.error });

    
    const systemPrompt = "Ви - експерт з аналізу зарплат та ефективності команд.";
    const userPrompt = `Проаналізуйте дані команди: ${JSON.stringify(payload, null, 2)}`;

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });

    const result = response.choices[0]?.message?.content || "";

    logger.info('Salary analysis completed', { 
      ip,
      responseLength: result.length
    });

    res.json({ 
      ok: true, 
      raw: result 
    });

  } catch (error) {
    logger.error('Salary analysis error', { 
      error: error.message,
      ip: req.ip 
    });
    
    res.status(500).json({ 
      ok: false, 
      error: 'Помилка сервера при аналізі зарплат' 
    });
  }
});

export default router;