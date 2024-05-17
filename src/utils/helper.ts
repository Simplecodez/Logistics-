import crypto from 'crypto';
import bcrypt from 'bcryptjs';

import jwt from 'jsonwebtoken';
import { Response } from 'express';
import axios, { AxiosResponse } from 'axios';
import { IGeoData } from '../interfaces/package-interface';
import { IDataSource } from '../interfaces/datasource-interface';
import { AppError } from './appError';
import { Socket } from 'socket.io';

class Utils {
  private static signToken(id: string, expiresin: string) {
    return jwt.sign({ id }, process.env.JWT_SECRET as string, {
      expiresIn: expiresin
    });
  }

  static createSetJWTToken(userID: string, res: Response): string {
    const token = Utils.signToken(userID, process.env.JWT_EXPIRES_IN as string);
    res.cookie('jwt', token, {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none'
    });
    return token;
  }

  static generateActivationToken(): {
    urlActivationToken: string;
    activationToken: string;
    activationTokenExpire: number;
  } {
    const urlActivationToken = crypto.randomBytes(32).toString('hex');
    const activationToken = crypto.createHash('sha256').update(urlActivationToken).digest('hex');
    const activationTokenExpire = Date.now() + 40 * 60 * 1000;

    return { urlActivationToken, activationToken, activationTokenExpire };
  }

  static generateRandomPassword(length: number) {
    const bytes = crypto.randomBytes(length / 2);
    return bytes.toString('hex');
  }

  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static async hashAPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  static async verifyPassword(candidatePassword: string, userPassword: string): Promise<boolean> {
    return await bcrypt.compare(candidatePassword, userPassword);
  }

  static verifyJWTToken(token: string, secret: string): Promise<any> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, secret, (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded);
        }
      });
    });
  }

  static changedPasswordAfter(JWTTimestamp: number, passwordChangedAt: number): boolean {
    if (passwordChangedAt) {
      const changedTimestamp = passwordChangedAt / 1000;
      return JWTTimestamp < changedTimestamp;
    }
    // False means NOT changed
    return false;
  }

  static async getDistanceTimeBetweenTwoLocation(
    origin: number[],
    destination: number[]
  ): Promise<IGeoData> {
    const config = {
      method: 'get',
      url: `${process.env.GEOLOCATION_API}?origins=${origin[0]},${origin[1]}&destinations=${destination[0]},${destination[1]}&key=${process.env.GEOLOCATION_API_KEY}`,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    return await axios(config);
  }

  static async verifyUserAccessTokenWhenConnectingToWebSockets(
    token: string,
    next: Function,
    dataSource: IDataSource,
    socket: any
  ) {
    try {
      const decoded = await Utils.verifyJWTToken(token, process.env.JWT_SECRET as string);
      const currentUser: any = await dataSource.fetch(
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
      socket.id = currentUser[0];
      next();
    } catch (err) {
      next(err);
    }
  }
}

export default Utils;
