import 'reflect-metadata';
import express, { Express, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth-router';
import userRouter from './routes/user-router';
import packageRouter from './routes/package-router';
import errorHandler from './controllers/error-controller';
import { AppError } from './utils/appError';
import { Server } from 'socket.io';
import { createServer } from 'http';
import cors from 'cors';
import compression from 'compression';
import socketIOHandler, { socketIOAuth } from './controllers/socketIO-controller';
import { xssClean } from './utils/index';

const app: Express = express();

// const allowedOrigins = [];
// const corsOptions = {
//   origin: allowedOrigins,
//   credentials: true
// };

// Security middleware.
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());
app.use(xssClean as any);
app.use(compression());

app.get('/', (req: Request, res: Response) => {
  res.send(`Welcome to ${process.env.APP_NAME}`);
});
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/user', userRouter);
app.use('/api/v1/package', packageRouter);
app.use('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

// Global Express Error handler
app.use(errorHandler);
// For production, the server will be created via the https protocol to prevent
// eavedropping or data tempering.
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
io.use(socketIOAuth);
io.on('connection', socketIOHandler);

export { httpServer, io };
