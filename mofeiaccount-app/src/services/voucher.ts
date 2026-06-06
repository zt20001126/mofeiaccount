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
 *
 * @param sourcePath 用户选中的图片绝对路径
 * @param recordId   账目 ID（用作文件名）
 * @param workDir    工作目录绝对路径
 * @returns 凭证图片的相对路径（写入 Excel 的值，如 ./vouchers/TX202606060001.png）
 */
export async function copyVoucher(
  sourcePath: string,
  recordId: string,
  workDir: string,
): Promise<string> {
  // 提取源文件扩展名
  const extMatch = sourcePath.match(/\.([a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1] : 'png';
  const fileName = `${recordId}.${ext}`;

  const destPath = joinPath(workDir, 'vouchers', fileName);

  // 通过 Rust 命令复制文件
  await copyFileCmd(sourcePath, destPath);

  return `${VOUCHER_RELATIVE_PREFIX}${fileName}`;
}
