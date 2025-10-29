import { useState, useEffect } from 'react';
import { EMAIL_PROVIDERS, DEFAULT_CONFIG } from './constants';
import { SyncConfig, SyncStatus, MessageType, EmailData } from './types';
import { syncEmails, checkServiceStatus } from './services/emailApi';
import { bitableService } from './services/bitableApi';

function App() {
  // 表单状态
  const [config, setConfig] = useState<SyncConfig>({
    email: '',
    password: '',
    provider: 'lark',
    count: DEFAULT_CONFIG.SYNC_COUNT
  });

  // 同步状态
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<{ type: MessageType; text: string } | null>(null);
  const [tableName, setTableName] = useState<string>('');

  // 初始化
  useEffect(() => {
    initializeApp();
  }, []);

  /**
   * 初始化应用
   */
  const initializeApp = async () => {
    try {
      // 检查服务状态
      const statusResult = await checkServiceStatus();
      if (!statusResult.success) {
        showMessage('error', '邮件服务连接失败，请检查网络连接');
        return;
      }

      // 初始化多维表格服务
      const initResult = await bitableService.init();
      if (!initResult) {
        showMessage('error', '多维表格初始化失败');
        return;
      }

      // 获取表格名称
      const name = await bitableService.getTableName();
      setTableName(name);

      showMessage('info', '插件初始化成功');
    } catch (error: any) {
      console.error('初始化失败:', error);
      showMessage('error', '插件初始化失败: ' + error.message);
    }
  };

  /**
   * 显示消息
   */
  const showMessage = (type: MessageType, text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  /**
   * 更新配置
   */
  const updateConfig = (key: keyof SyncConfig, value: string | number) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  /**
   * 验证表单
   */
  const validateForm = (): boolean => {
    if (!config.email.trim()) {
      showMessage('error', '请输入邮箱地址');
      return false;
    }

    if (!config.password.trim()) {
      showMessage('error', '请输入邮箱授权码');
      return false;
    }

    if (config.count < DEFAULT_CONFIG.MIN_SYNC_COUNT || config.count > DEFAULT_CONFIG.MAX_SYNC_COUNT) {
      showMessage('error', `同步数量应在 ${DEFAULT_CONFIG.MIN_SYNC_COUNT}-${DEFAULT_CONFIG.MAX_SYNC_COUNT} 之间`);
      return false;
    }

    return true;
  };

  /**
   * 执行邮件同步
   */
  const handleSync = async () => {
    if (!validateForm()) {
      return;
    }

    setSyncStatus('syncing');
    setProgress(0);
    showMessage('info', '开始同步邮件...');

    try {
      // 步骤1: 调用邮件API获取数据 (30%)
      setProgress(30);
      const emailResult = await syncEmails(config);
      
      if (!emailResult.success || !emailResult.data) {
        throw new Error(emailResult.error || '获取邮件数据失败');
      }

      const emails: EmailData[] = emailResult.data;
      showMessage('info', `获取到 ${emails.length} 封邮件`);

      // 步骤2: 准备多维表格 (60%)
      setProgress(60);
      const tableResult = await bitableService.ensureEmailTable();
      
      if (!tableResult.success) {
        throw new Error(tableResult.message || '准备邮件表格失败');
      }

      // 步骤3: 写入数据到表格 (90%)
      setProgress(90);
      const addResult = await bitableService.addEmailRecords(emails);
      
      if (!addResult.success) {
        throw new Error(addResult.message || '写入邮件数据失败');
      }

      // 完成 (100%)
      setProgress(100);
      setSyncStatus('success');
      showMessage('success', `同步完成！成功添加 ${addResult.count} 条邮件记录`);

    } catch (error: any) {
      console.error('同步失败:', error);
      setSyncStatus('error');
      showMessage('error', error.message || '同步过程中发生错误');
    }
  };

  /**
   * 重置状态
   */
  const resetSync = () => {
    setSyncStatus('idle');
    setProgress(0);
    setMessage(null);
  };

  return (
    <div className="container">
      <h2 style={{ marginBottom: '24px', textAlign: 'center', color: '#333' }}>
        邮件同步插件
      </h2>

      {tableName && (
        <div style={{ marginBottom: '16px', padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
          <small>当前表格: {tableName}</small>
        </div>
      )}

      {/* 邮箱提供商选择 */}
      <div className="form-group">
        <label className="form-label">邮箱提供商</label>
        <select
          className="form-select"
          value={config.provider}
          onChange={(e) => updateConfig('provider', e.target.value)}
          disabled={syncStatus === 'syncing'}
        >
          {EMAIL_PROVIDERS.map(provider => (
            <option key={provider.value} value={provider.value}>
              {provider.label}
            </option>
          ))}
        </select>
      </div>

      {/* 邮箱地址 */}
      <div className="form-group">
        <label className="form-label">邮箱地址</label>
        <input
          type="email"
          className="form-input"
          placeholder="请输入邮箱地址"
          value={config.email}
          onChange={(e) => updateConfig('email', e.target.value)}
          disabled={syncStatus === 'syncing'}
        />
      </div>

      {/* 授权码 */}
      <div className="form-group">
        <label className="form-label">邮箱授权码</label>
        <input
          type="password"
          className="form-input"
          placeholder="请输入邮箱授权码"
          value={config.password}
          onChange={(e) => updateConfig('password', e.target.value)}
          disabled={syncStatus === 'syncing'}
        />
        <small style={{ color: '#666', fontSize: '12px' }}>
          请在邮箱设置中生成应用专用密码
        </small>
      </div>

      {/* 同步数量 */}
      <div className="form-group">
        <label className="form-label">同步数量</label>
        <input
          type="number"
          className="form-input"
          min={DEFAULT_CONFIG.MIN_SYNC_COUNT}
          max={DEFAULT_CONFIG.MAX_SYNC_COUNT}
          value={config.count}
          onChange={(e) => updateConfig('count', parseInt(e.target.value) || DEFAULT_CONFIG.SYNC_COUNT)}
          disabled={syncStatus === 'syncing'}
        />
        <small style={{ color: '#666', fontSize: '12px' }}>
          最多可同步 {DEFAULT_CONFIG.MAX_SYNC_COUNT} 封邮件
        </small>
      </div>

      {/* 进度条 */}
      {syncStatus === 'syncing' && (
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* 消息显示 */}
      {message && (
        <div className={`message message-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* 操作按钮 */}
      <div style={{ textAlign: 'center', marginTop: '24px' }}>
        {syncStatus === 'idle' && (
          <button
            className="btn btn-primary"
            onClick={handleSync}
            style={{ width: '100%' }}
          >
            开始同步邮件
          </button>
        )}

        {syncStatus === 'syncing' && (
          <button
            className="btn btn-primary"
            disabled
            style={{ width: '100%' }}
          >
            同步中... ({progress}%)
          </button>
        )}

        {(syncStatus === 'success' || syncStatus === 'error') && (
          <button
            className="btn btn-primary"
            onClick={resetSync}
            style={{ width: '100%' }}
          >
            重新同步
          </button>
        )}
      </div>

      {/* 使用说明 */}
      <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
        <h4 style={{ marginBottom: '8px', fontSize: '14px' }}>使用说明：</h4>
        <ul style={{ fontSize: '12px', color: '#666', paddingLeft: '16px' }}>
          <li>选择您的邮箱提供商</li>
          <li>输入邮箱地址和授权码（非登录密码）</li>
          <li>设置要同步的邮件数量</li>
          <li>点击同步按钮开始导入邮件到表格</li>
        </ul>
      </div>
    </div>
  );
}

export default App;