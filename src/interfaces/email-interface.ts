import { IPackage } from './package-interface';
import { IUser } from './user-interface';

export interface IEmail {
  newTransport(): void;
  sendWelcome(userData: IUser, subject: string, url: string): Promise<void>;
  sendPackageReg(userData: IUser, packageData: IPackage, subject: string): Promise<void>;
  sendPackageDispatchNotificationForSender(
    userData: IUser,
    packageData: IPackage,
    subject: string,
    dispatchDate: Date
  ): Promise<void>;
  sendPackageDispatchNotificationForRecipient(
    userData: IUser,
    packageData: IPackage,
    subject: string,
    dispatchDate: Date
  ): Promise<void>;
}
