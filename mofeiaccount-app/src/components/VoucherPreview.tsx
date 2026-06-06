/**
 * 凭证图片预览弹窗组件
 *
 * PRD 3.3 模块二：点击凭证列弹窗预览图片
 *
 * 加载机制（修复后）：
 *   - 通过 Rust read_file_base64 命令读取本地图片
 *   - 将图片二进制转为 base64，使用 data:image/...;base64,... 内联显示
 *   - 避免了 Tauri v2 的 asset:// 协议在不同平台上的兼容性问题
 */

import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface VoucherPreviewProps {
  visible: boolean;
  workDir: string;           // 工作目录绝对路径
  relativePath: string;      // Excel 中存储的凭证相对路径（如 ./vouchers/xxx.png）
  onClose: () => void;
}

/** 拼接本地文件绝对路径 */
function joinPath(base: string, ...parts: string[]): string {
  const normalized = base.replace(/\\/g, '/').replace(/\/$/, '');
  const segments = parts.map((p) => p.replace(/\\/g, '/').replace(/^\/+/, ''));
  return [normalized, ...segments].join('/');
}

export function VoucherPreview({ visible, workDir, relativePath, onClose }: VoucherPreviewProps) {
  // data:image/...;base64,... 格式的图片源
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  // 加载状态：idle | loading | loaded | error
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');

  // 弹窗打开时，通过 Rust 命令读取图片并转为 base64
  useEffect(() => {
    if (!visible || !relativePath) {
      // 弹窗关闭时重置状态
      setImageSrc(null);
      setStatus('idle');
      return;
    }

    let cancelled = false;

    async function loadImage() {
      setStatus('loading');
      try {
        // 拼接图片的绝对路径
        const absPath = joinPath(workDir, relativePath.replace(/^\.\/vouchers\//, 'vouchers/'));
        // 调用 Rust 命令读取图片并返回 (mime, base64)
        const [mime, base64] = await invoke<[string, string]>('read_file_base64', { path: absPath });
        if (!cancelled) {
          // 构造 base64 data URL 供 <img> 标签直接渲染
          setImageSrc(`data:${mime};base64,${base64}`);
          setStatus('loaded');
        }
      } catch {
        if (!cancelled) {
          setStatus('error');
        }
      }
    }

    loadImage();

    return () => {
      cancelled = true;
    };
  }, [visible, workDir, relativePath]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 8,
          padding: 16,
          maxWidth: '80vw',
          maxHeight: '80vh',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: 200,
          minHeight: 120,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1,
            border: 'none',
            background: 'rgba(0,0,0,0.5)',
            color: '#fff',
            borderRadius: '50%',
            width: 28,
            height: 28,
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: '26px',
          }}
        >
          &#x2715;
        </button>

        {/* 加载中 */}
        {status === 'loading' && (
          <div style={{ color: '#999', fontSize: 14 }}>加载中…</div>
        )}

        {/* 加载失败 */}
        {status === 'error' && (
          <div style={{ color: '#ff4d4f', fontSize: 14 }}>图片加载失败</div>
        )}

        {/* 图片显示 */}
        {status === 'loaded' && imageSrc && (
          <img
            src={imageSrc}
            alt="凭证预览"
            style={{
              maxWidth: 'calc(80vw - 40px)',
              maxHeight: 'calc(80vh - 40px)',
              objectFit: 'contain',
            }}
          />
        )}
      </div>
    </div>
  );
}
