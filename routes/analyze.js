import express from "express";
import multer from "multer";
import { extractTextFromBuffer } from "../utils/textExtract.js";
import { negotiationSystemPrompt, negotiationUserPrompt } from "../utils/prompts.js";
import { askGPT, client as openaiClient } from "../utils/openAIClient.js";
import logger from '../utils/logger.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

const DAILY_LIMIT = Number(process.env.DAILY_TOKENS_LIMIT || 13500000);
const TIMEOUT_HOURS = Number(process.env.NEGOTIATION_TIMEOUT_HOURS || 12);

router.post("/analyze", upload.single("file"), async (req, res) => {
  try {
    const _ip = req.ip || req.connection.remoteAddress || "unknown";
    const profile = JSON.parse(req.body.profile || "{}");
    let plainText = (req.body.text || "").toString();

    if (req.file) plainText = await extractTextFromBuffer(req.file.originalname, req.file.buffer);

    if (!plainText || plainText.trim().length === 0) {
      return res.status(400).json({ error: "Будь ласка, введіть текст для аналізу." });
    }

    // Rate limiting (temporarily disabled)
    // const tokensEstimate = estimateTokensFromChars(plainText.length);
    // const check = checkAndConsume(ip, "negotiation", tokensEstimate, DAILY_LIMIT, TIMEOUT_HOURS);
    // if (!check.ok) return res.status(429).json({ error: check.error });

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const systemPrompt = negotiationSystemPrompt();
    const userPrompt = negotiationUserPrompt(profile, plainText);

    // Check if OpenAI is available
    if (!openaiClient) {
      res.write('data: {"chunk": "❌ OpenAI API не налаштований"}\\n\\n');
      res.write('event: error\\ndata: {"error": "OpenAI API key відсутній"}\\n\\n');
      res.end();
      return;
    }

    logger.info('🚀 Starting negotiation analysis', {
      profileKeys: Object.keys(profile),
      textLength: plainText.length,
      ip: req.ip
    });

    try {
      // Use streaming response from OpenAI
      const response = await askGPT(systemPrompt, userPrompt, true);

      for await (const chunk of response) {
        const delta = chunk.choices?.[0]?.delta?.content || "";
        if (delta) {
          res.write(`data: ${JSON.stringify({ chunk: delta })}\n\n`);
        }
      }
      
      logger.info('✅ Negotiation analysis completed successfully');
    } catch (openaiError) {
      logger.error('OpenAI API error in analyze route:', openaiError);
      res.write(`data: {"chunk": "❌ Помилка OpenAI API: ${openaiError.message}"}\\n\\n`);
      res.write(`event: error\\ndata: {"error": "${openaiError.message}"}\\n\\n`);
      res.end();
      return;
    }

    res.write(`event: done\ndata: {}\n\n`);
    res.end();
  } catch (err) {
    console.error("Analyze error:", err);
    try {
      res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    } catch {}
  }
});

export default router;