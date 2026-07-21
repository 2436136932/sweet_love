# Linux 部署文档

本文档用于在 Linux 服务器上部署 `sweet_love`。项目由 Express 提供 `/api`，由 Vite 构建 React 前端静态资源，并通过 Prisma 连接 MySQL。生产模式下，Node 服务会同时提供：

- `/api` 后端接口
- `/uploads` 本地上传静态目录
- `dist` 前端页面

以下示例以 Ubuntu 22.04/24.04 为准，其他发行版可按等价命令调整。

## 1. 部署架构

推荐结构：

```text
Browser
  -> Nginx :80/:443
  -> Node Express :3000
  -> MySQL :3306
  -> uploads 或 S3 兼容对象存储
```

推荐用 Nginx 处理域名、HTTPS 和请求体大小限制；用 PM2 或 systemd 守护 Node 进程；用 MySQL 保存业务数据。

## 2. 环境要求

- Linux 服务器一台
- Node.js 18 或更高版本，推荐 Node.js 20 LTS
- npm
- MySQL 8 或兼容版本
- Nginx
- PM2 或 systemd

检查版本：

```bash
node -v
npm -v
mysql --version
nginx -v
```

## 3. 安装基础软件

更新系统包：

```bash
sudo apt update
sudo apt upgrade -y
```

安装常用工具、Nginx 和 MySQL：

```bash
sudo apt install -y git curl build-essential nginx mysql-server
```

安装 Node.js 20：

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

安装 PM2：

```bash
sudo npm install -g pm2
```

## 4. 准备数据库

进入 MySQL：

```bash
sudo mysql
```

创建数据库和用户：

```sql
CREATE DATABASE sweet_love CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'sweet_love'@'localhost' IDENTIFIED BY 'replace-with-a-strong-password';
GRANT ALL PRIVILEGES ON sweet_love.* TO 'sweet_love'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

生产环境 `DATABASE_URL` 示例：

```dotenv
DATABASE_URL="mysql://sweet_love:replace-with-a-strong-password@localhost:3306/sweet_love"
```

## 5. 部署代码

选择部署目录，例如 `/var/www/sweet_love`：

```bash
sudo mkdir -p /var/www/sweet_love
sudo chown -R "$USER":"$USER" /var/www/sweet_love
cd /var/www/sweet_love
```

克隆项目：

```bash
git clone <your-repo-url> .
```

安装依赖：

```bash
npm ci
```

如果没有 lockfile 或 `npm ci` 失败，可以改用：

```bash
npm install
```

## 6. 配置环境变量

复制模板：

```bash
cp .env.example .env
```

编辑 `.env`：

```bash
nano .env
```

本地上传模式的生产配置示例：

```dotenv
DATABASE_URL="mysql://sweet_love:replace-with-a-strong-password@localhost:3306/sweet_love"
JWT_SECRET="replace-with-a-long-random-secret"

PORT="3000"
STORAGE_DRIVER="local"
UPLOAD_DIR="uploads"
MAX_UPLOAD_MB="20"

VITE_AMAP_KEY=""
VITE_AMAP_SECURITY_CODE=""

VITE_IMAGE_CDN_PROVIDER="local"
VITE_IMAGE_CDN_BASE_URL=""
VITE_IMAGE_CDN_QUALITY="75"
VITE_IMAGE_CDN_WIDTHS="120,240,360,480,720,1080"

GEMINI_API_KEY=""
APP_URL="https://your-domain.com"
```

生成随机 `JWT_SECRET`：

```bash
openssl rand -base64 48
```

创建上传目录并设置权限：

```bash
mkdir -p uploads
chmod 755 uploads
```

## 7. 上传存储模式

### 本地存储

本地模式配置：

```dotenv
STORAGE_DRIVER="local"
UPLOAD_DIR="uploads"
```

接口会返回 `{ key, url }`。数据库只保存 `key`，例如 `users/{userId}/{filename}`；`url` 只用于即时预览。文件由 Node 服务通过 `/uploads` 静态目录提供。

注意事项：

- 需要备份 `uploads` 目录
- 多实例部署时需要共享文件系统或切换到对象存储
- 迁移服务器时需要同步 `uploads`

### S3 兼容存储

生产环境也可以使用 S3 兼容对象存储：

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

`STORAGE_DRIVER="s3"` 时，以下变量必填：

- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_PUBLIC_URL`

`S3_PUBLIC_URL` 必须是浏览器可直接访问上传文件的公开地址。MinIO 通常需要：

```dotenv
S3_FORCE_PATH_STYLE="true"
```

又拍云 S3 兼容配置示例：

```dotenv
STORAGE_DRIVER="s3"
S3_REGION="us-east-1"
S3_BUCKET="your-upyun-service-name"
S3_ACCESS_KEY_ID="your-upyun-access-key"
S3_SECRET_ACCESS_KEY="your-upyun-secret-key"
S3_ENDPOINT="https://s3.api.upyun.com"
S3_PUBLIC_URL="https://your-public-domain.example.com"
S3_FORCE_PATH_STYLE="false"

VITE_IMAGE_CDN_PROVIDER="upyun"
VITE_IMAGE_CDN_BASE_URL="https://your-public-domain.example.com"
VITE_IMAGE_CDN_QUALITY="75"
VITE_IMAGE_CDN_WIDTHS="120,240,360,480,720,1080"
```

如果未显式配置 `VITE_IMAGE_CDN_BASE_URL`，构建时会使用 `S3_PUBLIC_URL` 作为图片 CDN 地址。图片字段入库仍只保存相对 key，不保存 CDN 绝对 URL。

更多 provider 参数和前端 `AppImage` 规范见 [图片 CDN 与图片 Key 规范](image-cdn.md)。

## 8. 数据库迁移和构建

生成 Prisma Client：

```bash
npm run db:generate
```

应用已有迁移：

```bash
npm run db:migrate
```

构建前端和服务端：

```bash
npm run build
```

构建后会生成：

- `dist/`：前端静态资源
- `dist-server/`：编译后的服务端代码

## 9. 启动生产服务

直接启动：

```bash
npm start
```

看到类似输出表示启动成功：

```text
Server running at http://localhost:3000
```

这种直接启动方式适合临时验证，会占用当前终端；停止时按 `Ctrl+C`。正式服务器部署不使用项目内置停止脚本，停止、重启和守护交给 PM2、systemd、Docker 或部署平台。

## 10. 使用 PM2 守护进程

PM2 用来让 Node 服务在后台运行，并在进程异常退出后自动拉起。下面命令假设项目目录是 `/var/www/sweet_love`，服务监听端口仍使用 `.env` 中的 `PORT`，默认是 `3000`。

确认当前目录和构建产物：

```bash
cd /var/www/sweet_love
ls dist dist-server
```

如果 `dist/` 或 `dist-server/` 不存在，先执行：

```bash
npm run build
```

首次启动服务：

```bash
NODE_ENV=production pm2 start npm --name sweet-love -- start
```

这条命令的含义：

- `NODE_ENV=production`：以生产环境运行
- `pm2 start npm`：让 PM2 启动 npm
- `--name sweet-love`：PM2 中显示的进程名
- `-- start`：传给 npm 的脚本，相当于执行 `npm start`

确认进程已经启动：

```bash
pm2 status
pm2 describe sweet-love
```

如果状态是 `online`，再在服务器本机测试 Node 服务：

```bash
curl -I http://127.0.0.1:3000
```

### 保存进程列表

PM2 启动成功后，需要保存当前进程列表：

```bash
pm2 save
```

如果不执行 `pm2 save`，服务器重启后 PM2 可能不知道要恢复哪些进程。

### 配置开机自启

生成开机自启命令：

```bash
pm2 startup
```

执行后，PM2 会输出一行以 `sudo env PATH=... pm2 startup ...` 开头的命令。复制 PM2 输出的那一整行并执行，例如：

```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u "$USER" --hp "$HOME"
```

不同服务器输出的路径和用户名可能不同，以你终端里 `pm2 startup` 实际输出为准。执行完成后再次保存：

```bash
pm2 save
```

验证开机自启配置：

```bash
systemctl status pm2-"$USER"
```

### 日常查看和维护

查看进程状态：

```bash
pm2 status
```

查看实时日志：

```bash
pm2 logs sweet-love
```

只查看最近 100 行日志：

```bash
pm2 logs sweet-love --lines 100
```

重启服务。修改 `.env`、更新代码、重新构建后通常都需要执行：

```bash
pm2 restart sweet-love
```

停止服务：

```bash
pm2 stop sweet-love
```

删除 PM2 中的服务记录：

```bash
pm2 delete sweet-love
pm2 save
```

使用 PM2 时，停止和重启统一使用 `pm2 stop sweet-love`、`pm2 restart sweet-love`，项目本身不提供跨系统杀进程脚本。

### 更新代码后的推荐顺序

每次部署新代码时，建议按这个顺序执行：

```bash
cd /var/www/sweet_love
git pull
npm ci
npm run db:generate
npm run db:migrate
npm run build
pm2 restart sweet-love
pm2 status
```

如果没有使用 lockfile，或 `npm ci` 失败，可以把 `npm ci` 换成：

```bash
npm install
```

### `.env` 修改后如何生效

服务启动时才会读取 `.env`。修改 `.env` 后需要重启：

```bash
pm2 restart sweet-love
```

如果修改的是 `VITE_` 开头的前端变量，还需要重新构建：

```bash
npm run build
pm2 restart sweet-love
```

### PM2 常见排查

如果 `pm2 status` 显示 `errored`，先看日志：

```bash
pm2 logs sweet-love --lines 200
```

常见原因：

- 没有先执行 `npm run build`，导致找不到 `dist-server/server.js`
- `.env` 缺少 `DATABASE_URL`、`JWT_SECRET`、`MAX_UPLOAD_MB` 等必需变量
- 数据库没有启动，或 `DATABASE_URL` 用户名、密码、数据库名不正确
- `PORT` 被其他进程占用
- 本地上传模式下 `UPLOAD_DIR` 没有写入权限

如果怀疑端口被占用：

```bash
sudo lsof -i :3000
```

如果需要重建 PM2 进程：

```bash
pm2 delete sweet-love
NODE_ENV=production pm2 start npm --name sweet-love -- start
pm2 save
```

## 11. 配置 Nginx 反向代理

创建配置文件：

```bash
sudo nano /etc/nginx/sites-available/sweet_love
```

写入以下内容，将 `your-domain.com` 替换为你的域名：

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

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/sweet_love /etc/nginx/sites-enabled/sweet_love
sudo nginx -t
sudo systemctl reload nginx
```

如果不需要默认站点：

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 12. 配置 HTTPS

安装 Certbot：

```bash
sudo apt install -y certbot python3-certbot-nginx
```

申请证书：

```bash
sudo certbot --nginx -d your-domain.com
```

检查自动续期：

```bash
sudo certbot renew --dry-run
```

## 13. 更新部署

以后更新代码时：

```bash
cd /var/www/sweet_love
git pull
npm ci
npm run db:generate
npm run db:migrate
npm run build
pm2 restart sweet-love
```

如果使用 `npm install`，则替换 `npm ci`：

```bash
npm install
```

## 14. 防火墙

如果启用了 UFW：

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

通常不需要向公网开放 `3000` 端口，外部访问交给 Nginx 的 80/443。

## 15. systemd 可选方案

如果不使用 PM2，也可以使用 systemd。

创建服务文件：

```bash
sudo nano /etc/systemd/system/sweet-love.service
```

写入：

```ini
[Unit]
Description=Sweet Love Node Service
After=network.target mysql.service

[Service]
Type=simple
WorkingDirectory=/var/www/sweet_love
Environment=NODE_ENV=production
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

如果使用 `www-data` 运行，需要调整项目权限：

```bash
sudo chown -R www-data:www-data /var/www/sweet_love
```

启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable sweet-love
sudo systemctl start sweet-love
sudo systemctl status sweet-love
```

查看日志：

```bash
journalctl -u sweet-love -f
```

停止或重启服务：

```bash
sudo systemctl stop sweet-love
sudo systemctl restart sweet-love
```

使用 systemd 时，停止和重启由 `systemctl` 负责，项目本身不维护 PID 文件或平台相关停止脚本。

## 16. 常见问题

### 页面能打开，但上传失败

检查：

- `.env` 中 `STORAGE_DRIVER` 是 `local` 还是 `s3`
- 本地模式下 `UPLOAD_DIR` 是否存在，Node 进程是否有写入权限
- S3 模式下 bucket、access key、secret、endpoint、public URL 是否正确
- bucket 或 CDN 是否允许公开访问上传对象
- Nginx `client_max_body_size` 是否小于 `MAX_UPLOAD_MB`

本地模式修复示例：

```bash
cd /var/www/sweet_love
mkdir -p uploads
chmod 755 uploads
pm2 restart sweet-love
```

### 数据库连接失败

检查：

```bash
systemctl status mysql
cat .env
npm run db:migrate
```

确认：

- MySQL 正在运行
- `DATABASE_URL` 用户名、密码、端口、数据库名正确
- 数据库用户有 `sweet_love` 数据库权限

### Prisma Client 报错

重新生成并重启：

```bash
npm run db:generate
pm2 restart sweet-love
```

### 地图无法使用

检查 `.env`：

```dotenv
VITE_AMAP_KEY="your-amap-key"
VITE_AMAP_SECURITY_CODE="your-amap-security-code"
```

修改后需要重新构建并重启：

```bash
npm run build
pm2 restart sweet-love
```

同时确认高德开放平台中配置了正确的域名白名单和安全密钥。

### 修改 `.env` 后没有生效

`.env` 只在服务启动时读取，修改后需要重启：

```bash
pm2 restart sweet-love
```

如果修改的是 `VITE_*` 变量，还需要重新构建：

```bash
npm run build
pm2 restart sweet-love
```

## 17. 部署检查清单

- `.env` 已配置生产数据库、`JWT_SECRET`、上传模式、上传大小和地图 key
- MySQL 数据库已创建并完成迁移
- `npm run build` 已成功生成 `dist/` 和 `dist-server/`
- 本地上传模式下 `uploads` 目录存在且可写
- S3 模式下对象存储配置完整且公开 URL 可访问
- Node 服务已通过 PM2 或 systemd 守护
- Nginx 已代理到 `127.0.0.1:3000`
- HTTPS 证书已配置
- 浏览器可以访问域名并完成注册、登录、绑定、上传和地图功能验证
