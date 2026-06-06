/**
 * App 根组件 - 简易本地记账软件主界面
 *
 * 整合三个核心模块：
 *   1. 新增记账表单
 *   2. 历史账目列表
 *   3. 修改账目弹窗
 *
 * 生命周期：启动时自动初始化工作目录 → 加载 Excel 数据 → 展示界面
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAppState } from './hooks/useAppState';
import { AddRecordForm } from './components/AddRecordForm';
import { RecordTable } from './components/RecordTable';
import { EditRecordModal } from './components/EditRecordModal';
import { ToastContainer, useToast } from './components/Toast';
import { LoadingOverlay } from './components/LoadingOverlay';
import { changeWorkDir } from './services/config';
import type { AccountRecord } from './types/account';

function App() {
  const {
    workDir,
    records,
    loading,
    error,
    initialize,
    addRecord,
    updateRecord,
    getLastBalance,
    clearError,
  } = useAppState();

  const { toasts, addToast, removeToast } = useToast();
  const [editTarget, setEditTarget] = useState<AccountRecord | null>(null);
  const [initialized, setInitialized] = useState(false);

  // 筛选状态
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterCustomerName, setFilterCustomerName] = useState('');

  // 基于筛选条件过滤 records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // 日期范围筛选：time 格式为 "YYYY-MM-DD HH:mm:ss"，取前 10 位与起止日期比较
      if (filterDateStart) {
        if (r.time.slice(0, 10) < filterDateStart) return false;
      }
      if (filterDateEnd) {
        if (r.time.slice(0, 10) > filterDateEnd) return false;
      }
      // 客户名称搜索：不区分大小写子串匹配
      if (filterCustomerName.trim()) {
        const keyword = filterCustomerName.trim().toLowerCase();
        if (!r.customerName.toLowerCase().includes(keyword)) return false;
      }
      return true;
    });
  }, [records, filterDateStart, filterDateEnd, filterCustomerName]);

  // 清除所有筛选条件
  const handleClearFilters = () => {
    setFilterDateStart('');
    setFilterDateEnd('');
    setFilterCustomerName('');
  };

  // 启动时初始化
  useEffect(() => {
    initialize().then(() => setInitialized(true));
  }, []);

  // 全局错误 → Toast
  useEffect(() => {
    if (error) {
      addToast('error', error);
      clearError();
    }
  }, [error, clearError, addToast]);

  // 获取已有 ID 列表（用于生成新 ID）
  const existingIds = records.map((r) => r.id);

  // 打开修改弹窗
  const handleEdit = useCallback((record: AccountRecord) => {
    setEditTarget(record);
  }, []);

  // 保存修改：构建完整的更新后列表
  const handleEditSave = useCallback(async (updatedRecord: AccountRecord) => {
    const updatedList = records.map((r) =>
      r.id === updatedRecord.id ? updatedRecord : r,
    );
    await updateRecord(updatedList);
  }, [records, updateRecord]);

  // 更换工作目录
  const handleChangeDir = async () => {
    try {
      await changeWorkDir();
      await initialize();
      addToast('success', '工作目录已更换');
    } catch (e) {
      const msg = e instanceof Error ? e.message : '切换目录失败';
      addToast('error', msg);
    }
  };

  // 初始化中
  if (!initialized) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        color: '#999',
        fontSize: 16,
      }}>
        正在初始化…
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f0f2f5',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    }}>
      {/* 顶部栏 */}
      <header style={{
        backgroundColor: '#fff',
        padding: '12px 24px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
          莫非记账
        </h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#666' }}>
            工作目录: {workDir}
          </span>
          <button
            style={{
              padding: '4px 12px',
              border: '1px solid #d9d9d9',
              borderRadius: 4,
              backgroundColor: '#fff',
              cursor: 'pointer',
              fontSize: 13,
            }}
            onClick={handleChangeDir}
          >
            更换目录
          </button>
        </div>
      </header>

      {/* 主体内容 */}
      <main style={{
        maxWidth: 1200,
        margin: '24px auto',
        padding: '0 24px',
      }}>
        {/* 新增记账表单 */}
        <AddRecordForm
          workDir={workDir ?? ''}
          lastBalance={getLastBalance()}
          existingIds={existingIds}
          onSave={addRecord}
          onAddToast={addToast}
        />

        {/* 账目统计 */}
        <div style={{
          display: 'flex',
          gap: 24,
          margin: '20px 0',
        }}>
          <StatCard label="总账目数" value={`${filteredRecords.length} 笔`} />
          <StatCard
            label="最新结余"
            value={`${getLastBalance().toFixed(2)} 元`}
            highlight={getLastBalance() < 0}
          />
        </div>

        {/* 历史账目列表 */}
        <div style={{
          backgroundColor: '#fff',
          borderRadius: 8,
          padding: 20,
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: 18 }}>
            账目流水
          </h2>

          {/* 筛选栏 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 16,
            padding: '10px 14px',
            backgroundColor: '#fafafa',
            borderRadius: 6,
            flexWrap: 'wrap',
          }}>
            <label style={{ fontSize: 13, color: '#666', whiteSpace: 'nowrap' }}>
              日期范围:
            </label>
            <input
              type="date"
              value={filterDateStart}
              onChange={(e) => setFilterDateStart(e.target.value)}
              style={filterInputStyle}
            />
            <span style={{ color: '#999', fontSize: 13 }}>至</span>
            <input
              type="date"
              value={filterDateEnd}
              onChange={(e) => setFilterDateEnd(e.target.value)}
              style={filterInputStyle}
            />
            <label style={{ fontSize: 13, color: '#666', whiteSpace: 'nowrap', marginLeft: 8 }}>
              客户名称:
            </label>
            <input
              type="text"
              value={filterCustomerName}
              onChange={(e) => setFilterCustomerName(e.target.value)}
              placeholder="搜索客户…"
              style={{ ...filterInputStyle, width: 140 }}
            />
            <button
              style={{
                padding: '5px 14px',
                backgroundColor: '#fff',
                color: '#666',
                border: '1px solid #d9d9d9',
                borderRadius: 4,
                fontSize: 13,
                cursor: 'pointer',
                marginLeft: 4,
              }}
              onClick={handleClearFilters}
            >
              清除筛选
            </button>
            <span style={{ fontSize: 12, color: '#999', marginLeft: 4 }}>
              {filteredRecords.length !== records.length
                ? `显示 ${filteredRecords.length} / ${records.length} 条`
                : `共 ${records.length} 条`}
            </span>
          </div>

          <RecordTable
            records={filteredRecords}
            workDir={workDir ?? ''}
            onEdit={handleEdit}
          />
        </div>
      </main>

      {/* 修改弹窗 */}
      <EditRecordModal
        visible={!!editTarget}
        record={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleEditSave}
        onAddToast={addToast}
      />

      {/* 全局组件 */}
      <LoadingOverlay visible={loading} />
      <ToastContainer messages={toasts} onRemove={removeToast} />
    </div>
  );
}

const filterInputStyle: React.CSSProperties = {
  padding: '5px 8px',
  border: '1px solid #d9d9d9',
  borderRadius: 4,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
};

/** 统计卡片小组件 */
function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: 8,
      padding: '16px 24px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      flex: 1,
    }}>
      <div style={{ fontSize: 13, color: '#999' }}>{label}</div>
      <div style={{
        fontSize: 22,
        fontWeight: 600,
        marginTop: 4,
        color: highlight ? '#ff4d4f' : '#333',
      }}>
        {value}
      </div>
    </div>
  );
}

export default App;
