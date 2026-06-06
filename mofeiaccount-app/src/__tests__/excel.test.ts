/**
 * ID 生成器 - 单元测试
 *
 * 验证 TX + YYYYMMDD + 4位序号 格式
 */

import { describe, it, expect } from 'vitest';
import { generateId, getCurrentTimeStr } from '../services/excel';

describe('generateId', () => {
  it('首个 ID 应为 TX + 当天日期 + 0001', () => {
    const id = generateId([]);
    const today = new Date();
    const dateStr = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('');
    expect(id).toBe(`TX${dateStr}0001`);
  });

  it('已有当天记录时，应递增序号', () => {
    const today = new Date();
    const dateStr = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('');
    const existing = [`TX${dateStr}0001`, `TX${dateStr}0002`, `TX${dateStr}0005`];
    const id = generateId(existing);
    expect(id).toBe(`TX${dateStr}0006`);
  });

  it('不同日期的序号互不影响', () => {
    const existing = ['TX202606050099']; // 前一天的第 99 号
    const id = generateId(existing);
    const today = new Date();
    const dateStr = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('');
    expect(id).toBe(`TX${dateStr}0001`);
  });

  it('ID 长度固定为 TX + 8位日期 + 4位序号 = 14 字符', () => {
    const id = generateId([]);
    expect(id.length).toBe(14);
    expect(id.startsWith('TX')).toBe(true);
  });
});

describe('getCurrentTimeStr', () => {
  it('应返回 YYYY-MM-DD HH:mm:ss 格式', () => {
    const result = getCurrentTimeStr();
    // 格式校验：2026-06-06 10:30:45
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});
