/**
 * Excel 读写服务 - 负责账本.xlsx 的解析与写入
 *
 * 使用 SheetJS (xlsx) 库操作 Excel 文件
 * 通过 Rust 自定义命令读写本地文件（绕过 Tauri fs 插件 ACL 限制）
 * PRD 第 4 节：所有写入操作必须包含 Try-Catch，防止 Excel 文件损坏
 */

import * as XLSX from 'xlsx';
import { invoke } from '@tauri-apps/api/core';
import type { AccountRecord, RawExcelRow } from '../types/account';
import { EXCEL_COLUMNS } from '../types/account';

/** 账本文件名 */
export const LEDGER_FILENAME = '账本.xlsx';

/** 凭证文件夹名 */
export const VOUCHER_DIR = 'vouchers';

/**
 * 通过 Rust 命令读取二进制文件
 */
async function readBytes(path: string): Promise<Uint8Array> {
  const data = await invoke<number[]>('read_file_bytes', { path });
  return new Uint8Array(data);
}

/**
 * 通过 Rust 命令写入二进制文件
 */
async function writeBytes(path: string, data: Uint8Array): Promise<void> {
  await invoke('write_file_bytes', { path, data: Array.from(data) });
}

/**
 * 通过 Rust 命令检查路径是否存在
 */
export async function checkExists(path: string): Promise<boolean> {
  return invoke<boolean>('check_exists', { path });
}

/**
 * 通过 Rust 命令创建目录
 */
export async function makeDir(path: string): Promise<void> {
  await invoke('make_dir', { path });
}

/**
 * 通过 Rust 命令复制文件
 */
export async function copyFileCmd(src: string, dest: string): Promise<void> {
  await invoke('copy_file_cmd', { src, dest });
}

/**
 * 将 AccountRecord[] 转换为 Excel 工作表并写入磁盘
 */
export async function writeRecords(
  records: AccountRecord[],
  filePath: string,
): Promise<void> {
  try {
    const rows: RawExcelRow[] = records.map((r) => ({
      '账目ID': r.id,
      '记账时间': r.time,
      '客户名称': r.customerName,
      '收款金额': r.income,
      '支出金额': r.expense,
      '结余金额': r.balance,
      '说明': r.description,
      '凭证': r.voucher,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: [...EXCEL_COLUMNS],
    });

    worksheet['!cols'] = [
      { wch: 20 },
      { wch: 20 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 30 },
      { wch: 35 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '账目流水');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    await writeBytes(filePath, new Uint8Array(buffer));
  } catch (error) {
    throw new Error(`写入账本文件失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 从磁盘读取 账本.xlsx 并解析为 AccountRecord[]
 */
export async function readRecords(filePath: string): Promise<AccountRecord[]> {
  try {
    const data = await readBytes(filePath);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      return [];
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<RawExcelRow>(worksheet);

    return rows.map((row) => ({
      id: String(row['账目ID'] ?? ''),
      time: String(row['记账时间'] ?? ''),
      customerName: String(row['客户名称'] ?? ''),
      income: Number(row['收款金额']) || 0,
      expense: Number(row['支出金额']) || 0,
      balance: Number(row['结余金额']) || 0,
      description: String(row['说明'] ?? ''),
      voucher: String(row['凭证'] ?? ''),
    }));
  } catch (error) {
    throw new Error(`读取账本文件失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** 生成唯一账目 ID，格式: TX + YYYYMMDD + 4位序号 */
export function generateId(existingIds: string[]): string {
  const today = new Date();
  const dateStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('');
  const prefix = `TX${dateStr}`;

  let maxSeq = 0;
  for (const id of existingIds) {
    if (id.startsWith(prefix)) {
      const seq = parseInt(id.slice(prefix.length), 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

/** 获取当前时间格式化字符串 */
export function getCurrentTimeStr(): string {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  const timePart = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join(':');
  return `${datePart} ${timePart}`;
}
