/**
 * 凭证文件服务 - 负责图片文件的复制和路径管理
 *
 * PRD 3.3 模块一：图片转存逻辑
 *   - 将用户选择的图片复制到 /vouchers/ 文件夹
 *   - 重命名为 [账目ID].png
 *   - Excel 中存储相对路径，保证跨机器可迁移
 */

import { copyFileCmd } from './excel';

const VOUCHER_RELATIVE_PREFIX = './vouchers/';

/** 拼接完整路径 */
function joinPath(base: string, ...parts: string[]): string {
  const normalized = base.replace(/\\/g, '/').replace(/\/$/, '');
  const segments = parts.map((p) => p.replace(/\\/g, '/').replace(/^\/+/, ''));
  return [normalized, ...segments].join('/');
}

/**
 * 将用户选中的图片复制到工作目录的 vouchers 文件夹
 */
export async function copyVoucher(
  sourcePath: string,
  recordId: string,
  workDir: string,
): Promise<string> {
  const extMatch = sourcePath.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1] : 'png';
  const fileName = `${recordId}.${ext}`;

  const destPath = joinPath(workDir, 'vouchers', fileName);

  await copyFileCmd(sourcePath, destPath);

  return `${VOUCHER_RELATIVE_PREFIX}${fileName}`;
}

/**
 * 根据相对路径和 workDir 拼接凭证图片的绝对路径
 */
export function resolveVoucherPath(
  relativePath: string,
  workDir: string,
): string {
  const fileName = relativePath.replace(/^\.\/vouchers\//, '');
  return joinPath(workDir, 'vouchers', fileName);
}
