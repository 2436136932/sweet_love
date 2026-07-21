export type ImageProvider = 'upyun' | 'aliyun' | 'tencent' | 'cloudinary' | 'imagekit' | 'local';
export type ImageCrop = 'square' | 'cover' | 'contain';

export interface ImageUrlOptions {
  width?: number;
  height?: number;
  crop?: ImageCrop;
  quality?: number;
  format?: 'webp' | 'original';
  widths?: number[];
}

const DEFAULT_WIDTHS = [120, 240, 360, 480, 720, 1080];
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.ogg', '.m4v'];
const RAW_SCHEMES = /^(data|blob):/i;
const ABSOLUTE_URL = /^[a-z][a-z0-9+.-]*:\/\//i;

function getProvider(): ImageProvider {
  const provider = String(import.meta.env.VITE_IMAGE_CDN_PROVIDER || 'upyun').toLowerCase();
  if (['upyun', 'aliyun', 'tencent', 'cloudinary', 'imagekit', 'local'].includes(provider)) {
    return provider as ImageProvider;
  }
  return 'upyun';
}

function getBaseUrl() {
  return String(import.meta.env.VITE_IMAGE_CDN_BASE_URL || '').replace(/\/+$/, '');
}

function getLocalBaseUrl() {
  if (typeof window === 'undefined') return '';
  return window.location.origin.replace(/\/+$/, '');
}

function getQuality(quality?: number) {
  const raw = quality ?? Number(import.meta.env.VITE_IMAGE_CDN_QUALITY || 75);
  if (!Number.isFinite(raw)) return 75;
  return Math.min(99, Math.max(1, Math.round(raw)));
}

function getConfiguredWidths() {
  const configured = String(import.meta.env.VITE_IMAGE_CDN_WIDTHS || '')
    .split(',')
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item > 0);
  return configured.length > 0 ? configured : DEFAULT_WIDTHS;
}

function isAbsoluteUrl(value: string) {
  return ABSOLUTE_URL.test(value);
}

function encodeKey(key: string) {
  return key
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

export function normalizeClientImageKey(value: string) {
  const trimmed = value.trim();
  if (!trimmed || RAW_SCHEMES.test(trimmed)) return trimmed;
  if (isAbsoluteUrl(trimmed)) {
    try {
      const url = new URL(trimmed);
      return decodeURIComponent(url.pathname).replace(/^\/+uploads\//i, '').replace(/^\/+/, '');
    } catch {
      return trimmed;
    }
  }
  return trimmed.replace(/\\/g, '/').replace(/^\/+uploads\//i, '').replace(/^\/+/, '');
}

function isVideoLike(value: string) {
  const path = value.split('?')[0].split('#')[0].toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => path.endsWith(ext));
}

function isSvgLike(value: string) {
  return value.split('?')[0].split('#')[0].toLowerCase().endsWith('.svg');
}

function isThirdPartyUrl(value: string) {
  if (!isAbsoluteUrl(value)) return false;
  const baseUrl = getBaseUrl();
  if (!baseUrl) return true;
  try {
    return new URL(value).origin !== new URL(baseUrl).origin;
  } catch {
    return true;
  }
}

export function isTransformableImage(src?: string | null) {
  if (!src) return false;
  const value = src.trim();
  if (!value || RAW_SCHEMES.test(value) || isVideoLike(value) || isSvgLike(value)) return false;
  return !isThirdPartyUrl(value);
}

function sourceUrl(src: string) {
  if (isAbsoluteUrl(src)) return src;
  const provider = getProvider();
  const baseUrl = getBaseUrl();
  const localBaseUrl = getLocalBaseUrl();
  const key = encodeKey(normalizeClientImageKey(src));

  if (provider === 'local' || !baseUrl) return `${localBaseUrl}/uploads/${key}`;
  return `${baseUrl}/${key}`;
}

function appendQuery(url: string, query: string) {
  const [withoutHash, hash = ''] = url.split('#');
  return `${withoutHash}${withoutHash.includes('?') ? '&' : '?'}${query}${hash ? `#${hash}` : ''}`;
}

function appendUpyun(url: string, pathParams: string) {
  const hashIndex = url.indexOf('#');
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const queryIndex = withoutHash.indexOf('?');
  if (queryIndex < 0) return `${withoutHash}!${pathParams}${hash}`;
  return `${withoutHash.slice(0, queryIndex)}!${pathParams}${withoutHash.slice(queryIndex)}${hash}`;
}

function transformUrl(url: string, options: ImageUrlOptions) {
  const width = options.width ? Math.round(options.width) : undefined;
  const height = options.height ? Math.round(options.height) : undefined;
  const size = options.crop === 'square' ? Math.round(width || height || 0) : undefined;
  const quality = getQuality(options.quality);
  const format = options.format === 'original' ? undefined : 'webp';
  const provider = getBaseUrl() ? getProvider() : 'local';

  if (!width && !height && !format) return url;

  if (provider === 'local') {
    return width || size ? appendQuery(url, `w=${size || width}`) : url;
  }

  if (provider === 'upyun') {
    const resize = size ? `/sq/${size}` : width ? `/fw/${width}` : height ? `/fh/${height}` : '';
    const output = `${resize}/quality/${quality}${format ? `/format/${format}` : ''}`;
    return appendUpyun(url, output);
  }

  if (provider === 'aliyun') {
    const resize = size ? `resize,m_fill,w_${size},h_${size}` : width ? `resize,w_${width}` : height ? `resize,h_${height}` : '';
    const process = ['image', resize, `quality,q_${quality}`, format ? `format,${format}` : ''].filter(Boolean).join('/');
    return appendQuery(url, `image_process=${process}`);
  }

  if (provider === 'tencent') {
    const resize = size
      ? `thumbnail/${size}x${size}^/gravity/center/crop/${size}x${size}`
      : width
        ? `thumbnail/${width}x`
        : height
          ? `thumbnail/x${height}`
          : '';
    const process = ['imageMogr2', resize, `quality/${quality}`, format ? `format/${format}` : ''].filter(Boolean).join('/');
    return appendQuery(url, process);
  }

  if (provider === 'cloudinary') {
    const transforms = [format ? `f_${format}` : '', `q_${quality}`, size ? `c_fill,w_${size},h_${size}` : width ? `w_${width}` : height ? `h_${height}` : '']
      .filter(Boolean)
      .join(',');
    return url.includes('/upload/') ? url.replace('/upload/', `/upload/${transforms}/`) : appendQuery(url, `tx=${encodeURIComponent(transforms)}`);
  }

  const transforms = [size ? `w-${size},h-${size},c-maintain_ratio` : width ? `w-${width}` : height ? `h-${height}` : '', `q-${quality}`, format ? `f-${format}` : '']
    .filter(Boolean)
    .join(',');
  return appendQuery(url, `tr=${transforms}`);
}

export function buildImageUrl(src?: string | null, options: ImageUrlOptions = {}) {
  if (!src) return '';
  if (!isTransformableImage(src)) {
    return RAW_SCHEMES.test(src) || isThirdPartyUrl(src) ? src : sourceUrl(src);
  }
  return transformUrl(sourceUrl(src), options);
}

export function buildSrcSet(src?: string | null, options: ImageUrlOptions = {}) {
  if (!src || !isTransformableImage(src)) return undefined;
  const maxWidth = options.width || Math.max(...getConfiguredWidths());
  const widths = Array.from(new Set([...(options.widths || getConfiguredWidths()), maxWidth]))
    .filter((width) => width > 0 && width <= Math.max(maxWidth, 1))
    .sort((a, b) => a - b);
  return widths.map((width) => `${buildImageUrl(src, { ...options, width })} ${width}w`).join(', ');
}
