const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Помилка валідації', { errors: errors.array(), path: req.path });
    return res.status(400).json({
      error: 'Помилка валідації даних',
      details: errors.array()
    });
  }
  next();
};

const validateAnalysis = [
  body('text')
    .isString()
    .notEmpty()
    .isLength({ min: 10, max: 10000 })
    .withMessage('Текст повинен містити від 10 до 10000 символів')
    .trim()
    .escape(),
  handleValidationErrors
];

const validateSalaryAnalysis = [
  body('text')
    .isString()
    .notEmpty()
    .isLength({ min: 20, max: 15000 })
    .withMessage('Опис команди повинен містити від 20 до 15000 символів')
    .trim()
    .escape(),
  handleValidationErrors
];

// Нова валідація для ручної картки працівника
const validateEmployeeForm = [
  body('name')
    .isString()
    .notEmpty()
    .isLength({ min: 2, max: 100 })
    .withMessage('Ім\'я повинно містити від 2 до 100 символів')
    .trim()
    .escape(),
  body('position')
    .isString()
    .notEmpty()
    .isLength({ min: 2, max: 100 })
    .withMessage('Посада повинна містити від 2 до 100 символів')
    .trim()
    .escape(),
  body('salary')
    .isNumeric()
    .isFloat({ min: 1000, max: 1000000 })
    .withMessage('Зарплата повинна бути від 1000 до 1000000'),
  body('experience')
    .optional()
    .isNumeric()
    .isFloat({ min: 0, max: 50 })
    .withMessage('Досвід роботи повинен бути від 0 до 50 років'),
  body('skills')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Навички не повинні перевищувати 500 символів')
    .trim()
    .escape(),
  body('education')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Освіта не повинна перевищувати 200 символів')
    .trim()
    .escape(),
  body('department')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Департамент не повинен перевищувати 100 символів')
    .trim()
    .escape(),
  body('performance')
    .optional()
    .isNumeric()
    .isFloat({ min: 1, max: 10 })
    .withMessage('Оцінка продуктивності повинна бути від 1 до 10'),
  body('location')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Локація не повинна перевищувати 100 символів')
    .trim()
    .escape(),
  handleValidationErrors
];

module.exports = {
  validateAnalysis,
  validateSalaryAnalysis,
  validateEmployeeForm
};