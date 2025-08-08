import express from "express";
import multer from "multer";
import { extractTextFromBuffer } from "../utils/textExtract.js";
import { negotiationSystemPrompt, negotiationUserPrompt } from "../utils/prompts.js";
// import { estimateTokensFromChars, checkAndConsume } from "../utils/rateLimiter.js";
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

const DAILY_LIMIT = Number(process.env.DAILY_TOKENS_LIMIT || 13500000);
const TIMEOUT_HOURS = Number(process.env.NEGOTIATION_TIMEOUT_HOURS || 12);

router.post("/analyze", upload.single("file"), async (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
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

    const sys = negotiationSystemPrompt();
    const user = negotiationUserPrompt(profile, plainText);

    const response = await openai.chat.completions.create({
      model: "gpt-5",
      temperature: 0.2,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user }
      ],
      stream: true
    });

    for await (const chunk of response) {
      const delta = chunk.choices?.[0]?.delta?.content || "";
      if (delta) res.write(`data: ${JSON.stringify({ chunk: delta })}\n\n`);
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