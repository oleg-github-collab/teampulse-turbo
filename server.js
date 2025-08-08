import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';

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

// Simple auth without sessions (configurable via env vars)
const VALID_CREDENTIALS = {
  username: process.env.DEMO_USERNAME || 'admin',
  password: process.env.DEMO_PASSWORD || 'password123'
};

// Serve static files
app.use(express.static(join(__dirname, 'public')));

// Simple login endpoint (without sessions)
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === VALID_CREDENTIALS.username && password === VALID_CREDENTIALS.password) {
    // Redirect to main app (no session storage for now)
    res.redirect('/index.html');
  } else {
    res.redirect('/login.html?error=1');
  }
});

// Logout endpoint
app.post('/logout', (req, res) => {
  res.redirect('/login.html');
});

// API Routes
app.use('/api', analyzeRoutes);
app.use('/api/salary', salaryRoutes);

// Additional salary analysis endpoints
app.post('/api/salary-employee', async (req, res) => {
  try {
    const employeeData = req.body;
    console.log('Employee analysis request received');
    
    // Mock analysis for demo
    const analysis = {
      employee_analysis: {
        salary_fairness: Math.floor(Math.random() * 4) + 6,
        market_position: 'конкурентоспроможна',
        performance_ratio: Math.floor(Math.random() * 3) + 7,
        growth_potential: 'високий'
      },
      risk_assessment: {
        flight_probability: Math.floor(Math.random() * 3) + 2,
        retention_risk: 'низький'
      },
      market_data: {
        position_range_min: Math.floor(employeeData.salary * 0.8),
        market_median: Math.floor(employeeData.salary * 1.1),
        position_range_max: Math.floor(employeeData.salary * 1.4)
      },
      recommendations: {
        salary_adjustment: 'Зарплата відповідає ринковим стандартам. Розгляньте підвищення на 10-15% через 6 місяців.',
        career_development: 'Рекомендуємо додаткове навчання в сучасних технологіях для підвищення кваліфікації.',
        skills_improvement: 'Розвиток лідерських навичок та участь у cross-functional проектах.'
      },
      action_plan: [
        'Провести зустріч 1-на-1 для обговорення цілей',
        'Створити план розвитку на наступні 6 місяців',
        'Запланувати ревізію зарплати через квартал'
      ]
    };
    
    res.json({ 
      success: true,
      analysis: analysis,
      employee: employeeData
    });
    
  } catch (error) {
    console.error('Employee analysis error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Помилка аналізу працівника' 
    });
  }
});

app.post('/api/salary-text', async (req, res) => {
  try {
    const _textData = req.body.text;
    console.log('Text analysis request received');
    
    // Mock analysis for demo
    const analysis = {
      overall_efficiency: Math.floor(Math.random() * 3) + 7,
      market_alignment: 'середній',
      cost_effectiveness: Math.floor(Math.random() * 2) + 8,
      strengths: [
        'Добре збалансована команда за досвідом',
        'Конкурентоспроможні зарплати для більшості позицій',
        'Хороший розподіл ролей та обов\'язків'
      ],
      concerns: [
        'Можливі дисбаланси в оплаті схожих ролей',
        'Потенційний ризик відтоку талантів',
        'Потреба в оптимізації бюджету на зарплати'
      ],
      recommendations: [
        'Провести аудит зарплатної справедливості',
        'Впровадити систему оцінки продуктивності',
        'Розробити план утримання ключових працівників',
        'Оптимізувати структуру команди'
      ],
      budget_optimization: 'Рекомендуємо перерозподіл до 15% зарплатного бюджету для покращення справедливості та утримання талантів.',
      salary_ranges: {
        recommended_min: 25000,
        current_average: 45000,
        recommended_max: 85000
      }
    };
    
    res.json({ 
      success: true,
      analysis: analysis
    });
    
  } catch (error) {
    console.error('Text analysis error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Помилка аналізу тексту' 
    });
  }
});

// Root redirect
app.get('/', (req, res) => {
  res.redirect('/login.html');
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
  console.log(`📝 Demo login: ${VALID_CREDENTIALS.username} / ${VALID_CREDENTIALS.password}`);
  console.log(`🌐 Health check: http://0.0.0.0:${PORT}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});