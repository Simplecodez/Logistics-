import path from 'path';
import { convert } from 'html-to-text';
import nodemailer from 'nodemailer';
import pug from 'pug';
import { IEmail } from '../interfaces/email-interface';
import { IUser } from '../interfaces/user-interface';
import { IPackage } from '../interfaces/package-interface';

class Email implements IEmail {
  private from: string;

  constructor() {
    this.from = `Real Logistics <${process.env.EMAIL_FROM}>`;
    process.env.EMAIL as string;
  }

  newTransport() {
    return nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  private async initiateSend(userData: IUser, subject: string, html: string, isSender: boolean) {
    const mailOptions = {
      from: this.from,
      to: isSender ? userData.email : userData.recipientEmail,
      subject,
      html,
      text: convert(html, { wordwrap: 120 })
    };
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome(userData: IUser, subject: string, url: string) {
    const html = pug.renderFile(path.join(__dirname, `../views/email/welcome.pug`), {
      name: userData.full_name?.split(' ')[0],
      url,
      subject
    });
    await this.initiateSend(userData, subject, html, true);
  }
  async sendPackageReg(userData: IUser, packageData: IPackage, subject: string) {
    const html = pug.renderFile(path.join(__dirname, `../views/email/packageReg.pug`), {
      userName: userData.full_name?.split(' ')[0],
      packageName: packageData.package_name,
      trackingNumber: packageData.package_id,
      trackingPassword: packageData.tracking_password,
      status: packageData.status,
      pickUpAddress: packageData.pick_up_address,
      destination: packageData.destination_address,
      ETA: packageData.estimated_time_of_arrival,
      subject
    });
    await this.initiateSend(userData, subject, html, true);
  }

  async sendPackageDispatchNotificationForSender(
    userData: IUser,
    packageData: IPackage,
    subject: string,
    dispatchDate: Date
  ) {
    const html = pug.renderFile(
      path.join(__dirname, `../views/email/packageDispatchNotification.pug`),
      {
        userName: userData.full_name?.split(' ')[0],
        packageName: packageData.package_name,
        trackingNumber: packageData.package_id,
        status: packageData.status,
        ETA: packageData.estimated_time_of_arrival,
        dispatchDate,
        subject
      }
    );
    await this.initiateSend(userData, subject, html, true);
  }

  async sendPackageDispatchNotificationForRecipient(
    userData: IUser,
    packageData: IPackage,
    subject: string,
    dispatchDate: Date
  ) {
    const html = pug.renderFile(
      path.join(__dirname, `../views/email/packageDispatchNotificationForRecipient.pug`),
      {
        userName: userData.full_name?.split(' ')[0],
        packageName: packageData.package_name,
        trackingNumber: packageData.package_id,
        phoneNumber: userData.phone_number,
        status: packageData.status,
        destination: packageData.destination_address,
        ETA: packageData.estimated_time_of_arrival,
        dispatchDate,
        trackingPassword: packageData.unhashed_tracking_password,
        subject
      }
    );
    await this.initiateSend(userData, subject, html, false);
  }
}

export default Email;
