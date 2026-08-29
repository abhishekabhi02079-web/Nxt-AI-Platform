const env = require('../config/env');

/**
 * 404 Not Found Handler
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Not Found - ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Global Error Handler
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || (res.statusCode === 200 ? 500 : res.statusCode);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    code: err.code || undefined,
    errors: err.errors || undefined,
    stack: env.NODE_ENV === 'production' ? undefined : err.stack,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
