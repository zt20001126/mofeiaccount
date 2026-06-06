/**
 * 凭证文件服务 - 负责图片文件的复制和路径管理
 *
 * PRD 3.3 模块一：图片转存逻辑
 *   - 将用户选择的图片复制到 /vouchers/ 文件夹
 *   - 重命名为 [账目ID].png
 *   - Excel 中存储相对路径，保证跨机器可迁移（PRD 第 4 节）
 */

import { copyFile } from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';

/** 凭证文件在 Excel 中的相对路径前缀 */
const VOUCHER_RELATIVE_PREFIX = './vouchers/';

/**
 * 将用户选中的图片复制到工作目录的 vouchers 文件夹
 *
 * @param sourcePath 用户选中的图片绝对路径
 * @param recordId   账目 ID（用作文件名）
 * @param workDir    工作目录绝对路径
 * @returns 凭证图片的相对路径（写入 Excel 的值）
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

  const destPath = await join(workDir, 'vouchers', fileName);

  await copyFile(sourcePath, destPath);

  return `${VOUCHER_RELATIVE_PREFIX}${fileName}`;
}

/**
 * 根据相对路径和 workDir 拼接凭证图片的绝对路径
 *
 * @param relativePath Excel 中存储的相对路径
 * @param workDir      工作目录绝对路径
 * @returns 凭证图片的绝对路径
 */
export async function resolveVoucherPath(
  relativePath: string,
  workDir: string,
): Promise<string> {
  // 去掉相对路径前缀 "./vouchers/"
  const fileName = relativePath.replace(/^\.\/vouchers\//, '');
  return join(workDir, 'vouchers', fileName);
}

/**
 * 将绝对路径转换为相对路径（用于更换工作目录后更新数据）
 */
export function toRelativePath(absolutePath: string, _workDir: string): string {
  const parts = absolutePath.replace(/\\/g, '/').split('/');
  const fileName = parts[parts.length - 1];
  return `${VOUCHER_RELATIVE_PREFIX}${fileName}`;
}
