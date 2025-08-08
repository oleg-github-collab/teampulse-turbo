import winston from 'winston';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Створення logs директорії якщо не існує
const logsDir = join(__dirname, '../logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

// Custom format для кращого читання
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message} ${metaString}`;
  })
);

// Production format
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Development format
const developmentFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaString = Object.keys(meta).length ? 
      `\n${JSON.stringify(meta, null, 2)}` : '';
    return `🕐 ${timestamp} [${level}]: ${message}${metaString}`;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' ? productionFormat : customFormat,
  defaultMeta: { 
    service: 'teampulse-turbo',
    version: '1.1.0',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Error logs - тільки помилки
    new winston.transports.File({ 
      filename: join(logsDir, 'error.log'), 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    }),
    
    // Combined logs - всі рівні
    new winston.transports.File({ 
      filename: join(logsDir, 'combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // Access logs для HTTP requests
    new winston.transports.File({
      filename: join(logsDir, 'access.log'),
      level: 'info',
      maxsize: 10485760, // 10MB
      maxFiles: 3,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ],
  
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: join(logsDir, 'exceptions.log'),
      maxsize: 5242880,
      maxFiles: 2
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: join(logsDir, 'rejections.log'),
      maxsize: 5242880,
      maxFiles: 2
    })
  ]
});

// Console transport для development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: developmentFormat,
    level: 'debug'
  }));
} else {
  // Production console з обмеженням рівнів
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.simple()
    ),
    level: 'warn' // Тільки warnings та errors
  }));
}

// Custom логгер методи
logger.request = (req, res, responseTime) => {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    contentLength: res.get('Content-Length') || 0
  });
};

logger.api = (endpoint, data, responseTime) => {
  logger.info('API Call', {
    endpoint,
    responseTime: `${responseTime}ms`,
    dataSize: JSON.stringify(data).length,
    timestamp: new Date().toISOString()
  });
};

logger.ai = (model, tokens, cost, operation) => {
  logger.info('AI Operation', {
    model,
    operation,
    promptTokens: tokens.prompt || 0,
    completionTokens: tokens.completion || 0,
    totalTokens: tokens.total || 0,
    estimatedCost: cost ? `$${cost.toFixed(4)}` : 'unknown'
  });
};

logger.security = (event, details) => {
  logger.warn('Security Event', {
    event,
    details,
    timestamp: new Date().toISOString(),
    severity: 'medium'
  });
};

logger.performance = (operation, duration, details = {}) => {
  const level = duration > 5000 ? 'warn' : 'info';
  logger[level]('Performance Metric', {
    operation,
    duration: `${duration}ms`,
    ...details
  });
};

// Graceful shutdown
logger.shutdown = () => {
  return new Promise((resolve) => {
    logger.info('🛑 Shutting down logger...');
    logger.end(() => {
      resolve();
    });
  });
};

export default logger;