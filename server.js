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

// Session management
app.use(session({
  secret: process.env.SESSION_SECRET || 'teampulse-turbo-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
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

// Login endpoint with session management
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === VALID_CREDENTIALS.username && password === VALID_CREDENTIALS.password) {
    // Store authentication in session
    req.session.authenticated = true;
    req.session.username = username;
    
    // Save session before redirect
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err);
        return res.redirect('/login.html?error=1');
      }
      res.redirect('/');
    });
  } else {
    res.redirect('/login.html?error=1');
  }
});

// Logout endpoint
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
    }
    res.clearCookie('connect.sid');
    res.redirect('/login.html');
  });
});

// API Routes
app.use('/api', analyzeRoutes);
app.use('/api/salary', salaryRoutes);

// Import OpenAI client
import { askGPT, client as openaiClient } from './utils/openAIClient.js';

// Additional salary analysis endpoints
app.post('/api/salary-employee', async (req, res) => {
  try {
    const employeeData = req.body;
    console.log('Employee analysis request received');
    
    if (!openaiClient) {
      return res.status(500).json({ 
        success: false,
        error: 'OpenAI API не налаштований. Потрібен дійсний API ключ.' 
      });
    }
    
    const systemPrompt = `Ви - експерт з HR аналітики та оцінки персоналу. Проаналізуйте працівника та надайте детальну оцінку з рекомендаціями. Відповідайте у форматі JSON.`;
    
    const userPrompt = `Проаналізуйте працівника з такими даними:
Ім'я: ${employeeData.name || 'Не вказано'}
Посада: ${employeeData.position || 'Не вказано'}
Зарплата: ${employeeData.salary || 'Не вказано'} грн/міс
Досвід: ${employeeData.experience || 'Не вказано'} років
Департамент: ${employeeData.department || 'Не вказано'}
Локація: ${employeeData.location || 'Не вказано'}
Навички: ${employeeData.skills || 'Не вказано'}
Освіта: ${employeeData.education || 'Не вказано'}
Продуктивність (1-10): ${employeeData.performance || 'Не вказано'}

Надайте аналіз у JSON форматі з полями:
- employee_analysis (salary_fairness, market_position, performance_ratio, growth_potential)
- risk_assessment (flight_probability, retention_risk)  
- market_data (position_range_min, market_median, position_range_max)
- recommendations (salary_adjustment, career_development, skills_improvement)
- action_plan (масив рекомендацій)`;

    const analysis = await askGPT(systemPrompt, userPrompt, false);
    
    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(analysis);
    } catch {
      // Fallback if JSON parsing fails
      parsedAnalysis = {
        employee_analysis: { 
          analysis_text: analysis.substring(0, 500) + "..." 
        }
      };
    }
    
    res.json({ 
      success: true,
      analysis: parsedAnalysis,
      employee: employeeData
    });
    
  } catch (error) {
    console.error('Employee analysis error:', error);
    res.status(500).json({ 
      success: false,
      error: `Помилка аналізу працівника: ${error.message}` 
    });
  }
});

app.post('/api/salary-text', async (req, res) => {
  try {
    const textData = req.body.text;
    console.log('Text analysis request received');
    
    if (!openaiClient) {
      return res.status(500).json({ 
        success: false,
        error: 'OpenAI API не налаштований. Потрібен дійсний API ключ.' 
      });
    }
    
    const systemPrompt = `Ви - експерт з аналізу команд та зарплатної політики. Проаналізуйте опис команди та надайте рекомендації щодо оптимізації зарплат та ефективності. Відповідайте у форматі JSON.`;
    
    const userPrompt = `Проаналізуйте наступний опис команди та зарплатної структури:

${textData}

Надайте аналіз у JSON форматі з полями:
- overall_efficiency (число 1-10)
- market_alignment (текст)
- cost_effectiveness (число 1-10)
- strengths (масив сильних сторін)
- concerns (масив проблем)
- recommendations (масив рекомендацій)
- budget_optimization (текстова рекомендація)
- salary_ranges (recommended_min, current_average, recommended_max)`;

    const analysis = await askGPT(systemPrompt, userPrompt, false);
    
    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(analysis);
    } catch {
      // Fallback if JSON parsing fails
      parsedAnalysis = {
        analysis_text: analysis.substring(0, 1000) + "...",
        overall_efficiency: 7,
        market_alignment: "потребує аналізу"
      };
    }
    
    res.json({ 
      success: true,
      analysis: parsedAnalysis
    });
    
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
    version: '1.1.0'
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
});