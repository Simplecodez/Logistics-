import { AppError } from '../utils/appError';
import { NextFunction, Request, Response } from 'express';

const handleJWTError = (): AppError => new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = (): AppError =>
  new AppError('Your token has expired! Please log in again.', 401);

const handleValidationError = (err: any): AppError => {
  const fieldsToBeValidated = ['full_name', 'email', 'phone_number', 'password'];
  let message = err.message;
  const formattedError = new AppError(message, 400);
  return formattedError;
};

const handleDuplicateDB = (err: any): AppError => {
  let message: string = '';
  if (err.constraint === 'users_email_key')
    message = `Email already exists, please use another one.`;
  else if (err.constraint === 'users_phone_number_key')
    message = 'Phone number already exist, please use another one.';

  return new AppError(message, 400);
};

const handleInvalidInputDB = (err: any): AppError => {
  const message = 'Invalid parameter or query string. Please check and try again.';
  return new AppError(message, 400);
};

const sendError = (err: AppError, req: Request, res: Response) => {
  // console.error('error', err);
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }

  // Log the error
  console.error('error', err);
  // Send generic message.
  return res.status(500).json({
    status: 'error',
    message: err
  });
};

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  let error = err;
  if (error.name === 'JsonWebTokenError') error = handleJWTError();
  if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
  if (error.code === '23505') error = handleDuplicateDB(error);
  if (error.code === '22P02') error = handleInvalidInputDB(error);
  if (error.name === 'ValidationError' && error.isJoi) error = handleValidationError(error);
  sendError(error, req, res);
};

export default errorHandler;
