import { IDatabaseConnection } from '../interfaces/db-interface';
import { IPackage } from '../interfaces/package-interface';
import { IUser } from '../interfaces/user-interface';
import { IDataSource } from '../interfaces/datasource-interface';

class DataSource implements IDataSource {
  private db: IDatabaseConnection;
  constructor(db: IDatabaseConnection) {
    this.db = db;
  }
  async create(query: string, params: any[]): Promise<IUser | IPackage> {
    return await this.db.query(query, params);
  }

  async fetch(query: string, params?: any[]): Promise<IUser | IPackage | []> {
    return await this.db.query(query, params);
  }

  async update(query: string, params: any[]): Promise<void> {
    await this.db.query(query, params);
  }
}

export default DataSource;
