import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security and performance middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));

// Parse requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple auth without sessions (hardcoded for demo)
const VALID_CREDENTIALS = {
  username: 'admin',
  password: 'password123'
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
app.post('/api/analyze', async (req, res) => {
  try {
    console.log('Analysis request received');
    
    // Set headers for streaming response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    
    // Simulate streaming analysis
    res.write('data: {"chunk": "🔍 Аналіз розпочато..."}\n\n');
    
    setTimeout(() => {
      res.write('data: {"chunk": "\\n\\n📊 Обробка даних..."}\n\n');
    }, 500);
    
    setTimeout(() => {
      res.write('data: {"chunk": "\\n\\n✅ Аналіз завершено!\\n\\nРезультат:\\n{\\n  \\"status\\": \\"success\\",\\n  \\"analysis\\": \\"Демо результат аналізу переговорів\\",\\n  \\"biases\\": [],\\n  \\"manipulations\\": [],\\n  \\"recommendations\\": [\\"Покращити стратегію переговорів\\"]\\n}"}\n\n');
      res.end();
    }, 1000);
    
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

app.post('/api/salary', async (req, res) => {
  try {
    console.log('Salary analysis request received');
    
    // Simulate salary analysis
    const result = {
      ok: true,
      raw: JSON.stringify({
        team_summary: { 
          total_inefficiency_percent: Math.floor(Math.random() * 50) + 10,
          total_employees: 5,
          average_salary: 45000
        },
        per_employee: [
          { name: "Працівник 1", inefficiency_percent: Math.floor(Math.random() * 30) + 10 },
          { name: "Працівник 2", inefficiency_percent: Math.floor(Math.random() * 30) + 10 },
          { name: "Працівник 3", inefficiency_percent: Math.floor(Math.random() * 30) + 10 }
        ],
        recommendations: [
          "Оптимізувати розподіл завдань",
          "Розглянути корекцію зарплат",
          "Покращити мотивацію команди"
        ]
      })
    };
    
    res.json(result);
    
  } catch (error) {
    console.error('Salary analysis error:', error);
    res.status(500).json({ error: 'Salary analysis failed' });
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
app.use((err, req, res, next) => {
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

app.listen(PORT, () => {
  console.log(`🚀 TeamPulse Turbo server running on port ${PORT}`);
  console.log(`📝 Demo login: ${VALID_CREDENTIALS.username} / ${VALID_CREDENTIALS.password}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});