import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { IDataSource } from '../../interfaces/datasource-interface';
import { catchAsync } from '../../utils/catchAsync';
import { registerSchema } from '../../validators/package-validator';
import Utils from '../../utils/helper';
import { IGeoData, IPackage } from '../../interfaces/package-interface';
import { fetchQuery, fetchQueryNext, insertQuery } from '../../utils/query-helper';
import { IEmail } from '../../interfaces/email-interface';
import { QueryResultRow } from 'pg';
import { AppError } from '../../utils/appError';
import cacheServiceInstance from '../../services/cache-services';

class PackageController {
  private packageDataSource: IDataSource;
  private email: IEmail;

  constructor(_packageDataSource: IDataSource, _email: IEmail) {
    this.packageDataSource = _packageDataSource;
    this.email = _email;
  }

  register(): (req: Request, res: Response, next: NextFunction) => void {
    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
      const {
        package_name,
        receiver_email,
        receiver_phone_number,
        pick_up_date,
        description,
        pickup_location_coordinates, // should be in this format [lat,lng]
        pick_up_address,
        destination_coordinates, // should be in this format [lat,lng]
        destination_address
      } = req.body;

      const newPackageDetails = {
        package_name,
        receiver_email,
        receiver_phone_number,
        pick_up_date,
        pickup_location_coordinates,
        pick_up_address,
        destination_coordinates,
        destination_address,
        description
      };

      await registerSchema.validateAsync(newPackageDetails);

      //   Generate a password for the receiver of the package so they can also track the package.
      const trackingPasswordForReceiver = Utils.generateRandomPassword(12);
      const hashedPassword = await Utils.hashAPassword(trackingPasswordForReceiver);

      const pickupLocationCoordinates = {
        lat: pickup_location_coordinates[0],
        lng: pickup_location_coordinates[1]
      };
      const destinationCoordinates = {
        lat: destination_coordinates[0],
        lng: destination_coordinates[1]
      };
      const pickupAddress = `${pick_up_address.street} ${pick_up_address.city} ${pick_up_address.state}`;
      const destinationAddress = `${destination_address.street} ${destination_address.city} ${destination_address.state}`;

      const getDistanceAndETA: IGeoData = await Utils.getDistanceTimeBetweenTwoLocation(
        pickup_location_coordinates,
        destination_coordinates
      );

      const ETA = getDistanceAndETA.data.rows[0].elements[0].duration.text;
      const package_id = uuidv4();
      const newPackage: IPackage = await this.packageDataSource.create(insertQuery, [
        package_id,
        package_name,
        receiver_email,
        receiver_phone_number,
        (req as any).user.user_id,
        hashedPassword,
        'Registered/Not received',
        Date.now(),
        2000,
        pick_up_date,
        ETA,
        pickupLocationCoordinates,
        pickupLocationCoordinates,
        destinationCoordinates,
        destinationAddress,
        pickupAddress,
        trackingPasswordForReceiver,
        description
      ]);

      cacheServiceInstance.set(package_id, pickupLocationCoordinates);

      const newPackageWithUnhashedTrackingPassword = {
        ...newPackage[0],
        tracking_password: trackingPasswordForReceiver
      };
      await this.email.sendPackageReg(
        (req as any).user,
        newPackageWithUnhashedTrackingPassword,
        'Package registered'
      );

      res.status(200).json({
        status: 'success',
        package: newPackage
      });
    });
  }

  getAll(): (req: Request, res: Response, next: NextFunction) => void {
    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
      const packages = await this.packageDataSource.fetch(`SELECT * FROM packages`);
      res.status(200).json({
        status: 'success',
        packages
      });
    });
  }

  getOne(): (req: Request, res: Response, next: NextFunction) => void {
    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
      console.log(req.params.packageId);
      const retrievedPackage = await this.packageDataSource.fetch(
        'SELECT * FROM packages WHERE package_id = $1',
        [req.params.packageId]
      );
      res.status(200).json({
        status: 'success',
        package: retrievedPackage
      });
    });
  }

  getMyPackages(): (req: Request, res: Response, next: NextFunction) => void {
    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
      const retrievedPackage = await this.packageDataSource.fetch(
        'SELECT * FROM packages WHERE user_ref = $1 AND status != $2',
        [(req as any).user._user_id, 'Delivered']
      );
      res.status(200).json({
        status: 'success',
        packages: retrievedPackage
      });
    });
  }

  updateStatus(): (req: Request, res: Response, next: NextFunction) => void {
    return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
      const allowedStatus = [
        'Received/Processing',
        'In Transit',
        'Delivered',
        'Returned',
        'Delayed',
        'Undeliverable'
      ];

      const allowedStatusForRider = ['Received/Processing', 'In Transit'];
      if (!req.query.status) {
        return next(new AppError('Please provide status to update!', 403));
      }

      if (!allowedStatus.includes(req.query.status as string)) {
        return next(
          new AppError(
            `Invalid status. Can be only be any of this:  'Registered/Not received',
        'Received/Processing',
        'In Transit',
        'Delivered',
        'Returned',
        'Delayed',
        'Undeliverable`,
            400
          )
        );
      }

      if (
        (req as any).user.user_role === 'dispatch_rider' &&
        !allowedStatusForRider.includes(req.query.status as string)
      ) {
        return next(new AppError('You are not authorised for that action!', 403));
      }

      const retrievedPackage: QueryResultRow = await this.packageDataSource.fetch(fetchQuery, [
        req.params.packageId
      ]);

      if (retrievedPackage.length <= 0) {
        return next(new AppError('No package with the provided id.', 404));
      }

      //   check if the user is a rider assigned to pick up the package for delivery, if yes add him to the package rider column.
      const isDispatchRiderAndStatusIsReceivedProcessing =
        (req as any).user.user_role === 'dispatch_rider' &&
        req.query.status === 'Received/Processing';
      const updateQuery = isDispatchRiderAndStatusIsReceivedProcessing
        ? `UPDATE packages SET status = $1, status_time_stamp = $2, rider_ref = $3 WHERE package_id = $4`
        : `UPDATE packages SET status = $1, status_time_stamp = $2 WHERE package_id = $3`;
      const queryParams = isDispatchRiderAndStatusIsReceivedProcessing
        ? [req.query.status, Date.now(), (req as any).user.user_id, req.params.packageId]
        : [req.query.status, Date.now(), req.params.packageId];

      await this.packageDataSource.update(updateQuery, queryParams);

      retrievedPackage[0].user_ref.recipientEmail = retrievedPackage[0].receiver_email;

      await Promise.all([
        this.email.sendPackageDispatchNotificationForSender(
          retrievedPackage[0].user_ref,
          retrievedPackage[0],
          'Package Dispatched',
          new Date(Date.now() + 10 * 60 * 1000)
        ),
        this.email.sendPackageDispatchNotificationForRecipient(
          retrievedPackage[0].user_ref,
          retrievedPackage[0],
          'Package Dispatched',
          new Date(Date.now() + 10 * 60 * 1000)
        )
      ]);

      res.status(200).json({
        status: 'success',
        message: 'Package status has been updated successfully.'
      });
    });
  }
}

export default PackageController;
