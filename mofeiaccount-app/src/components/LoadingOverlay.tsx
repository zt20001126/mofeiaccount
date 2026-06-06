/**
 * Loading 遮罩层组件
 *
 * PRD 第 4 节：修改账目触发 Excel 重写时需要 Loading 遮罩防二次点击
 * 集成测试 IT-004：写入过程中显示 Loading 遮罩层
 */

interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
}

export function LoadingOverlay({ visible, text = '处理中…' }: LoadingOverlayProps) {
  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 8888,
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: '24px 40px',
        textAlign: 'center',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      }}>
        <div style={{ fontSize: 16, marginBottom: 8 }}>{text}</div>
        <div style={{ color: '#999', fontSize: 13 }}>请不要关闭窗口</div>
      </div>
    </div>
  );
}
