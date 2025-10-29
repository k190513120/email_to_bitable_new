import axios from 'axios';
import { API_CONFIG } from '../constants';
import { ApiResponse, EmailData, SyncConfig } from '../types';

// 创建 axios 实例
const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    console.log('发送请求:', config.url, config.data);
    return config;
  },
  (error) => {
    console.error('请求错误:', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    console.log('收到响应:', response.data);
    return response;
  },
  (error) => {
    console.error('响应错误:', error);
    return Promise.reject(error);
  }
);

/**
 * 获取支持的邮箱提供商列表
 */
export const getEmailProviders = async (): Promise<ApiResponse<string[]>> => {
  try {
    const response = await api.get(API_CONFIG.ENDPOINTS.PROVIDERS);
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '获取邮箱提供商失败'
    };
  }
};

/**
 * 检查服务状态
 */
export const checkServiceStatus = async (): Promise<ApiResponse<any>> => {
  try {
    const response = await api.get(API_CONFIG.ENDPOINTS.STATUS);
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '服务状态检查失败'
    };
  }
};

/**
 * 同步邮件数据
 */
export const syncEmails = async (config: SyncConfig): Promise<ApiResponse<EmailData[]>> => {
  try {
    const requestData = {
      email_username: config.email,
      email_password: config.password,
      email_provider: config.provider,
      email_count: config.count
    };

    const response = await api.post(API_CONFIG.ENDPOINTS.SYNC, requestData);
    
    // 检查响应数据格式 - 根据实际返回的数据结构调整
    console.log('API响应数据结构:', response.data);
    
    if (response.data && response.data.success && response.data.data) {
      // 检查是否有emails数组
      if (Array.isArray(response.data.data.emails)) {
        return {
          success: true,
          data: response.data.data.emails,
          message: `成功同步 ${response.data.data.emails.length} 封邮件`
        };
      }
      // 检查data本身是否就是emails数组
      else if (Array.isArray(response.data.data)) {
        return {
          success: true,
          data: response.data.data,
          message: `成功同步 ${response.data.data.length} 封邮件`
        };
      }
    }
    
    return {
      success: false,
      error: '邮件数据格式错误'
    };
  } catch (error: any) {
    console.error('邮件同步失败:', error);
    
    let errorMessage = '邮件同步失败';
    if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};