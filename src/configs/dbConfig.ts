import { Pool } from 'pg';
import { IDatabaseConnection } from '../interfaces/db-interface';

class PostgresConnection implements IDatabaseConnection {
  private db: Pool;

  constructor() {
    this.db = new Pool({
      connectionString: process.env.POSTGRESQL_CONNECTION_URI,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }

  async query(sql: string, params?: any[]): Promise<any> {
    const result = await this.db.query(sql, params);
    return result.rows;
  }
}

const db = new PostgresConnection();

export default db;
