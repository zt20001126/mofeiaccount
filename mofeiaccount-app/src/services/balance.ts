/**
 * 结余计算核心算法 - 纯函数，不依赖任何外部状态
 *
 * 算法规则（PRD 3.2 节）：
 *   每笔结余 = 上一笔结余 + 本次收款 - 本次支出
 *
 * 适用场景：
 *   1. 新增账目追加到末尾时，全量重算
 *   2. 修改历史账目的收款/支出金额后，全量重算（PRD 3.3 模块二联动修改）
 *
 * 注意：输入数组必须已按时间正序排列，否则结余链会错乱
 */

import type { AccountRecord } from '../types/account';

/**
 * 根据历史记录，重新计算全量数据的结余
 * @param records 原始账目列表（按时间正序排列）
 * @returns 计算完最新结余的账目列表（新数组，不修改原数组）
 */
export function recalculateBalances(records: AccountRecord[]): AccountRecord[] {
  let currentBalance = 0;
  return records.map((record) => {
    currentBalance = currentBalance + record.income - record.expense;
    return {
      ...record,
      balance: currentBalance,
    };
  });
}

/**
 * 计算单笔新增记录的结余预览值（不修改现有数据）
 * @param lastBalance 上一笔账目的结余（若无历史记录则为 0）
 * @param income     本次收款金额
 * @param expense    本次支出金额
 * @returns 预览结余
 */
export function calculatePreviewBalance(
  lastBalance: number,
  income: number,
  expense: number,
): number {
  return lastBalance + income - expense;
}
