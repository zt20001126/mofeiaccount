/**
 * 修改账目弹窗组件
 *
 * PRD 3.3 模块二：
 *   - 弹出内容与新增表单一致，但回显已有数据
 *   - 联动修改：修改收款/支出后自动重算后续所有结余
 */

import { useState, useMemo } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import type { AccountRecord } from '../types/account';
import type { ToastMessage } from './Toast';

interface EditRecordModalProps {
  visible: boolean;
  record: AccountRecord | null;
  onClose: () => void;
  onSave: (updatedRecord: AccountRecord) => Promise<void>;
  onAddToast: (type: ToastMessage['type'], text: string) => void;
}

export function EditRecordModal({
  visible,
  record,
  onClose,
  onSave,
  onAddToast,
}: EditRecordModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [incomeStr, setIncomeStr] = useState('');
  const [expenseStr, setExpenseStr] = useState('');
  const [description, setDescription] = useState('');
  const [voucherSource, setVoucherSource] = useState('');
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // 当 record 变化时，回显数据
  if (record && !initialized) {
    setCustomerName(record.customerName);
    setIncomeStr(String(record.income));
    setExpenseStr(String(record.expense));
    setDescription(record.description);
    setVoucherSource(record.voucher);
    setInitialized(true);
  }

  // record 变化时重置初始化状态
  if (record && initialized && customerName !== record.customerName) {
    setCustomerName(record.customerName);
    setIncomeStr(String(record.income));
    setExpenseStr(String(record.expense));
    setDescription(record.description);
    setVoucherSource(record.voucher);
  }

  const income = parseFloat(incomeStr) || 0;
  const expense = parseFloat(expenseStr) || 0;

  const validationError = useMemo(() => {
    if (!customerName.trim()) return '请输入客户名称';
    if (isNaN(income) || income < 0) return '请输入合法的收款金额';
    if (isNaN(expense) || expense < 0) return '请输入合法的支出金额';
    return null;
  }, [customerName, income, expense]);

  const handleSelectVoucher = async () => {
    try {
      const selected = await open({
        multiple: false,
        title: '选择凭证图片',
        filters: [{ name: '图片文件', extensions: ['jpg', 'jpeg', 'png'] }],
      });
      if (selected && typeof selected === 'string') {
        setVoucherSource(selected);
      }
    } catch {
      onAddToast('error', '打开文件选择器失败');
    }
  };

  const handleSave = async () => {
    if (validationError) {
      onAddToast('error', validationError);
      return;
    }

    if (!record) return;

    try {
      setSaving(true);

      const updated: AccountRecord = {
        ...record,
        customerName: customerName.trim(),
        income,
        expense,
        description: description.trim(),
        voucher: voucherSource,
      };

      await onSave(updated);
      onAddToast('success', '修改成功');
      handleClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : '修改失败';
      onAddToast('error', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setInitialized(false);
    onClose();
  };

  if (!visible || !record) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 8500,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 8,
          padding: 24,
          minWidth: 480,
          maxWidth: 560,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0 }}>修改账目 - {record.id}</h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
          <div>
            <label style={labelStyle}>客户名称 *</label>
            <input
              style={inputStyle}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
          <div></div>

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

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>说明 / 备注</label>
            <input
              style={inputStyle}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>凭证图片</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button type="button" style={secondaryBtnStyle} onClick={handleSelectVoucher}>
                重新选择
              </button>
              {voucherSource && (
                <span style={{ fontSize: 13, color: '#666' }}>
                  {voucherSource.replace(/\\/g, '/').split('/').pop()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={{
          marginTop: 16,
          padding: '8px 12px',
          backgroundColor: '#fff7e6',
          borderRadius: 4,
          fontSize: 13,
          color: '#ad6800',
        }}>
          修改收款/支出金额后，该笔及之后所有账目的结余将被自动重新计算
        </div>

        <div style={{ marginTop: 20, textAlign: 'right', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" style={secondaryBtnStyle} onClick={handleClose}>
            取消
          </button>
          <button
            type="button"
            style={{
              ...primaryBtnStyle,
              opacity: saving || validationError ? 0.6 : 1,
            }}
            disabled={saving || !!validationError}
            onClick={handleSave}
          >
            {saving ? '保存中…' : '保存修改'}
          </button>
        </div>
      </div>
    </div>
  );
}

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
