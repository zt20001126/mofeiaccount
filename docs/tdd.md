```
# 技术设计与测试文档 (TDD) - 简易本地记账软件

## 1. 核心数据结构与接口 (Types & Interfaces)

```typescript
// src/types/account.ts

export interface AccountRecord {
  id: string;            // 流水号，格式: TX+年月日+4位自增码 (如: TX202606060001)
  time: string;          // 记账时间，格式: YYYY-MM-DD HH:mm:ss
  customerName: string;  // 客户名称
  income: number;        // 收款金额 (必须 >= 0)
  expense: number;       // 支出金额 (必须 >= 0)
  balance: number;       // 当前结余 (自动计算结果)
  description: string;   // 备注说明
  voucher: string;       // 凭证图片的相对路径 (如: ./vouchers/TX202606060001.png)
}

export interface AppConfig {
  workDir: string;       // 用户选择的本地工作目录绝对路径
}
```

## 2. 核心模块技术设计 (Technical Architecture)

### 2.1 目录初始化与 Excel 读写

- **底层依赖：** * 目录选择与文件复制：Tauri 官方插件 `@tauri-apps/plugin-dialog` 和 `@tauri-apps/plugin-fs`。
  - Excel 解析与生成：使用轻量级前端库 `xlsx` (SheetJS)。
- **逻辑核心：** * 软件启动检测 `workDir`，若首次使用，调起原生文件夹选择器。
  - 读取时：将 `账本.xlsx` 转换为 `AccountRecord[]` 数组存入前端状态（如 Vue 的 ref 或 React 的 state）。
  - 写入时：将最新的整个数组重新生成为 Excel 工作表并覆写到本地磁盘。

### 2.2 结余计算核心算法 (Core Algorithm)

无论是新增账目，还是修改历史账目，**结余必须通过以下纯函数重新滚动计算**，以保证账目连续性：

TypeScript

```
/**
 * 根据历史记录，重新计算全量数据的结余
 * @param records 原始账目列表 (按时间正序排列)
 * @returns 计算完最新结余的账目列表
 */
export function recalculateBalances(records: AccountRecord[]): AccountRecord[] {
  let currentBalance = 0;
  return records.map((record) => {
    currentBalance = currentBalance + record.income - record.expense;
    return {
      ...record,
      balance: currentBalance
    };
  });
}
```

## 3. 测试用例设计 (Test Cases)

基于测试驱动开发（TDD）原则，在编写业务代码前，需确保以下核心单元测试与集成测试用例通过。

### 3.1 单元测试：结余核心计算 (Unit Tests)

| **测试编号** | **测试场景**         | **输入数据 (income, expense)**                               | **预期输出 (balance)**   | **状态** |
| ------------ | -------------------- | ------------------------------------------------------------ | ------------------------ | -------- |
| **UT-001**   | 初始第一笔账目计算   | 第1笔：收入 1000，支出 0                                     | 第1笔结余：`1000`        | 待执行   |
| **UT-002**   | 连续账目正常流转     | 第1笔：结余 1000 第2笔：收入 500，支出 200                   | 第2笔结余：`1300`        | 待执行   |
| **UT-003**   | 产生负债/产生负结余  | 第1笔：结余 1000 第2笔：收入 0，支出 1500                    | 第2笔结余：`-500`        | 待执行   |
| **UT-004**   | 历史账目修改后的重算 | 原始：[+100, +200(余300), -50(余250)] 修改：第二笔由 200 改为 `300` | 重算后尾笔结余变为 `350` | 待执行   |

### 3.2 集成测试：本地文件与交互 (Integration Tests)

| **测试编号** | **测试模块** | **动作/操作行为**                             | **预期正确结果**                                             |
| ------------ | ------------ | --------------------------------------------- | ------------------------------------------------------------ |
| **IT-001**   | 初始化       | 首次打开软件，选择 `D:/KeepAccounts` 目录     | 1. 成功在目标位置创建 `账本.xlsx` 2. 成功创建 `D:/KeepAccounts/vouchers` 文件夹 |
| **IT-002**   | 新增账目     | 填写表单，上传本地图片 `C:/avatar.png` 并保存 | 1. 图片被成功复制并重命名到 `./vouchers/` 内 2. `账本.xlsx` 内新增一行，且凭证列为相对路径 |
| **IT-003**   | 异常防错     | 新增账目时，收款和支出全部留空或填入非数字    | 1. 表单校验拦截，无法点击保存 2. 界面弹出红字提示“请输入合法的金额” |
| **IT-004**   | 覆写安全     | 修改历史账单，触发大批量 Excel 重新写入       | 1. 界面出现 Loading 遮罩层防二次点击 2. 写入完成后文件未损坏，列表成功刷新 |