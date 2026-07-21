import { Send } from 'lucide-react';
import { useRef, useState } from 'react';
import { cn } from '../../lib/utils';
import { EmojiPickerButton } from './EmojiPickerButton';

export interface EmojiInputProps {
  onSend?: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function EmojiInput({ onSend, placeholder = '写点什么...', className }: EmojiInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSend = () => {
    const content = value.trim();
    if (!content) return;
    onSend?.(content);
    setValue('');
    requestAnimationFrame(() => textareaRef.current?.focus({ preventScroll: true }));
  };

  return (
    <div className={cn('rounded-2xl border border-gray-100 bg-white p-3 shadow-xl dark:border-white/10 dark:bg-gray-950', className)}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="min-h-24 w-full resize-none bg-transparent px-1 text-sm font-bold leading-relaxed text-gray-700 outline-none placeholder:text-gray-300 dark:text-gray-100 dark:placeholder:text-gray-500"
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <EmojiPickerButton value={value} onChange={setValue} textareaRef={textareaRef} />
        <button
          type="button"
          onClick={handleSend}
          disabled={!value.trim()}
          className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-pink-500 px-4 text-xs font-black text-white shadow-lg shadow-pink-100 transition-colors hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-none"
        >
          <Send size={15} />
          发送
        </button>
      </div>
    </div>
  );
}

export default EmojiInput;
