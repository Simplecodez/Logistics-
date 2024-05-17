import express, { Router } from 'express';
import DataSource from '../datasources/datasource';
import PackageController from '../controllers/package/package-controller';
import { authController } from './auth-router';
import Email from '../services/email-services';
import PackageTrackingController from '../controllers/package/package-tracking-controller';
import db from '../configs/dbConfig';

const datasource = new DataSource(db);
const email = new Email();
const packageController = new PackageController(datasource, email);
const packageTrackingController = new PackageTrackingController(datasource, email);

class PackageRouter {
  private router: Router;
  constructor() {
    this.router = express.Router();
    this.initialize();
  }

  private initialize() {
    this.router.post('/register', authController.protect(), packageController.register());
    this.router.post(
      '/update-status/:packageId',
      authController.protect(),
      authController.restrictTo('dispatch_rider', 'admin'),
      packageController.updateStatus()
    );
    // The track route retrieves the status of the package,
    // the estimated time of arrival which is continously updated as the rider moves.
    // The exact location coordinates of the rider is sent to the server from the client and that is used to calculate and update the ETA.
    // Before the location is updated on the DB, the previous location and the current location are compared, and the coordinations are updated
    // on the DB if the distance is or above 30 meters. This can be increased or decreased as required. This was done as a resource saving approach.
    // Also the time stamp of the status update is retrieved.
    // For Live feed on the rider's location, the client can connect to the server with the package ID. As the rider moves, the location is transmitted
    // via websockets to user. Both the rider and user are to connect using the package ID.
    this.router.post(
      '/track',
      authController.protectPackageTracking(),
      packageTrackingController.trackPackage()
    );
    this.router.get(
      '/',
      authController.protect(),
      authController.restrictTo('admin'),
      packageController.getAll()
    );

    this.router.get(
      '/:packageId',
      authController.protect(),
      authController.restrictTo('admin'),
      packageController.getOne()
    );

    this.router.get('/my-packages', authController.protect(), packageController.getOne());
  }

  getRouter(): Router {
    return this.router;
  }
}

const packageRouter = new PackageRouter();

export default packageRouter.getRouter();
