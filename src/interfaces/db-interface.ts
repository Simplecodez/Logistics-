export interface IDatabaseConnection {
  query(sql: string, params?: any[]): Promise<any>;
}
