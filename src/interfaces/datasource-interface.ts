import { IPackage } from './package-interface';
import { IUser } from './user-interface';

export interface IDataSource {
  fetch(query: string, params?: any[]): Promise<IUser | IPackage | []>;
  create(query: string, params: any[]): Promise<IUser | IPackage>;
  update(query: string, params: any[]): Promise<void>;
}
