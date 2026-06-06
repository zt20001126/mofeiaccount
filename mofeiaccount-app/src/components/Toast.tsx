/**
 * Toast 消息组件 - 全局提示
 * 支持 success / error / info 三种类型
 */

import { useEffect, useState } from 'react';

export interface ToastMessage {
  id: number;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastProps {
  messages: ToastMessage[];
  onRemove: (id: number) => void;
}

export function ToastContainer({ messages, onRemove }: ToastProps) {
  return (
    <div style={{
      position: 'fixed',
      top: 20,
      right: 20,
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      {messages.map((msg) => (
        <div
          key={msg.id}
          onClick={() => onRemove(msg.id)}
          style={{
            padding: '12px 20px',
            borderRadius: 6,
            color: '#fff',
            fontSize: 14,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            maxWidth: 360,
            wordBreak: 'break-word',
            ...(msg.type === 'success' && { backgroundColor: '#52c41a' }),
            ...(msg.type === 'error' && { backgroundColor: '#ff4d4f' }),
            ...(msg.type === 'info' && { backgroundColor: '#1890ff' }),
          }}
        >
          {msg.text}
        </div>
      ))}
    </div>
  );
}

/** 简易 Toast 管理 Hook */
let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastMessage['type'], text: string) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, type, text }]);
    // 3 秒后自动消失
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, removeToast };
}
