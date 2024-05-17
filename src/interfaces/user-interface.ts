import { QueryResultRow } from 'pg';

export interface IUser extends QueryResultRow {
  id: number;
  user_id?: string;
  full_name?: string;
  email?: string;
  phone_number?: string;
  password?: string;
  is_active?: boolean;
  create_at?: Date;
  activation_token?: string;
  user_role?: string;
  password_changed_at:Date
  activation_token_time?: Date;
}
