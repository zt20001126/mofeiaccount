/**
 * 应用配置服务 - 负责工作目录的持久化
 *
 * 使用 Tauri 提供的本地配置文件存储（应用沙盒内）
 * 首次启动需引导用户选择工作目录，之后自动加载
 *
 * PRD 3.1 节：目录初始化与配置文件管理
 */

import { exists, mkdir } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-dialog';
import { join } from '@tauri-apps/api/path';
import type { AppConfig } from '../types/account';
import { LEDGER_FILENAME, VOUCHER_DIR, writeRecords } from './excel';

/** localStorage 中存储 workDir 的 key */
const WORK_DIR_KEY = 'app_work_dir';

/** 配置文件路径（存储于 localStorage） */
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

/** 获取当前工作目录 */
export function getWorkDir(): string | null {
  const config = getConfig();
  return config?.workDir ?? null;
}

/**
 * 初始化工作目录
 *
 * 流程：
 *   1. 尝试读取已有配置 → 验证目录是否存在
 *   2. 若无配置或目录已不存在 → 弹出文件夹选择器
 *   3. 选定后自动创建 账本.xlsx 和 /vouchers/ 文件夹
 *   4. 保存配置到 localStorage
 *
 * @returns 工作目录路径
 */
export async function initWorkDir(): Promise<string> {
  // 1. 尝试已有配置
  const existingConfig = getConfig();
  if (existingConfig?.workDir) {
    const dirExists = await exists(existingConfig.workDir);
    if (dirExists) {
      return existingConfig.workDir;
    }
  }

  // 2. 弹出文件夹选择器
  const selected = await open({
    directory: true,
    multiple: false,
    title: '选择记账工作目录',
  });

  if (!selected || typeof selected !== 'string') {
    throw new Error('未选择工作目录，软件无法使用');
  }

  const workDir = selected;

  // 3. 创建必要的子目录和文件
  const voucherDir = await join(workDir, VOUCHER_DIR);
  if (!(await exists(voucherDir))) {
    await mkdir(voucherDir, { recursive: true });
  }

  // 创建空账本文件（仅表头）
  const ledgerPath = await join(workDir, LEDGER_FILENAME);
  if (!(await exists(ledgerPath))) {
    await writeRecords([], ledgerPath);
  }

  // 4. 保存配置
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

  const workDir = selected;

  const voucherDir = await join(workDir, VOUCHER_DIR);
  if (!(await exists(voucherDir))) {
    await mkdir(voucherDir, { recursive: true });
  }

  const ledgerPath = await join(workDir, LEDGER_FILENAME);
  if (!(await exists(ledgerPath))) {
    await writeRecords([], ledgerPath);
  }

  saveConfig({ workDir });

  return workDir;
}
