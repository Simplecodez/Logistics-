import { Response, NextFunction, Request } from 'express';
import { QueryResultRow } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { catchAsync } from '../utils/catchAsync';
import Utils from '../utils/helper';
import { registerSchema } from '../validators/user-validator';
import { IEmail } from '../interfaces/email-interface';
import { AppError } from '../utils/appError';
import { IDataSource } from '../interfaces/datasource-interface';
import { packageTrackingSchema } from '../validators/package-validator';

class AuthController {
  private userDataSource: IDataSource;
  private emailService: IEmail;

  constructor(_userDataSource: IDataSource, _emailService: IEmail) {
    this.userDataSource = _userDataSource;
    this.emailService = _emailService;
  }

  register(): (req: Request, res: Response, next: NextFunction) => void {
    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
      const { urlActivationToken, activationToken, activationTokenExpire } =
        Utils.generateActivationToken();
      const { full_name, email, phone_number, password, password_confirm } = req.body;

      const newUser = {
        full_name,
        email,
        phone_number,
        password,
        password_confirm
      };

      await registerSchema.validateAsync(newUser);

      const hashedPassword = await Utils.hashAPassword(password);

      const user: QueryResultRow = await this.userDataSource.create(
        'INSERT INTO users (full_name, email, phone_number, password, activation_token, activation_token_time, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [
          full_name,
          email,
          phone_number,
          hashedPassword,
          activationToken,
          activationTokenExpire,
          uuidv4()
        ]
      );

      const url = `${req.protocol}://${req.get('host')}/api/v1/auth/activate/${urlActivationToken}`;

      await this.emailService.sendWelcome(user[0], 'welcome', url);

      res.status(201).json({
        status: 'success',
        message: 'You have successful registered, please check you email and activate your account.'
      });
    });
  }

  activateUser(): (req: Request, res: Response, next: NextFunction) => void {
    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
      const hashedToken = Utils.hashToken(req.params.token);

      const user: any = await this.userDataSource.fetch(
        'SELECT activation_token_time, user_id, is_active FROM users WHERE activation_token = $1 AND activation_token_time > $2 LIMIT 1',
        [hashedToken, Date.now()]
      );

      if (user.length <= 0) {
        return next(new AppError('Invalid or expired token', 400));
      }

      await this.userDataSource.update(
        'UPDATE users SET is_active = $1, activation_token_time= $2, activation_token=$3 WHERE user_id = $4',
        [true, 0, '', user[0].user_id]
      );

      res.status(200).json({
        status: 'success',
        message: 'Your account has been activated successfully!'
      });
    });
  }

  signin(): (req: Request, res: Response, next: NextFunction) => void {
    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
      const { email, password } = req.body;
      if (!email || !password) {
        return next(new AppError('Please provide email and password!', 400));
      }

      const user: any = await this.userDataSource.fetch(
        'SELECT  full_name, email, user_id, password, is_active FROM users WHERE email = $1 LIMIT 1',
        [email]
      );

      if (user.length <= 0 || !(await Utils.verifyPassword(password, user[0].password))) {
        return next(new AppError('Incorrect email or password', 401));
      }

      if (!user[0].is_active) {
        return next(
          new AppError('Your account is not active yet, please verify your account.', 401)
        );
      }

      const token = Utils.createSetJWTToken(user[0].user_id, res);

      delete user[0].user_id;
      delete user[0].password;
      delete user[0].is_active;

      res.status(200).json({
        status: 'success',
        message: 'You have successfully signed in',
        user: user[0],
        token
      });
    });
  }

  protect(): (req: Request, res: Response, next: NextFunction) => void {
    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
      // 1) Getting token and check of it's there
      let jwtToken: string = '';
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        jwtToken = req.headers.authorization.split(' ')[1];
      } else if (req.cookies.jwt) {
        jwtToken = req.cookies.jwt;
      }
      if (jwtToken === '') {
        return next(new AppError('You are not signed in! Please sign in.', 401));
      }

      // 2) Verification jwtToken
      const decoded = await Utils.verifyJWTToken(jwtToken, process.env.JWT_SECRET as string);

      // 3) Check if user still exist
      const currentUser: any = await this.userDataSource.fetch(
        'SELECT  id, full_name, email, user_id, phone_number, password_changed_at, user_role FROM users WHERE user_id = $1 LIMIT 1',
        [decoded.id]
      );

      if (currentUser.length <= 0) {
        return next(
          new AppError('Sorry, your token is no longer valid, please sign in again.', 401)
        );
      }

      // 4) Check if user changed password after the token was issued
      if (Utils.changedPasswordAfter(decoded.iat, currentUser[0].password_changed_at)) {
        return next(new AppError('You recently changed password! Please log in again.', 401));
      }
      // GRANT ACCESS TO PROTECTED ROUTE
      (req as any).user = currentUser[0];
      next();
    });
  }

  restrictTo(...roles: string[]): (req: Request, res: Response, next: NextFunction) => void {
    return (req, res, next) => {
      // roles ['admin', 'dispatch_rider']. role='user'
      if (!roles.includes((req as any).user.user_role)) {
        return next(new AppError('You do not have permission to perform this action.', 403));
      }
      next();
    };
  }

  protectPackageTracking(): (req: Request, res: Response, next: NextFunction) => void {
    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
      await packageTrackingSchema.validateAsync(req.body);
      // Check if a tracking ID exist
      if (!req.body.package_id) {
        return next(new AppError('Please provide a package tracking ID', 400));
      }
      // Check if there is a tracking password for authentication
      if (req.body.tracking_password) {
        return next();
      }
      // 1) Getting token and check of it's there
      let jwtToken: string = '';
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        jwtToken = req.headers.authorization.split(' ')[1];
      } else if (req.cookies.jwt) {
        jwtToken = req.cookies.jwt;
      }
      // If no token, require a tracking password
      if (jwtToken === '') {
        return next(
          new AppError(
            'Provide a tracking password. If you are a receiver, kind contack the sender for a tracking password.',
            401
          )
        );
      }
      // 2) if token, Verification jwtToken
      const decoded = await Utils.verifyJWTToken(jwtToken, process.env.JWT_SECRET as string);

      // // 3) Check if user still exist
      const currentUser: any = await this.userDataSource.fetch(
        'SELECT  id, full_name, email, user_id, phone_number, password_changed_at, user_role FROM users WHERE user_id = $1 LIMIT 1',
        [decoded.id]
      );

      if (currentUser.length <= 0) {
        return next(
          new AppError(
            'Sorry, your token is no longer valid, please sign in again or provide a tracking password.',
            401
          )
        );
      }

      if (Utils.changedPasswordAfter(decoded.iat, currentUser[0].password_changed_at)) {
        return next(
          new AppError(
            'You recently changed password! Please log in again or provide a tracking password.',
            401
          )
        );
      }
      (req as any).user = currentUser[0];
      next();
    });
  }
}
export default AuthController;
