/**
 * 全局应用状态管理 - 简易 Hook
 *
 * 核心状态包括：
 *   - workDir: 当前工作目录
 *   - records: 账目列表（全量加载到内存）
 *   - loading: 全局加载状态（用于 Loading 遮罩，PRD 第 4 节，集成测试 IT-004）
 *   - error: 全局错误信息
 */

import { useState, useCallback, useEffect } from 'react';
import type { AccountRecord } from '../types/account';
import { initWorkDir } from '../services/config';
import { readRecords, writeRecords } from '../services/excel';
import { recalculateBalances } from '../services/balance';
import { join } from '@tauri-apps/api/path';
import { LEDGER_FILENAME } from '../services/excel';

export function useAppState() {
  const [workDir, setWorkDir] = useState<string | null>(null);
  const [records, setRecords] = useState<AccountRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 初始化：选择工作目录并加载数据 */
  const initialize = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const dir = await initWorkDir();
      setWorkDir(dir);

      const ledgerPath = await join(dir, LEDGER_FILENAME);
      const data = await readRecords(ledgerPath);
      setRecords(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  /** 新增一条账目，自动写入后端 */
  const addRecord = useCallback(async (record: AccountRecord) => {
    if (!workDir) return;
    try {
      setLoading(true);
      setError(null);

      const newRecords = [...records, record];
      const recalculated = recalculateBalances(newRecords);
      const ledgerPath = await join(workDir, LEDGER_FILENAME);
      await writeRecords(recalculated, ledgerPath);
      setRecords(recalculated);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e; // 让调用方知道失败了
    } finally {
      setLoading(false);
    }
  }, [records, workDir]);

  /** 修改一笔历史账目，接收更新后的全量列表 */
  const updateRecord = useCallback(async (
    updatedRecords: AccountRecord[],
  ) => {
    if (!workDir) return;
    try {
      setLoading(true);
      setError(null);

      const recalculated = recalculateBalances(updatedRecords);
      const ledgerPath = await join(workDir, LEDGER_FILENAME);
      await writeRecords(recalculated, ledgerPath);
      setRecords(recalculated);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [workDir]);

  /** 获取上笔结余 */
  const getLastBalance = useCallback((): number => {
    if (records.length === 0) return 0;
    return records[records.length - 1].balance;
  }, [records]);

  /** 清除错误 */
  const clearError = useCallback(() => setError(null), []);

  return {
    workDir,
    records,
    loading,
    error,
    initialize,
    addRecord,
    updateRecord,
    getLastBalance,
    clearError,
  };
}
