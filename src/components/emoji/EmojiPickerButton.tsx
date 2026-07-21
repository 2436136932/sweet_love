import { Smile, X } from 'lucide-react';
import { Suspense, lazy, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactElement, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { EmojiClickData, PickerProps } from 'emoji-picker-react';
import { cn } from '../../lib/utils';

type LazyEmojiPickerProps = Omit<PickerProps, 'emojiData'>;

const QUICK_EMOJIS = ['❤️', '🥰', '😘', '🤗', '🫶', '😂', '😭', '✨', '🌙', '🎉'];
const MOBILE_PANEL_GAP = 12;
const DESKTOP_PANEL_WIDTH = 340;
const DESKTOP_PANEL_HEIGHT = 472;

let emojiPickerPromise: Promise<{ default: (props: LazyEmojiPickerProps) => ReactElement }> | null = null;

function loadEmojiPicker() {
  emojiPickerPromise ??= Promise.all([
    import('emoji-picker-react'),
    import('emoji-picker-react/dist/data/emojis-zh'),
  ]).then(([{ default: EmojiPicker }, { default: zh }]) => {
    const EmojiPickerWithZh = (props: LazyEmojiPickerProps) => (
      <EmojiPicker {...props} emojiData={zh} />
    );

    return { default: EmojiPickerWithZh };
  });

  return emojiPickerPromise;
}

const LazyEmojiPicker = lazy(loadEmojiPicker);

export interface EmojiPickerButtonProps {
  value: string;
  onChange: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  className?: string;
}

export function EmojiPickerButton({ value, onChange, textareaRef, className }: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const [pickerHeight, setPickerHeight] = useState<number | string>(420);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const updatePanelLayout = () => {
    const viewport = window.visualViewport;
    const visualLeft = viewport?.offsetLeft ?? 0;
    const visualTop = viewport?.offsetTop ?? 0;
    const visualWidth = viewport?.width ?? window.innerWidth;
    const visualHeight = viewport?.height ?? window.innerHeight;
    const isDesktop = window.matchMedia('(min-width: 640px)').matches;

    if (isDesktop) {
      const triggerRect = rootRef.current?.getBoundingClientRect();
      const fallbackRight = MOBILE_PANEL_GAP;
      const right = triggerRect
        ? Math.max(MOBILE_PANEL_GAP, window.innerWidth - triggerRect.right)
        : fallbackRight;
      const top = triggerRect
        ? Math.max(MOBILE_PANEL_GAP, triggerRect.top - DESKTOP_PANEL_HEIGHT - 8)
        : MOBILE_PANEL_GAP;

      setPickerHeight(420);
      setPanelStyle({
        position: 'fixed',
        top,
        right,
        width: DESKTOP_PANEL_WIDTH,
        maxHeight: `calc(100dvh - ${MOBILE_PANEL_GAP * 2}px)`,
      });
      return;
    }

    const maxHeight = Math.max(280, Math.floor(visualHeight - MOBILE_PANEL_GAP * 2));
    const quickBarHeight = 53;

    setPickerHeight(Math.max(220, maxHeight - quickBarHeight));
    setPanelStyle({
      position: 'fixed',
      left: visualLeft + MOBILE_PANEL_GAP,
      right: Math.max(MOBILE_PANEL_GAP, window.innerWidth - visualLeft - visualWidth + MOBILE_PANEL_GAP),
      top: visualTop + MOBILE_PANEL_GAP,
      maxHeight,
    });
  };

  useEffect(() => {
    if (!open) return;
    updatePanelLayout();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    const handleViewportChange = () => updatePanelLayout();

    document.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('scroll', handleViewportChange);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
    };
  }, [open]);

  const insertEmoji = (emoji: string, closeAfterInsert = true) => {
    const input = textareaRef.current;
    const currentValue = input?.value ?? value;
    const start = input?.selectionStart ?? currentValue.length;
    const end = input?.selectionEnd ?? currentValue.length;
    const nextValue = `${currentValue.slice(0, start)}${emoji}${currentValue.slice(end)}`;
    const nextCursor = start + emoji.length;

    onChange(nextValue);
    if (closeAfterInsert) {
      setOpen(false);
    }

    requestAnimationFrame(() => {
      input?.focus({ preventScroll: true });
      input?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    insertEmoji(emojiData.emoji);
  };

  const pickerPanel = useMemo(() => {
    if (!open) return null;

    return (
      <div
        ref={panelRef}
        style={panelStyle}
        className="z-50 overflow-hidden rounded-2xl border border-white/80 bg-white shadow-xl dark:border-white/10 dark:bg-gray-950"
      >
        <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-100 bg-pink-50/60 px-2 py-2 scrollbar-hide dark:border-white/10 dark:bg-white/5">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => insertEmoji(emoji)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xl transition-colors hover:bg-white active:scale-95 dark:hover:bg-white/10"
            >
              {emoji}
            </button>
          ))}
        </div>

        <Suspense
          fallback={
            <div className="flex h-64 flex-col items-center justify-center gap-3 text-xs font-black text-gray-400 dark:text-gray-500">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-pink-100 border-t-pink-500" />
              正在加载表情...
            </div>
          }
        >
          <LazyEmojiPicker
            open={open}
            onEmojiClick={handleEmojiClick}
            theme={'auto' as PickerProps['theme']}
            emojiStyle={'apple' as PickerProps['emojiStyle']}
            lazyLoadEmojis
            autoFocusSearch={false}
            searchPlaceholder="搜索表情"
            previewConfig={{ showPreview: false }}
            width="100%"
            height={pickerHeight}
          />
        </Suspense>
      </div>
    );
  }, [open, panelStyle, pickerHeight, value]);

  return (
    <div ref={rootRef} className={cn('relative inline-flex', className)}>
      <button
        type="button"
        aria-label={open ? '关闭表情选择器' : '打开表情选择器'}
        aria-expanded={open}
        onPointerEnter={() => void loadEmojiPicker()}
        onFocus={() => void loadEmojiPicker()}
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-gray-400 transition-colors hover:bg-pink-50 hover:text-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-100 dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-pink-200"
      >
        {open ? <X size={20} /> : <Smile size={20} />}
      </button>

      {pickerPanel ? createPortal(pickerPanel, document.body) : null}
    </div>
  );
}

export default EmojiPickerButton;
