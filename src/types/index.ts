export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: 'user' | 'admin';
  created_at: string;
}

export interface ServiceCenter {
  id: number;
  name: string;
  code: string;
  category: string;
  address: string;
  phone?: string | null;
  operating_hours?: string | null;
  is_active: boolean;
  service_count?: number;
  total_waiting?: number;
  services?: Service[];
  created_at?: string;
  updated_at?: string;
}

export interface Service {
  id: number;
  center_id: number;
  name: string;
  prefix: string;
  description?: string | null;
  avg_service_time_mins: number;
  is_active: boolean;
  center_name?: string;
  center_code?: string;
  center_category?: string;
  center_address?: string;
  center_operating_hours?: string;
  waiting_count?: number;
  currently_serving?: string | null;
  currently_serving_counter?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type TokenStatus = 'waiting' | 'now_serving' | 'served' | 'skipped' | 'cancelled';

export interface QueueLog {
  id: number;
  token_id: number;
  previous_status: string | null;
  new_status: TokenStatus;
  changed_by?: number | null;
  changed_by_name?: string | null;
  note?: string | null;
  created_at: string;
}

export interface QueueToken {
  id: number;
  service_id: number;
  center_id: number;
  user_id: number;
  token_number: string;
  sequence_number: number;
  status: TokenStatus;
  counter_desk?: string | null;
  notes?: string | null;
  joined_at: string;
  called_at?: string | null;
  completed_at?: string | null;
  estimated_wait_mins: number;
  service_name?: string;
  service_prefix?: string;
  avg_service_time_mins?: number;
  center_name?: string;
  center_address?: string;
  center_phone?: string;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  verification_method?: string;
  position?: number;
  waiting_ahead?: number;
  currently_serving?: string | null;
  currently_serving_counter?: string | null;
  total_waiting_in_service?: number;
  logs?: QueueLog[];
}

export interface AdminStats {
  waiting_count: number;
  serving_count: number;
  served_count: number;
  skipped_count: number;
  cancelled_count: number;
  total_tokens: number;
}

export interface ServiceStat {
  id: number;
  name: string;
  prefix: string;
  center_name: string;
  waiting: number;
  now_serving: number;
  served: number;
  skipped: number;
}
