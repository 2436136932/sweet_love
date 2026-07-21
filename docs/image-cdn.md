# 图片 CDN 与图片 Key 规范

本文档记录 Sweet Love 当前的图片上传、数据库存储和前端展示规范。

## 核心规则

- 数据库只保存相对对象 key，例如 `users/{userId}/{filename}.jpg`。
- 数据库不保存 `https://...`、`/uploads/...`、Windows 盘符路径或 Linux 绝对文件路径。
- `POST /api/uploads` 返回 `{ key, url }`：
  - `key` 是持久化值，写入数据库。
  - `url` 只用于即时预览，不写入数据库。
- 前端上传封装 `uploadService.upload(file)` 默认返回 `key`，页面拿到后可直接提交给业务接口。
- 页面展示图片统一使用 `AppImage`，需要手动拼地址时使用 `buildImageUrl`。
- 页面不要手写 CDN 图片处理参数，例如 `!/fw/`、`image_process`、`imageMogr2`、`tr=`。

## 持久化格式

推荐格式：

```text
users/{userId}/{filename}
```

兼容读取但新写入会归一化：

| 输入 | 入库值 |
| --- | --- |
| `https://cdn.example.com/users/a.jpg` | `users/a.jpg` |
| `/uploads/users/a.jpg` | `users/a.jpg` |
| `uploads/users/a.jpg` | `users/a.jpg` |
| `G:\path\to\a.jpg` | 拒绝，写入空值 |
| `/var/www/uploads/a.jpg` | 拒绝，写入空值 |
| `data:image/png;base64,...` | 拒绝，写入空值 |
| `blob:http://...` | 拒绝，写入空值 |

服务端归一化逻辑位于 `src/server/imageKey.ts`，业务接口写入图片字段前会调用 `normalizeImageKey()` 或 `normalizeImageKeyArray()`。

## 前端展示

`AppImage` 会统一输出：

- `src`
- `srcSet`
- `sizes`
- `loading`
- `decoding`
- `fetchPriority`
- `width`
- `height`

首屏图片传 `priority`：

```tsx
<AppImage
  src={coverImage}
  alt="Cover"
  width={960}
  height={540}
  crop="cover"
  priority
/>
```

列表或非首屏图片默认懒加载：

```tsx
<AppImage
  src={item.src}
  alt={item.title}
  width={240}
  height={240}
  crop="square"
  sizes="120px"
/>
```

调用方应传 `width` / `height`，或明确 `aspectRatio`，减少图片加载前后的布局偏移。

## CDN 配置

`.env` 中配置：

```dotenv
VITE_IMAGE_CDN_PROVIDER="upyun"
VITE_IMAGE_CDN_BASE_URL="https://cdn.example.com"
VITE_IMAGE_CDN_QUALITY="75"
VITE_IMAGE_CDN_WIDTHS="120,240,360,480,720,1080"
```

变量说明：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `VITE_IMAGE_CDN_PROVIDER` | `upyun` | 图片处理服务商，可选 `upyun`、`aliyun`、`tencent`、`cloudinary`、`imagekit`、`local` |
| `VITE_IMAGE_CDN_BASE_URL` | `S3_PUBLIC_URL` 或空 | 图片 CDN 域名，不带结尾 `/` |
| `VITE_IMAGE_CDN_QUALITY` | `75` | 默认压缩质量，范围会限制在 `1` 到 `99` |
| `VITE_IMAGE_CDN_WIDTHS` | `120,240,360,480,720,1080` | `srcset` 响应式宽度列表 |

如果 `VITE_IMAGE_CDN_BASE_URL` 留空，前端会退回本地 `/uploads/{key}`。`vite.config.ts` 会在未显式配置 `VITE_IMAGE_CDN_BASE_URL` 时使用 `S3_PUBLIC_URL` 作为兜底。

## Provider 参数

`buildImageUrl()` 会根据 provider 生成图片处理参数：

| Provider | 示例规则 |
| --- | --- |
| `upyun` | `!/fw/{w}/quality/{q}/format/webp`，正方形裁剪使用 `!/sq/{size}/quality/{q}/format/webp` |
| `aliyun` | `?image_process=resize,w_{w}/quality,q_{q}/format,webp` |
| `tencent` | `?imageMogr2/thumbnail/{w}x/quality/{q}/format/webp` |
| `cloudinary` | 在 `/upload/` 后插入 `f_webp,q_{q},w_{w}` |
| `imagekit` | `?tr=w-{w},q-{q},f-webp` |
| `local` | `/uploads/{key}?w={w}` |

`blob:`、`data:`、视频、SVG 和无法识别的第三方 URL 不做图片转换，直接透传或按原始 URL 展示。

## 本地与对象存储

本地开发常用：

```dotenv
STORAGE_DRIVER="local"
UPLOAD_DIR="uploads"
VITE_IMAGE_CDN_PROVIDER="local"
VITE_IMAGE_CDN_BASE_URL=""
```

又拍云 S3 兼容对象存储示例：

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

## 验证清单

- 上传接口响应同时包含 `key` 和 `url`。
- 业务接口入库值为 `users/...`，没有协议、域名或 `/uploads/` 前缀。
- 首屏封面图片包含 `loading="eager"` 和 `fetchPriority="high"`。
- 非首屏列表图片默认 `loading="lazy"`。
- `srcset` 宽度有序、去重，并带有当前 provider 的 WebP、质量和缩放参数。
