const logger = require('../utils/logger');

module.exports = function errorHandler(err, req, res, next) {
  logger.error('Необроблена помилка', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // Помилки валідації
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Помилка валідації даних' });
  }

  // Помилки OpenAI
  if (err.message?.includes('OpenAI') || err.code === 'insufficient_quota') {
    return res.status(503).json({ error: 'Сервіс тимчасово недоступний' });
  }

  // JSON parse помилки
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Невалідний JSON' });
  }

  // За замовчуванням
  res.status(500).json({ 
    error: 'Внутрішня помилка сервера',
    ...(process.env.NODE_ENV !== 'production' && { details: err.message })
  });
};