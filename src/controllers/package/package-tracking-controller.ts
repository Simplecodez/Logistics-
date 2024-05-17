import { IDataSource } from '../../interfaces/datasource-interface';
import { IEmail } from '../../interfaces/email-interface';
import { NextFunction, Request, Response } from 'express';
import { catchAsync } from '../../utils/catchAsync';
import { QueryResultRow } from 'pg';
import { AppError } from '../../utils/appError';
import Utils from '../../utils/helper';

class PackageTrackingController {
  private packageDataSources: IDataSource;
  constructor(_packageDataSource: IDataSource, _email: IEmail) {
    this.packageDataSources = _packageDataSource;
  }

  trackPackage(): (req: Request, res: Response, next: NextFunction) => void {
    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
      const { package_id, tracking_password } = req.body;

      const retrievedPackage: QueryResultRow = await this.packageDataSources.fetch(
        `SELECT package_id, 
            package_name, 
            receiver_email,
            receiver_phone_number,
            status,
            tracking_password,
            status_time_stamp,
            delivery_fee,
            pick_up_date, 
            estimated_time_of_arrival,
            destination_address,
            user_ref,
            description,
            pick_up_address FROM packages WHERE package_id = $1 LIMIT 1`,
        [package_id]
      );

      //   Check if any record was found
      if (retrievedPackage.length <= 0) {
        return next(
          new AppError(
            'Package not found in our records. Please check the package ID and try again.',
            404
          )
        );
      }

      // If password in provided, check if the password provided matched the tracking password
      if (
        tracking_password &&
        !(await Utils.verifyPassword(tracking_password, retrievedPackage[0].tracking_password))
      ) {
        return next(new AppError('Incorrect tracking password or package ID', 401));
      }
      // if no password provided, meaning we are authenticating using the session token or bearer token,
      // check if the person tracking is the sender of the package

      if (!tracking_password && (req as any).user.user_id !== retrievedPackage[0].user_ref) {
        return next(
          new AppError(
            'You are not authorized for this action. Please sign in or provide a valid password.',
            401
          )
        );
      }

      const { package_name, status, status_time_stamp, estimated_time_of_arrival, description } =
        retrievedPackage[0];

      res.status(200).json({
        status: 'success',
        packageTrackingData: {
          package_id: retrievedPackage[0].package_id,
          package_name,
          description,
          status,
          timeSinceLastUpdate: new Date(+status_time_stamp),
          estimated_time_of_arrival
        }
      });
    });
  }
}

export default PackageTrackingController;
