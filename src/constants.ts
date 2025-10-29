import { EmailProvider } from './types';

// 邮箱提供商配置
export const EMAIL_PROVIDERS: EmailProvider[] = [
  { label: 'Lark 飞书邮箱', value: 'lark' },
  { label: 'Gmail', value: 'gmail' },
  { label: 'QQ邮箱', value: 'qq' },
  { label: '163邮箱', value: '163' },
  { label: 'Outlook', value: 'outlook' }
];

// API 配置
export const API_CONFIG = {
  BASE_URL: 'https://sorry-marylinda-miaomiaocompany-32548e63.koyeb.app',
  ENDPOINTS: {
    SYNC: '/api/sync/email',
    STATUS: '/api/status',
    PROVIDERS: '/api/providers'
  }
};

// 默认配置
export const DEFAULT_CONFIG = {
  SYNC_COUNT: 10,
  MAX_SYNC_COUNT: 100,
  MIN_SYNC_COUNT: 1
};

// 表格字段配置
export const TABLE_FIELDS = {
  SUBJECT: '邮件主题',
  SENDER: '发件人',
  DATE: '发送时间',
  CONTENT: '邮件内容',
  ATTACHMENTS: '附件'
};