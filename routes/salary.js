import express from "express";
import multer from "multer";
import { extractTextFromBuffer } from "../utils/textExtract.js";
import { salarySystemPrompt, salaryUserPrompt } from "../utils/prompts.js";
import { askGPT, client as openaiClient } from "../utils/openAIClient.js";
import logger from '../utils/logger.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

// Constants
const DAILY_LIMIT = Number(process.env.DAILY_TOKENS_LIMIT || 400000);
const TIMEOUT_HOURS = Number(process.env.SALARY_TIMEOUT_HOURS || 24);

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

    // Rate limiting disabled for demo
    // const check = checkAndConsume(ip, "salary", 5000, DAILY_LIMIT, TIMEOUT_HOURS);
    // if (!check.ok) return res.status(429).json({ ok: false, error: check.error });

    // Check if OpenAI is available
    if (!openaiClient) {
      return res.status(500).json({ 
        ok: false, 
        error: "OpenAI API не налаштований. Потрібен дійсний API ключ для роботи системи." 
      });
    }

    let result;
    try {
      const systemPrompt = salarySystemPrompt();
      const userPrompt = salaryUserPrompt(payload);

      logger.info('🚀 Starting salary analysis', {
        payloadType: typeof payload,
        hasEmployees: Array.isArray(payload.employees),
        employeeCount: Array.isArray(payload.employees) ? payload.employees.length : 0,
        ip
      });

      result = await askGPT(systemPrompt, userPrompt, false);
      
      logger.info('✅ Salary analysis completed successfully', {
        responseLength: result.length
      });
      
    } catch (openaiError) {
      logger.error('OpenAI API error in salary route:', openaiError);
      return res.status(500).json({ 
        ok: false, 
        error: `Помилка OpenAI API: ${openaiError.message}` 
      });
    }

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