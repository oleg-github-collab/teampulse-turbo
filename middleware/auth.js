import logger from '../utils/logger.js';

export default function authMiddleware(req, res, next) {
  try {
    // Публічні шляхи (не потребують автентифікації)
    const publicPaths = [
      '/login.html',
      '/login',
      '/health'
    ];
    
    const isPublicPath = publicPaths.some(path => req.path.startsWith(path));
    const isStaticFile = /\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i.test(req.path);
    
    // Дозволити доступ до публічних шляхів та статичних файлів
    if (isPublicPath || isStaticFile) {
      return next();
    }
    
    // Перевірити автентифікацію
    const isAuthenticated = req.session && req.session.authenticated === true;
    
    if (!isAuthenticated) {
      // Для API запитів повертати 401
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Необхідна авторизація' });
      }
      // Для веб запитів перенаправляти на логін
      return res.redirect('/login.html');
    }
    
    next();
  } catch (error) {
    logger.error('Помилка в middleware авторизації', { 
      error: error.message, 
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    res.status(500).json({ error: 'Помилка сервера' });
  }
}