/**
 * Excel 读写服务 - 负责账本.xlsx 的解析与写入
 *
 * 使用 SheetJS (xlsx) 库操作 Excel 文件
 * 依赖 Tauri FS API 读写本地文件（二进制模式）
 * 依赖 Tauri Dialog API 选择文件夹
 *
 * 安全注意事项（PRD 第 4 节）：
 *   - 所有写入操作必须包含 Try-Catch，防止 Excel 文件损坏
 *   - 凭证路径统一使用相对路径存储
 */

import * as XLSX from 'xlsx';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import type { AccountRecord, RawExcelRow } from '../types/account';
import { EXCEL_COLUMNS } from '../types/account';

/** 账本文件名 */
export const LEDGER_FILENAME = '账本.xlsx';

/** 凭证文件夹名 */
export const VOUCHER_DIR = 'vouchers';

/**
 * 将 AccountRecord[] 转换为 Excel 工作表并写入磁盘
 *
 * @param records  账目列表（顺序即为 Excel 行序）
 * @param filePath 账本.xlsx 的完整路径
 * @throws 写入失败时抛出异常，由调用方处理
 */
export async function writeRecords(
  records: AccountRecord[],
  filePath: string,
): Promise<void> {
  try {
    // 将 AccountRecord[] 转为 Excel 行数据（中文列名）
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

    // 创建工作表
    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: [...EXCEL_COLUMNS],
    });

    // 设置列宽（提高可读性）
    worksheet['!cols'] = [
      { wch: 20 }, // 账目ID
      { wch: 20 }, // 记账时间
      { wch: 15 }, // 客户名称
      { wch: 12 }, // 收款金额
      { wch: 12 }, // 支出金额
      { wch: 12 }, // 结余金额
      { wch: 30 }, // 说明
      { wch: 35 }, // 凭证
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '账目流水');

    // 导出为二进制 buffer，写入磁盘
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    await writeFile(filePath, new Uint8Array(buffer));
  } catch (error) {
    // 包装异常以便上层统一处理
    throw new Error(`写入账本文件失败: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 从磁盘读取 账本.xlsx 并解析为 AccountRecord[]
 *
 * @param filePath 账本.xlsx 的完整路径
 * @returns 账目列表（空文件返回 []）
 * @throws 读取失败时抛出异常
 */
export async function readRecords(filePath: string): Promise<AccountRecord[]> {
  try {
    const data = await readFile(filePath);
    const workbook = XLSX.read(new Uint8Array(data), { type: 'array' });
    const sheetName = workbook.SheetNames[0];

    if (!sheetName) {
      // 工作表不存在（空文件），返回空数组
      return [];
    }

    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<RawExcelRow>(worksheet);

    // 将 Excel 行映射为 AccountRecord
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

/**
 * 生成唯一账目 ID
 * 格式: TX + YYYYMMDD + 4位自增序号（如 TX202606060001）
 *
 * @param existingIds 当天已有的账目 ID 列表
 * @returns 新 ID
 */
export function generateId(existingIds: string[]): string {
  const today = new Date();
  const dateStr = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('');

  const prefix = `TX${dateStr}`;

  // 找出当天已有的最大序号，在此基础上 +1
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

/**
 * 获取当前时间的格式化字符串
 * 格式: YYYY-MM-DD HH:mm:ss
 */
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
