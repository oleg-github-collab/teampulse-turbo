import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ESM __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Завантаження змінних оточення
dotenv.config();

// Імпорт утилітів
import logger from './utils/logger.js';
import validateEnv from './utils/validateEnv.js';

// Імпорт middleware
import authMiddleware from './middleware/auth.js';
import { validateAnalysis, validateSalaryAnalysis, validateEmployeeForm } from './middleware/validation.js';
import errorHandler from './middleware/errorHandler.js';

// Імпорт routes
import analyzeRoutes from './routes/analyze.js';
import salaryRoutes from './routes/salary.js';
import authRoutes from './routes/auth.js';

// Валідація змінних оточення
validateEnv();

const app = express();

// Middleware для безпеки
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хвилин
  max: 100, // максимум 100 запитів з IP
  message: { error: "Забагато запитів з цього IP. Спробуйте пізніше." },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 хвилина
  max: 10, // максимум 10 AI запитів на хвилину
  message: { error: "Забагато AI запитів. Зачекайте хвилину." },
});

// CORS налаштування
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || []
    : true,
  credentials: true,
  optionsSuccessStatus: 200,
};

// Застосування middleware
app.use(limiter);
app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ 
  limit: "10mb",
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ error: "Невалідний JSON" });
      throw new Error("Невалідний JSON");
    }
  }
}));
app.use(cookieParser());

// Логування запитів
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { 
    ip: req.ip,
    userAgent: req.get('User-Agent') 
  });
  next();
});

// Статичні файли
app.use(express.static(path.join(__dirname, "public"), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0'
}));

// API маршрути з rate limiting
app.use("/api/auth", authRoutes);
app.use("/api/analyze", apiLimiter, authMiddleware, validateAnalysis, analyzeRoutes);
app.use("/api/salary-text", apiLimiter, authMiddleware, validateSalaryAnalysis, salaryRoutes);
app.use("/api/salary-employee", apiLimiter, authMiddleware, validateEmployeeForm, salaryRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "1.1.0",
    node_version: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Сторінка входу
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Catch-all для SPA
app.get("*", authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Обробка помилок
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  logger.info(`🚀 TeamPulse Turbo запущено на порті ${PORT}`, {
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    node_version: process.version,
    esm_mode: true
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM отримано, закриваю сервер...');
  server.close(() => {
    logger.info('Сервер закрито');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT отримано, закриваю сервер...');
  server.close(() => {
    logger.info('Сервер закрито');
    process.exit(0);
  });
});

// ESM export замість module.exports
export default app;