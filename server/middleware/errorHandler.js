export function notFoundHandler(req, res, next) {
  const error = new Error(`Route ${req.method} ${req.originalUrl} not found.`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  const suppliedStatus = error.statusCode || error.status;
  const statusCode = Number.isInteger(suppliedStatus)
    && suppliedStatus >= 400 && suppliedStatus <= 599 ? suppliedStatus : 500;
  const isServerError = statusCode >= 500;
  let message = isServerError && error.expose !== true
    ? 'Internal server error.'
    : error.message || 'Internal server error.';
  const details = !isServerError && Array.isArray(error.details) ? error.details : [];

  if (error.type === 'entity.parse.failed') message = 'Invalid JSON body.';
  if (error.type === 'entity.too.large') message = 'Request body exceeds the 10kb limit.';

  if (isServerError) {
    console.error(`API request failed: ${req.method} ${req.path} (${statusCode}).`);
  }

  return res.status(statusCode).json({
    error: {
      message,
      details,
    },
  });
}
