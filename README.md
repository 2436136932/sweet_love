# Sweet Love

Sweet Love 是一个面向情侣的私密生活记录 Web App。它把纪念日、恋爱日记、相册足迹、留言、100 件小事、每日评分、点餐、情侣厨房和姨妈助手放在同一个移动端体验里，并通过账号绑定让两个人共享一部分生活数据。

项目采用前后端同仓结构：前端使用 React + Vite，后端使用 Express 提供 `/api` 接口，数据库使用 Prisma + MySQL，上传文件支持本地目录和 S3 兼容对象存储。

## 功能概览

- 账号注册、登录、JWT 鉴权、邀请码绑定和解除绑定。
- 情侣空间资料维护：空间名称、简介、封面、恋爱开始日期。
- 首页概览：恋爱天数、重要纪念日、待办摘要、每日评分、厨房入口和“此刻状态”。
- 纪念日管理：新增、删除、重要纪念日标记。
- 恋爱日记：记录日期、心情、内容、位置和图片。
- 相册：支持图片/视频、分类、精选、点赞、评论、地点标记和足迹地图。
- 足迹地图：基于高德地图展示相册地点；上传图片时可读取 EXIF GPS，转换为 GCJ-02 后预填地点，也支持 POI 搜索、当前定位和手动拖拽校准。
- 留言板：支持文字和图片留言，并轮询刷新。
- 100 件恋爱小事：支持分类、计划日期、完成状态、完成回忆和图片。
- 点餐模块：维护菜品库、今日点餐、数量和备注。
- 情侣厨房：菜谱、收藏、购物清单生成和做饭打卡。
- 姨妈健康：周期记录、每日症状/情绪日志、趋势摘要、备孕参考模式和提醒待办同步。
- AI 助手：支持恋爱留言、日记润色、待办灵感、留言草稿、姨妈照顾文案、厨房灵感和结构化菜谱草稿。
- 文件上传：支持本地 `/uploads` 和 S3 兼容对象存储；数据库图片字段只保存相对对象 key，展示时由统一图片 CDN 适配层生成访问地址。

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | React 19, Vite 6, TypeScript |
| 样式 | Tailwind CSS 4, `src/index.css` |
| 动效 | motion |
| 图标 | lucide-react |
| 地图 | 高德地图 JS API, `@amap/amap-jsapi-loader`, `exifr` |
| 后端 | Express 4, tsx |
| 鉴权 | bcryptjs, jsonwebtoken |
| 数据库 | MySQL, Prisma Client |
| 上传 | multer, 本地静态目录, S3 兼容对象存储 |
| AI | OpenAI-compatible / Gemini / Claude, Pexels/Pixabay 图片搜索 |

## 环境要求

- Node.js 18 或更高版本，推荐 Node.js 20 LTS。
- npm。
- MySQL 8 或兼容版本。

检查本机环境：

```bash
node -v
npm -v
mysql --version
```

## 快速启动

### 1. 安装依赖

```bash
npm install
```

### 2. 创建环境变量

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

至少需要配置：

```dotenv
DATABASE_URL="mysql://root:123456@localhost:3306/sweet_love"
JWT_SECRET="replace-with-a-long-random-secret"
STORAGE_DRIVER="local"
UPLOAD_DIR="uploads"
MAX_UPLOAD_MB="5"
```

如需地图能力，继续配置：

```dotenv
VITE_AMAP_KEY="your-amap-key"
VITE_AMAP_SECURITY_CODE="your-amap-security-code"
```

如需 AI 能力，继续配置当前 provider 对应的 API Key、Base URL 和模型名。

### 3. 创建数据库

进入 MySQL 后执行：

```sql
CREATE DATABASE sweet_love CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. 初始化 Prisma

```bash
npm run db:generate
npm run db:dev
```

### 5. 启动开发服务

```bash
npm run dev
```

默认访问地址：

```text
http://localhost:3000
```

开发模式下，`server.ts` 会启动 Express 服务，并通过 Vite middleware 提供 React 页面和热更新。停止服务时，在启动它的终端里按 `Ctrl+C`。

## 常用命令

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动本地开发服务 |
| `npm run build` | 构建前端和服务端产物 |
| `npm run build:client` | 仅构建前端静态资源 |
| `npm run build:server` | 仅构建服务端代码 |
| `npm start` | 启动生产构建后的服务 |
| `npm run preview` | 启动 Vite 静态预览 |
| `npm run lint` | 执行 TypeScript 类型检查 |
| `npm run db:generate` | 生成 Prisma Client |
| `npm run db:dev` | 开发环境创建并执行 Prisma 迁移 |
| `npm run db:migrate` | 生产环境应用已有 Prisma 迁移 |

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `DATABASE_URL` | 是 | 无 | MySQL 连接地址 |
| `JWT_SECRET` | 是 | 无 | JWT 签名密钥，生产环境请使用长随机字符串 |
| `PORT` | 否 | `3000` | Express 服务端口 |
| `STORAGE_DRIVER` | 否 | `local` | 上传存储模式：`local` 或 `s3` |
| `UPLOAD_DIR` | 否 | `uploads` | 本地上传目录 |
| `MAX_UPLOAD_MB` | 是 | 无 | 单个上传文件大小上限，单位 MB |
| `S3_REGION` | S3 模式必填 | 无 | S3 区域 |
| `S3_BUCKET` | S3 模式必填 | 无 | S3 bucket 名称 |
| `S3_ACCESS_KEY_ID` | S3 模式必填 | 无 | S3 access key |
| `S3_SECRET_ACCESS_KEY` | S3 模式必填 | 无 | S3 secret key |
| `S3_ENDPOINT` | 否 | 无 | S3 兼容服务 endpoint，例如 MinIO、R2、又拍云 |
| `S3_PUBLIC_URL` | S3 模式必填 | 无 | 浏览器可访问的对象公开 URL 或 CDN 域名 |
| `S3_FORCE_PATH_STYLE` | 否 | `false` | 是否启用 path-style 访问 |
| `VITE_IMAGE_CDN_PROVIDER` | 否 | `upyun` | 图片处理服务商：`upyun`、`aliyun`、`tencent`、`cloudinary`、`imagekit` 或 `local` |
| `VITE_IMAGE_CDN_BASE_URL` | 否 | `S3_PUBLIC_URL` 或空 | 图片 CDN 公开访问域名；留空时使用 `/uploads` |
| `VITE_IMAGE_CDN_QUALITY` | 否 | `75` | 图片转换默认质量 |
| `VITE_IMAGE_CDN_WIDTHS` | 否 | `120,240,360,480,720,1080` | `AppImage` 生成 `srcset` 的响应式宽度列表 |
| `VITE_AMAP_KEY` | 否 | 无 | 高德地图 Web JS API key |
| `VITE_AMAP_SECURITY_CODE` | 否 | 无 | 高德地图安全密钥 |
| `AI_PROVIDER` | 否 | `openai-compatible` | AI provider：`openai-compatible`、`gemini` 或 `claude` |
| `OPENAI_COMPATIBLE_API_KEY` | 按 provider | 无 | OpenAI 兼容接口 token，仅服务端使用 |
| `OPENAI_COMPATIBLE_BASE_URL` | 按 provider | 无 | OpenAI 兼容 API 地址，例如 `https://api.openai.com/v1` |
| `OPENAI_COMPATIBLE_MODEL` | 按 provider | 无 | OpenAI 兼容聊天模型名 |
| `OPENAI_COMPATIBLE_TIMEOUT_MS` | 否 | `60000` | 请求超时，单位毫秒 |
| `OPENAI_COMPATIBLE_MAX_TOKENS` | 否 | `2048` | 单次响应最大 token 数 |
| `OPENAI_COMPATIBLE_TEMPERATURE` | 否 | `0.7` | 生成温度 |
| `GEMINI_API_KEY` | 按 provider | 无 | Gemini API token，仅服务端使用 |
| `GEMINI_MODEL` | 否 | `gemini-3.5-flash` | Gemini 模型名 |
| `GEMINI_TIMEOUT_MS` | 否 | `60000` | 请求超时，单位毫秒 |
| `GEMINI_MAX_TOKENS` | 否 | `2048` | 单次响应最大 token 数 |
| `GEMINI_TEMPERATURE` | 否 | `0.7` | 生成温度 |
| `CLAUDE_API_KEY` | 按 provider | 无 | Claude API token，仅服务端使用 |
| `CLAUDE_MODEL` | 否 | `claude-opus-4-8` | Claude 模型名 |
| `CLAUDE_TIMEOUT_MS` | 否 | `60000` | 请求超时，单位毫秒 |
| `CLAUDE_MAX_TOKENS` | 否 | `2048` | 单次响应最大 token 数 |
| `PEXELS_API_KEY` | 否 | 无 | Pexels 图片 API token，用于 AI 菜谱配图 |
| `PIXABAY_API_KEY` | 否 | 无 | Pixabay 图片 API token，用于 AI 菜谱配图 |
| `APP_URL` | 否 | 无 | 生产环境应用访问地址 |

生成生产环境 `JWT_SECRET` 示例：

```bash
openssl rand -base64 48
```

## 地图与足迹定位

相册地点统一使用高德地图可直接展示的 `GCJ-02` 坐标。

- 图片上传时，前端会尝试用 `exifr` 读取照片 EXIF GPS。
- EXIF GPS 属于 `WGS84`，会先通过高德 `convertFrom(..., 'gps')` 转为 `GCJ-02`。
- 读到照片定位后会自动预填地址，用户仍可进入选点器校准。
- 选点器支持高德 POI 搜索、当前定位、点击地图和拖拽 marker。
- 保存地点时会记录 `locationSource`、`locationAccuracyMeters`、`locationPoiId`、`locationPoiName`、`locationAdcode` 和 `locationCoordinateSystem`，方便判断定位来源和精度。

如果地图无法加载，请检查：

- `.env` 中是否配置 `VITE_AMAP_KEY` 和 `VITE_AMAP_SECURITY_CODE`。
- 高德控制台的域名白名单是否包含当前访问域名。
- 生产环境是否启用了 HTTPS。
- 修改 `VITE_*` 变量后是否已重启开发服务或重新构建。

## 文件上传

### 本地存储

默认使用本地存储：

```dotenv
STORAGE_DRIVER="local"
UPLOAD_DIR="uploads"
```

上传后的文件由 Express 通过 `/uploads` 静态路径对外提供。上传接口返回 `{ key, url }`，其中 `key` 是入库值，例如 `users/{userId}/{filename}`；`url` 只用于即时预览，不写入数据库。生产环境如果使用本地存储，需要备份 `uploads` 目录；多实例部署时也要考虑文件同步。

### S3 兼容存储

切换到 S3 兼容对象存储：

```dotenv
STORAGE_DRIVER="s3"
S3_REGION="auto"
S3_BUCKET="sweet-love"
S3_ACCESS_KEY_ID="replace-with-access-key"
S3_SECRET_ACCESS_KEY="replace-with-secret-key"
S3_ENDPOINT="https://your-s3-compatible-endpoint"
S3_PUBLIC_URL="https://cdn.example.com"
S3_FORCE_PATH_STYLE="false"
```

`S3_PUBLIC_URL` 必须是浏览器可以直接访问上传文件的公开地址。又拍云 S3 endpoint 可使用：

```dotenv
S3_ENDPOINT="https://s3.api.upyun.com"
```

### 图片 CDN 与相对 Key

图片字段的新写入值统一保存为无前导斜杠的相对对象 key，例如：

```text
users/abc/123.jpg
```

不要把 `https://...`、`/uploads/...` 或本机绝对路径写入数据库。服务端会在图片字段入库前调用 `normalizeImageKey()` 做归一化和拦截；旧数据读取时仍尽量兼容。

前端展示图片统一使用 `AppImage`，需要手动生成地址时使用 `buildImageUrl()`。`AppImage` 会根据 `VITE_IMAGE_CDN_PROVIDER`、`VITE_IMAGE_CDN_BASE_URL`、`VITE_IMAGE_CDN_QUALITY` 和 `VITE_IMAGE_CDN_WIDTHS` 生成 `src`、`srcset`、`sizes`、懒加载和首屏高优先级属性。

详细规则见 [docs/image-cdn.md](docs/image-cdn.md)。

## 项目结构

```text
.
├── server.ts                         # Express 入口，开发环境挂载 Vite，生产环境托管 dist
├── package.json                      # 项目脚本和依赖
├── vite.config.ts                    # Vite 配置
├── tsconfig.json                     # 前端 TypeScript 配置
├── tsconfig.server.json              # 服务端 TypeScript 配置
├── prisma
│   ├── schema.prisma                 # Prisma 数据模型
│   └── migrations                    # 数据库迁移
├── src
│   ├── App.tsx                       # 应用状态、页面切换和全局数据加载
│   ├── main.tsx                      # React 入口
│   ├── types.ts                      # 前端类型定义
│   ├── index.css                     # 全局样式
│   ├── services/api.ts               # 前端 API client
│   ├── server                        # 服务端配置、数据库、AI 和路由
│   ├── components                    # 通用组件
│   ├── hooks                         # React hooks
│   ├── lib                           # 工具函数和地图配置
│   └── pages                         # 业务页面
└── docs
    ├── startup.md                    # 本地启动说明
    ├── image-cdn.md                  # 图片 CDN 与图片 Key 规范
    ├── linux-deployment.md           # Linux 部署说明
    └── project-analysis.md           # 项目分析文档
```

## 数据模型

主要模型位于 `prisma/schema.prisma`：

- `User`：用户账号、邀请码、头像、简介、此刻状态和绑定关系。
- `Couple`：情侣空间资料和双方用户关系。
- `Anniversary`：纪念日。
- `AlbumImage`：相册媒体，支持图片、视频、地点、定位元数据、精选、点赞和评论。
- `AlbumComment` / `AlbumLike`：相册评论和点赞。
- `Diary`：日记、心情、位置和图片。
- `Todo`：100 件恋爱小事和完成回忆。
- `PeriodRecord`：姨妈助手周期记录。
- `Message`：留言板消息。
- `DailyRating`：每日评分。
- `MenuDish` / `MealOrderItem`：菜品库和点餐记录。
- `KitchenRecipe` / `KitchenRecipeFavorite` / `KitchenShoppingList` / `KitchenCookCheckin`：情侣厨房相关数据。

修改模型后，开发环境运行：

```bash
npm run db:dev
npm run db:generate
```

生产环境只应用已有迁移：

```bash
npm run db:migrate
```

## API 概览

所有业务接口都挂载在 `/api` 下。除注册和登录外，接口需要携带：

```text
Authorization: Bearer <token>
```

| 模块 | 接口 |
| --- | --- |
| 鉴权 | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| 情侣绑定 | `POST /api/auth/bind`, `POST /api/auth/unbind` |
| 用户资料 | `PUT /api/user/profile`, `PATCH /api/user/moment-status` |
| 情侣空间 | `GET /api/couple`, `PUT /api/couple` |
| AI | `POST /api/ai/generate` |
| 上传 | `POST /api/uploads` |
| 每日评分 | `GET /api/ratings/today`, `POST /api/ratings` |
| 纪念日 | `GET/POST /api/anniversaries`, `PATCH/DELETE /api/anniversaries/:id` |
| 相册 | `GET/POST /api/album`, `PATCH/DELETE /api/album/:id` |
| 相册互动 | `POST /api/album/:id/comments`, `POST/DELETE /api/album/:id/like` |
| 日记 | `GET/POST /api/diaries`, `PUT/DELETE /api/diaries/:id` |
| 待办 | `GET/POST /api/todos`, `PATCH/DELETE /api/todos/:id` |
| 留言 | `GET/POST /api/messages` |
| 姨妈健康 | `GET/POST /api/periods`, `PATCH/DELETE /api/periods/:id`, `PUT/DELETE /api/periods/logs/:date`, `PATCH /api/periods/settings`, `POST /api/periods/care-todos/sync` |
| 菜品 | `GET/POST /api/menu/dishes`, `DELETE /api/menu/dishes/:id` |
| 点餐 | `GET /api/meal-orders/today`, `GET /api/meal-orders`, 点餐条目增删改 |
| 厨房 | 菜谱、收藏、购物清单、购物项和做饭打卡接口 |

接口实现集中在 `src/server/routes.ts`，前端调用封装在 `src/services/api.ts`。

## 生产构建与启动

构建：

```bash
npm run db:generate
npm run db:migrate
npm run build
```

启动：

```bash
npm start
```

`npm start` 需要先执行 `npm run build`，并确保项目根目录下已经存在 `dist/` 和 `dist-server/`。生产模式下，服务会读取 `dist` 中的前端静态资源，同时继续提供 `/api` 和 `/uploads`。

## Linux 部署简要流程

推荐使用 Nginx 反向代理到 Node 服务，并使用 PM2 或 systemd 守护进程。

```bash
git clone <your-repo-url> sweet_love
cd sweet_love
npm ci
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run build
NODE_ENV=production pm2 start npm --name sweet-love -- start
pm2 save
```

Nginx 示例：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

更完整的部署步骤见 [docs/linux-deployment.md](docs/linux-deployment.md)。

## 常见问题

### 启动时报缺少环境变量

检查 `.env` 是否存在，并确认 `DATABASE_URL`、`JWT_SECRET`、`MAX_UPLOAD_MB` 已正确填写。

### 数据库连接失败

依次检查：

- MySQL 服务是否已经启动。
- `DATABASE_URL` 中的用户名、密码、端口和数据库名是否正确。
- 数据库 `sweet_love` 是否已经创建。
- 是否执行过 `npm run db:generate` 和 `npm run db:dev`。

### 端口被占用

可以在 `.env` 中指定其他端口：

```dotenv
PORT="3001"
```

然后重新启动：

```bash
npm run dev
```

### AI 生成失败

检查：

- `.env` 中是否配置 `AI_PROVIDER`，以及当前 provider 对应的 API Key、Base URL 和模型。
- 修改 `.env` 后是否已经重启服务。
- provider 对应的 base URL 和模型名是否与供应商控制台一致。
- 后端日志中是否出现超时、401/403 鉴权失败或供应商返回错误。

AI 功能走服务端 `POST /api/ai/generate`，前端不会直接暴露 API Key。

### AI 菜谱没有配图

AI 菜谱文字生成依赖当前 `AI_PROVIDER`；配图依赖可选的 `PEXELS_API_KEY` 或 `PIXABAY_API_KEY`。匹配不到足够准确的食物图片时，会返回无图状态，用户采用菜谱后仍可在表单里手动上传或替换图片。

### 图片或视频上传失败

检查：

- `MAX_UPLOAD_MB` 是否小于实际文件大小。
- 本地存储模式下 `UPLOAD_DIR` 是否存在，Node 进程是否有写入权限。
- S3 模式下 bucket、密钥、endpoint 和公开 URL 是否正确。
- Nginx 的 `client_max_body_size` 是否小于 `MAX_UPLOAD_MB`。

## 相关文档

- [本地启动文档](docs/startup.md)
- [Linux 部署文档](docs/linux-deployment.md)
- [项目分析文档](docs/project-analysis.md)
