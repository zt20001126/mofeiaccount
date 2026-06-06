/**
 * 账目列表表格组件
 *
 * PRD 3.3 模块二：
 *   - 表格展示所有账目字段
 *   - 凭证列可点击预览
 *   - 每行设"修改"按钮
 *   - 结余列置灰不可编辑
 */

import { useState } from 'react';
import type { AccountRecord } from '../types/account';
import { resolveVoucherPath } from '../services/voucher';
import { VoucherPreview } from './VoucherPreview';

interface RecordTableProps {
  records: AccountRecord[];
  workDir: string;
  onEdit: (record: AccountRecord) => void;
}

export function RecordTable({ records, workDir, onEdit }: RecordTableProps) {
  const [previewPath, setPreviewPath] = useState<string | null>(null);

  const handlePreviewVoucher = async (record: AccountRecord) => {
    if (!record.voucher) return;
    try {
      const absPath = await resolveVoucherPath(record.voucher, workDir);
      setPreviewPath(absPath);
    } catch {
      setPreviewPath(null);
    }
  };

  if (records.length === 0) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        color: '#999',
        fontSize: 15,
      }}>
        暂无账目记录，请先新增记账
      </div>
    );
  }

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 14,
        }}>
          <thead>
            <tr style={{ backgroundColor: '#fafafa', borderBottom: '2px solid #e8e8e8' }}>
              <th style={thStyle}>账目ID</th>
              <th style={thStyle}>记账时间</th>
              <th style={thStyle}>客户名称</th>
              <th style={thStyle}>收款金额</th>
              <th style={thStyle}>支出金额</th>
              <th style={{ ...thStyle, color: '#999' }}>结余金额</th>
              <th style={thStyle}>说明</th>
              <th style={thStyle}>凭证</th>
              <th style={thStyle}>操作</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={tdStyle}>{record.id}</td>
                <td style={tdStyle}>{record.time}</td>
                <td style={tdStyle}>{record.customerName}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  {record.income.toFixed(2)}
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>
                  {record.expense.toFixed(2)}
                </td>
                <td style={{
                  ...tdStyle,
                  textAlign: 'right',
                  color: '#999',
                  backgroundColor: '#fafafa',
                  fontWeight: 500,
                }}>
                  {record.balance.toFixed(2)}
                </td>
                <td style={tdStyle}>{record.description || '-'}</td>
                <td style={tdStyle}>
                  {record.voucher ? (
                    <span
                      style={{ color: '#1890ff', cursor: 'pointer', fontSize: 13 }}
                      onClick={() => handlePreviewVoucher(record)}
                    >
                      {record.voucher.replace(/^\.\/vouchers\//, '')}
                    </span>
                  ) : (
                    <span style={{ color: '#ccc' }}>-</span>
                  )}
                </td>
                <td style={tdStyle}>
                  <button
                    style={{
                      padding: '4px 12px',
                      backgroundColor: '#fff',
                      color: '#1890ff',
                      border: '1px solid #1890ff',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 13,
                    }}
                    onClick={() => onEdit(record)}
                  >
                    修改
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <VoucherPreview
        visible={!!previewPath}
        imagePath={previewPath || ''}
        onClose={() => setPreviewPath(null)}
      />
    </>
  );
}

const thStyle: React.CSSProperties = {
  padding: '10px 8px',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: 13,
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '8px',
  fontSize: 13,
  maxWidth: 200,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};
