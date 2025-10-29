// 邮箱提供商类型
export interface EmailProvider {
  label: string;
  value: string;
}

// 附件信息接口
export interface AttachmentInfo {
  filename: string;
  size: number;
  content_type: string;
  content?: string;  // base64编码的文件内容
  token?: string;    // 上传到飞书后获得的文件token
}

// 邮件数据接口
export interface EmailData {
  id: string;
  subject: string;
  sender: string;
  date: string;
  body: string;  // 改为body字段，与后端API返回的字段名一致
  attachments?: AttachmentInfo[];  // 改为附件详细信息数组
  has_attachments?: boolean;  // 保持向后兼容性
}

// 同步配置接口
export interface SyncConfig {
  email: string;
  password: string;
  provider: string;
  count: number;
}

// API 响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 同步状态
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

// 消息类型
export type MessageType = 'success' | 'error' | 'info';