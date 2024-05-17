import { NextFunction } from 'express';
import { clean } from './xss-clean';
/**
 * export middleware
 * @return {function} Middleware function
 */
export const xssClean = (req: any, res: Response, next: NextFunction) => {
  if (req.body) req.body = clean(req.body);
  if (req.query) req.query = clean(req.query);
  if (req.params) req.params = clean(req.params);
  next();
};
