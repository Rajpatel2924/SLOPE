export function validate(schema, location = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[location]);

    if (!result.success) {
      const error = new Error('Validation failed.');
      error.statusCode = 400;
      error.details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      return next(error);
    }

    if (location === 'query') {
      // Express 5 recomputes this getter; shadow it with the validated data.
      Object.defineProperty(req, 'query', {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    } else {
      req[location] = result.data;
    }

    return next();
  };
}
