/**
 * 全局应用状态管理 - 简易 Hook
 *
 * 核心状态包括：
 *   - workDir: 当前工作目录
 *   - records: 账目列表（全量加载到内存）
 *   - loading: 全局加载状态（用于 Loading 遮罩，PRD 第 4 节，集成测试 IT-004）
 *   - error: 全局错误信息
 */

import { useState, useCallback } from 'react';
import type { AccountRecord } from '../types/account';
import { initWorkDir } from '../services/config';
import { readRecords, writeRecords, LEDGER_FILENAME } from '../services/excel';
import { recalculateBalances } from '../services/balance';

/** 拼接路径（与 config.ts 保持一致） */
function joinPath(base: string, ...parts: string[]): string {
  const normalized = base.replace(/\\/g, '/').replace(/\/$/, '');
  const segments = parts.map((p) => p.replace(/\\/g, '/').replace(/^\/+/, ''));
  return [normalized, ...segments].join('/');
}

export function useAppState() {
  const [workDir, setWorkDir] = useState<string | null>(null);
  const [records, setRecords] = useState<AccountRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialize = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const dir = await initWorkDir();
      setWorkDir(dir);
      const ledgerPath = joinPath(dir, LEDGER_FILENAME);
      const data = await readRecords(ledgerPath);
      setRecords(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const addRecord = useCallback(async (record: AccountRecord) => {
    if (!workDir) return;
    try {
      setLoading(true);
      setError(null);
      const newRecords = [...records, record];
      const recalculated = recalculateBalances(newRecords);
      const ledgerPath = joinPath(workDir, LEDGER_FILENAME);
      await writeRecords(recalculated, ledgerPath);
      setRecords(recalculated);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [records, workDir]);

  const updateRecord = useCallback(async (updatedRecords: AccountRecord[]) => {
    if (!workDir) return;
    try {
      setLoading(true);
      setError(null);
      const recalculated = recalculateBalances(updatedRecords);
      const ledgerPath = joinPath(workDir, LEDGER_FILENAME);
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

  const getLastBalance = useCallback((): number => {
    if (records.length === 0) return 0;
    return records[records.length - 1].balance;
  }, [records]);

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
