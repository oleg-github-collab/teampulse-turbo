import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';

// Import middleware
import authMiddleware from './middleware/auth.js';

// Import routes
import analyzeRoutes from './routes/analyze.js';
import salaryRoutes from './routes/salary.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration for Railway
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://*.railway.app', 'https://*.up.railway.app']
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow external resources
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(morgan('combined'));

// Parse requests
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Session management with enhanced configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'teampulse-turbo-secret-key-2024',
  name: 'teampulse.session', // Custom session name
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiration on activity
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax', // CSRF protection
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  // Add session store configuration for production
  ...(process.env.NODE_ENV === 'production' && {
    proxy: true // Trust first proxy for secure cookies
  })
}));

// Simple auth without sessions (configurable via env vars)
const VALID_CREDENTIALS = {
  username: process.env.DEMO_USERNAME || 'janeDVDops',
  password: process.env.DEMO_PASSWORD || 'jane2210'
};

// Authentication middleware for protected routes
app.use(authMiddleware);

// Serve static files (after auth middleware)
app.use(express.static(join(__dirname, 'public')));

// Login endpoint with enhanced session management
app.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Log login attempt for debugging
    console.log(`Login attempt for user: ${username}`);
    
    // Validate credentials
    if (!username || !password) {
      console.log('Login failed: Missing credentials');
      return res.redirect('/login.html?error=1');
    }
    
    if (username === VALID_CREDENTIALS.username && password === VALID_CREDENTIALS.password) {
      console.log('Login successful for user:', username);
      
      // Store authentication in session
      req.session.authenticated = true;
      req.session.username = username;
      req.session.loginTime = new Date();
      
      // Save session before redirect with better error handling
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.redirect('/login.html?error=1&msg=session');
        }
        
        console.log('Session saved successfully, redirecting to main app');
        
        // For AJAX requests, return JSON
        if (req.headers['content-type']?.includes('application/json') || 
            req.headers['accept']?.includes('application/json')) {
          return res.json({ success: true, redirect: '/' });
        }
        
        // For form submissions, redirect
        res.redirect('/');
      });
    } else {
      console.log('Login failed: Invalid credentials');
      res.redirect('/login.html?error=1');
    }
  } catch (error) {
    console.error('Login error:', error);
    res.redirect('/login.html?error=1&msg=server');
  }
});

// Logout endpoint
app.post('/logout', (req, res) => {
  const username = req.session?.username;
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
    }
    res.clearCookie('teampulse.session'); // Use our custom session name
    res.clearCookie('connect.sid'); // Fallback for default name
    console.log(`User ${username} logged out successfully`);
    res.redirect('/login.html');
  });
});

// Session status endpoint for debugging
app.get('/api/session', (req, res) => {
  res.json({
    authenticated: !!req.session?.authenticated,
    username: req.session?.username || null,
    loginTime: req.session?.loginTime || null,
    sessionId: req.sessionID,
    cookie: req.session?.cookie
  });
});

// API Routes
app.use('/api', analyzeRoutes);
app.use('/api/salary', salaryRoutes);

// Import OpenAI client
import { askGPT, client as openaiClient } from './utils/openAIClient.js';

// ===== HELPER FUNCTIONS FOR COMPETENCY ANALYSIS =====

// Calculate competency alignment
function calculateCompetencyAlignment(competency, taskComplexity) {
  const gap = competency - taskComplexity;
  let status = '';
  let efficiency = 100;
  let financialLoss = 0;
  
  if (gap > 3) {
    // Overqualified
    status = 'Перекваліфікований';
    efficiency = 100 - (gap * 10);
    financialLoss = gap * 5; // 5% loss per level of overqualification
  } else if (gap < -2) {
    // Underqualified
    status = 'Недостатня кваліфікація';
    efficiency = 100 + (gap * 15);
    financialLoss = Math.abs(gap) * 8; // 8% loss per level of underqualification
  } else if (gap >= -2 && gap <= 3) {
    // Optimal range
    status = 'Оптимальна відповідність';
    efficiency = 100 - Math.abs(gap) * 2;
    financialLoss = Math.abs(gap) * 2;
  }
  
  return {
    gap,
    status,
    efficiency: Math.max(0, Math.min(100, efficiency)),
    financialLoss: Math.min(50, financialLoss)
  };
}

// Calculate monthly financial loss
function calculateMonthlyLoss(salary, gap) {
  const lossPercentage = gap > 3 ? gap * 5 : 
                         gap < -2 ? Math.abs(gap) * 8 : 
                         Math.abs(gap) * 2;
  return (salary * Math.min(50, lossPercentage)) / 100;
}

// Create fallback analysis when API is unavailable
function createFallbackAnalysis(employeeData, alignment, hourlyRate, monthlyLoss) {
  return {
    employee_analysis: {
      salary_fairness: Math.round(7 - Math.abs(alignment.gap) * 0.5),
      market_position: alignment.status,
      performance_ratio: employeeData.performance || 7,
      growth_potential: alignment.gap > 2 ? 'Високий' : alignment.gap < -2 ? 'Потребує навчання' : 'Стабільний'
    },
    risk_assessment: {
      flight_probability: alignment.gap > 3 ? 8 : alignment.gap < -2 ? 3 : 5,
      retention_risk: alignment.gap > 3 ? 'Високий' : 'Середній'
    },
    market_data: {
      position_range_min: Math.round(employeeData.salary * 0.8),
      market_median: employeeData.salary,
      position_range_max: Math.round(employeeData.salary * 1.3)
    },
    competency_alignment: alignment,
    hourly_rate: hourlyRate,
    monthly_inefficiency_cost: monthlyLoss,
    task_distribution: {
      above_competency: alignment.gap < -2 ? Math.abs(alignment.gap) * 15 : 10,
      optimal: 100 - Math.abs(alignment.gap) * 15,
      below_competency: alignment.gap > 3 ? alignment.gap * 15 : 10
    },
    financial_impact: {
      total_monthly_loss: monthlyLoss,
      loss_percentage: alignment.financialLoss,
      optimal_salary_for_tasks: Math.round(employeeData.salary * (100 - alignment.financialLoss) / 100)
    },
    recommendations: {
      salary_adjustment: alignment.gap > 3 ? 'Розглянути підвищення або складніші завдання' : 
                         alignment.gap < -2 ? 'Необхідне навчання або спрощення завдань' : 
                         'Зарплата відповідає завданням',
      career_development: 'Збалансувати складність завдань з рівнем компетенцій',
      skills_improvement: employeeData.skills || 'Розвивати профільні навички'
    },
    action_plan: [
      alignment.gap > 3 ? 'Призначити більш складні проекти' : 'Оптимізувати розподіл завдань',
      'Провести оцінку компетенцій через 3 місяці',
      alignment.gap < -2 ? 'Організувати менторство або навчання' : 'Підтримувати поточний баланс',
      `Оптимізувати витрати: потенційна економія ${monthlyLoss.toFixed(0)} грн/міс`
    ]
  };
}

// ===== ENHANCED SALARY EMPLOYEE ANALYSIS ENDPOINT =====
app.post('/api/salary-employee', async (req, res) => {
  try {
    const employeeData = req.body;
    console.log('Employee analysis request received:', employeeData.name);
    
    // Calculate competency metrics
    const competency = parseInt(employeeData.competency) || 7;
    const taskComplexity = parseInt(employeeData.taskComplexity) || 7;
    const salary = parseInt(employeeData.salary) || 0;
    const hourlyRate = salary / 160; // 160 working hours per month
    
    // Calculate alignment
    const alignment = calculateCompetencyAlignment(competency, taskComplexity);
    const monthlyLoss = calculateMonthlyLoss(salary, alignment.gap);
    
    // If OpenAI is not available, use fallback
    if (!openaiClient) {
      console.warn('OpenAI API not configured, using fallback analysis');
      const fallbackAnalysis = createFallbackAnalysis(employeeData, alignment, hourlyRate, monthlyLoss);
      
      return res.json({ 
        success: true,
        analysis: fallbackAnalysis,
        employee: employeeData
      });
    }
    
    // Prepare enhanced prompt with competency analysis
    const systemPrompt = `Ти експерт з HR-аналітики та оптимізації людських ресурсів. 
    Проаналізуй відповідність компетенцій працівника до складності його завдань 
    та розрахуй фінансові втрати від невідповідності. Відповідай у форматі JSON.`;
    
    const userPrompt = `
    Дані працівника:
    - Ім'я: ${employeeData.name}
    - Посада: ${employeeData.position}
    - Зарплата: ${salary} грн/міс
    - Погодинна ставка: ${hourlyRate.toFixed(0)} грн/год
    - Рівень компетенцій: ${competency}/10
    - Складність поточних завдань: ${taskComplexity}/10
    - Розрив компетенцій: ${alignment.gap} (${alignment.status})
    - Опис завдань: ${employeeData.tasks || 'Не вказано'}
    - Навички: ${employeeData.skills || 'Не вказано'}
    - Досвід: ${employeeData.experience || 'Не вказано'} років
    - Департамент: ${employeeData.department || 'Не вказано'}
    - Локація: ${employeeData.location || 'Не вказано'}
    - Продуктивність: ${employeeData.performance || 7}/10
    
    Проаналізуй та визнач:
    
    1. РОЗПОДІЛ ЗАВДАНЬ ЗА ВІДПОВІДНІСТЮ (у %):
       - Завдання ВИЩЕ компетенцій (ризик помилок, затримок, стресу)
       - Завдання ОПТИМАЛЬНОЇ складності (зона розвитку)
       - Завдання НИЖЧЕ компетенцій (марнування потенціалу)
    
    2. ФІНАНСОВІ ВТРАТИ:
       - Втрати від завдань вище компетенцій (грн/міс): час на виправлення помилок, додаткове навчання, затримки
       - Втрати від завдань нижче компетенцій (грн/міс): переплата за прості завдання, втрачені можливості
       - Загальні втрати (грн/міс та % від зарплати)
    
    3. ДЕТАЛЬНИЙ АНАЛІЗ:
       - Які конкретні завдання занадто складні?
       - Які завдання занадто прості?
       - Оптимальний рівень складності для цього працівника
    
    4. РЕКОМЕНДАЦІЇ:
       - Перерозподіл завдань (що передати іншим)
       - Навчання для підвищення компетенцій
       - Зміна позиції або грейду
       - Оптимальна зарплата для поточних завдань
    
    Відповідь у форматі JSON з полями:
    {
      "employee_analysis": {
        "salary_fairness": число 1-10,
        "market_position": "текст",
        "performance_ratio": число 1-10,
        "growth_potential": "текст"
      },
      "risk_assessment": {
        "flight_probability": число 1-10,
        "retention_risk": "текст"
      },
      "market_data": {
        "position_range_min": число,
        "market_median": число,
        "position_range_max": число
      },
      "task_distribution": {
        "above_competency": число (відсоток),
        "optimal": число (відсоток),
        "below_competency": число (відсоток)
      },
      "financial_impact": {
        "total_monthly_loss": число,
        "loss_percentage": число,
        "optimal_salary_for_tasks": число
      },
      "recommendations": {
        "salary_adjustment": "текст",
        "career_development": "текст",
        "skills_improvement": "текст"
      },
      "action_plan": ["крок 1", "крок 2", "крок 3", "крок 4"]
    }`;

    try {
      const analysis = await askGPT(systemPrompt, userPrompt, false);
      
      let parsedAnalysis;
      try {
        parsedAnalysis = JSON.parse(analysis);
      } catch (parseError) {
        console.warn('Failed to parse GPT response, using fallback');
        parsedAnalysis = createFallbackAnalysis(employeeData, alignment, hourlyRate, monthlyLoss);
      }
      
      // Add calculated competency alignment to the analysis
      parsedAnalysis.competency_alignment = alignment;
      parsedAnalysis.hourly_rate = hourlyRate;
      parsedAnalysis.monthly_inefficiency_cost = monthlyLoss;
      
      res.json({ 
        success: true,
        analysis: parsedAnalysis,
        employee: employeeData
      });
      
    } catch (gptError) {
      console.error('GPT API error, using fallback:', gptError.message);
      const fallbackAnalysis = createFallbackAnalysis(employeeData, alignment, hourlyRate, monthlyLoss);
      
      res.json({ 
        success: true,
        analysis: fallbackAnalysis,
        employee: employeeData
      });
    }
    
  } catch (error) {
    console.error('Employee analysis error:', error);
    res.status(500).json({ 
      success: false,
      error: `Помилка аналізу працівника: ${error.message}` 
    });
  }
});

// ===== SALARY TEXT ANALYSIS ENDPOINT =====
app.post('/api/salary-text', async (req, res) => {
  try {
    const textData = req.body.text;
    console.log('Text analysis request received');
    
    if (!textData || textData.length < 20) {
      return res.status(400).json({
        success: false,
        error: 'Текст занадто короткий для аналізу'
      });
    }
    
    // Fallback analysis for when API is unavailable
    const createFallbackTextAnalysis = () => ({
      overall_efficiency: 7,
      market_alignment: 'Потребує детального аналізу',
      cost_effectiveness: 6,
      strengths: [
        'Команда сформована',
        'Є базова структура',
        'Визначені ролі та обов\'язки'
      ],
      concerns: [
        'Потребує аналізу ринкових ставок',
        'Необхідна оцінка компетенцій',
        'Варто переглянути розподіл завдань'
      ],
      recommendations: [
        'Провести аудит компетенцій команди',
        'Порівняти зарплати з ринковими',
        'Оптимізувати розподіл завдань за складністю',
        'Розробити план розвитку для кожного члена команди'
      ],
      budget_optimization: 'Рекомендується провести детальний аналіз для виявлення можливостей оптимізації бюджету на 10-15%',
      salary_ranges: {
        recommended_min: 0,
        current_average: 0,
        recommended_max: 0
      }
    });
    
    if (!openaiClient) {
      console.warn('OpenAI API not configured for salary-text analysis');
      return res.json({ 
        success: true,
        analysis: createFallbackTextAnalysis()
      });
    }
    
    const systemPrompt = `Ви - експерт з аналізу команд та зарплатної політики. 
    Проаналізуйте опис команди та надайте рекомендації щодо оптимізації зарплат та ефективності. 
    Відповідайте у форматі JSON.`;
    
    const userPrompt = `Проаналізуйте наступний опис команди та зарплатної структури:

${textData}

Надайте аналіз у JSON форматі з полями:
- overall_efficiency (число 1-10)
- market_alignment (текст: "низький", "середній", "високий")
- cost_effectiveness (число 1-10)
- strengths (масив з 3-5 сильних сторін)
- concerns (масив з 3-5 проблем)
- recommendations (масив з 4-6 рекомендацій)
- budget_optimization (текстова рекомендація щодо оптимізації бюджету)
- salary_ranges (об'єкт з полями: recommended_min, current_average, recommended_max)`;

    try {
      const analysis = await askGPT(systemPrompt, userPrompt, false);
      
      let parsedAnalysis;
      try {
        parsedAnalysis = JSON.parse(analysis);
        
        // Validate and set defaults for missing fields
        parsedAnalysis.overall_efficiency = parsedAnalysis.overall_efficiency || 7;
        parsedAnalysis.market_alignment = parsedAnalysis.market_alignment || 'середній';
        parsedAnalysis.cost_effectiveness = parsedAnalysis.cost_effectiveness || 6;
        parsedAnalysis.strengths = parsedAnalysis.strengths || ['Потребує аналізу'];
        parsedAnalysis.concerns = parsedAnalysis.concerns || ['Потребує аналізу'];
        parsedAnalysis.recommendations = parsedAnalysis.recommendations || ['Провести детальний аналіз'];
        parsedAnalysis.budget_optimization = parsedAnalysis.budget_optimization || 'Потребує додаткового аналізу';
        parsedAnalysis.salary_ranges = parsedAnalysis.salary_ranges || {
          recommended_min: 0,
          current_average: 0,
          recommended_max: 0
        };
        
      } catch (parseError) {
        console.warn('Failed to parse GPT response for text analysis, using fallback');
        parsedAnalysis = createFallbackTextAnalysis();
      }
      
      res.json({ 
        success: true,
        analysis: parsedAnalysis
      });
      
    } catch (gptError) {
      console.error('GPT API error for text analysis, using fallback:', gptError.message);
      res.json({ 
        success: true,
        analysis: createFallbackTextAnalysis()
      });
    }
    
  } catch (error) {
    console.error('Text analysis error:', error);
    res.status(500).json({ 
      success: false,
      error: `Помилка аналізу тексту: ${error.message}` 
    });
  }
});

// Root redirect - serve main app if authenticated, otherwise login
app.get('/', (req, res) => {
  if (req.session.authenticated) {
    res.sendFile(join(__dirname, 'public', 'index.html'));
  } else {
    res.redirect('/login.html');
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.2.0',
    features: {
      negotiation_analysis: true,
      salary_analysis: true,
      competency_alignment: true,
      openai_available: !!openaiClient
    }
  });
});

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Environment validation for Railway
const requiredEnvVars = ['NODE_ENV'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn(`⚠️  Missing environment variables: ${missingVars.join(', ')}`);
  console.warn('Setting defaults for demo deployment...');
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 TeamPulse Turbo server running on port ${PORT}`);
  console.log(`🌐 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💰 Competency analysis: ENABLED`);
  console.log(`🤖 OpenAI API: ${openaiClient ? 'CONNECTED' : 'FALLBACK MODE'}`);
});