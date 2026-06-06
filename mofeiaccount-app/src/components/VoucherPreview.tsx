/**
 * 凭证图片预览弹窗组件
 *
 * PRD 3.3 模块二：点击凭证列弹窗预览图片
 */

interface VoucherPreviewProps {
  visible: boolean;
  imagePath: string; // 绝对路径
  onClose: () => void;
}

export function VoucherPreview({ visible, imagePath, onClose }: VoucherPreviewProps) {
  if (!visible) return null;

  // 使用 Tauri 本地文件协议加载图片
  const assetUrl = `https://asset.localhost/${imagePath.replace(/\\/g, '/')}`;

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
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
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
        <img
          src={assetUrl}
          alt="凭证预览"
          style={{
            maxWidth: 'calc(80vw - 40px)',
            maxHeight: 'calc(80vh - 40px)',
            objectFit: 'contain',
          }}
        />
      </div>
    </div>
  );
}
