/**
 * 手机端上传凭证图片弹窗组件
 *
 * 工作流程：
 *   1. 弹窗打开 → 调用 Rust start_upload_server 启动 HTTP 服务
 *   2. 生成二维码（指向 http://本机IP:端口/）+ 显示访问地址文字
 *   3. 手机扫码 → 浏览器打开上传页 → 选择图片 → 上传
 *   4. Rust 端保存图片到保存目录 → 前端通过 Rust 命令轮询检测新文件 → 自动回填
 *   5. 关闭弹窗 → 调用 stop_upload_server 停止服务
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import QRCode from 'qrcode';

interface MobileUploadModalProps {
  visible: boolean;
  saveDir: string; // 图片保存目录（绝对路径，如 D:/记账/vouchers/）
  onFileUploaded: (filePath: string) => void; // 上传完成回调，传递文件绝对路径
  onClose: () => void;
}

export function MobileUploadModal({
  visible,
  saveDir,
  onFileUploaded,
  onClose,
}: MobileUploadModalProps) {
  // 局域网 IP + 端口
  const [serverInfo, setServerInfo] = useState<{ ip: string; port: number } | null>(null);
  // 二维码 data URL
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  // 状态：starting | running | error
  const [status, setStatus] = useState<'starting' | 'running' | 'error'>('starting');
  const [errorMsg, setErrorMsg] = useState<string>('');
  // 轮询间隔 ref
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 已上传的文件绝对路径集合（用于去重）
  const uploadedFilesRef = useRef<Set<string>>(new Set());

  /** 启动上传服务器 */
  const startServer = useCallback(async () => {
    if (!visible || !saveDir) return;

    try {
      setStatus('starting');
      setServerInfo(null);
      setQrDataUrl(null);
      setErrorMsg('');
      // 重置已上传文件记录
      uploadedFilesRef.current = new Set();

      // 调用 Rust 命令启动 HTTP 服务器
      const [port, ip] = await invoke<[number, string]>('start_upload_server', {
        saveDir,
      });

      const info = { ip, port };
      setServerInfo(info);

      // 生成二维码
      const url = `http://${ip}:${port}/`;
      const qr = await QRCode.toDataURL(url, {
        width: 240,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      setQrDataUrl(qr);
      setStatus('running');
    } catch (e) {
      setStatus('error');
      setErrorMsg(e instanceof Error ? e.message : '启动服务失败');
    }
  }, [visible, saveDir]);

  /** 轮询检测新上传的文件（通过 Rust poll_uploaded_file 命令） */
  const startPolling = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    // 先登记磁盘上已有的上传文件，避免把旧文件误判为新上传
    invoke<string[]>('poll_uploaded_file', { dir: saveDir }).then((existing) => {
      for (const filePath of existing) {
        uploadedFilesRef.current.add(filePath);
      }
    });

    pollTimerRef.current = setInterval(async () => {
      try {
        // 调用 Rust 命令列出目录中所有 mobile_upload_ 开头的文件
        const existingFiles = await invoke<string[]>('poll_uploaded_file', {
          dir: saveDir,
        });

        // 检查是否有新文件
        for (const filePath of existingFiles) {
          if (!uploadedFilesRef.current.has(filePath)) {
            uploadedFilesRef.current.add(filePath);
            // 回传给父组件
            onFileUploaded(filePath);
          }
        }
      } catch {
        // 忽略轮询错误，下次再试
      }
    }, 2000); // 每 2 秒检测一次
  }, [saveDir, onFileUploaded]);

  // 弹窗打开时启动服务器
  useEffect(() => {
    if (visible) {
      startServer().then(() => startPolling());
    }
    return () => {
      // 弹窗关闭时清理
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [visible, startServer, startPolling]);

  // 关闭时停止服务器
  const handleClose = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    invoke('stop_upload_server').catch(() => {});
    onClose();
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 8700,
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: 12,
          padding: 32,
          minWidth: 360,
          maxWidth: 420,
          textAlign: 'center',
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>手机上传凭证</h3>
        <p style={{ fontSize: 13, color: '#999', marginBottom: 24 }}>
          请确保手机与电脑连接同一 WiFi
        </p>

        {/* 启动中 */}
        {status === 'starting' && (
          <div style={{ padding: 40, color: '#999' }}>正在启动服务…</div>
        )}

        {/* 错误 */}
        {status === 'error' && (
          <div style={{ padding: 20 }}>
            <p style={{ color: '#ff4d4f', marginBottom: 16 }}>{errorMsg}</p>
            <button style={secondaryBtnStyle} onClick={handleClose}>
              关闭
            </button>
          </div>
        )}

        {/* 运行中 — 显示二维码 */}
        {status === 'running' && qrDataUrl && serverInfo && (
          <>
            <div style={{
              border: '2px solid #f0f0f0',
              borderRadius: 8,
              padding: 12,
              display: 'inline-block',
              marginBottom: 16,
            }}>
              <img src={qrDataUrl} alt="扫码上传" style={{ display: 'block' }} />
            </div>

            <div style={{
              backgroundColor: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: 6,
              padding: '10px 16px',
              marginBottom: 20,
              fontSize: 14,
              color: '#389e0d',
            }}>
              扫描二维码或浏览器访问
              <br />
              <strong style={{ fontSize: 15 }}>
                http://{serverInfo.ip}:{serverInfo.port}
              </strong>
            </div>

            <p style={{ fontSize: 12, color: '#bbb' }}>
              上传完成后图片会自动回填到表单
            </p>

            <button style={secondaryBtnStyle} onClick={handleClose}>
              关闭
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const secondaryBtnStyle: React.CSSProperties = {
  marginTop: 8,
  padding: '8px 24px',
  backgroundColor: '#fff',
  color: '#333',
  border: '1px solid #d9d9d9',
  borderRadius: 6,
  fontSize: 14,
  cursor: 'pointer',
};
