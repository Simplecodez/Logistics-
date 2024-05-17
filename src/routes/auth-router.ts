import express, { Router } from 'express';
import DataSource from '../datasources/datasource';
import AuthController from '../controllers/auth-controller';
import Email from '../services/email-services';
import db from '../configs/dbConfig';

const userDataSource = new DataSource(db);
const email = new Email();
export const authController = new AuthController(userDataSource, email);

class AuthRouter {
  private router: Router;
  constructor() {
    this.router = express.Router();
    this.initialize();
  }

  private initialize() {
    this.router.post('/register', authController.register());
    this.router.get('/activate/:token', authController.activateUser());
    this.router.post('/signin', authController.signin());
  }
  getRouter(): Router {
    return this.router;
  }
}

const authRouter = new AuthRouter();

export default authRouter.getRouter();
