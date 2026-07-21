import React, { useState, useRef, ChangeEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Send, Image as ImageIcon, MoreVertical, Heart, X, Sparkles } from 'lucide-react';
import { Message, User } from '../types';
import { aiService, uploadService } from '../services/api';
import { useToast } from '../components/Toast';
import { useModalHistory } from '../hooks/useModalHistory';
import { AppImage } from '../components/AppImage';
import { EmojiPickerButton } from '../components/emoji/EmojiPickerButton';

// 格式化留言时间：今天 12:30 / 昨天 14:15 / 6月30日 18:22
const formatMessageTime = (dateStr?: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  if (isNaN(date.getTime())) return '';

  const isSameDay = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (isSameDay) {
    return `今天 ${timeStr}`;
  } else if (isYesterday) {
    return `昨天 ${timeStr}`;
  } else {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日 ${timeStr}`;
  }
};

// 判断是否需要展示时间分割线（大于 5 分钟）
const shouldShowTimeDivider = (currentMsg: Message, prevMsg?: Message) => {
  if (!prevMsg) return true;
  const currentVal = currentMsg.createdAt ? new Date(currentMsg.createdAt).getTime() : 0;
  const prevVal = prevMsg.createdAt ? new Date(prevMsg.createdAt).getTime() : 0;
  if (!currentVal || !prevVal) return false;
  return currentVal - prevVal > 5 * 60 * 1000;
};

interface MessageItemProps {
  m: Message;
  idx: number;
  user: User;
  currentUserAvatar: string;
  partnerAvatar: string;
  partnerName: string;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  highlightedId: string | null;
  scrollToMessage: (id: string) => void;
  setPreviewImage: (img: { src: string; alt: string } | null) => void;
  onDelete?: (id: string) => Promise<void> | void;
  setReplyingMessage: (m: Message) => void;
  messageInputRef: React.RefObject<HTMLTextAreaElement | null>;
  showToast: (msg: string, type: 'success' | 'error') => void;
  showDivider: boolean;
}

// WeChat style item memoization to optimize big chat lists re-rendering
const MessageItem = React.memo(function MessageItem({
  m,
  idx,
  user,
  currentUserAvatar,
  partnerAvatar,
  partnerName,
  activeMenuId,
  setActiveMenuId,
  highlightedId,
  scrollToMessage,
  setPreviewImage,
  onDelete,
  setReplyingMessage,
  messageInputRef,
  showToast,
  showDivider
}: MessageItemProps) {
  const isMine = m.userId === user.id || m.senderId === user.id;
  const senderAvatar = m.user?.avatar || (isMine ? currentUserAvatar : partnerAvatar);
  const senderName = m.user?.username || (isMine ? user.username : partnerName);

  return (
    <div className="flex flex-col gap-4">
      {showDivider && (m.createdAt || m.timestamp) && (
        <div className="flex justify-center my-1 select-none">
          <span className="bg-white/50 text-[10px] font-semibold text-gray-400/80 px-2.5 py-0.5 rounded-full border border-white/30 backdrop-blur-sm shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
            {formatMessageTime(m.createdAt || m.timestamp)}
          </span>
        </div>
      )}
      <motion.div
        id={`msg-${m.id}`}
        layout
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ 
          opacity: 1, 
          scale: highlightedId === m.id ? 1.05 : 1, 
          y: 0,
          boxShadow: highlightedId === m.id ? "0 10px 25px rgba(244,114,182,0.2)" : "none"
        }}
        transition={{ 
          type: "spring",
          stiffness: 300,
          damping: 25,
          delay: highlightedId === m.id ? 0 : idx * 0.03 
        }}
        className={`flex rounded-3xl p-1 transition-all duration-300 ${
          highlightedId === m.id ? 'bg-pink-100/40 ring-2 ring-pink-400/30' : ''
        } ${isMine ? 'justify-end' : 'justify-start'}`}
      >
        <div className={`flex gap-3 max-w-[85%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
          <motion.div 
            whileHover={{ scale: 1.1 }}
            className={`w-9 h-9 rounded-2xl overflow-hidden shrink-0 shadow-sm border-2 border-white flex items-center justify-center ${
              isMine ? 'bg-pink-100' : 'bg-blue-100'
            }`}
          >
            <AppImage 
              src={senderAvatar} 
              alt={senderName} 
              className="w-full h-full object-cover"
              width={72}
              height={72}
              crop="square"
            />
          </motion.div>
          <div className={`flex flex-col gap-1.5 ${isMine ? 'items-end' : 'items-start'}`}>
            <div className="relative">
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuId(m.id === activeMenuId ? null : m.id);
                }}
                className={`px-4 py-2.5 rounded-[22px] text-sm font-medium shadow-sm border transition-all hover:shadow-md whitespace-pre-wrap break-words text-left cursor-pointer select-text ${
                  isMine
                    ? 'bg-gradient-to-br from-pink-500 to-rose-400 text-white border-pink-400 rounded-tr-none'
                    : 'bg-white/80 backdrop-blur-sm text-gray-700 border-white/60 rounded-tl-none'
                }`}
              >
                {/* Quote reply block */}
                {m.replyTo && (
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollToMessage(m.replyTo!.id);
                    }}
                    className={`mb-2 p-2 rounded-xl text-[10px] border border-dashed flex flex-col gap-0.5 select-none transition-all active:scale-[0.98] ${
                      isMine 
                        ? 'bg-white/15 hover:bg-white/20 border-white/25 text-white/90' 
                        : 'bg-gray-100/60 hover:bg-gray-100/90 border-gray-200 text-gray-500'
                    }`}
                  >
                    <p className="font-extrabold text-[8px] uppercase tracking-wider opacity-85">
                      @{m.replyTo.user?.username || (m.replyTo.userId === user.id || m.replyTo.senderId === user.id ? user.username : partnerName)}
                    </p>
                    <p className="truncate max-w-[200px] leading-snug">
                      {m.replyTo.content || (m.replyTo.imageUrl ? '[图片]' : '')}
                    </p>
                  </div>
                )}

                {m.imageUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewImage({ src: m.imageUrl || '', alt: `${senderName} 发送的图片` });
                    }}
                    className="mb-2 block max-w-full overflow-hidden rounded-xl text-left transition-transform active:scale-[0.98]"
                    aria-label="查看大图"
                  >
                    <AppImage
                      src={m.imageUrl}
                      alt={`${senderName} 发送的图片`}
                      className="max-h-60 max-w-full cursor-zoom-in object-cover transition-transform hover:scale-[1.02]"
                      width={480}
                      height={320}
                      crop="cover"
                      sizes="80vw"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                )}
                {m.content}
              </div>

              {/* Floating context menu */}
              <AnimatePresence>
                {activeMenuId === m.id && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 5 }}
                    transition={{ duration: 0.12 }}
                    className={`absolute z-40 bg-white/95 border border-pink-100/60 shadow-[0_10px_25px_rgba(244,114,182,0.12)] rounded-2xl p-1 flex gap-0.5 items-center text-xs -top-12 backdrop-blur-md ${
                      isMine ? 'right-0' : 'left-0'
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(m.content);
                        showToast('已复制到剪贴板', 'success');
                        setActiveMenuId(null);
                      }}
                      className="px-3 py-1.5 rounded-xl hover:bg-pink-50 text-gray-700 font-bold transition-colors whitespace-nowrap"
                    >
                      复制
                    </button>
                    <button
                      onClick={() => {
                        setReplyingMessage(m);
                        setActiveMenuId(null);
                        setTimeout(() => {
                          messageInputRef.current?.focus();
                        }, 50);
                      }}
                      className="px-3 py-1.5 rounded-xl hover:bg-pink-50 text-pink-500 font-bold transition-colors whitespace-nowrap"
                    >
                      回复
                    </button>
                    {isMine && onDelete && (
                      <button
                        onClick={async () => {
                          if (window.confirm("确定撤回这条留言吗？")) {
                            try {
                              await onDelete(m.id);
                              showToast('留言已撤回', 'success');
                            } catch (error) {
                              console.error("Delete message failed:", error);
                              showToast('撤回失败，请稍后重试', 'error');
                            }
                          }
                          setActiveMenuId(null);
                        }}
                        className="px-3 py-1.5 rounded-xl hover:bg-red-50 text-red-500 font-bold transition-colors whitespace-nowrap"
                      >
                        撤回
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.m.id === nextProps.m.id &&
    prevProps.m.content === nextProps.m.content &&
    prevProps.m.imageUrl === nextProps.m.imageUrl &&
    prevProps.m.replyToId === nextProps.m.replyToId &&
    prevProps.showDivider === nextProps.showDivider &&
    (prevProps.highlightedId === prevProps.m.id) === (nextProps.highlightedId === nextProps.m.id) &&
    (prevProps.activeMenuId === prevProps.m.id) === (nextProps.activeMenuId === nextProps.m.id) &&
    prevProps.currentUserAvatar === nextProps.currentUserAvatar &&
    prevProps.partnerAvatar === nextProps.partnerAvatar
  );
});

export default function MessageBoard({ 
  data, 
  user,
  isLoading = false,
  onBack,
  onSend,
  onDelete,
  onLoadMore
}: { 
  data: Message[],
  user: User,
  isLoading?: boolean,
  onBack: () => void,
  onSend: (content: string, imageUrl?: string, replyToId?: string) => Promise<void> | void,
  onDelete?: (id: string) => Promise<void> | void,
  onLoadMore?: (beforeId: string) => Promise<number> | number
}) {
  const { showToast } = useToast();
  const [msg, setMsg] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [replyingMessage, setReplyingMessage] = useState<Message | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const partner = user.partner;
  const currentUserAvatar = user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.username)}`;
  const partnerAvatar = partner?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(partner?.username || 'partner')}`;
  const closeAiPanel = useModalHistory('messages-ai', aiPanelOpen, () => setAiPanelOpen(false));
  const closeImagePreview = useModalHistory('messages-image-preview', Boolean(previewImage), () => setPreviewImage(null));

  const prevDataRef = useRef<Message[]>([]);

  // Auto scroll to bottom when new messages arrive (only if not loading older history)
  useEffect(() => {
    const prevData = prevDataRef.current;
    const currentData = data;
    prevDataRef.current = data;

    const container = scrollRef.current;
    if (!container) return;

    // 1. 首次加载
    if (prevData.length === 0 && currentData.length > 0) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'auto'
      });
      return;
    }

    // 2. 检查是否有新消息被追加到尾部
    const hasNewMessageAtBottom = 
      currentData.length > 0 && 
      (prevData.length === 0 || currentData[currentData.length - 1].id !== prevData[prevData.length - 1].id);

    if (hasNewMessageAtBottom && !loadingMore && !highlightedId) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [data, highlightedId, loadingMore]);

  // Click outside to close message popover menus
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenuId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Auto-resize input textarea
  useEffect(() => {
    const textarea = messageInputRef.current;
    if (textarea) {
      textarea.style.height = '40px';
      const scrollHeight = textarea.scrollHeight;
      if (scrollHeight > 40) {
        textarea.style.height = `${Math.min(scrollHeight, 120)}px`;
      }
    }
  }, [msg]);

  // WeChat Style Infinite History Load on top scrolling
  const handleScroll = async () => {
    const container = scrollRef.current;
    if (!container) return;

    if (container.scrollTop <= 5 && !loadingMore && hasMore && data.length > 0 && onLoadMore) {
      setLoadingMore(true);
      const oldScrollHeight = container.scrollHeight;
      
      try {
        const oldestId = data[0].id;
        const loadedCount = await onLoadMore(oldestId);
        
        // If loaded history items are less than limit (20), it means no more history exists
        if (typeof loadedCount === 'number' && loadedCount < 20) {
          setHasMore(false);
        }
      } catch (error) {
        console.error("Load older messages failed:", error);
      } finally {
        setLoadingMore(false);
        // Correct height shift seamlessly, keeping current view stable
        setTimeout(() => {
          if (scrollRef.current) {
            const newScrollHeight = scrollRef.current.scrollHeight;
            scrollRef.current.scrollTop = newScrollHeight - oldScrollHeight;
          }
        }, 20);
      }
    }
  };

  // Scroll to original message when clicking the reply indicator
  const scrollToMessage = (targetId: string) => {
    const el = document.getElementById(`msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedId(targetId);
      setTimeout(() => {
        setHighlightedId(null);
      }, 1200);
    } else {
      showToast('无法定位到原留言，它可能已被撤回', 'error');
    }
  };

  const handleSend = async () => {
    if ((msg.trim() || selectedFile) && !isSending) {
      setIsSending(true);
      try {
        const imageUrl = selectedFile ? await uploadService.upload(selectedFile) : undefined;
        await onSend(msg, imageUrl, replyingMessage?.id);
        setMsg('');
        setSelectedImage(null);
        setSelectedFile(null);
        setReplyingMessage(null);
        if (messageInputRef.current) {
          messageInputRef.current.style.height = '40px';
        }
      } catch (error) {
        console.error("Send message failed:", error);
        showToast(error instanceof Error ? error.message : '发送失败，请检查图片格式或大小', 'error');
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift + Enter 允许换行
        return;
      }
      if (!isComposing) {
        e.preventDefault();
        handleSend();
      }
    }
  };

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateAiMessage = async () => {
    const prompt = aiPrompt.trim() || '帮我生成一句自然温柔的留言';
    setAiLoading(true);
    setAiResult('');
    try {
      const result = await aiService.generate({
        type: 'message_reply',
        prompt,
        context: {
          partnerName: partner?.username,
          recentMessages: data.slice(-6).map((item) => ({
            mine: item.userId === user.id || item.senderId === user.id,
            content: item.content,
          })),
        },
      });
      setAiResult(result.content);
    } catch (error) {
      console.error('Generate message failed:', error);
      showToast(error instanceof Error ? error.message : 'AI 文案生成失败，请稍后重试', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col overflow-hidden bg-[#FEF9F3]/30">
      {/* Header */}
      <header className="z-10 flex shrink-0 items-center justify-between border-b border-white/50 bg-white/40 px-4 pb-4 pt-8 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to home"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-gray-500 shadow-sm ring-1 ring-white/70 transition-colors hover:text-pink-500"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex shrink-0 -space-x-3">
            <div className="w-10 h-10 rounded-[14px] border-2 border-white overflow-hidden bg-blue-100 shadow-md relative z-10">
              <AppImage src={partnerAvatar} alt={partner?.username || '另一半'} className="w-full h-full object-cover" width={80} height={80} crop="square" priority />
            </div>
            <div className="w-10 h-10 rounded-[14px] border-2 border-white overflow-hidden bg-pink-100 shadow-md relative z-20">
              <AppImage src={currentUserAvatar} alt={user.username} className="w-full h-full object-cover" width={80} height={80} crop="square" priority />
            </div>
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-black text-gray-800 tracking-tight">我们的留言板</h1>
            <p className="text-[8px] text-green-500 font-black uppercase tracking-widest flex items-center gap-1">
              <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse" /> 正在思念中
            </p>
          </div>
        </div>
        <MoreVertical size={20} className="text-gray-400" />
      </header>

      {/* Chat Area */}
      <div 
        ref={scrollRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 scrollbar-hide pb-28"
      >
        {/* Loading indicator for top loading history */}
        {loadingMore && (
          <div className="flex justify-center py-2">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-pink-500/20 border-t-pink-500" />
          </div>
        )}

        {isLoading && data.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center text-gray-400">
            <div className="mb-3 h-10 w-10 animate-pulse rounded-2xl bg-pink-100" />
            <p className="text-xs font-black uppercase tracking-widest">正在同步留言...</p>
          </div>
        )}

        {!isLoading && data.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-pink-50 text-pink-300">
              <Heart size={30} className="fill-pink-100" />
            </div>
            <p className="text-sm font-black text-gray-500">还没有留言</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-300">Say something sweet</p>
          </div>
        )}

        {data.map((m, idx) => {
          const prevMsg = idx > 0 ? data[idx - 1] : undefined;
          const showDivider = shouldShowTimeDivider(m, prevMsg);
          return (
            <MessageItem
              key={m.id}
              m={m}
              idx={idx}
              user={user}
              currentUserAvatar={currentUserAvatar}
              partnerAvatar={partnerAvatar}
              partnerName={partner?.username || '另一半'}
              activeMenuId={activeMenuId}
              setActiveMenuId={setActiveMenuId}
              highlightedId={highlightedId}
              scrollToMessage={scrollToMessage}
              setPreviewImage={setPreviewImage}
              onDelete={onDelete}
              setReplyingMessage={setReplyingMessage}
              messageInputRef={messageInputRef}
              showToast={showToast}
              showDivider={showDivider}
            />
          );
        })}
      </div>

      {/* Emoji Picker & Input Area */}
      <div
        className="absolute inset-x-3 z-30 flex flex-col gap-2"
        style={{ bottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        {/* Image Preview */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-xl group"
            >
              <AppImage src={selectedImage} alt="preview" className="w-full h-full object-cover" width={96} height={96} crop="square" />
              <button 
                onClick={() => { setSelectedImage(null); setSelectedFile(null); }}
                className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full hover:bg-black/70 transition-colors"
                aria-label="Remove image"
              >
                <X size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Replying message indicator */}
        <AnimatePresence>
          {replyingMessage && (
            <motion.div
              initial={{ y: 10, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 10, opacity: 0, scale: 0.98 }}
              className="rounded-2xl border border-pink-100/50 bg-white/95 p-2.5 shadow-lg backdrop-blur-xl flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-1 h-6 bg-pink-400 rounded-full shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-[9px] text-pink-500 uppercase tracking-widest">
                    正在回复 {replyingMessage.user?.username || (replyingMessage.userId === user.id || replyingMessage.senderId === user.id ? user.username : partner?.username || '另一半')}
                  </p>
                  <p className="truncate text-gray-500 font-semibold mt-0.5 max-w-[240px]">
                    {replyingMessage.content || (replyingMessage.imageUrl ? '[图片]' : '')}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setReplyingMessage(null)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100/80 text-gray-400 hover:bg-pink-50 hover:text-pink-500 transition-colors"
                aria-label="Cancel reply"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating AI Panel */}
        <AnimatePresence>
          {aiPanelOpen && (
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.96 }}
              className="absolute bottom-[64px] left-0 right-0 z-40 rounded-[26px] border border-pink-100/50 bg-white/90 p-4 shadow-[0_20px_50px_rgba(244,114,182,0.15)] backdrop-blur-xl"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-black text-gray-800">AI 留言草稿</p>
                <button type="button" onClick={closeAiPanel} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:bg-pink-50 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <textarea
                value={aiPrompt}
                onChange={(event) => setAiPrompt(event.target.value)}
                rows={2}
                placeholder="想表达什么？比如：哄TA开心、说晚安、解释一下刚才的事..."
                className="w-full resize-none rounded-2xl border border-pink-100/40 bg-pink-50/20 px-3 py-2 text-xs font-bold text-gray-700 outline-none placeholder:text-gray-300 focus:border-pink-300 transition-colors"
              />
              <button
                type="button"
                onClick={generateAiMessage}
                disabled={aiLoading}
                className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 text-xs font-black text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                {aiLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Sparkles size={14} />}
                生成文案
              </button>
              {aiResult && (
                <div className="mt-2 rounded-2xl bg-pink-50/50 border border-pink-100/30 p-3">
                  <p className="whitespace-pre-wrap text-xs font-bold leading-relaxed text-gray-700">{aiResult}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setMsg(aiResult);
                      setAiPanelOpen(false);
                    }}
                    className="mt-2 w-full rounded-xl bg-pink-500 py-2.5 text-xs font-black text-white hover:bg-pink-600 active:scale-[0.98] transition-all"
                  >
                    填入输入框
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text Input Area */}
        <div className="bg-white/95 backdrop-blur-xl border border-white/80 p-2 rounded-[26px] shadow-[0_18px_45px_rgba(244,114,182,0.22)] flex items-end gap-2">
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleImageSelect}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors ${selectedImage ? 'text-pink-500' : 'text-gray-400 hover:text-pink-400'}`}
            aria-label="Select image"
          >
            <ImageIcon size={20} />
          </button>
          
          <textarea
            ref={messageInputRef}
            rows={1}
            placeholder={selectedImage ? "想说点什么..." : "说点悄悄话..."}
            className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm font-medium outline-none placeholder:text-gray-300 resize-none max-h-[120px] overflow-y-auto scrollbar-hide py-2.5 leading-relaxed"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            disabled={isSending}
          />
          
          <span onPointerDownCapture={() => setAiPanelOpen(false)}>
            <EmojiPickerButton value={msg} onChange={setMsg} textareaRef={messageInputRef} />
          </span>
          <button
            type="button"
            onClick={() => {
              setAiPanelOpen((open) => !open);
            }}
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors ${aiPanelOpen ? 'text-pink-500' : 'text-gray-400 hover:text-pink-400'}`}
            aria-label="AI message assistant"
          >
            <Sparkles size={20} />
          </button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink-500 text-white shadow-lg shadow-pink-100 disabled:opacity-50"
            disabled={isSending || (!msg.trim() && !selectedFile)}
            aria-label="Send message"
          >
            {isSending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Send size={18} />}
          </motion.button>
        </div>
      </div>

      {/* Background Decor */}
      <div className="absolute top-[20%] right-[10%] opacity-10 pointer-events-none">
        <Heart size={80} className="text-pink-300 fill-pink-100" />
      </div>
      <div className="absolute bottom-[20%] left-[10%] opacity-10 pointer-events-none">
        <Heart size={60} className="text-purple-300 fill-purple-100" />
      </div>

      {/* Fullscreen Image Preview */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-[180] flex items-center justify-center bg-gray-950/88 p-4 backdrop-blur-sm">
            <button
              type="button"
              aria-label="关闭图片预览"
              onClick={closeImagePreview}
              className="absolute inset-0 cursor-zoom-out"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="relative z-10 flex max-h-full max-w-full items-center justify-center"
            >
              <AppImage
                src={previewImage.src}
                alt={previewImage.alt}
                className="max-h-[86vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
                width={1440}
                height={1440}
                sizes="100vw"
                priority
                referrerPolicy="no-referrer"
              />
              <button
                type="button"
                onClick={closeImagePreview}
                aria-label="关闭图片预览"
                className="absolute -right-2 -top-2 flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-gray-600 shadow-xl transition-colors hover:text-pink-500"
              >
                <X size={18} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
