import { motion, AnimatePresence } from 'motion/react';
import { Book, Plus, Smile, Heart, Image as ImageIcon, Sparkles, MapPin, X, Trash2, Map, Frown, Meh, Edit2, Calendar } from 'lucide-react';
import { useState, ChangeEvent, useMemo } from 'react';
import { DiaryEntry, User } from '../types';
import MapPicker from '../components/MapPicker';
import { Upload } from '../components/Upload';
import { aiService, uploadService } from '../services/api';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Confirm';
import { useModalHistory } from '../hooks/useModalHistory';
import { AppImage } from '../components/AppImage';

function getLocalDateTimeString(date = new Date()) {
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
}

export default function Diary({ 
  data, 
  user,
  isLoading = false,
  onAdd, 
  onDelete,
  onUpdate 
}: { 
  data: DiaryEntry[],
  user: User,
  isLoading?: boolean,
  onAdd: (entry: Omit<DiaryEntry, 'id'>) => Promise<void> | void,
  onDelete: (id: string) => Promise<void> | void,
  onUpdate: (entry: DiaryEntry) => Promise<void> | void
}) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<DiaryEntry['mood']>('love');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [location, setLocation] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPolishedContent, setAiPolishedContent] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'week' | 'month' | 'custom'>('all');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [dateTime, setDateTime] = useState(() => getLocalDateTimeString());
  const partner = user.partner;
  const userAvatar = user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.username)}`;
  const partnerAvatar = partner?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(partner?.username || 'partner')}`;
  const closeAddModal = useModalHistory('diary-editor', showAdd, () => setShowAdd(false));
  const closeMapModal = useModalHistory('diary-map', showMap, () => setShowMap(false));

  const filteredDiaries = useMemo(() => {
    let start: Date | null = null;
    let end: Date | null = null;
    const now = new Date();

    if (filterType === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.setDate(diff));
      start.setHours(0, 0, 0, 0);
    } else if (filterType === 'month') {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (filterType === 'custom') {
      if (startDateFilter) {
        start = new Date(startDateFilter + 'T00:00:00');
      }
      if (endDateFilter) {
        end = new Date(endDateFilter + 'T23:59:59');
      }
    }

    return data.filter(diary => {
      const d = new Date(diary.date);
      if (isNaN(d.getTime())) return true;
      if (start && d < start) return false;
      if (end && d > end) return false;
      return true;
    });
  }, [data, filterType, startDateFilter, endDateFilter]);

  const handleMapSelect = (data: { address: string; lat: number; lng: number }) => {
    setLocation(data.address);
    setShowMap(false);
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
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

  const getLocation = () => {
    if (!navigator.geolocation) {
      showToast('您的浏览器不支持地理定位', 'error');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Use OpenStreetMap Nominatim for free reverse geocoding
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=zh-CN`,
            {
              headers: {
                'Accept-Language': 'zh-CN',
                'User-Agent': 'SweetLoverApp/1.0'
              }
            }
          );
          const data = await response.json();
          if (data && data.display_name) {
            // Simplify address to something romantic/concise
            const address = data.address;
            const city = address.city || address.town || address.village || '';
            const district = address.suburb || address.city_district || '';
            const road = address.road || '';
            const shortAddress = district || city ? `${city} ${district} ${road}`.trim() : data.display_name;
            setLocation(shortAddress || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
          } else {
            setLocation(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
          }
        } catch (err) {
          console.error('Reverse geocoding error:', err);
          setLocation(`${latitude.toFixed(2)}, ${longitude.toFixed(2)}`);
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        setIsLocating(false);
        showToast('无法获取位置信息', 'error');
      }
    );
  };

  const handleAdd = async () => {
    if (content) {
      setIsSaving(true);
      try {
        const imageUrl = selectedFile ? await uploadService.upload(selectedFile) : selectedImage;
        const submitDate = new Date(dateTime).toISOString();
      if (editingId) {
        await onUpdate({
          id: editingId,
          date: submitDate,
          mood,
          content,
          location: location || '我们的家',
          images: imageUrl ? [imageUrl] : []
        });
      } else {
        await onAdd({
          date: submitDate,
          mood,
          content,
          location: location || '我们的家',
          images: imageUrl ? [imageUrl] : []
        });
      }
      showToast(editingId ? '日记已更新' : '日记已发布', 'success');
      resetForm();
      } catch (error) {
        console.error("Save diary failed:", error);
        showToast(error instanceof Error ? error.message : '保存失败，请检查图片格式或大小', 'error');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (deletingId) return;
    const isConfirmed = await confirm({
      title: '确认删除日记',
      message: '你确定要删除这篇日记吗？此操作无法撤销。',
      confirmText: '确认删除',
      cancelText: '取消',
      type: 'danger'
    });
    if (!isConfirmed) return;

    setDeletingId(id);
    try {
      await onDelete(id);
      showToast('日记已删除', 'success');
    } catch (error) {
      console.error("Delete diary failed:", error);
      showToast(error instanceof Error ? error.message : '删除失败，请稍后重试', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setContent('');
    setLocation('');
    setSelectedImage(null);
    setSelectedFile(null);
    setMood('love');
    setEditingId(null);
    setAiPolishedContent('');
    setDateTime(getLocalDateTimeString());
    setShowAdd(false);
  };

  const startEdit = (diary: DiaryEntry) => {
    setEditingId(diary.id);
    setContent(diary.content);
    setMood(diary.mood);
    setLocation(diary.location || '');
    setSelectedImage(diary.images?.[0] || null);
    setAiPolishedContent('');
    setDateTime(getLocalDateTimeString(new Date(diary.date)));
    setShowAdd(true);
  };

  const handleAiPolish = async () => {
    if (!content.trim()) {
      showToast('先写一点内容，再让 AI 润色', 'error');
      return;
    }
    setAiLoading(true);
    setAiPolishedContent('');
    try {
      const result = await aiService.generate({
        type: 'diary_polish',
        prompt: content,
        context: { mood, location, partnerName: partner?.username },
      });
      setAiPolishedContent(result.content);
    } catch (error) {
      console.error('Polish diary failed:', error);
      showToast(error instanceof Error ? error.message : 'AI 润色失败，请稍后重试', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const moodIcons = {
    love: { 
      icon: Heart, 
      color: 'bg-pink-100 text-pink-500',
      label: '心动',
      animate: {
        scale: [1, 1.2, 1],
        transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
      }
    },
    happy: { 
      icon: Smile, 
      color: 'bg-yellow-100 text-yellow-500',
      label: '开心',
      animate: {
        y: [0, -4, 0],
        transition: { duration: 0.6, repeat: Infinity, ease: "easeInOut" }
      }
    },
    angry: { 
      icon: Meh, 
      color: 'bg-red-100 text-red-500',
      label: '生气',
      animate: {
        x: [0, -1, 1, -1, 0],
        transition: { duration: 0.3, repeat: Infinity }
      }
    },
    sad: { 
      icon: Frown, 
      color: 'bg-blue-100 text-blue-500',
      label: '难过',
      animate: {
        rotate: [-5, 5, -5],
        transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
      }
    },
    surprised: { 
      icon: Sparkles, 
      color: 'bg-purple-100 text-purple-500',
      label: '惊喜',
      animate: {
        scale: [1, 1.15, 1],
        rotate: [0, 10, -10, 0],
        transition: { duration: 2.5, repeat: Infinity, ease: "linear" }
      }
    }
  };

  return (
    <div className="flex min-h-full flex-col lg:h-full">
      <header className="sticky top-0 z-30 flex items-end justify-between bg-[#FEF9F3]/95 px-6 pb-4 pt-8 backdrop-blur">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">恋爱日记</h1>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Written with love</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowAdd(true)}
          className="w-12 h-12 bg-pink-500 rounded-2xl shadow-lg shadow-pink-100 flex items-center justify-center text-white"
        >
          <Plus size={24} />
        </motion.button>
      </header>

      {/* Filter Bar */}
      <div className="px-6 py-3 bg-[#FEF9F3]/90 backdrop-blur border-b border-pink-50/50 flex flex-col gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {(['all', 'week', 'month', 'custom'] as const).map((type) => {
            const labels = { all: '全部', week: '本周', month: '本月', custom: '自定义' };
            const selected = filterType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`shrink-0 rounded-full px-4.5 py-1.5 text-xs font-black transition-all ${
                  selected 
                    ? 'bg-gradient-to-r from-pink-400 to-pink-500 text-white shadow-md shadow-pink-100/50' 
                    : 'bg-pink-50/40 text-pink-400 border border-pink-100/20 hover:bg-pink-50/65'
                }`}
              >
                {labels[type]}
              </button>
            );
          })}
        </div>
        {filterType === 'custom' && (
          <motion.div 
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2"
          >
            <div className="relative flex items-center flex-1 rounded-2xl border border-pink-100/50 bg-white/80 px-3.5 py-2 shadow-xs focus-within:border-pink-300 focus-within:ring-1 focus-within:ring-pink-100/30 transition-all">
              <Calendar size={13} className="text-pink-400 mr-2.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="block text-[8px] font-black uppercase text-gray-400 leading-none">开始日期</span>
                <input
                  type="date"
                  className="w-full bg-transparent text-xs font-black text-gray-700 outline-none mt-0.5 cursor-pointer"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                />
              </div>
            </div>
            <span className="text-xs font-bold text-gray-400 shrink-0 px-0.5">至</span>
            <div className="relative flex items-center flex-1 rounded-2xl border border-pink-100/50 bg-white/80 px-3.5 py-2 shadow-xs focus-within:border-pink-300 focus-within:ring-1 focus-within:ring-pink-100/30 transition-all">
              <Calendar size={13} className="text-pink-400 mr-2.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="block text-[8px] font-black uppercase text-gray-400 leading-none">结束日期</span>
                <input
                  type="date"
                  className="w-full bg-transparent text-xs font-black text-gray-700 outline-none mt-0.5 cursor-pointer"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="px-4 mt-4 space-y-6 pb-32 lg:flex-1 lg:overflow-y-auto lg:scrollbar-hide">
        {isLoading && data.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-[32px] bg-white/70 p-12 text-center text-gray-400">
            <div className="mb-4 h-12 w-12 animate-pulse rounded-2xl bg-pink-100" />
            <p className="text-xs font-black uppercase tracking-widest">正在翻阅日记...</p>
          </div>
        )}

        {!isLoading && filteredDiaries.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-[32px] bg-white/70 p-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-pink-50 text-pink-300">
              <Book size={30} />
            </div>
            <p className="text-sm font-black text-gray-500">没有匹配的日记</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-300">Try another filter</p>
          </div>
        )}

        {filteredDiaries.map((diary, idx) => {
          const d = new Date(diary.date);
          const hasTime = !isNaN(d.getTime());
          const year = hasTime ? d.getFullYear() : '';
          const month = hasTime ? String(d.getMonth() + 1).padStart(2, '0') : diary.date.split('-')[1];
          const day = hasTime ? String(d.getDate()).padStart(2, '0') : diary.date.split('-')[2];
          const time = hasTime ? String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') : '';

          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={diary.id}
              className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-pink-50/50 group"
            >
              <div className="p-5 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="text-center bg-gray-50 px-2 py-1 rounded-xl shrink-0">
                      <p className="text-lg font-black text-gray-800 leading-none">{day}</p>
                      <p className="text-[8px] font-black text-gray-400 uppercase">{month}月</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">
                        {year ? `${year}年${month}月${day}日 ${time}` : '今天'}
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold truncate">
                        <MapPin size={10} className="shrink-0" /> <span className="truncate">{diary.location || '我们的家'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button 
                      onClick={() => startEdit(diary)}
                      className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-pink-50 text-pink-300 opacity-100 transition-all hover:text-pink-500 sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label="编辑日记"
                    >
                      <Edit2 className="w-[14px] h-[14px] sm:w-4 sm:h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(diary.id)}
                      disabled={deletingId === diary.id}
                      className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-red-50 text-red-300 opacity-100 transition-all hover:text-red-500 disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label="删除日记"
                    >
                      {deletingId === diary.id ? <span className="block h-4 w-4 animate-spin rounded-full border-2 border-red-100 border-t-red-400" /> : <Trash2 className="w-[14px] h-[14px] sm:w-4 sm:h-4" />}
                    </button>
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center ${moodIcons[diary.mood].color}`}>
                      <motion.div
                        animate={moodIcons[diary.mood].animate}
                      >
                        {(() => {
                          const MoodIcon = moodIcons[diary.mood].icon;
                          return <MoodIcon className="w-[18px] h-[18px] sm:w-5 sm:h-5" />;
                        })()}
                      </motion.div>
                    </div>
                </div>
              </div>

              <p className="text-sm font-medium text-gray-600 leading-relaxed italic">
                “{diary.content}”
              </p>

              {diary.images && diary.images.length > 0 && (
                <div className="flex justify-center overflow-hidden rounded-[24px] border border-gray-100 bg-pink-50/20">
                  <AppImage src={diary.images[0]} alt="Diary" className="max-h-[360px] max-w-full object-contain" width={720} height={480} sizes="(min-width: 768px) 640px, 100vw" referrerPolicy="no-referrer" />
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <div className="flex -space-x-2">
                  <div className="w-6 h-6 rounded-full border-2 border-white overflow-hidden bg-gray-200">
                    <AppImage src={userAvatar} alt={user.username} className="w-full h-full object-cover" width={48} height={48} crop="square" />
                  </div>
                  <div className="w-6 h-6 rounded-full border-2 border-white overflow-hidden bg-gray-200">
                    <AppImage src={partnerAvatar} alt={partner?.username || '另一半'} className="w-full h-full object-cover" width={48} height={48} crop="square" />
                  </div>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-pink-400">
                  查看详情 <Sparkles size={12} />
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAddModal}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative max-h-[calc(var(--app-height,100dvh)-2rem)] w-full max-w-sm overflow-y-auto rounded-[32px] bg-white p-6 shadow-2xl scrollbar-hide sm:rounded-[40px] sm:p-8"
            >
              <button onClick={resetForm} className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
                <X size={20} />
              </button>
              <h2 className="mb-2 pr-12 text-xl font-black text-gray-800">{editingId ? '修改日记' : '写下此刻...'}</h2>
              <p className="mb-4 whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-gray-300 sm:mb-6">
                {editingId ? 'Refine your beautiful memory' : 'Your love story continues here'}
              </p>
              
              <div className="space-y-4 sm:space-y-6">
                <div className="mb-6 flex justify-around rounded-2xl bg-gray-50 p-1.5">
                  {Object.entries(moodIcons).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => setMood(key as any)}
                      className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all ${
                        mood === key ? value.color + ' scale-105 shadow-sm' : 'text-gray-300 hover:text-gray-400'
                      }`}
                    >
                      <motion.div
                        animate={mood === key ? value.animate : {}}
                      >
                        <value.icon size={18} className={mood === key && key === 'love' ? 'fill-current' : ''} />
                      </motion.div>
                      {mood === key && (
                        <motion.span
                          layoutId="mood-label"
                          className="absolute -bottom-6 text-[10px] font-black uppercase tracking-widest text-pink-500"
                        >
                          {value.label}
                        </motion.span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="space-y-4">
                  <Upload
                    value={selectedImage || undefined}
                    onChange={(val) => {
                      if (val === null) {
                        setSelectedImage(null);
                        setSelectedFile(null);
                      }
                    }}
                    onFileSelect={(file) => {
                      if (file && !Array.isArray(file)) {
                        setSelectedFile(file);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setSelectedImage(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    autoUpload={false}
                    placeholder="添加照片"
                  />

                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="你在哪儿？(选填)" 
                      className="w-full bg-pink-50/30 p-4 pr-24 rounded-2xl border border-pink-100 outline-none text-sm font-medium"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button 
                        onClick={() => setShowMap(true)}
                        className="p-2 text-pink-400 hover:bg-pink-100 rounded-lg transition-colors"
                        title="地图选点"
                      >
                        <Map size={18} />
                      </button>
                      <button 
                        onClick={getLocation}
                        disabled={isLocating}
                        className={`p-2 rounded-lg transition-colors ${
                          isLocating ? 'text-pink-300 animate-pulse' : 'text-pink-400 hover:bg-pink-100'
                        }`}
                        title="自动定位"
                      >
                        <MapPin size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Date & Time Picker */}
                  <div className="relative">
                    <input 
                      type="datetime-local" 
                      className="w-full bg-pink-50/30 p-4 rounded-2xl border border-pink-100 outline-none text-sm font-medium text-gray-700 focus:ring-2 focus:ring-pink-100"
                      value={dateTime}
                      onChange={(e) => setDateTime(e.target.value)}
                    />
                  </div>

                  <textarea 
                    placeholder="今天发生了什么趣事吗？" 
                    className="min-h-24 w-full resize-none rounded-2xl border border-pink-100 bg-pink-50/30 p-4 text-sm font-medium outline-none sm:min-h-[120px]"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleAiPolish}
                    disabled={aiLoading || !content.trim()}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-xs font-black text-on-accent shadow-lg shadow-accent/20 disabled:opacity-50"
                  >
                    {aiLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Sparkles size={14} />}
                    AI 润色草稿
                  </button>
                  {aiPolishedContent && (
                    <div className="rounded-2xl border border-pink-100 bg-white p-3">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-pink-400">AI Draft</p>
                      <p className="whitespace-pre-wrap text-xs font-bold leading-relaxed text-gray-600">{aiPolishedContent}</p>
                      <button
                        type="button"
                        onClick={() => setContent(aiPolishedContent)}
                        className="mt-3 w-full rounded-xl bg-pink-500 py-2.5 text-xs font-black text-white"
                      >
                        采用这版
                      </button>
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleAdd}
                  disabled={isSaving || !content}
                  className="w-full bg-pink-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-pink-100 mt-2 disabled:opacity-50 disabled:shadow-none"
                >
                  {isSaving ? '正在保存...' : (editingId ? '保存修改' : '发布日记')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Map Picker Modal */}
      <AnimatePresence>
        {showMap && (
          <MapPicker 
            onClose={closeMapModal}
            onSelect={handleMapSelect}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
