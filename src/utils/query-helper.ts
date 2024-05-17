export const insertQuery = `
INSERT INTO packages (
  package_id,
  package_name,
  receiver_email,
  receiver_phone_number,
  user_ref,
  tracking_password,
  status,
  status_time_stamp,
  delivery_fee,
  pick_up_date,
  estimated_time_of_arrival,
  pickup_location_coordinates,
  exact_location_coordinates,
  destination_coordinates,
  destination_address,
  pick_up_address,
  unhashed_tracking_password,
  description
) VALUES (
  $1,    
  $2,     
  $3,     
  $4,    
  $5,     
  $6,     
  $7,    
  $8,     
  $9,     
  $10,    
  $11,      
  $12,      
  $13,    
  $14,
  $15,
  $16, 
  $17,
  $18    
) RETURNING 
package_id, 
package_name, 
description,
receiver_email,
receiver_phone_number,
status,
status_time_stamp,
delivery_fee,
pick_up_date, 
estimated_time_of_arrival,
destination_address,
pick_up_address;
`;

export const fetchQuery = `SELECT
packages.package_id,
packages.package_name,
packages.receiver_email,
packages.receiver_phone_number,
packages.user_ref,
packages.tracking_password,
packages.status,
packages.created_at,
packages.status_time_stamp,
packages.delivery_fee,
packages.pick_up_date,
packages.exact_location_coordinates AS pick_up_location_coordinates,
packages.destination_address,
packages.pick_up_address,
packages.destination_coordinates,
packages.estimated_time_of_arrival,
packages.unhashed_tracking_password,
packages.rider_ref,
json_build_object(
    'user_id', users.user_id,
    'full_name', users.full_name,
    'email', users.email,
    'phone_number', users.phone_number,
    'user_role', users.user_role,
    'password', users.password,
    'is_active', users.is_active,
    'activation_token', users.activation_token,
    'activation_token_time', users.activation_token_time,
    'password_changed_at', users.password_changed_at
) AS user_ref
FROM
packages
JOIN
users ON packages.user_ref = users.user_id
WHERE
packages.package_id = $1
LIMIT 1;
`;

export const fetchQueryNext = `
SELECT
    packages.*,
    json_build_object(
        'user_id', user_ref.user_id,
        'full_name', user_ref.full_name,
        'email', user_ref.email,
        'phone_number', user_ref.phone_number,
        'user_role', user_ref.user_role,
        'password', user_ref.password,
        'is_active', user_ref.is_active,
        'activation_token', user_ref.activation_token,
        'activation_token_time', user_ref.activation_token_time,
        'password_changed_at', user_ref.password_changed_at
    ) AS user_ref,
    json_build_object(
        'user_id', rider_ref.user_id,
        'full_name', rider_ref.full_name,
        'email', rider_ref.email,
        'phone_number', rider_ref.phone_number,
        'user_role', rider_ref.user_role,
        'password', rider_ref.password,
        'is_active', rider_ref.is_active,
        'activation_token', rider_ref.activation_token,
        'activation_token_time', rider_ref.activation_token_time,
        'password_changed_at', rider_ref.password_changed_at
    ) AS rider_ref
FROM
    packages
JOIN
    users AS user_ref ON packages.user_ref = user_ref.user_id
JOIN
    users AS rider_ref ON packages.rider_ref = rider_ref.user_id
WHERE
    packages.package_id = $1
LIMIT 1;
`;

// ST_SetSRID(ST_MakePoint($12, $13), 4326),
// ST_SetSRID(ST_MakePoint($12, $13), 4326),
