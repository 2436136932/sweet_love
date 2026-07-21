import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Image as ImageIcon, Video, Plus, X, UploadCloud, Loader2 } from 'lucide-react';
import { uploadService } from '../services/api';
import { useToast } from './Toast';
import { AppImage } from './AppImage';
import { buildImageUrl } from '../lib/imageUrl';

export interface UploadProps {
  value?: string | string[];
  onChange?: (value: any) => void;
  variant?: 'card' | 'avatar' | 'icon' | 'drag-drop';
  multiple?: boolean;
  accept?: string;
  autoUpload?: boolean;
  placeholder?: string;
  uploading?: boolean; // Manual control from parent
  disabled?: boolean;
  className?: string;
  onClear?: () => void;
  onFileSelect?: (file: File | File[] | null) => void;
  onUploadStart?: () => void;
  onUploadEnd?: (url: any) => void;
  onUploadError?: (error: Error) => void;
}

export function Upload({
  value,
  onChange,
  variant = 'card',
  multiple = false,
  accept = 'image/*',
  autoUpload = true,
  placeholder,
  uploading: parentUploading = false,
  disabled = false,
  className = '',
  onClear,
  onFileSelect,
  onUploadStart,
  onUploadEnd,
  onUploadError,
}: UploadProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDragOver, setIsDragOver] = useState(false);
  const [internalUploading, setInternalUploading] = useState(false);
  const [localPreviews, setLocalPreviews] = useState<string[]>([]);
  
  const isUploading = internalUploading || parentUploading;

  // Helpers to check media type
  const isVideoUrl = (url: string) => {
    const videoExtensions = ['.mp4', '.mov', '.webm', '.ogg', '.m4v'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext)) || url.startsWith('data:video/');
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || disabled || isUploading) return;

    // Check multiple restriction
    const filesArray = Array.from(files);
    const selectedFiles = multiple ? filesArray : [filesArray[0]];

    // Trigger EXIF/callback for parent if provided
    if (onFileSelect) {
      onFileSelect(multiple ? selectedFiles : selectedFiles[0]);
    }

    if (autoUpload) {
      setInternalUploading(true);
      onUploadStart?.();
      try {
        const uploadPromises = selectedFiles.map(file => uploadService.upload(file));
        const uploadedUrls = await Promise.all(uploadPromises);

        if (multiple) {
          const currentUrls = Array.isArray(value) ? value : (value ? [value as string] : []);
          const nextUrls = [...currentUrls, ...uploadedUrls];
          onChange?.(nextUrls);
          onUploadEnd?.(nextUrls);
        } else {
          onChange?.(uploadedUrls[0]);
          onUploadEnd?.(uploadedUrls[0]);
        }
        showToast('媒体文件已成功上传', 'success');
      } catch (error) {
        console.error('Upload component error:', error);
        const err = error instanceof Error ? error : new Error('文件上传失败，请重试');
        onUploadError?.(err);
        showToast(err.message, 'error');
      } finally {
        setInternalUploading(false);
      }
    } else {
      // Manual upload mode: generate local object URLs for previews and pass the files
      const blobUrls = selectedFiles.map(file => URL.createObjectURL(file));
      setLocalPreviews(prev => multiple ? [...prev, ...blobUrls] : [blobUrls[0]]);
      
      // Send selected Files back to parent
      if (multiple) {
        onChange?.(selectedFiles);
      } else {
        onChange?.(selectedFiles[0]);
      }
    }

    // Reset input value so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  // Drag and drop handlers
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled && !isUploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!disabled && !isUploading) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Delete image/video
  const handleRemove = (indexToRemove: number) => {
    if (disabled || isUploading) return;

    if (multiple) {
      if (autoUpload) {
        const currentUrls = Array.isArray(value) ? value : [];
        const nextUrls = currentUrls.filter((_, idx) => idx !== indexToRemove);
        onChange?.(nextUrls);
      } else {
        setLocalPreviews(prev => prev.filter((_, idx) => idx !== indexToRemove));
        // If value holds File[], update parent
        const currentFiles = Array.isArray(value) ? value : [];
        const nextFiles = currentFiles.filter((_, idx) => idx !== indexToRemove);
        onChange?.(nextFiles);
      }
    } else {
      onChange?.(null);
      setLocalPreviews([]);
      onClear?.();
    }
  };

  // Render trigger zone
  const renderTrigger = (isAddMore = false) => {
    const textPrompt = placeholder || (multiple ? '添加照片或视频' : '选择图片或视频');

    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        className={`relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 ${
          isDragOver
            ? 'border-pink-400 bg-pink-50/50 scale-[0.98]'
            : 'border-pink-100 bg-pink-50/20 hover:bg-pink-50/40'
        } ${isAddMore ? 'h-24 w-24' : 'h-40 w-full'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        {isUploading ? (
          <div className="flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-pink-500" />
            {!isAddMore && <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest">正在上传...</span>}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center">
            {accept.includes('video') ? (
              <UploadCloud size={isAddMore ? 18 : 26} className="mb-2 text-pink-300" />
            ) : (
              <ImageIcon size={isAddMore ? 18 : 26} className="mb-2 text-pink-300" />
            )}
            {!isAddMore && (
              <span className="text-[10px] font-bold uppercase tracking-widest text-pink-400">
                {textPrompt}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  // List of items to display
  const items = Array.isArray(value) ? value : (value ? [value as string] : []);
  const previewsToRender = !autoUpload && localPreviews.length > 0 ? localPreviews : items;

  // 1. Multiple Mode Grid
  if (multiple) {
    return (
      <div className={`space-y-3 ${className}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled || isUploading}
        />
        
        {previewsToRender.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {previewsToRender.map((src, index) => {
              const isVideo = isVideoUrl(src);
              return (
                <div key={src + index} className="relative aspect-square overflow-hidden rounded-xl bg-gray-50 border border-pink-50 shadow-sm group">
                  {isVideo ? (
                    <video src={buildImageUrl(src)} className="h-full w-full object-cover" />
                  ) : (
                    <AppImage src={src} alt="Preview" className="h-full w-full object-cover" width={160} height={160} crop="square" sizes="25vw" />
                  )}
                  
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(index);
                    }}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-rose-500 shadow-md transition-all hover:scale-110 hover:bg-rose-50 border border-gray-100 z-10"
                  >
                    <X size={10} />
                  </button>
                  {isVideo && (
                    <div className="absolute bottom-1 right-1 rounded bg-black/40 p-0.5 text-[8px] font-bold text-white uppercase tracking-widest">
                      video
                    </div>
                  )}
                </div>
              );
            })}
            {previewsToRender.length < 9 && renderTrigger(true)}
          </div>
        )}
        
        {previewsToRender.length === 0 && renderTrigger(false)}
      </div>
    );
  }

  // 2. Single Mode Card / Default
  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {previewsToRender.length > 0 && previewsToRender[0] ? (
        <div className="group relative w-full overflow-hidden rounded-2xl border border-pink-100 bg-pink-50/10 p-2 shadow-inner">
          <div className="relative mx-auto w-fit max-w-full overflow-hidden rounded-xl bg-black/5">
            {isVideoUrl(previewsToRender[0]) ? (
              <video
                src={buildImageUrl(previewsToRender[0])}
                className="mx-auto max-h-[180px] max-w-full object-contain rounded-xl sm:max-h-[280px]"
                controls
              />
            ) : (
              <AppImage
                src={previewsToRender[0]}
                alt="Uploaded media preview"
                className="mx-auto max-h-[180px] max-w-full object-contain rounded-xl sm:max-h-[280px]"
                width={560}
                height={420}
                sizes="(min-width: 640px) 560px, 100vw"
              />
            )}

            {/* Hover overlay to delete */}
            {!disabled && !isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-xl">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRemove(0);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-rose-500 shadow-xl transition-all duration-300 hover:scale-110 active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>
            )}
          </div>

          {/* Loader inside media container when uploading is manually passed as true */}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-xs rounded-2xl">
              <Loader2 className="h-6 w-6 animate-spin text-pink-500" />
            </div>
          )}
        </div>
      ) : (
        renderTrigger(false)
      )}
    </div>
  );
}
