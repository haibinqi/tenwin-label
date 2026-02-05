// Database types
export interface CodeTemplate {
  id: string;
  name: string;
  type: '一维码' | '二维码';
  prefix: string;
  padding_length: number;
  remark: string;
  created_at: string;
}

export interface CodeBatch {
  id: string;
  template_id: string;
  start_number: number;
  end_number: number;
  count: number;
  status: 'active' | 'void';
  created_at: string;
}

export interface CodeBatchWithTemplate extends CodeBatch {
  template_name: string;
  template_prefix: string;
  template_padding: number;
  template_type: string;
}

export interface CodeItem {
  id: number;
  batch_id: string;
  serial_number: number;
  code_text: string;
  is_printed?: number;
  printed_at?: string | null;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Dashboard stats
export interface DashboardStats {
  today_count: number;
  active_batches: number;
  template_count: number;
}

// Form data types
export interface TemplateFormData {
  name: string;
  type: '一维码' | '二维码';
  prefix: string;
  padding_length: number;
  remark: string;
}

export interface BatchFormData {
  template_id: string;
  start_number: number;
  count: number;
}
