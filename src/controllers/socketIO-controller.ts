import { Socket } from 'socket.io';
import cacheServiceInstance from '../services/cache-services';
import Utils from '../utils/helper';
import { IGeoData } from '../interfaces/package-interface';
import DataSource from '../datasources/datasource';
import { io } from '../app';
import { AppError } from '../utils/appError';
import db from '../configs/dbConfig';

const dataSource = new DataSource(db);

const socketIOHandler = (socket: Socket) => {
  // connect for rider
  if ((socket.id as any).user_role === 'dispatch_rider') {
    socket.on('rider_location', async (data): Promise<any> => {
      try {
        if (cacheServiceInstance.has(data.package_id)) {
          const { package_id, new_location } = data;
          // reformat rider's current location to JSONB
          const riderCurrentLocation = {
            lat: new_location[0],
            lng: new_location[1]
          };
          // Retrieve previous latest location from cache
          const initialPointLat = cacheServiceInstance.get(package_id).lat;
          const initialPointLng = cacheServiceInstance.get(package_id).lng;
          // Calculate the distance and time remaining to destination
          const getDistanceAndETA: IGeoData = await Utils.getDistanceTimeBetweenTwoLocation(
            [initialPointLat, initialPointLng],
            [riderCurrentLocation.lat, riderCurrentLocation.lng]
          );
          // get the ETA
          if (getDistanceAndETA.data.rows[0].elements[0].status !== 'ZERO_RESULTS') {
            const ETA = getDistanceAndETA.data.rows[0].elements[0].duration.text;
            // get the distance
            const distance = getDistanceAndETA.data.rows[0].elements[0].distance.value;
            // update the exact_location_coordinates and other columns  if the distance between the previous location
            // and the current location is equal to or more than 30 metres
            // The is to reduce the cost of frequent updates
            // It is equivalent to using a timer or CronJob but more efficient I think
            if (distance >= 30) {
              await dataSource.update(
                'UPDATE packages SET exact_location_coordinates = $1, status_time_stamp = $2, estimated_time_of_arrival = $3, status = $4 WHERE package_id = $5',
                [riderCurrentLocation, Date.now(), ETA, 'In Transit', package_id]
              );
            }
            // update the cache with the current location of the rider
            cacheServiceInstance.set(package_id, riderCurrentLocation);
            // finally send the rider location to the sender or receiver who is connected.
            io.to(package_id).emit('rider_location_update', new_location);
          } else {
            // If location does not exist, throw an error to be sent to the rider to adjust he or her device.
            throw new AppError('Location does not exist, please recaliberate your device.', 400);
          }
        } else {
          //
          throw new AppError('Package not found to communicate location.', 400);
        }
      } catch (error: any) {
        socket.join((socket.id as any).user_id);
        io.to((socket.id as any).user_id).emit('error_event', error.message);
      }
    });
  }
  // connect for user
  if ((socket.id as any).user_role === 'user') {
    socket.on('subscribe_package_location', (data: any) => {
      const { package_id } = data;
      // connects user to the package room
      console.log(package_id);
      if (cacheServiceInstance.has(package_id)) {
        // if the package id does not exist
        socket.join(package_id);
        console.log('Connected to room: ' + package_id);
        return;
      }
      socket.join(package_id);
      io.to(package_id).emit('error_event', 'Package not found to communicate location.');
      return;
    });
    socket.on('unsubscribe_package_location', (data) => {
      // disconnects user from the package room so the
      socket.leave(data.package_id);
    });
  }
};

export const socketIOAuth = async (socket: Socket, next: any) => {
  if (socket.handshake.headers.auth) {
    const { auth } = socket.handshake.headers;
    await Utils.verifyUserAccessTokenWhenConnectingToWebSockets(
      auth as string,
      next,
      dataSource,
      socket
    );
  } else {
    next(new AppError('Authentication error, Please provide a token', 401));
  }
};

export default socketIOHandler;
