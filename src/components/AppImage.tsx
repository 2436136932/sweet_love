import type { CSSProperties, ImgHTMLAttributes } from 'react';
import { buildImageUrl, buildSrcSet, type ImageCrop } from '../lib/imageUrl';

type NativeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'sizes' | 'loading' | 'decoding' | 'fetchPriority'>;

export interface AppImageProps extends NativeImageProps {
  src?: string | null;
  width?: number;
  height?: number;
  crop?: ImageCrop;
  quality?: number;
  sizes?: string;
  priority?: boolean;
  aspectRatio?: string;
  widths?: number[];
}

export function AppImage({
  src,
  width,
  height,
  crop,
  quality,
  sizes,
  priority = false,
  aspectRatio,
  widths,
  style,
  ...props
}: AppImageProps) {
  const imageOptions = { width, height, crop, quality, widths };
  const mergedStyle: CSSProperties | undefined = aspectRatio ? { aspectRatio, ...style } : style;

  return (
    <img
      {...props}
      src={buildImageUrl(src, imageOptions)}
      srcSet={buildSrcSet(src, imageOptions)}
      sizes={sizes}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
      style={mergedStyle}
    />
  );
}
