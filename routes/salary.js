import express from "express";
import multer from "multer";
import { extractTextFromBuffer } from "../utils/textExtract.js";
import { salarySystemPrompt, salaryUserPrompt } from "../utils/prompts.js";
// import { estimateTokensFromChars, checkAndConsume } from "../utils/rateLimiter.js";
import logger from '../utils/logger.js';
import OpenAI from "openai";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

// Constants
const DAILY_LIMIT = Number(process.env.DAILY_TOKENS_LIMIT || 400000);
const TIMEOUT_HOURS = Number(process.env.SALARY_TIMEOUT_HOURS || 24);

// OpenAI клієнт
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
}) : null;

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

    
    // Check if OpenAI is available, otherwise use demo data
    let result;
    if (!openai) {
      // Demo result for Railway deployment
      result = JSON.stringify({
        team_summary: { 
          total_inefficiency_percent: Math.floor(Math.random() * 30) + 15,
          total_employees: Array.isArray(payload.employees) ? payload.employees.length : 3,
          average_salary: 45000
        },
        per_employee: Array.isArray(payload.employees) ? payload.employees.map((emp, i) => ({
          name: emp.name || `Працівник ${i + 1}`,
          inefficiency_percent: Math.floor(Math.random() * 25) + 10
        })) : [
          { name: "Демо працівник 1", inefficiency_percent: 15 },
          { name: "Демо працівник 2", inefficiency_percent: 20 },
          { name: "Демо працівник 3", inefficiency_percent: 12 }
        ],
        recommendations: [
          "Оптимізувати розподіл завдань між командою",
          "Розглянути корекцію зарплат відповідно до продуктивності",
          "Впровадити систему мотивації та KPI",
          "Покращити процеси комунікації в команді"
        ]
      });
    } else {
      const systemPrompt = "Ви - експерт з аналізу зарплат та ефективності команд.";
      const userPrompt = `Проаналізуйте дані команди: ${JSON.stringify(payload, null, 2)}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4",
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      });

      result = response.choices[0]?.message?.content || "";
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