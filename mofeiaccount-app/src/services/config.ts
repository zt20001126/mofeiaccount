/**
 * 应用配置服务 - 负责工作目录的持久化
 *
 * 首次启动需引导用户选择工作目录，之后自动加载
 * PRD 3.1 节：目录初始化与配置文件管理
 */

import { open } from '@tauri-apps/plugin-dialog';
import type { AppConfig } from '../types/account';
import { LEDGER_FILENAME, VOUCHER_DIR, writeRecords, checkExists, makeDir } from './excel';

const WORK_DIR_KEY = 'app_work_dir';

function getConfig(): AppConfig | null {
  try {
    const raw = localStorage.getItem(WORK_DIR_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppConfig;
  } catch {
    return null;
  }
}

function saveConfig(config: AppConfig): void {
  localStorage.setItem(WORK_DIR_KEY, JSON.stringify(config));
}

export function getWorkDir(): string | null {
  const config = getConfig();
  return config?.workDir ?? null;
}

/** 拼接完整路径（前端兜底，Tauri join 在 Rust 命令中不适用） */
function joinPath(base: string, ...parts: string[]): string {
  const normalized = base.replace(/\\/g, '/').replace(/\/$/, '');
  const segments = parts.map((p) => p.replace(/\\/g, '/').replace(/^\/+/, ''));
  return [normalized, ...segments].join('/');
}

/**
 * 初始化工作目录
 */
export async function initWorkDir(): Promise<string> {
  const existingConfig = getConfig();
  if (existingConfig?.workDir) {
    const dirExists = await checkExists(existingConfig.workDir);
    if (dirExists) {
      return existingConfig.workDir.replace(/\\/g, '/');
    }
  }

  const selected = await open({
    directory: true,
    multiple: false,
    title: '选择记账工作目录',
  });

  if (!selected || typeof selected !== 'string') {
    throw new Error('未选择工作目录，软件无法使用');
  }

  const workDir = selected.replace(/\\/g, '/');

  // 创建 /vouchers/ 文件夹
  const voucherDir = joinPath(workDir, VOUCHER_DIR);
  if (!(await checkExists(voucherDir))) {
    await makeDir(voucherDir);
  }

  // 创建空账本文件
  const ledgerPath = joinPath(workDir, LEDGER_FILENAME);
  if (!(await checkExists(ledgerPath))) {
    await writeRecords([], ledgerPath);
  }

  saveConfig({ workDir });

  return workDir;
}

/**
 * 更换工作目录
 */
export async function changeWorkDir(): Promise<string> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: '选择新的记账工作目录',
  });

  if (!selected || typeof selected !== 'string') {
    throw new Error('未选择工作目录');
  }

  const workDir = selected.replace(/\\/g, '/');

  const voucherDir = joinPath(workDir, VOUCHER_DIR);
  if (!(await checkExists(voucherDir))) {
    await makeDir(voucherDir);
  }

  const ledgerPath = joinPath(workDir, LEDGER_FILENAME);
  if (!(await checkExists(ledgerPath))) {
    await writeRecords([], ledgerPath);
  }

  saveConfig({ workDir });

  return workDir;
}
