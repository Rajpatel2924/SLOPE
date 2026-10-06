export function httpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.expose = true;
  return error;
}
