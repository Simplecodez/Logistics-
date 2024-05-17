import { AxiosResponse } from 'axios';
import { QueryResultRow } from 'pg';

export interface IPackage extends QueryResultRow {
  id: number;
  package_id?: string;
  package_name?: string;
  receiver_email?: string;
  receiver_phone_number?: string;
  user_ref?: number;
  tracking_password?: string;
  password?: string;
  status?: string;
  status_time_stamp?: Date;
  delivery_fee?: number;
  pick_up_date?: Date;
  estimated_time_of_arrival?: Date;
  pick_up_location?: number[];
  exact_location?: number[];
  exact_location_coordinates?: object;
  destination?: number[];
  destination_address?: string;
  pick_up_address?: string;
  unhashed_tracking_password?: string;
}

export interface IGeoData extends AxiosResponse {
  destination_addresses?: string[];
  origin_addresses?: string[];
  rows: geoelement[];
}

type geoelement = {
  element: [
    {
      distance: {
        text: string;
        value: number;
      };
      duration: {
        text: string;
        value: number;
      };
      status: string;
    }
  ];
};
