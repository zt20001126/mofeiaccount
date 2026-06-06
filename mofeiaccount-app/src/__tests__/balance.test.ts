/**
 * 结余计算核心算法 - 单元测试
 *
 * 覆盖 TDD 3.1 节定义的 UT-001 ~ UT-004
 */

import { describe, it, expect } from 'vitest';
import { recalculateBalances, calculatePreviewBalance } from '../services/balance';
import type { AccountRecord } from '../types/account';

/** 辅助函数：创建一个基础账目记录 */
function makeRecord(overrides: Partial<AccountRecord> = {}): AccountRecord {
  return {
    id: 'TX202606060001',
    time: '2026-06-06 10:00:00',
    customerName: '测试客户',
    income: 0,
    expense: 0,
    balance: 0,
    description: '',
    voucher: '',
    ...overrides,
  };
}

describe('recalculateBalances', () => {
  // UT-001: 初始第一笔账目计算
  it('UT-001: 首笔账目 — 收入 1000，支出 0 → 结余应为 1000', () => {
    const input: AccountRecord[] = [
      makeRecord({ id: 'TX202606060001', income: 1000, expense: 0 }),
    ];
    const result = recalculateBalances(input);
    expect(result[0].balance).toBe(1000);
  });

  // UT-002: 连续账目正常流转
  it('UT-002: 连续两笔 — 第一笔结余 1000，第二笔收入 500 支出 200 → 第二笔结余 1300', () => {
    const input: AccountRecord[] = [
      makeRecord({ id: 'TX202606060001', income: 1000, expense: 0 }),
      makeRecord({ id: 'TX202606060002', income: 500, expense: 200 }),
    ];
    const result = recalculateBalances(input);
    expect(result[0].balance).toBe(1000);
    expect(result[1].balance).toBe(1300);
  });

  // UT-003: 产生负结余
  it('UT-003: 负结余场景 — 第一笔结余 1000，第二笔收入 0 支出 1500 → 第二笔结余 -500', () => {
    const input: AccountRecord[] = [
      makeRecord({ id: 'TX202606060001', income: 1000, expense: 0 }),
      makeRecord({ id: 'TX202606060002', income: 0, expense: 1500 }),
    ];
    const result = recalculateBalances(input);
    expect(result[0].balance).toBe(1000);
    expect(result[1].balance).toBe(-500);
  });

  // UT-004: 历史账目修改后重算
  it('UT-004: 修改历史第二笔收入 200→300 → 尾笔结余从 250 变为 350', () => {
    // 原始三笔: +100, +200(余300), -50(余250)
    const modified: AccountRecord[] = [
      makeRecord({ id: 'TX202606060001', income: 100, expense: 0 }),
      makeRecord({ id: 'TX202606060002', income: 300, expense: 0 }), // 从 200 改为 300
      makeRecord({ id: 'TX202606060003', income: 0, expense: 50 }),
    ];
    const result = recalculateBalances(modified);
    expect(result[0].balance).toBe(100);
    expect(result[1].balance).toBe(400);  // 100 + 300
    expect(result[2].balance).toBe(350);  // 400 - 50
  });

  // 空数组
  it('空数组应返回空数组', () => {
    const result = recalculateBalances([]);
    expect(result).toEqual([]);
  });

  // 不修改原数组
  it('应返回新数组，不修改原数组', () => {
    const input: AccountRecord[] = [
      makeRecord({ id: 'TX202606060001', income: 500, expense: 0 }),
    ];
    const inputCopy = structuredClone(input);
    const result = recalculateBalances(input);
    expect(result).not.toBe(input);
    expect(input).toEqual(inputCopy); // 原数组未变
  });
});

describe('calculatePreviewBalance', () => {
  it('无历史记录时，预览结余 = 收入 - 支出', () => {
    expect(calculatePreviewBalance(0, 2000, 500)).toBe(1500);
  });

  it('有历史结余时，累加计算', () => {
    expect(calculatePreviewBalance(3000, 1000, 200)).toBe(3800);
  });
});
