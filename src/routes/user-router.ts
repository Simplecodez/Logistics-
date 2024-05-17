import express, { Router } from 'express';
import { authController } from './auth-router';
import UserController from '../controllers/user-controller';
import UserDataSource from '../datasources/datasource';
import db from '../configs/dbConfig';

const userDataSource = new UserDataSource(db);
const userController = new UserController(userDataSource);

class UserRouter {
  private router: Router;
  constructor() {
    this.router = express.Router();
    this.initialize();
  }

  private initialize() {
    this.router.get('/me', authController.protect(), userController.getMe());
    this.router.post('/update-password', authController.protect(), userController.updatePassword());
    return this.router;
  }

  getRouter(): Router {
    return this.router;
  }
}
const userRouter = new UserRouter();

export default userRouter.getRouter();
