# Railway Deployment Guide for TeamPulse Turbo

## Overview
This project is now fully configured for Railway deployment with proper error handling, environment variable management, and demo mode functionality.

## Key Fixes Applied

### 1. Server Configuration
- ✅ Added proper CORS configuration for Railway domains
- ✅ Fixed import/export statements throughout the codebase
- ✅ Added missing route imports in `server.js`
- ✅ Implemented graceful OpenAI API key handling (demo mode when missing)
- ✅ Fixed login-first routing (redirects to `/login.html` on root)

### 2. API Endpoints
- ✅ Added missing `/api/salary-employee` endpoint
- ✅ Added missing `/api/salary-text` endpoint  
- ✅ Fixed route mounting for analyze and salary routes
- ✅ Implemented demo data when OpenAI API is unavailable

### 3. Environment Variables
- ✅ Created `.env.example` with all required variables
- ✅ Added environment validation with fallbacks
- ✅ Configurable demo credentials via env vars

### 4. Railway Configuration Files
- ✅ `railway.json` - Railway service configuration
- ✅ `nixpacks.toml` - Build configuration for Nixpacks
- ✅ Updated `package.json` with proper scripts and engine requirements

### 5. Error Handling & Linting
- ✅ Fixed ESLint configuration for browser globals
- ✅ Resolved unused variable warnings
- ✅ Added proper error boundaries for missing dependencies

## Deployment Steps

### 1. Railway Setup
1. Connect your GitHub repository to Railway
2. Create a new Railway project
3. Connect to your repository

### 2. Environment Variables
Set these in Railway dashboard:
```
NODE_ENV=production
OPENAI_API_KEY=your_openai_api_key_here (optional - demo works without)
DEMO_USERNAME=admin (optional - defaults to 'admin')
DEMO_PASSWORD=password123 (optional - defaults to 'password123')
```

### 3. Build Configuration
Railway will automatically:
- Use Node.js 18+ (specified in `package.json`)
- Run `npm install` and `npm run build`
- Start server with `npm start`
- Health check via `/health` endpoint

## Demo Mode Features
When OPENAI_API_KEY is not provided:
- ✅ Negotiation analysis returns structured demo results
- ✅ Salary analysis generates random but realistic data
- ✅ Employee analysis provides mock market data
- ✅ All UI features remain functional

## Authentication
- Default login: `admin` / `password123`
- Redirects unauthenticated users to login page
- Can be customized via environment variables

## Health Check
- Available at `/health`
- Returns server status, uptime, and version
- Used by Railway for service monitoring

## File Structure
```
├── server.js              # Main server file with all routes
├── routes/
│   ├── analyze.js         # Negotiation analysis (with demo mode)
│   └── salary.js          # Salary analysis (with demo mode)  
├── public/
│   ├── login.html         # Login page (shown first)
│   ├── index.html         # Main application
│   ├── app.js             # Frontend logic
│   └── salary-analysis.js # Salary analysis frontend
├── utils/                 # Utility functions
├── middleware/            # Express middleware
├── railway.json           # Railway configuration
├── nixpacks.toml          # Build configuration
└── .env.example           # Environment template
```

## Production Notes
- Server binds to `0.0.0.0:$PORT` for Railway compatibility
- CORS configured for Railway domains (`*.railway.app`)
- Helmet security middleware with Railway-compatible settings
- 50MB request limit for file uploads
- Graceful shutdown handling for Railway deployments

## Troubleshooting
1. **Build fails**: Check Node.js version (requires 18+)
2. **Routes not working**: Verify all imports in `server.js`
3. **CORS errors**: Check Railway domain in CORS config
4. **API not working**: Demo mode activates when OpenAI key missing

The project is now fully ready for Railway deployment! 🚀