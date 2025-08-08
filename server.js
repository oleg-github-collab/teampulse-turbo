import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import session from 'express-session';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: 'teampulse-turbo-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.authenticated) {
    return next();
  } else {
    return res.redirect('/login.html');
  }
};

// Serve static files (unprotected for login.html)
app.use(express.static(join(__dirname, 'public')));

// Protect main routes
app.use('/index.html', requireAuth);
app.use('/app.js', requireAuth);
app.use('/salary-analysis.js', requireAuth);

// Login route
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // Simple auth (замініть на реальну перевірку)
  if (username === 'admin' && password === 'password123') {
    req.session.authenticated = true;
    req.session.username = username;
    res.redirect('/index.html');
  } else {
    res.redirect('/login.html?error=1');
  }
});

// Logout route
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
    }
    res.redirect('/login.html');
  });
});

// API Routes (protected)
app.post('/api/analyze', requireAuth, async (req, res) => {
  try {
    // Your analysis logic here
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    // Simulate streaming response
    res.write('data: {"chunk": "Аналіз розпочато..."}\n\n');
    setTimeout(() => {
      res.write('data: {"chunk": "\\nГотово! Результат аналізу."}\n\n');
      res.end();
    }, 1000);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

app.post('/api/salary', requireAuth, async (req, res) => {
  try {
    // Your salary analysis logic here
    const result = {
      ok: true,
      raw: JSON.stringify({
        team_summary: { total_inefficiency_percent: 25 },
        per_employee: [
          { name: "Employee 1", inefficiency_percent: 20 },
          { name: "Employee 2", inefficiency_percent: 30 }
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
  if (req.session && req.session.authenticated) {
    res.redirect('/index.html');
  } else {
    res.redirect('/login.html');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 TeamPulse Turbo server running on http://localhost:${PORT}`);
  console.log(`📝 Default login: admin / password123`);
});