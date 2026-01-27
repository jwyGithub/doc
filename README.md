# 文档管理系统

一个基于 Next.js 和 Cloudflare D1 的现代化文档管理系统，支持 Markdown 编辑预览和 AI 智能美化。

## 技术栈

- **框架**: Next.js 16 + React 19
- **样式**: Tailwind CSS v4
- **UI 组件**: shadcn/ui + Radix UI
- **图标**: Lucide React
- **数据库**: Cloudflare D1 (SQLite)
- **ORM**: Drizzle ORM
- **认证**: Better Auth
- **AI**: Google Gemini AI (原生 API)
- **Markdown**: React Markdown + Remark GFM + Rehype Highlight
- **部署**: Cloudflare Workers (via OpenNext)

## 功能特性

### 文档管理

- 左右分栏布局，左侧文档目录，右侧文档内容
- 支持文档树状结构（父子文档）
- Markdown 实时编辑和预览
- 代码高亮显示（支持复制按钮）
- 文档的新增、编辑、删除（带二次确认）
- 全文搜索（基于 MiniSearch）

### AI 智能功能

- **AI 文档美化**: 使用 Google Gemini AI 优化文档结构和格式
- **流式响应**: 支持 SSE 流式输出，实时显示 AI 生成内容
- **模型选择**: 支持选择不同的 Gemini 模型
- **配置管理**: 可视化 AI 配置界面

### 用户管理

- 用户注册/登录
- 用户角色（普通用户、管理员、超级管理员）
- 管理员可管理用户（弹窗式管理界面）
- 超级管理员可设置是否允许新用户注册

### 系统特性

- 响应式设计
- 深色/浅色主题切换
- 动画过渡效果
- 完善的错误处理
- 弹窗式配置界面

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 创建 D1 数据库

```bash
# 创建数据库
wrangler d1 create doc

# 将返回的 database_id 更新到 wrangler.jsonc 中
```

### 3. 初始化数据库

```bash
# 本地开发
pnpm db:migrate:local

# 远程部署
pnpm db:migrate:remote
```

### 4. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

### 5. 初始化系统

首次访问时，系统会自动跳转到初始化页面 `/setup`，创建超级管理员账户。

**默认超级管理员账号**:

- 邮箱: `admin@doc.local`
- 密码: `Qazwork123`

### 6. 配置 AI 功能（可选）

1. 获取 [Google AI Studio](https://aistudio.google.com/) API Key
2. 点击用户头像 → AI 配置
3. 输入 API Key 并保存
4. 选择要使用的模型

## 部署

### 部署到 Cloudflare

```bash
# 构建并部署
pnpm deploy

# 仅上传（不部署）
pnpm upload

# 本地预览
pnpm preview
```

## 项目结构

```
src/
├── app/
│   ├── (auth)/               # 认证相关页面
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/          # 主应用页面
│   │   ├── documents/
│   │   ├── users/
│   │   └── settings/
│   ├── setup/                # 系统初始化页面
│   └── api/                  # API 路由
│       ├── ai/               # AI 相关 API
│       │   ├── beautify/     # 文档美化
│       │   ├── config/       # AI 配置
│       │   ├── models/       # 模型列表
│       │   └── test/         # 连接测试
│       ├── auth/
│       ├── documents/
│       ├── users/
│       ├── settings/
│       └── setup/
├── components/
│   ├── ui/                   # shadcn 组件
│   ├── ai-beautify-dialog.tsx    # AI 美化弹窗
│   ├── ai-config-dialog.tsx      # AI 配置弹窗
│   ├── app-sidebar.tsx           # 应用侧边栏
│   ├── document-tree.tsx         # 文档目录树
│   ├── document-viewer.tsx       # 文档查看/编辑器
│   ├── markdown-renderer.tsx     # Markdown 渲染器
│   ├── search-button.tsx         # 搜索按钮
│   ├── search-command.tsx        # 搜索命令面板
│   ├── settings-dialog.tsx       # 系统设置弹窗
│   ├── users-dialog.tsx          # 用户管理弹窗
│   ├── theme-provider.tsx        # 主题提供者
│   └── theme-toggle.tsx          # 主题切换
├── db/
│   ├── index.ts              # 数据库连接
│   └── schema.ts             # 数据库表定义
├── lib/
│   ├── auth.ts               # Better Auth 配置
│   ├── auth-client.ts        # 客户端认证
│   ├── cloudflare.ts         # Cloudflare 工具
│   ├── init.ts               # 初始化逻辑
│   ├── session.ts            # 会话管理
│   └── utils.ts
└── hooks/
    └── use-mobile.ts
```

## 数据库表结构

| 表名 | 说明 |
|------|------|
| users | 用户表 |
| sessions | 会话表 |
| accounts | 账户表（第三方登录） |
| verifications | 验证表 |
| documents | 文档表 |
| settings | 系统设置表 |

## 可用脚本

```bash
pnpm dev              # 启动开发服务器
pnpm build            # 构建生产版本
pnpm start            # 启动生产服务器
pnpm deploy           # 构建并部署到 Cloudflare
pnpm upload           # 构建并上传到 Cloudflare
pnpm preview          # 本地预览 Cloudflare 构建
pnpm cf-typegen       # 生成 Cloudflare 类型
pnpm db:generate      # 生成数据库迁移
pnpm db:migrate:local # 本地数据库迁移
pnpm db:migrate:remote# 远程数据库迁移
pnpm db:reset         # 重置本地数据库
pnpm db:studio        # 启动 Drizzle Studio
```

## 环境变量

在 `.dev.vars` 文件中配置开发环境变量：

```env
NEXTJS_ENV=development
```

## API 端点

### 文档 API

- `GET /api/documents` - 获取文档列表
- `POST /api/documents` - 创建文档
- `GET /api/documents/:id` - 获取单个文档
- `PUT /api/documents/:id` - 更新文档
- `DELETE /api/documents/:id` - 删除文档

### AI API

- `POST /api/ai/beautify` - AI 文档美化（流式响应）
- `GET /api/ai/config` - 获取 AI 配置
- `POST /api/ai/config` - 保存 AI 配置
- `GET /api/ai/models` - 获取可用模型列表
- `POST /api/ai/test` - 测试 AI 连接

### 用户 API

- `GET /api/users` - 获取用户列表
- `PUT /api/users/:id` - 更新用户
- `DELETE /api/users/:id` - 删除用户

### 设置 API

- `GET /api/settings/registration` - 获取注册设置
- `POST /api/settings/registration` - 更新注册设置

## License

MIT
