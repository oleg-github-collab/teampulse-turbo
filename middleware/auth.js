const logger = require('../utils/logger');

module.exports = function authMiddleware(req, res, next) {
  try {
    const isLoggedIn = req.cookies.loggedIn === "true";
    
    // Публічні шляхи
    const publicPaths = [
      '/login',
      '/health',
      '/api/auth'
    ];
    
    const isPublicPath = publicPaths.some(path => req.path.startsWith(path));
    const isStaticFile = /\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i.test(req.path);
    
    if (isPublicPath || isStaticFile) {
      return next();
    }
    
    if (!isLoggedIn) {
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Необхідна авторизація' });
      }
      return res.redirect('/login');
    }
    
    next();
  } catch (error) {
    logger.error('Помилка в middleware авторизації', { error: error.message, path: req.path });
    res.status(500).json({ error: 'Помилка сервера' });
  }
};