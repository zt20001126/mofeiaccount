# 简易记账

一款纯本地、单机版记账桌面应用，使用 Excel 文件存储账目数据，无需服务器、无需联网。

**技术栈：** Tauri + React + TypeScript

## 启动方式

```bash
# 1. 安装依赖
npm install

# 2. 桌面开发模式（自动打开窗口，支持热更新）
npx tauri dev

# 3. 打包为 Windows 安装包（可选）
npx tauri build
```

## 系统要求

- Node.js >= 18
- Rust 工具链：[rustup.rs](https://rustup.rs/) 安装 MSVC 版本

## 使用说明

1. 首次启动时选择一个本地文件夹作为记账目录
2. 软件会在该目录下创建 `账本.xlsx` 和 `vouchers/` 文件夹
3. 填写记账表单，支持上传凭证图片，点击保存即可
4. 所有数据存储在本地 Excel 文件中，可随时迁移到其他电脑
