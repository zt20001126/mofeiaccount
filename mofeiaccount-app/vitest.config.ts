import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // 仅测试纯函数（不依赖 Tauri API），无需 browser mode
    environment: 'node',
  },
});
