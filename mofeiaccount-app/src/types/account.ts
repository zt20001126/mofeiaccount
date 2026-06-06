/**
 * 核心数据结构定义 - 与 PRD 3.2 节的 Data Schema 完全对齐
 */

/** 单条账目记录，对应 Excel 中的一行 */
export interface AccountRecord {
  id: string;            // 流水号，格式: TX+年月日+4位自增码 (如: TX202606060001)
  time: string;          // 记账时间，格式: YYYY-MM-DD HH:mm:ss
  customerName: string;  // 客户名称（必填）
  income: number;        // 收款金额 (必须 >= 0)
  expense: number;       // 支出金额 (必须 >= 0)
  balance: number;       // 当前结余（自动计算，不可手动编辑）
  description: string;   // 备注说明（选填）
  voucher: string;       // 凭证图片的相对路径 (如: ./vouchers/TX202606060001.png)
}

/** 应用配置，持久化到本地沙盒 */
export interface AppConfig {
  workDir: string;       // 用户选择的本地工作目录绝对路径
}

/** Excel 中的一行原始数据（结余可能为空字符串） */
export interface RawExcelRow {
  '账目ID': string;
  '记账时间': string;
  '客户名称': string;
  '收款金额': number;
  '支出金额': number;
  '结余金额': number;
  '说明': string;
  '凭证': string;
}

/** Excel 列名到 TS 字段名的映射 */
export const EXCEL_COLUMN_MAP: Record<string, keyof AccountRecord> = {
  '账目ID': 'id',
  '记账时间': 'time',
  '客户名称': 'customerName',
  '收款金额': 'income',
  '支出金额': 'expense',
  '结余金额': 'balance',
  '说明': 'description',
  '凭证': 'voucher',
};

/** Excel 列名列表，按顺序 */
export const EXCEL_COLUMNS = [
  '账目ID',
  '记账时间',
  '客户名称',
  '收款金额',
  '支出金额',
  '结余金额',
  '说明',
  '凭证',
] as const;
