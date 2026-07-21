import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Plus, Heart, Bell, X, Trash2, Star, Clock } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { Anniversary } from '../types';
import { getDaysBetween, getRemainingDays } from '../lib/utils';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/Confirm';
import { useModalHistory } from '../hooks/useModalHistory';

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState<{h: number, m: number, s: number}>({ h: 0, m: 0, s: 0 });

  useEffect(() => {
    const calculate = () => {
      const now = new Date();
      const target = new Date(targetDate);
      const currentYear = now.getFullYear();
      let nextAnn = new Date(currentYear, target.getMonth(), target.getDate());
      if (nextAnn < now) {
        nextAnn = new Date(currentYear + 1, target.getMonth(), target.getDate());
      }
      
      const diff = nextAnn.getTime() - now.getTime();
      const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      
      setTimeLeft({ h: hours, m: minutes, s: seconds });
    };

    calculate();
    const timer = setInterval(calculate, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="mt-2 flex gap-1.5">
      {[
        { val: timeLeft.h, unit: 'H' },
        { val: timeLeft.m, unit: 'M' },
        { val: timeLeft.s, unit: 'S' }
      ].map((item, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="min-w-[30px] rounded-lg bg-white/20 px-2 py-1 text-center backdrop-blur-md">
            <span className="text-[14px] font-black text-white leading-none">
              {item.val.toString().padStart(2, '0')}
            </span>
          </div>
          <span className="text-[7px] font-bold text-pink-200 mt-0.5">{item.unit}</span>
        </div>
      ))}
    </div>
  );
}

export default function Anniversaries({ 
  data, 
  isLoading = false,
  onAdd, 
  onDelete,
  onToggleImportant
}: { 
  data: Anniversary[],
  isLoading?: boolean,
  onAdd: (ann: Omit<Anniversary, 'id'>) => Promise<void> | void,
  onDelete: (id: string) => Promise<void> | void,
  onToggleImportant: (id: string) => Promise<void> | void
}) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newIsImportant, setNewIsImportant] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const closeAddModal = useModalHistory('anniversaries-add', showAdd, () => setShowAdd(false));

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      // Prioritize important ones
      if (a.isImportant && !b.isImportant) return -1;
      if (!a.isImportant && b.isImportant) return 1;
      
      // Then sort by remaining days
      return getRemainingDays(a.date) - getRemainingDays(b.date);
    });
  }, [data]);

  const nearestAnn = useMemo(() => {
    if (data.length === 0) return null;
    const sorted = [...data].sort((a, b) => getRemainingDays(a.date) - getRemainingDays(b.date));
    return sorted[0];
  }, [data]);

  const handleAdd = async () => {
    if (newTitle && newDate) {
      setIsSaving(true);
      try {
        await onAdd({ title: newTitle, date: newDate, isImportant: newIsImportant });
        showToast('纪念日已保存', 'success');
        setNewTitle('');
        setNewDate('');
        setNewIsImportant(false);
        setShowAdd(false);
      } catch (error) {
        console.error("Save anniversary failed:", error);
        showToast(error instanceof Error ? error.message : '保存失败，请稍后重试', 'error');
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleToggleImportant = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await onToggleImportant(id);
    } catch (error) {
      console.error("Update anniversary failed:", error);
      showToast(error instanceof Error ? error.message : '更新失败，请稍后重试', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (busyId) return;
    const isConfirmed = await confirm({
      title: '确认删除纪念日',
      message: '你确定要删除这个纪念日吗？此操作无法撤销。',
      confirmText: '确认删除',
      cancelText: '取消',
      type: 'danger'
    });
    if (!isConfirmed) return;

    setBusyId(id);
    try {
      await onDelete(id);
      showToast('纪念日已删除', 'success');
    } catch (error) {
      console.error("Delete anniversary failed:", error);
      showToast(error instanceof Error ? error.message : '删除失败，请稍后重试', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex min-h-full flex-col bg-[#FEF9F3]/30 lg:h-full lg:min-h-0 lg:overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-end justify-between bg-[#FEF9F3]/95 px-6 pb-4 pt-8 backdrop-blur">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight">我们的纪念日</h1>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Every moment matters</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowAdd(true)}
          className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-pink-500 border border-white"
        >
          <Plus size={20} />
        </motion.button>
      </header>

      {/* Main Stats */}
      <div className="px-6 mt-4 shrink-0">
        <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-pink-500 to-rose-400 p-5 shadow-xl shadow-pink-100">
          <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="relative z-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <span className="text-[10px] font-black text-pink-100 uppercase tracking-widest">距离下一个纪念日</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-5xl font-black text-white">
                    {nearestAnn ? getRemainingDays(nearestAnn.date) : '--'}
                  </span>
                  <span className="text-sm font-bold text-pink-100">Days</span>
                </div>
              </div>
              {nearestAnn && <CountdownTimer targetDate={nearestAnn.date} />}
            </div>
            
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/20 pt-4">
              <p className="min-w-0 flex-1 truncate text-sm font-bold text-white opacity-90">{nearestAnn?.title || '等待记录...'}</p>
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold text-white backdrop-blur-sm">
                <Clock size={10} /> 实时倒计时
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="px-6 mt-8 space-y-4 pb-32 lg:flex-1 lg:overflow-y-auto lg:scrollbar-hide">
        {isLoading && sortedData.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-[28px] bg-white/60 p-10 text-center text-gray-400">
            <div className="mb-3 h-12 w-12 animate-pulse rounded-2xl bg-pink-100" />
            <p className="text-xs font-black uppercase tracking-widest">正在加载纪念日...</p>
          </div>
        )}

        {!isLoading && sortedData.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-[28px] bg-white/60 p-10 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pink-50 text-pink-300">
              <Calendar size={28} />
            </div>
            <p className="text-sm font-black text-gray-500">还没有纪念日</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-300">Add your first memory</p>
          </div>
        )}

        {sortedData.map((ann, idx) => {
          const daysSince = getDaysBetween(ann.date);
          const daysUntil = getRemainingDays(ann.date);
          const isFuture = new Date(ann.date) > new Date();
          const progress = Math.max(0, Math.min(100, 100 - (daysUntil / 365 * 100)));

          return (
            <motion.div
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              key={ann.id}
              onClick={() => handleToggleImportant(ann.id)}
              className={`bg-white/70 backdrop-blur-md p-4 rounded-[28px] border border-white/60 shadow-sm flex items-center justify-between group cursor-pointer hover:shadow-md transition-shadow relative overflow-hidden ${ann.isImportant ? 'ring-2 ring-pink-200' : ''}`}
            >
              <div className="absolute bottom-0 left-0 h-1 bg-pink-100/50 w-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-pink-400/30"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
                  ann.isImportant ? 'bg-pink-500 text-white shadow-lg shadow-pink-100' : 'bg-pink-100 text-pink-500'
                }`}>
                  <Calendar size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-gray-800">{ann.title}</h3>
                    {ann.isImportant && <Star size={10} className="text-pink-500 fill-pink-500" />}
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                    {ann.date} · {isFuture ? '即将到来' : `在一起 ${daysSince} 天`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="flex items-baseline gap-0.5 justify-end">
                    <p className={`text-lg font-black ${daysUntil <= 7 ? 'text-pink-500 animate-pulse' : 'text-gray-800'}`}>
                      {daysUntil}
                    </p>
                    <span className="text-[7px] font-black text-gray-400">D</span>
                  </div>
                  <p className="text-[8px] font-black text-gray-300 uppercase tracking-tighter">
                    Countdown
                  </p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); void handleDelete(ann.id); }}
                  disabled={busyId === ann.id}
                  className="ml-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-300 opacity-100 transition-all hover:text-red-500 disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  {busyId === ann.id ? <span className="block h-4 w-4 animate-spin rounded-full border-2 border-red-200 border-t-red-500" /> : <Trash2 size={16} />}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center p-4">
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
              className="w-full max-w-sm bg-white rounded-[40px] p-8 relative shadow-2xl"
            >
              <button onClick={closeAddModal} className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
                <X size={20} />
              </button>
              <h2 className="text-xl font-black text-gray-800 mb-6">新增纪念日</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">标题</label>
                  <input 
                    type="text" 
                    placeholder="如：相识、第一餐..." 
                    className="w-full bg-pink-50/50 p-4 rounded-2xl border border-pink-100 outline-none text-sm font-medium focus:ring-2 focus:ring-pink-100 transition-all"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">日期</label>
                  <input 
                    type="date" 
                    className="w-full bg-pink-50/50 p-4 rounded-2xl border border-pink-100 outline-none text-sm font-medium focus:ring-2 focus:ring-pink-100 transition-all"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
                
                <button 
                  onClick={() => setNewIsImportant(!newIsImportant)}
                  className={`flex items-center gap-2 p-4 rounded-2xl border transition-all ${
                    newIsImportant ? 'bg-pink-50 border-pink-200 text-pink-500' : 'bg-gray-50 border-gray-100 text-gray-400'
                  }`}
                >
                  <Star size={16} className={newIsImportant ? 'fill-pink-500' : ''} />
                  <span className="text-xs font-bold">标记为重要纪念日</span>
                </button>

                <button 
                  onClick={handleAdd}
                  disabled={!newTitle || !newDate || isSaving}
                  className="w-full bg-pink-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-pink-100 mt-2 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
                >
                  {isSaving ? '正在保存...' : '保存纪念日'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
