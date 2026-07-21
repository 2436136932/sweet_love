# 项目启动文档

本文档用于在本地启动 `sweet_love` 项目。项目由 Express 提供后端 API，由 Vite 提供 React 前端开发服务，并通过 Prisma 连接 MySQL 数据库。

## 1. 环境要求

- Node.js 18 或更高版本，推荐 Node.js 20 LTS
- npm
- MySQL 8 或兼容版本

先确认本机环境：

```bash
node -v
npm -v
mysql --version
```

Windows、macOS 和 Linux 都可以运行本项目。以下命令同时给出 Bash 和 PowerShell 写法，按自己的终端选择即可。

## 2. 安装依赖

进入项目根目录：

```bash
cd sweet_love
npm install
```

当前项目根目录示例：

```text
G:\code\sweet_lover\sweet_love
```

## 3. 配置环境变量

复制环境变量模板：

```bash
cp .env.example .env
```

Windows PowerShell：

```powershell
Copy-Item .env.example .env
```

编辑 `.env`，本地开发至少需要：

```dotenv
DATABASE_URL="mysql://root:123456@localhost:3306/sweet_love"
JWT_SECRET="replace-with-a-long-random-secret"

STORAGE_DRIVER="local"
UPLOAD_DIR="uploads"
MAX_UPLOAD_MB="5"

VITE_AMAP_KEY=""
VITE_AMAP_SECURITY_CODE=""

VITE_IMAGE_CDN_PROVIDER="local"
VITE_IMAGE_CDN_BASE_URL=""
VITE_IMAGE_CDN_QUALITY="75"
VITE_IMAGE_CDN_WIDTHS="120,240,360,480,720,1080"

GEMINI_API_KEY=""
APP_URL=""
```

关键变量说明：

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | MySQL 连接地址，格式为 `mysql://用户:密码@主机:端口/数据库名` |
| `JWT_SECRET` | JWT 签名密钥，本地可自定义，生产环境必须换成长随机字符串 |
| `PORT` | 可选，服务端口，未配置时默认 `3000` |
| `STORAGE_DRIVER` | 上传存储模式，可选 `local` 或 `s3`，本地开发推荐 `local` |
| `UPLOAD_DIR` | 本地上传目录，默认 `uploads` |
| `MAX_UPLOAD_MB` | 单个上传文件大小上限，单位 MB |
| `VITE_IMAGE_CDN_PROVIDER` | 图片处理服务商，本地开发推荐 `local`，生产可用 `upyun` 等 CDN |
| `VITE_IMAGE_CDN_BASE_URL` | 图片 CDN 公开访问域名，本地开发留空时使用 `/uploads` |
| `VITE_IMAGE_CDN_QUALITY` | 图片转换默认质量 |
| `VITE_IMAGE_CDN_WIDTHS` | 响应式图片 `srcset` 宽度列表 |
| `VITE_AMAP_KEY` | 可选，高德地图 JS API key |
| `VITE_AMAP_SECURITY_CODE` | 可选，高德地图安全密钥 |
| `GEMINI_API_KEY` | 原模板遗留变量，当前核心功能不依赖 |
| `APP_URL` | 生产访问地址，本地开发可留空 |

## 4. 准备数据库

确保 MySQL 已启动，然后创建数据库：

```sql
CREATE DATABASE sweet_love CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

如果使用 MySQL 命令行：

```bash
mysql -u root -p
```

进入后执行上面的 `CREATE DATABASE` 语句。

## 5. 初始化 Prisma

生成 Prisma Client：

```bash
npm run db:generate
```

执行开发环境迁移：

```bash
npm run db:dev
```

如果是在生产环境或只想应用仓库里已有迁移，使用：

```bash
npm run db:migrate
```

## 6. 启动开发服务

执行：

```bash
npm run dev
```

启动成功后，终端会显示类似：

```text
Server running at http://localhost:3000
```

浏览器访问：

```text
http://localhost:3000
```

开发模式下，`server.ts` 会启动 Express 服务，并通过 Vite middleware 提供 React 页面和热更新。前端请求统一走 `/api`，上传文件默认通过 `/uploads` 访问。停止服务时，在启动它的终端里按 `Ctrl+C`。

## 7. 首次使用流程

1. 打开 `http://localhost:3000`。
2. 注册第一个账号。
3. 复制账号页面展示的邀请码。
4. 注册第二个账号，并输入第一个账号的邀请码完成情侣绑定。
5. 绑定后即可使用首页、日记、相册、待办、留言、点餐和情侣厨房等功能。

## 8. 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 启动本地开发服务 |
| `npm run build` | 构建前端和服务端产物 |
| `npm run build:client` | 仅构建前端静态资源 |
| `npm run build:server` | 仅构建服务端代码 |
| `npm start` | 启动生产构建后的服务 |
| `npm run preview` | 启动 Vite 静态预览 |
| `npm run lint` | 执行 TypeScript 类型检查 |
| `npm run db:generate` | 生成 Prisma Client |
| `npm run db:dev` | 开发环境执行 Prisma 迁移 |
| `npm run db:migrate` | 生产环境应用已有迁移 |

## 9. 本地生产模式验证

开发时使用：

```bash
npm run dev
```

需要在本地验证生产构建时，先构建再启动：

```bash
npm run build
npm start
```

`npm start` 依赖 `npm run build` 生成的 `dist/` 和 `dist-server/`。本地验证时它会以前台进程运行，停止服务时在启动它的终端里按 `Ctrl+C`。

## 10. 本地上传目录

本地开发默认使用：

```dotenv
STORAGE_DRIVER="local"
UPLOAD_DIR="uploads"
```

上传文件会保存到项目根目录下的 `uploads`，并通过 `/uploads` 静态路径访问。上传接口返回 `{ key, url }`，数据库只保存 `key`，例如 `users/{userId}/{filename}`；`url` 只用于当前页面即时预览。该目录可能包含用户上传内容，不建议提交到 Git。

如果想测试 S3 兼容存储，请参考 [Linux 部署文档](linux-deployment.md) 中的 S3 配置部分。

图片 key、CDN provider 和 `AppImage` 使用规范见 [图片 CDN 与图片 Key 规范](image-cdn.md)。

## 11. 常见问题

### 缺少环境变量

如果启动时报类似错误：

```text
Missing required environment variable: DATABASE_URL
Missing required environment variable: JWT_SECRET
MAX_UPLOAD_MB must be a positive number
```

检查 `.env` 是否存在，并确认 `DATABASE_URL`、`JWT_SECRET`、`MAX_UPLOAD_MB` 已填写。

### 数据库连接失败

依次确认：

- MySQL 服务已经启动
- `.env` 中的用户名、密码、端口和数据库名正确
- 数据库 `sweet_love` 已经创建
- 已执行 `npm run db:generate`
- 开发环境已执行 `npm run db:dev`

### 端口被占用

默认端口是 `3000`。如果端口被占用，可以在 `.env` 中增加：

```dotenv
PORT="3001"
```

然后重新执行：

```bash
npm run dev
```

### 上传失败

检查：

- `MAX_UPLOAD_MB` 是否小于实际文件大小
- `UPLOAD_DIR` 是否存在
- Node 进程是否有写入 `UPLOAD_DIR` 的权限
- 如果前面有 Nginx，`client_max_body_size` 是否足够大

### 地图无法加载

地图相关功能依赖高德地图配置：

```dotenv
VITE_AMAP_KEY="your-amap-key"
VITE_AMAP_SECURITY_CODE="your-amap-security-code"
```

修改 `VITE_*` 变量后需要重新启动开发服务；生产环境则需要重新构建。
