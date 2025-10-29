import { bitable, FieldType } from '@lark-base-open/js-sdk';
import { EmailData } from '../types';
import { TABLE_FIELDS } from '../constants';

/**
 * 多维表格服务类
 */
export class BitableService {
  private table: any = null;

  /**
   * 初始化服务
   */
  async init() {
    try {
      this.table = await bitable.base.getActiveTable();
      return true;
    } catch (error) {
      console.error('初始化多维表格失败:', error);
      return false;
    }
  }

  /**
   * 检查或创建邮件表格
   */
  async ensureEmailTable(): Promise<{ success: boolean; message?: string }> {
    try {
      if (!this.table) {
        await this.init();
      }

      // 检查是否已存在邮件相关字段
      const fieldMetaList = await this.table.getFieldMetaList();
      const existingFields = fieldMetaList.map((field: any) => field.name);

      const requiredFields = [
        { name: TABLE_FIELDS.SUBJECT, type: FieldType.Text },
        { name: TABLE_FIELDS.SENDER, type: FieldType.Text },
        { name: TABLE_FIELDS.DATE, type: FieldType.DateTime },
        { name: TABLE_FIELDS.CONTENT, type: FieldType.Text },
        { name: TABLE_FIELDS.ATTACHMENTS, type: FieldType.Attachment }  // 改为附件字段类型
      ];

      // 创建缺失的字段
      for (const field of requiredFields) {
        if (!existingFields.includes(field.name)) {
          await this.table.addField({
            type: field.type,
            name: field.name
          });
          console.log(`创建字段: ${field.name}`);
        }
      }

      return {
        success: true,
        message: '邮件表格准备完成'
      };
    } catch (error: any) {
      console.error('创建邮件表格失败:', error);
      return {
        success: false,
        message: error.message || '创建邮件表格失败'
      };
    }
  }

  /**
   * 获取字段映射
   */
  private async getFieldMapping(): Promise<Record<string, string>> {
    const fieldMetaList = await this.table.getFieldMetaList();
    const fieldMapping: Record<string, string> = {};

    for (const field of fieldMetaList) {
      switch (field.name) {
        case TABLE_FIELDS.SUBJECT:
          fieldMapping.subject = field.id;
          break;
        case TABLE_FIELDS.SENDER:
          fieldMapping.sender = field.id;
          break;
        case TABLE_FIELDS.DATE:
          fieldMapping.date = field.id;
          break;
        case TABLE_FIELDS.CONTENT:
          fieldMapping.content = field.id;
          break;
        case TABLE_FIELDS.ATTACHMENTS:
          fieldMapping.attachments = field.id;
          break;
      }
    }

    return fieldMapping;
  }

  /**
   * 批量添加邮件记录
   */
  async addEmailRecords(emails: EmailData[]): Promise<{ success: boolean; message?: string; count?: number }> {
    try {
      if (!this.table) {
        throw new Error('表格未初始化');
      }

      if (!emails || emails.length === 0) {
        return {
          success: true,
          message: '没有邮件需要添加',
          count: 0
        };
      }

      console.log(`开始添加 ${emails.length} 条邮件记录`);

      // 确保表格字段存在
      const tableResult = await this.ensureEmailTable();
      if (!tableResult.success) {
        return tableResult;
      }

      // 获取字段映射
      const fieldMapping = await this.getFieldMapping();
      console.log('字段映射:', fieldMapping);

      // 获取字段实例
      const subjectField = fieldMapping.subject ? await this.table.getField(fieldMapping.subject) : null;
      const senderField = fieldMapping.sender ? await this.table.getField(fieldMapping.sender) : null;
      const dateField = fieldMapping.date ? await this.table.getField(fieldMapping.date) : null;
      const contentField = fieldMapping.content ? await this.table.getField(fieldMapping.content) : null;
      const attachmentsField = fieldMapping.attachments ? await this.table.getField(fieldMapping.attachments) : null;

      console.log('字段实例获取结果:', {
        subjectField: !!subjectField,
        senderField: !!senderField,
        dateField: !!dateField,
        contentField: !!contentField,
        attachmentsField: !!attachmentsField
      });

      // 验证至少有一个字段可用
      if (!subjectField && !senderField && !dateField && !contentField && !attachmentsField) {
        throw new Error('没有找到任何可用的字段，请检查字段配置');
      }

      const records = [];

      // 为每封邮件创建记录
      for (let i = 0; i < emails.length; i++) {
        const email = emails[i];
        console.log(`处理邮件 ${i + 1}/${emails.length}:`, {
          subject: email.subject,
          sender: email.sender,
          date: email.date,
          bodyLength: email.body?.length || 0,
          hasAttachments: email.has_attachments
        });

        try {
          // 验证邮件数据
          if (!email) {
            throw new Error(`邮件 ${i + 1} 数据为空`);
          }

          // 构建 fields 对象
          const fields: Record<string, any> = {};

          // 添加主题字段
          if (subjectField) {
            const subjectValue = email.subject || '';
            console.log(`添加主题字段，值: "${subjectValue}"`);
            if (typeof subjectValue !== 'string') {
              throw new Error(`主题值必须是字符串，当前类型: ${typeof subjectValue}`);
            }
            fields[subjectField.id] = subjectValue;
          }

          // 添加发件人字段
          if (senderField) {
            const senderValue = email.sender || '';
            console.log(`添加发件人字段，值: "${senderValue}"`);
            if (typeof senderValue !== 'string') {
              throw new Error(`发件人值必须是字符串，当前类型: ${typeof senderValue}`);
            }
            fields[senderField.id] = senderValue;
          }

          // 添加日期字段
          if (dateField) {
            let dateValue;
            try {
              const date = new Date(email.date);
              if (isNaN(date.getTime())) {
                throw new Error(`无效的日期格式: ${email.date}`);
              }
              dateValue = date.getTime();
              console.log(`添加日期字段，原始值: "${email.date}"，时间戳: ${dateValue}`);
            } catch (dateError) {
              console.warn('日期解析失败，使用当前时间:', dateError);
              dateValue = Date.now();
            }
            
            if (typeof dateValue !== 'number') {
              throw new Error(`日期值必须是数字，当前类型: ${typeof dateValue}`);
            }
            fields[dateField.id] = dateValue;
          }

          // 添加内容字段
          if (contentField) {
            let contentValue = email.body || '';
            
            // 对内容进行清理和验证
            if (typeof contentValue !== 'string') {
              console.warn(`内容值类型不正确，转换为字符串。原类型: ${typeof contentValue}，原值:`, contentValue);
              contentValue = String(contentValue);
            }
            
            // 清理可能导致问题的特殊字符和格式
            contentValue = contentValue
              .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // 移除控制字符
              .replace(/\r\n/g, '\n') // 统一换行符
              .replace(/\r/g, '\n')   // 统一换行符
              .trim(); // 移除首尾空白
            
            // 限制内容长度，避免过长内容导致问题
            const maxLength = 10000; // 设置最大长度限制
            if (contentValue.length > maxLength) {
              contentValue = contentValue.substring(0, maxLength) + '...';
              console.warn(`内容过长，已截断到 ${maxLength} 字符`);
            }
            
            console.log(`添加内容字段，清理后值长度: ${contentValue.length}`);
            console.log(`内容预览: "${contentValue.substring(0, 100)}${contentValue.length > 100 ? '...' : ''}"`);
            
            fields[contentField.id] = contentValue;
          }

          // 添加附件字段
          if (attachmentsField) {
            let attachmentValue: any = null;
            
            try {
              // 如果有附件详细信息且包含文件内容，上传到飞书
              if (email.attachments && Array.isArray(email.attachments) && email.attachments.length > 0) {
                console.log(`邮件包含 ${email.attachments.length} 个附件，开始上传...`);
                const attachmentInfos = await this.uploadAttachments(email.attachments);
                if (attachmentInfos.length > 0) {
                  // 使用完整的附件信息对象数组
                  attachmentValue = attachmentInfos;
                  console.log(`成功上传 ${attachmentInfos.length} 个附件:`, attachmentInfos);
                } else {
                  // 如果上传失败，设置为空数组
                  attachmentValue = [];
                }
              } else if (email.has_attachments) {
                // 向后兼容：如果只有 has_attachments 布尔值但没有附件详细信息
                attachmentValue = [];
                console.log('邮件标记有附件但无详细信息，设置为空数组');
              } else {
                // 没有附件的情况，对于附件字段应该设置为空数组而不是文本
                attachmentValue = [];
                console.log('邮件无附件，设置为空数组');
              }
            } catch (error) {
              console.warn('处理附件信息时出错:', error);
              // 降级处理：对于附件字段，错误时也应该设置为空数组
              attachmentValue = [];
            }
            
            console.log(`添加附件字段，值类型: ${typeof attachmentValue}，值:`, attachmentValue);
            fields[attachmentsField.id] = attachmentValue;
          }

          if (Object.keys(fields).length === 0) {
            throw new Error('没有添加任何字段数据，请检查字段配置');
          }

          // 构建记录对象
          const record = { fields };
          records.push(record);
          
          console.log(`邮件 ${i + 1} 的记录数据准备完成，字段数量: ${Object.keys(fields).length}`);
          console.log(`记录数据:`, record);
        } catch (recordError: any) {
           console.error(`创建邮件 ${i + 1} 的记录数据失败:`, recordError);
           console.error('邮件数据:', email);
           console.error('字段状态:', {
             subjectField: !!subjectField,
             senderField: !!senderField,
             dateField: !!dateField,
             contentField: !!contentField,
             attachmentsField: !!attachmentsField
           });
           throw new Error(`创建邮件 ${i + 1} 的记录数据失败: ${recordError?.message || recordError}`);
         }
      }

      // 添加详细的调试日志
      console.log('=== 调试信息开始 ===');
      console.log('1. records 类型:', typeof records);
      console.log('2. records 是否为数组:', Array.isArray(records));
      console.log('3. records 长度:', records?.length);
      console.log('4. records 内容:', JSON.stringify(records, null, 2));
      console.log('5. fieldMapping:', fieldMapping);
      console.log('6. emails 输入数据:', emails);
      console.log('=== 调试信息结束 ===');

      // 验证数据格式
      if (!Array.isArray(records)) {
        console.error('❌ records 不是数组，类型为:', typeof records);
        throw new Error(`记录数据必须是数组，当前类型: ${typeof records}`);
      }
      
      if (records.length === 0) {
        throw new Error('记录数据不能为空');
      }

      // 验证每个记录的格式（fields 方式）
      records.forEach((record, index) => {
        console.log(`验证记录 ${index}:`, record);
        if (!record || typeof record !== 'object') {
          throw new Error(`记录 ${index} 不是对象，类型: ${typeof record}`);
        }
        if (!record.fields || typeof record.fields !== 'object') {
          throw new Error(`记录 ${index} 缺少 fields 属性或 fields 不是对象`);
        }
        if (Object.keys(record.fields).length === 0) {
          throw new Error(`记录 ${index} 的 fields 对象为空`);
        }
      });

      // 在调用 addRecords 前再次确认数据格式
      console.log('🚀 即将调用 this.table.addRecords，参数类型:', typeof records);
      console.log('🚀 即将调用 this.table.addRecords，参数是否为数组:', Array.isArray(records));
      console.log('🚀 即将调用 this.table.addRecords，参数内容:', records);
      
      // 深度验证数据结构，确保完全符合 IRecordValue[] 格式
      const validatedRecords = records.map((record, index) => {
        // 确保记录是纯对象
        const cleanRecord: { fields: Record<string, any> } = {
          fields: {}
        };
        
        // 验证并清理 fields 对象
        if (record.fields && typeof record.fields === 'object') {
          for (const [fieldId, value] of Object.entries(record.fields)) {
            // 确保字段 ID 是字符串
            if (typeof fieldId === 'string' && fieldId.trim() !== '') {
              // 确保值不是 undefined 或 null
              if (value !== undefined && value !== null) {
                cleanRecord.fields[fieldId] = value;
              }
            }
          }
        }
        
        // 验证清理后的记录
        if (Object.keys(cleanRecord.fields).length === 0) {
          throw new Error(`记录 ${index} 清理后没有有效字段`);
        }
        
        return cleanRecord;
      });
      
      console.log('✅ 数据验证完成，清理后的记录:', validatedRecords);
      
      try {
        // 尝试批量添加记录
        const result = await this.table.addRecords(validatedRecords);
        console.log('✅ 批量添加记录成功:', result);
        
        return {
          success: true,
          message: `成功添加 ${emails.length} 条邮件记录`,
          count: emails.length
        };
      } catch (batchError: any) {
        console.error('❌ 批量添加失败，尝试单条添加:', batchError);
        
        // 备用方案：单条添加记录
         const successCount = await this.addRecordsOneByOne(validatedRecords, emails);
         
         if (successCount > 0) {
           return {
             success: true,
             message: `通过单条添加成功添加 ${successCount}/${emails.length} 条邮件记录`,
             count: successCount
           };
         } else {
           throw new Error(`批量添加和单条添加都失败: ${batchError.message}`);
         }
      }
    } catch (error: any) {
      console.error('添加邮件记录失败:', error);
      return {
        success: false,
        message: error.message || '添加邮件记录失败'
      };
    }
  }

  /**
   * 单条添加记录的备用方案
   */
  private async addRecordsOneByOne(
    records: Array<{ fields: Record<string, any> }>, 
    emails: any[]
  ): Promise<number> {
    let successCount = 0;
    
    // 获取附件字段映射
    const fieldMapping = await this.getFieldMapping();
    const attachmentsField = fieldMapping.attachments ? await this.table.getField(fieldMapping.attachments) : null;
    
    for (let i = 0; i < records.length; i++) {
      try {
        console.log(`🔄 尝试单条添加第 ${i + 1}/${records.length} 条记录:`, records[i]);
        
        // 分离附件字段和其他字段
        const { fields } = records[i];
        const attachmentValue = attachmentsField ? fields[attachmentsField.id] : null;
        const fieldsWithoutAttachment = { ...fields };
        
        // 从字段中移除附件字段，先添加其他字段
        if (attachmentsField && attachmentsField.id in fieldsWithoutAttachment) {
          delete fieldsWithoutAttachment[attachmentsField.id];
        }
        
        // 先添加记录（不包含附件字段）
        const recordId = await this.table.addRecord(fieldsWithoutAttachment);
        console.log(`✅ 第 ${i + 1} 条记录基础字段添加成功，记录ID:`, recordId);
        
        // 如果有附件字段且有附件数据，单独设置附件
        if (attachmentsField && attachmentValue && Array.isArray(attachmentValue) && attachmentValue.length > 0) {
          try {
            console.log(`🔗 开始设置第 ${i + 1} 条记录的附件字段:`, attachmentValue);
            
            // 使用附件字段专用的setValue方法
            await attachmentsField.setValue(recordId, attachmentValue);
            console.log(`✅ 第 ${i + 1} 条记录附件字段设置成功`);
          } catch (attachmentError: any) {
            console.error(`⚠️ 第 ${i + 1} 条记录附件字段设置失败:`, attachmentError);
            // 附件设置失败不影响记录本身的成功状态
          }
        }
        
        successCount++;
        
        // 添加短暂延迟，避免请求过于频繁
        if (i < records.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (singleError: any) {
        console.error(`❌ 第 ${i + 1} 条记录添加失败:`, singleError);
        console.error(`失败的记录数据:`, records[i]);
        console.error(`对应的邮件数据:`, emails[i]);
        // 继续处理下一条记录，不中断整个过程
      }
    }
    
    console.log(`📊 单条添加完成，成功: ${successCount}/${records.length}`);
    return successCount;
  }

  /**
   * 上传附件到飞书并获取完整附件信息
   */
  private async uploadAttachments(attachments: any[]): Promise<Array<{
    name: string;
    size: number;
    type: string;
    token: string;
    timeStamp: number;
  }>> {
    const attachmentInfos: Array<{
      name: string;
      size: number;
      type: string;
      token: string;
      timeStamp: number;
    }> = [];
    
    for (const attachment of attachments) {
      try {
        // 检查是否有文件内容
        if (!attachment.content) {
          console.warn(`附件 ${attachment.filename} 没有内容，跳过上传`);
          continue;
        }
        
        // 验证文件大小和名称限制
        const maxSize = 1024 * 1024 * 1024 * 2; // 2GB
        if (attachment.size > maxSize) {
          console.warn(`附件 ${attachment.filename} 大小 ${attachment.size} 超过限制，跳过上传`);
          continue;
        }
        
        if (attachment.filename.length > 250) {
          console.warn(`附件 ${attachment.filename} 文件名过长，跳过上传`);
          continue;
        }
        
        // 将base64内容转换为File对象
        const binaryString = atob(attachment.content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const file = new File([bytes], attachment.filename, { 
          type: attachment.content_type || 'application/octet-stream' 
        });
        
        console.log(`正在上传附件: ${attachment.filename} (${this.formatFileSize(attachment.size)})`);
        
        // 使用飞书SDK上传文件
        const uploadTokens = await bitable.base.batchUploadFile([file]);
        if (uploadTokens && uploadTokens.length > 0) {
          // 构建完整的附件信息对象
          const attachmentInfo = {
            name: attachment.filename,
            size: attachment.size,
            type: attachment.content_type || 'application/octet-stream',
            token: uploadTokens[0],
            timeStamp: Date.now()
          };
          
          attachmentInfos.push(attachmentInfo);
          console.log(`附件 ${attachment.filename} 上传成功，token: ${uploadTokens[0]}`);
        } else {
          console.warn(`附件 ${attachment.filename} 上传失败，未获取到token`);
        }
        
      } catch (error) {
        console.error(`上传附件 ${attachment.filename} 时出错:`, error);
        // 继续处理其他附件
      }
    }
    
    return attachmentInfos;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * 获取当前表格名称
   */
  async getTableName(): Promise<string> {
    try {
      if (!this.table) {
        await this.init();
      }
      
      const tableMeta = await this.table.getMeta();
      return tableMeta.name || '未知表格';
    } catch (error: any) {
      console.error('获取表格名称失败:', error);
      return '获取失败';
    }
  }

  /**
   * 检查表格是否存在邮件字段
   */
  async hasEmailFields(): Promise<boolean> {
    try {
      if (!this.table) {
        await this.init();
      }

      const fieldMetaList = await this.table.getFieldMetaList();
      const fieldNames = fieldMetaList.map((field: any) => field.name);

      // 检查是否至少包含主题和发件人字段
      return fieldNames.includes(TABLE_FIELDS.SUBJECT) && 
             fieldNames.includes(TABLE_FIELDS.SENDER);
    } catch (error) {
      console.error('检查邮件字段失败:', error);
      return false;
    }
  }
}

// 导出单例实例
export const bitableService = new BitableService();