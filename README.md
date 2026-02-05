# Tenwin Label - 标签打印系统

基于 React Router v7 + Cloudflare Pages + D1 的全栈标签打印管理系统。

## 技术栈

- **框架**: React Router v7 (Remix v2 继任者)
- **部署**: Cloudflare Pages
- **数据库**: Cloudflare D1 (SQLite)
- **样式**: Tailwind CSS v4
- **条码生成**: JsBarcode, QRCode

## 功能特性

- 编码模板管理（一维码/二维码）
- 批次生成（自动接续编号）
- 生成历史记录
- 多种打印版式（A4 3x8 / 4x10 / 2x5 / 连续纸）
- 打印范围控制
- 批次作废管理

## 本地开发

```bash
# 安装依赖
npm install

# 开发服务器
npm run dev

# 类型检查
npm run typecheck
```

## 部署到 Cloudflare

### 1. 创建 D1 数据库

```bash
# 创建数据库
npx wrangler d1 create tenwin-label-db

# 更新 wrangler.toml 中的 database_id
```

### 2. 执行数据库迁移

```bash
# 创建迁移
npx wrangler d1 migrations create tenwin-label-db init

# 应用迁移
npx wrangler d1 migrations apply tenwin-label-db
```

### 3. 创建 KV 命名空间（可选，用于缓存）

```bash
npx wrangler kv:namespace create "CACHE"
```

### 4. 部署

```bash
# 构建并部署
npm run deploy

# 或者分步执行
npm run build
npx wrangler pages deploy ./build/client
```

## 项目结构

```
tenwin-label/
├── app/
│   ├── components/      # 共享组件
│   ├── routes/          # 页面路由
│   │   ├── _layout.tsx           # 布局组件
│   │   ├── _layout._index.tsx    # 仪表盘
│   │   ├── _layout.templates.tsx # 模板管理
│   │   ├── _layout.batches.tsx   # 批次生成
│   │   ├── _layout.history.tsx   # 历史记录
│   │   └── print.$batchId.tsx    # 打印预览
│   ├── utils/
│   │   └── db.ts        # 数据库工具
│   ├── types.ts         # TypeScript 类型
│   ├── db/
│   │   └── schema.sql   # 数据库 Schema
│   ├── root.tsx         # 根组件
│   ├── routes.ts        # 路由配置
│   └── tailwind.css     # Tailwind 样式
├── functions/
│   └── [[path]].ts      # Cloudflare Functions 入口
├── migrations/
│   └── 0001_initial.sql # 数据库迁移
├── wrangler.toml        # Cloudflare 配置
├── react-router.config.ts
├── vite.config.ts
└── package.json
```

## 数据库 Schema

### code_templates（编码模板表）
- id: TEXT PRIMARY KEY
- name: TEXT (模板名称)
- type: TEXT (一维码/二维码)
- prefix: TEXT (前缀)
- padding_length: INTEGER (填充长度)
- remark: TEXT (备注)
- created_at: DATETIME

### code_batches（批次表）
- id: TEXT PRIMARY KEY
- template_id: TEXT (外键)
- start_number: INTEGER (起始序号)
- end_number: INTEGER (结束序号)
- count: INTEGER (数量)
- status: TEXT (active/void)
- created_at: DATETIME

### code_items（单码表）
- id: INTEGER PRIMARY KEY AUTOINCREMENT
- batch_id: TEXT (外键)
- serial_number: INTEGER (序号)
- code_text: TEXT (编码文本)
- is_printed: INTEGER (是否已打印)
- printed_at: DATETIME

## 环境变量

在 `wrangler.toml` 中配置：

- `DB`: D1 数据库绑定
- `CACHE`: KV 命名空间绑定（可选）

## 使用说明

1. 首次使用需要先创建编码模板
2. 在"批次生成"页面选择模板并设置参数
3. 生成后可以跳转到打印预览
4. 打印预览支持多种标签版式和打印范围控制
5. 在"生成历史"中可以查看、作废批次

## License

MIT
