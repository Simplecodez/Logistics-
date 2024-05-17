import { Response, NextFunction, Request } from 'express';
import { AppError } from '../utils/appError';
import { catchAsync } from '../utils/catchAsync';
import Utils from '../utils/helper';
import { updatePasswordSchema } from '../validators/user-validator';
import { IDataSource } from '../interfaces/datasource-interface';
import { QueryResultRow } from 'pg';

class UserController {
  private userDataSource: IDataSource;

  constructor(_userDataSource: IDataSource) {
    this.userDataSource = _userDataSource;
  }

  getMe(): (req: Request, res: Response, next: NextFunction) => void {
    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
      delete (req as any).user.user_role;
      res.status(200).json({
        status: 'success',
        user: (req as any).user
      });
    });
  }

  updatePassword(): (req: Request, res: Response, next: NextFunction) => void {
    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
      const { password_current, password } = req.body;

      await updatePasswordSchema.validateAsync({ password, password_current });
      // 1) Get user from collection
      const user: QueryResultRow = await this.userDataSource.fetch(
        'SELECT password FROM users WHERE user_id = $1 LIMIT 1',
        [(req as any).user.user_id]
      );

      // 2) Check if POSTed current password is correct
      if (!(await Utils.verifyPassword(password_current, user[0].password)))
        return next(new AppError('Your current password is wrong.', 401));

      const hashedPassword = await Utils.hashAPassword(password);

      // 3) If so, update password
      await this.userDataSource.update(
        'UPDATE users SET password = $1, password_changed_at = $2 WHERE user_id = $3',
        [hashedPassword, Date.now() - 1000, (req as any).user.user_id]
      );

      Utils.createSetJWTToken((req as any).user.user_id, res);

      res.status(200).json({
        status: 'success',
        message: 'Password Updated successfully'
      });
    });
  }
}

export default UserController;
