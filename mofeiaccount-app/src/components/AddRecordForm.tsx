/**
 * 新增记账表单组件
 *
 * PRD 3.3 模块一：
 *   - 表单字段：客户名称（必填）、收款金额、支出金额、说明（选填）、凭证上传
 *   - 实时预览结余
 *   - 选择凭证：调用系统文件选择器，限制 jpg/png
 *   - 保存：图片转存 + Excel 追加 + 刷新列表
 *
 * 集成测试 IT-002、IT-003
 */

import { useState, useMemo } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { calculatePreviewBalance } from '../services/balance';
import { generateId, getCurrentTimeStr } from '../services/excel';
import { copyVoucher } from '../services/voucher';
import type { AccountRecord } from '../types/account';
import type { ToastMessage } from './Toast';

interface AddRecordFormProps {
  workDir: string;
  lastBalance: number;
  existingIds: string[];
  onSave: (record: AccountRecord) => Promise<void>;
  onAddToast: (type: ToastMessage['type'], text: string) => void;
}

export function AddRecordForm({
  workDir,
  lastBalance,
  existingIds,
  onSave,
  onAddToast,
}: AddRecordFormProps) {
  const [customerName, setCustomerName] = useState('');
  const [incomeStr, setIncomeStr] = useState('0');
  const [expenseStr, setExpenseStr] = useState('0');
  const [description, setDescription] = useState('');
  const [voucherSource, setVoucherSource] = useState(''); // 用户选中的源图片路径
  const [saving, setSaving] = useState(false);

  // 实时计算预览结余
  const income = parseFloat(incomeStr) || 0;
  const expense = parseFloat(expenseStr) || 0;
  const previewBalance = useMemo(
    () => calculatePreviewBalance(lastBalance, income, expense),
    [lastBalance, income, expense],
  );

  // 表单校验：客户名称必填，金额必须为合法非负数字
  const validationError = useMemo(() => {
    if (!customerName.trim()) return '请输入客户名称';
    if (incomeStr.trim() === '' || isNaN(income) || income < 0) return '请输入合法的收款金额';
    if (expenseStr.trim() === '' || isNaN(expense) || expense < 0) return '请输入合法的支出金额';
    return null;
  }, [customerName, incomeStr, expenseStr, income, expense]);

  // 选择凭证图片
  const handleSelectVoucher = async () => {
    try {
      const selected = await open({
        multiple: false,
        title: '选择凭证图片',
        filters: [
          {
            name: '图片文件',
            extensions: ['jpg', 'jpeg', 'png'],
          },
        ],
      });

      if (selected && typeof selected === 'string') {
        setVoucherSource(selected);
      }
    } catch {
      onAddToast('error', '打开文件选择器失败');
    }
  };

  // 保存
  const handleSave = async () => {
    if (validationError) {
      onAddToast('error', validationError);
      return;
    }

    try {
      setSaving(true);

      const recordId = generateId(existingIds);

      // 处理凭证：复制到 vouchers 文件夹
      let voucherPath = '';
      if (voucherSource) {
        voucherPath = await copyVoucher(voucherSource, recordId, workDir);
      }

      const record: AccountRecord = {
        id: recordId,
        time: getCurrentTimeStr(),
        customerName: customerName.trim(),
        income,
        expense,
        balance: 0, // 由 recalculateBalances 重算
        description: description.trim(),
        voucher: voucherPath,
      };

      await onSave(record);

      // 重置表单
      setCustomerName('');
      setIncomeStr('0');
      setExpenseStr('0');
      setDescription('');
      setVoucherSource('');
      onAddToast('success', '保存成功');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '保存失败';
      onAddToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: 8,
      padding: 20,
      marginBottom: 20,
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    }}>
      <h2 style={{ margin: '0 0 16px 0', fontSize: 18 }}>新增记账</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
        {/* 客户名称 */}
        <div>
          <label style={labelStyle}>客户名称 *</label>
          <input
            style={inputStyle}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="如：张三"
          />
        </div>

        {/* 收款金额 */}
        <div>
          <label style={labelStyle}>收款金额</label>
          <input
            style={inputStyle}
            type="number"
            min="0"
            step="0.01"
            value={incomeStr}
            onChange={(e) => setIncomeStr(e.target.value)}
          />
        </div>

        {/* 支出金额 */}
        <div>
          <label style={labelStyle}>支出金额</label>
          <input
            style={inputStyle}
            type="number"
            min="0"
            step="0.01"
            value={expenseStr}
            onChange={(e) => setExpenseStr(e.target.value)}
          />
        </div>

        {/* 预览结余 */}
        <div>
          <label style={labelStyle}>结余金额（自动计算）</label>
          <input
            style={{ ...inputStyle, backgroundColor: '#f5f5f5', color: '#999' }}
            value={previewBalance.toFixed(2)}
            readOnly
            disabled
          />
        </div>

        {/* 说明 */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>说明 / 备注</label>
          <input
            style={inputStyle}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="选填"
          />
        </div>

        {/* 凭证上传 */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>凭证图片</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" style={secondaryBtnStyle} onClick={handleSelectVoucher}>
              选择凭证
            </button>
            {voucherSource && (
              <span style={{ fontSize: 13, color: '#666' }}>
                已选择: {voucherSource.replace(/\\/g, '/').split('/').pop()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div style={{ marginTop: 20, textAlign: 'right' }}>
        <button
          type="button"
          style={{
            ...primaryBtnStyle,
            opacity: saving || validationError ? 0.6 : 1,
          }}
          disabled={saving || !!validationError}
          onClick={handleSave}
        >
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  );
}

// 内联样式（避免额外 CSS 文件，保持组件自包含）
const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 4,
  fontSize: 13,
  color: '#333',
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  fontSize: 14,
  outline: 'none',
  boxSizing: 'border-box',
};

const primaryBtnStyle: React.CSSProperties = {
  padding: '8px 24px',
  backgroundColor: '#1890ff',
  color: '#fff',
  border: 'none',
  borderRadius: 4,
  fontSize: 14,
  cursor: 'pointer',
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '6px 16px',
  backgroundColor: '#fff',
  color: '#333',
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  fontSize: 14,
  cursor: 'pointer',
};
