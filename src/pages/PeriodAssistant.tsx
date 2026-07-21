import {
  Activity,
  ArrowLeft,
  Baby,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Droplets,
  HeartHandshake,
  LineChart,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  LhTestResult,
  PeriodDailyLog,
  PeriodFlow,
  PeriodRecord,
  PeriodSettings,
  PeriodSummary,
} from '../types';
import { aiService } from '../services/api';
import { useConfirm } from '../components/Confirm';

type ViewMode = 'tracker' | 'trends';

type PeriodDraft = {
  startDate: string;
  endDate: string;
  flow: '' | PeriodFlow;
  painLevel: number;
  symptoms: string[];
  note: string;
};

type LogDraft = {
  flow: '' | PeriodFlow;
  painLevel: number;
  symptoms: string[];
  moods: string[];
  energyLevel: number;
  temperatureCelsius: string;
  lhTestResult: '' | LhTestResult;
  intercourse: boolean;
  note: string;
};

const viewTabs: Array<{ id: ViewMode; label: string; icon: typeof Activity }> = [
  { id: 'tracker', label: '生理看板', icon: Activity },
  { id: 'trends', label: '数据趋势', icon: LineChart },
];

const symptomOptions = ['腹痛', '腰酸', '头痛', '疲惫', '胸胀', '腹胀', '失眠', '食欲变化', '怕冷', '想喝热的'];
const moodOptions = ['平静', '敏感', '低落', '烦躁', '有精神', '想被陪伴'];
const flowOptions: Array<{ value: '' | PeriodFlow; label: string }> = [
  { value: '', label: '未选' },
  { value: 'spotting', label: '点滴' },
  { value: 'light', label: '偏少' },
  { value: 'medium', label: '正常' },
  { value: 'heavy', label: '偏多' },
];
const lhOptions: Array<{ value: '' | LhTestResult; label: string }> = [
  { value: '', label: '未记录' },
  { value: 'not_tested', label: '未测试' },
  { value: 'negative', label: '阴性' },
  { value: 'positive', label: '阳性' },
];

function todayString() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60 * 1000;
  return new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function formatDate(value: Date) {
  const offset = value.getTimezoneOffset() * 60 * 1000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

function addDays(value: string, days: number) {
  const date = toDate(value);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

function monthTitle(value: Date) {
  return value.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
}

function formatShortDate(value?: string) {
  if (!value) return '--';
  const [, month, day] = value.split('-');
  return `${month}/${day}`;
}

function diffDays(from: string, to: string) {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / dayMs);
}

function inRange(date: string, start?: string, end?: string) {
  if (!start || !end) return false;
  return date >= start && date <= end;
}

function emptyRecordDraft(): PeriodDraft {
  return {
    startDate: todayString(),
    endDate: '',
    flow: '',
    painLevel: 0,
    symptoms: [],
    note: '',
  };
}

function emptyLogDraft(): LogDraft {
  return {
    flow: '',
    painLevel: 0,
    symptoms: [],
    moods: [],
    energyLevel: 3,
    temperatureCelsius: '',
    lhTestResult: '',
    intercourse: false,
    note: '',
  };
}

function recordToDraft(record: PeriodRecord): PeriodDraft {
  return {
    startDate: record.startDate,
    endDate: record.endDate || '',
    flow: record.flow || '',
    painLevel: record.painLevel ?? 0,
    symptoms: record.symptoms || [],
    note: record.note || '',
  };
}

function logToDraft(log?: PeriodDailyLog): LogDraft {
  if (!log) return emptyLogDraft();
  return {
    flow: log.flow || '',
    painLevel: log.painLevel ?? 0,
    symptoms: log.symptoms || [],
    moods: log.moods || [],
    energyLevel: log.energyLevel ?? 3,
    temperatureCelsius: log.temperatureCelsius === undefined ? '' : String(log.temperatureCelsius),
    lhTestResult: log.lhTestResult || '',
    intercourse: Boolean(log.intercourse),
    note: log.note || '',
  };
}

function durationText(record: PeriodRecord) {
  if (!record.endDate) return '进行中';
  return `${diffDays(record.startDate, record.endDate) + 1} 天`;
}

function toggleItem(list: string[], item: string) {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
}

function buildCalendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function getCyclePhase(cycleDay?: number, totalDays?: number, isInPeriod?: boolean, averagePeriodDays?: number) {
  if (!cycleDay || !totalDays) return null;
  const pDays = averagePeriodDays || 5;
  const ovulationDay = Math.max(1, totalDays - 14);
  const fertileStart = Math.max(1, ovulationDay - 5);
  const fertileEnd = Math.min(totalDays, ovulationDay + 1);

  if (isInPeriod || cycleDay <= pDays) {
    return {
      name: '月经期',
      description: '身体排毒与休息阶段，建议保暖、清淡饮食，避免剧烈运动。',
      color: 'from-rose-400 to-pink-500',
      textColor: 'text-rose-500',
      bgLight: 'bg-rose-50/75',
      range: `第 1 - ${pDays} 天`,
      index: 0,
    };
  }
  if (cycleDay >= fertileStart && cycleDay <= fertileEnd) {
    return {
      name: '排卵期 / 易孕期',
      description: '雌激素水平较高，精力充沛。如在备孕阶段，这是黄金窗口。',
      color: 'from-emerald-400 to-teal-500',
      textColor: 'text-emerald-600',
      bgLight: 'bg-emerald-50/75',
      range: `第 ${fertileStart} - ${fertileEnd} 天`,
      index: 2,
    };
  }
  if (cycleDay < fertileStart) {
    return {
      name: '卵泡期',
      description: '卵泡开始发育，身体逐渐恢复活力，心情也变得积极明朗。',
      color: 'from-amber-300 to-orange-400',
      textColor: 'text-amber-600',
      bgLight: 'bg-amber-50/75',
      range: `第 ${pDays + 1} - ${fertileStart - 1} 天`,
      index: 1,
    };
  }
  return {
    name: '黄体期',
    description: '孕激素占主导，身体可能出现水肿或情绪波动，记得多关爱自己。',
    color: 'from-purple-400 to-indigo-500',
    textColor: 'text-purple-600',
    bgLight: 'bg-purple-50/75',
    range: `第 ${fertileEnd + 1} - ${totalDays} 天`,
    index: 3,
  };
}

function statusText(summary: PeriodSummary | null, settings?: PeriodSettings | null) {
  if (!summary || summary.recordCount === 0) {
    return {
      title: '从第一条记录开始',
      detail: '补上最近一次开始和结束日期，就能生成周期预测与照顾提醒。',
      tone: 'bg-gradient-to-r from-rose-400 to-rose-500',
    };
  }
  if (summary.isInPeriod) {
    return {
      title: `经期第 ${summary.currentDay || 1} 天`,
      detail: `预计 ${formatShortDate(summary.predictedEndDate || summary.latestEndDate)} 左右结束。`,
      tone: 'bg-gradient-to-r from-rose-500 to-pink-500',
    };
  }
  if (summary.daysUntilNext !== undefined && summary.daysUntilNext < 0) {
    return {
      title: `经期已推迟 ${Math.abs(summary.daysUntilNext)} 天`,
      detail: `预计开始于 ${formatShortDate(summary.predictedStartDate)}，平均周期 ${summary.averageCycleDays} 天。`,
      tone: 'bg-gradient-to-r from-amber-500 to-orange-500',
    };
  }
  if (settings?.mode === 'trying_to_conceive' && summary.predictedOvulationDate) {
    return {
      title: `周期第 ${summary.currentCycleDay || 1} 天`,
      detail: `预计排卵日 ${formatShortDate(summary.predictedOvulationDate)}，仅作备孕记录参考。`,
      tone: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    };
  }
  return {
    title: summary.daysUntilNext === 0 ? '预计今天开始' : `预计还有 ${summary.daysUntilNext} 天`,
    detail: `${formatShortDate(summary.predictedStartDate)} 左右开始，平均周期 ${summary.averageCycleDays} 天。`,
    tone: 'bg-gradient-to-r from-rose-400 to-pink-400',
  };
}

export default function PeriodAssistantPage({
  records,
  logs,
  summary,
  settings,
  isLoading,
  onBack,
  onCreate,
  onUpdate,
  onDelete,
  onSaveLog,
  onDeleteLog,
  onUpdateSettings,
  onSyncCareTodos,
}: {
  records: PeriodRecord[];
  logs: PeriodDailyLog[];
  summary: PeriodSummary | null;
  settings: PeriodSettings | null;
  isLoading: boolean;
  onBack: () => void;
  onCreate: (record: Omit<PeriodRecord, 'id' | 'createdById'>) => Promise<void>;
  onUpdate: (id: string, record: Partial<Omit<PeriodRecord, 'id' | 'createdById'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onSaveLog: (date: string, log: Partial<Omit<PeriodDailyLog, 'id' | 'date' | 'createdById'>>) => Promise<void>;
  onDeleteLog: (date: string) => Promise<void>;
  onUpdateSettings: (settings: Partial<PeriodSettings>) => Promise<void>;
  onSyncCareTodos: () => Promise<{ skipped: boolean; created: number; updated: number; predictedStartDate?: string }>;
}) {
  const confirm = useConfirm();
  const [activeView, setActiveView] = useState<ViewMode>('tracker');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [recordDraft, setRecordDraft] = useState<PeriodDraft>(emptyRecordDraft);
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [logDraft, setLogDraft] = useState<LogDraft>(emptyLogDraft);
  const [calendarMonth, setCalendarMonth] = useState(() => toDate(todayString()));
  const [syncText, setSyncText] = useState('');
  const [aiCarePrompt, setAiCarePrompt] = useState('');
  const [aiCareResult, setAiCareResult] = useState('');
  const [aiCareLoading, setAiCareLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isLogEditing, setIsLogEditing] = useState(false);
  const [isRecordEditing, setIsRecordEditing] = useState(false);

  const normalizedSettings = settings || {
    mode: 'cycle',
    defaultCycleDays: 28,
    defaultPeriodDays: 5,
    reminderLeadDays: 3,
    autoSyncCareTodos: true,
  };

  const logByDate = useMemo(() => new Map(logs.map((log) => [log.date, log])), [logs]);
  const latestOpenRecord = useMemo(() => records.find((record) => !record.endDate), [records]);
  const selectedLog = logByDate.get(selectedDate);
  const status = useMemo(() => statusText(summary, normalizedSettings), [summary, normalizedSettings]);
  const calendarDays = useMemo(() => buildCalendarDays(calendarMonth), [calendarMonth]);

  const currentPhase = useMemo(() => {
    return getCyclePhase(
      summary?.currentCycleDay,
      summary?.averageCycleDays || normalizedSettings.defaultCycleDays,
      summary?.isInPeriod,
      summary?.averagePeriodDays || normalizedSettings.defaultPeriodDays
    );
  }, [summary, normalizedSettings]);

  const periodDurationHistory = useMemo(() => {
    const finished = records
      .filter((r) => r.endDate)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(-6);
    return finished.map((r) => {
      const days = diffDays(r.startDate, r.endDate!) + 1;
      return {
        label: formatShortDate(r.startDate),
        days,
      };
    });
  }, [records]);

  useEffect(() => {
    containerRef.current?.scrollIntoView({ block: 'start' });
  }, [activeView]);

  useEffect(() => {
    setLogDraft(logToDraft(selectedLog));
  }, [selectedDate, selectedLog]);

  useEffect(() => {
    if (editingId) {
      setIsRecordEditing(true);
    }
  }, [editingId]);

  const saveRecord = async () => {
    if (!recordDraft.startDate) return;
    setBusy(true);
    try {
      const payload = {
        startDate: recordDraft.startDate,
        endDate: recordDraft.endDate || undefined,
        flow: recordDraft.flow || undefined,
        painLevel: recordDraft.painLevel,
        symptoms: recordDraft.symptoms,
        note: recordDraft.note,
      };
      if (editingId) await onUpdate(editingId, payload);
      else await onCreate(payload);
      setEditingId(null);
      setRecordDraft(emptyRecordDraft());
      setIsRecordEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const markStartedToday = async () => {
    setBusy(true);
    try {
      await onCreate({ startDate: todayString(), symptoms: [], painLevel: 0 });
    } finally {
      setBusy(false);
    }
  };

  const markEndedToday = async () => {
    if (!latestOpenRecord) return;
    setBusy(true);
    try {
      await onUpdate(latestOpenRecord.id, { endDate: todayString() });
    } finally {
      setBusy(false);
    }
  };

  const removeRecord = async (record: PeriodRecord) => {
    const isConfirmed = await confirm({
      title: '删除经期记录',
      message: `确定删除 ${record.startDate}${record.endDate ? ` 至 ${record.endDate}` : ''} 的记录吗？`,
      confirmText: '删除',
      cancelText: '取消',
      type: 'danger',
    });
    if (!isConfirmed) return;
    setBusy(true);
    try {
      await onDelete(record.id);
    } finally {
      setBusy(false);
    }
  };

  const saveDailyLog = async () => {
    setBusy(true);
    try {
      await onSaveLog(selectedDate, {
        flow: logDraft.flow || undefined,
        painLevel: logDraft.painLevel,
        symptoms: logDraft.symptoms,
        moods: logDraft.moods,
        energyLevel: logDraft.energyLevel,
        temperatureCelsius: logDraft.temperatureCelsius ? Number(logDraft.temperatureCelsius) : undefined,
        lhTestResult: logDraft.lhTestResult || undefined,
        intercourse: logDraft.intercourse,
        note: logDraft.note,
      });
      setIsLogEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const clearDailyLog = async () => {
    if (!selectedLog) return;
    const isConfirmed = await confirm({
      title: '清空今日日志',
      message: `确定清空 ${selectedDate} 的健康日志吗？`,
      confirmText: '清空',
      cancelText: '取消',
      type: 'danger',
    });
    if (!isConfirmed) return;
    setBusy(true);
    try {
      await onDeleteLog(selectedDate);
      setIsLogEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const syncCareTodos = async () => {
    setBusy(true);
    setSyncText('');
    try {
      const result = await onSyncCareTodos();
      setSyncText(result.skipped ? '当前没有需要同步的新提醒。' : `已同步 ${result.created + result.updated} 条提醒待办。`);
    } finally {
      setBusy(false);
    }
  };

  const generateAiCare = async () => {
    const prompt = aiCarePrompt.trim() || '帮我写一段温柔的经期或备孕生活照顾提醒，适合放进待办描述。';
    setAiCareLoading(true);
    setAiCareResult('');
    try {
      const result = await aiService.generate({
        type: 'period_care',
        prompt,
        context: {
          summary,
          selectedDate,
          selectedLog,
          settings: normalizedSettings,
          note: '只生成生活照顾、陪伴和记录建议；不要医疗、避孕、助孕或诊断判断。',
        },
      });
      setAiCareResult(result.content);
    } catch (error) {
      console.error('Generate period care failed:', error);
      setAiCareResult(error instanceof Error ? error.message : 'AI 生成失败，请稍后重试');
    } finally {
      setAiCareLoading(false);
    }
  };

  const shiftMonth = (step: number) => {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + step, 1));
  };

  return (
    <div ref={containerRef} className="min-h-full px-5 pb-10">
      <header className="sticky top-0 z-30 mb-4 flex items-center justify-between gap-3 bg-[#FEF9F3]/95 pb-3 pt-6 backdrop-blur">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/75 text-gray-600 shadow-sm"
          aria-label="返回首页"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-rose-400">Cycle Health</p>
          <h1 className="truncate text-xl font-black text-gray-800">姨妈健康</h1>
        </div>
        {isLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-rose-200 border-t-rose-500" /> : null}
      </header>

      <div className="mb-4 grid grid-cols-2 gap-2 rounded-[24px] bg-white/65 p-1.5 shadow-sm">
        {viewTabs.map((tab) => {
          const Icon = tab.icon;
          const selected = activeView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveView(tab.id)}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-[18px] text-[10px] font-black transition-colors ${
                selected ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeView === 'tracker' && (
        <div className="space-y-5">
          <section className={`relative overflow-hidden rounded-[30px] ${status.tone} p-5 text-white shadow-xl shadow-rose-100`}>
            <div className="absolute right-5 top-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
              {normalizedSettings.mode === 'trying_to_conceive' ? <Baby size={28} /> : <Droplets size={28} />}
            </div>
            <div className="relative pr-14">
              <h2 className="text-3xl font-black leading-tight">{status.title}</h2>
              <p className="mt-3 text-sm font-bold leading-relaxed text-white/78">{status.detail}</p>
              <p className="mt-4 text-[11px] font-bold leading-relaxed text-white/65">{summary?.disclaimer || '仅供生活记录和周期参考。'}</p>
            </div>
            <div className="relative mt-6 grid grid-cols-3 gap-2">
              <Metric label="预计经期" value={formatShortDate(summary?.predictedStartDate)} />
              <Metric label="平均周期" value={`${summary?.averageCycleDays || normalizedSettings.defaultCycleDays} 天`} />
              <Metric label="已记录" value={`${summary?.recordCount || 0} 次`} />
            </div>
          </section>

          {currentPhase && records.length > 0 && (
            <section className="rounded-[30px] bg-white/70 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">当前生理状态</span>
                  <h3 className={`mt-1 text-base font-black bg-gradient-to-r ${currentPhase.color} bg-clip-text text-transparent`}>
                    {currentPhase.name} <span className="text-xs font-bold text-gray-400">({currentPhase.range})</span>
                  </h3>
                </div>
                <span className={`rounded-2xl ${currentPhase.bgLight} ${currentPhase.textColor} px-3 py-1 text-xs font-black`}>
                  周期第 {summary?.currentCycleDay} 天
                </span>
              </div>
              <p className="mt-2 text-xs font-bold leading-relaxed text-gray-500">
                {currentPhase.description}
              </p>

              {/* 生理周期条形展示图 */}
              <div className="mt-5 relative">
                <div className="h-3 w-full rounded-full bg-gray-100 flex overflow-hidden">
                  <div className="h-full bg-rose-300" style={{ width: `${((summary?.averagePeriodDays || 5) / (summary?.averageCycleDays || 28)) * 100}%` }} title="月经期" />
                  <div className="h-full bg-amber-200" style={{ width: `${((Math.max(1, (summary?.averageCycleDays || 28) - 14 - 5 - (summary?.averagePeriodDays || 5))) / (summary?.averageCycleDays || 28)) * 100}%` }} title="卵泡期" />
                  <div className="h-full bg-emerald-300" style={{ width: `${(7 / (summary?.averageCycleDays || 28)) * 100}%` }} title="排卵易孕期" />
                  <div className="h-full bg-purple-300" style={{ width: `${(Math.max(1, 14 - 1 - 1) / (summary?.averageCycleDays || 28)) * 100}%` }} title="黄体期" />
                </div>
                
                {/* 周期日指示针 */}
                <div 
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-gradient-to-r ${currentPhase.color} border-2 border-white shadow-md flex items-center justify-center`}
                  style={{ left: `${Math.min(100, Math.max(0, (((summary?.currentCycleDay || 1) - 0.5) / (summary?.averageCycleDays || 28)) * 100))}%` }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                </div>
              </div>
              
              <div className="mt-3.5 flex justify-between text-[9px] font-black text-gray-400">
                <span className={currentPhase.index === 0 ? 'text-rose-500 font-black' : ''}>月经期</span>
                <span className={currentPhase.index === 1 ? 'text-amber-600 font-black' : ''}>卵泡期</span>
                <span className={currentPhase.index === 2 ? 'text-emerald-600 font-black' : ''}>排卵易孕期</span>
                <span className={currentPhase.index === 3 ? 'text-purple-500 font-black' : ''}>黄体期</span>
              </div>
            </section>
          )}

          <section className="grid grid-cols-3 gap-2">
            <ActionButton icon={Plus} title={records.length === 0 ? '记录第一次' : '今天来了'} description="设置为开始日期" disabled={busy || Boolean(latestOpenRecord)} onClick={markStartedToday} />
            <ActionButton icon={Check} title="今天结束" description={latestOpenRecord ? '补上结束日期' : '无进行中经期'} disabled={busy || !latestOpenRecord} onClick={markEndedToday} />
            <ActionButton icon={ClipboardCheck} title="同步提醒" description="情侣关怀与待办" disabled={busy} onClick={syncCareTodos} />
          </section>
          {syncText && <p className="rounded-2xl bg-white/70 px-4 py-3 text-xs font-bold text-rose-500">{syncText}</p>}

          <section className="rounded-[30px] bg-white/70 p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <button type="button" onClick={() => shiftMonth(-1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-500" aria-label="上个月">
                <ChevronLeft size={16} />
              </button>
              <h2 className="text-sm font-black text-gray-800">{monthTitle(calendarMonth)}</h2>
              <button type="button" onClick={() => shiftMonth(1)} className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-500" aria-label="下个月">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="mb-2 grid grid-cols-7 text-center text-[10px] font-black text-gray-400">
              {['日', '一', '二', '三', '四', '五', '六'].map((day) => <span key={day}>{day}</span>)}
            </div>
            
            <div className="max-w-[340px] mx-auto">
              <div className="grid grid-cols-7 gap-1 justify-items-center">
                {calendarDays.map((date) => {
                  const value = formatDate(date);
                  const isCurrentMonth = date.getMonth() === calendarMonth.getMonth();
                  const isSelected = value === selectedDate;
                  const isToday = value === todayString();
                  const hasLog = logByDate.has(value);
                  
                  const getPeriodEndDate = (rec: PeriodRecord) => {
                    if (rec.endDate) return rec.endDate;
                    const length = summary?.averagePeriodDays || normalizedSettings.defaultPeriodDays || 5;
                    return addDays(rec.startDate, Math.min(length, 10) - 1);
                  };
                  const isRecordedPeriod = records.some((record) => inRange(value, record.startDate, getPeriodEndDate(record)));
                  const isPredictedPeriod = inRange(value, summary?.predictedStartDate, summary?.predictedEndDate);
                  const isFertile = inRange(value, summary?.fertileWindow?.startDate, summary?.fertileWindow?.endDate);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setSelectedDate(value);
                        setIsLogEditing(false);
                      }}
                      className={`relative w-8 h-8 flex items-center justify-center rounded-full text-xs font-black transition-colors ${
                        isSelected
                          ? 'bg-gray-900 text-white'
                          : isRecordedPeriod
                            ? 'bg-rose-500 text-white'
                            : isPredictedPeriod
                              ? 'bg-rose-100 text-rose-600'
                              : isFertile
                                ? 'bg-emerald-100 text-emerald-700'
                                : isCurrentMonth
                                  ? 'bg-white text-gray-700 hover:bg-gray-50'
                                  : 'bg-white/45 text-gray-300'
                      }`}
                    >
                      {date.getDate()}
                      {isToday && <span className="absolute -top-0.5 -right-0.5 rounded-full bg-amber-300 px-1 text-[6px] text-amber-900 leading-none">今</span>}
                      {hasLog && <span className={`absolute bottom-0.5 h-1 w-1 rounded-full ${isSelected || isRecordedPeriod ? 'bg-white' : 'bg-rose-500'}`} />}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="mt-4 grid grid-cols-4 gap-1 text-[9px] font-bold text-gray-400 justify-items-center border-t border-rose-100/30 pt-3">
              <Legend color="bg-rose-500" text="已录经期" />
              <Legend color="bg-rose-100" text="预测经期" />
              <Legend color="bg-emerald-100" text="易孕窗口" />
              <Legend color="bg-gray-900" text="选中日期" />
            </div>
          </section>

          {/* 当日健康状态与编辑器 */}
          <section className="rounded-[28px] bg-white/70 p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-rose-100/50 pb-3">
              <div>
                <h3 className="text-sm font-black text-gray-800">
                  {selectedDate === todayString() ? '今日健康状态' : `${formatShortDate(selectedDate)} 健康状态`}
                </h3>
                <p className="mt-1 text-[10px] font-bold text-gray-400">{selectedDate}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsLogEditing(!isLogEditing);
                }}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-black transition-colors ${
                  isLogEditing ? 'bg-gray-200 text-gray-600' : 'bg-rose-50 text-rose-500'
                }`}
              >
                {isLogEditing ? (
                  <>取消</>
                ) : (
                  <>
                    <Pencil size={10} />
                    {selectedLog ? '修改日志' : '补充记录'}
                  </>
                )}
              </button>
            </div>

            {isLogEditing ? (
              <div className="mt-4 pt-2">
                <LogEditor
                  draft={logDraft}
                  setDraft={setLogDraft}
                  onSave={saveDailyLog}
                  onClear={clearDailyLog}
                  hasExisting={Boolean(selectedLog)}
                  busy={busy}
                  showFertility={normalizedSettings.mode === 'trying_to_conceive'}
                />
              </div>
            ) : selectedLog ? (
              <div className="mt-4 space-y-3.5">
                {selectedLog.flow && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-gray-400 w-12">经量流量:</span>
                    <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black text-rose-500">
                      {flowOptions.find(o => o.value === selectedLog.flow)?.label || selectedLog.flow}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-rose-50/40 p-2.5">
                    <p className="text-[9px] font-black text-gray-400">疼痛程度</p>
                    <p className="mt-1 text-sm font-black text-rose-500">
                      {selectedLog.painLevel !== undefined ? `${selectedLog.painLevel} / 5` : '--'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-rose-50/40 p-2.5">
                    <p className="text-[9px] font-black text-gray-400">精力状态</p>
                    <p className="mt-1 text-sm font-black text-gray-700">
                      {selectedLog.energyLevel !== undefined ? `${selectedLog.energyLevel} / 5` : '--'}
                    </p>
                  </div>
                </div>

                {selectedLog.symptoms && selectedLog.symptoms.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-gray-400 mb-1.5">记录症状</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedLog.symptoms.map((s: string) => (
                        <span key={s} className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-500">{s}</span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLog.moods && selectedLog.moods.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-gray-400 mb-1.5">今日心情</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedLog.moods.map((m: string) => (
                        <span key={m} className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-500">{m}</span>
                      ))}
                    </div>
                  </div>
                )}

                {(selectedLog.temperatureCelsius || selectedLog.lhTestResult || selectedLog.intercourse) && (
                  <div className="border-t border-dashed border-rose-100/50 pt-3 mt-1 grid grid-cols-2 gap-2">
                    {selectedLog.temperatureCelsius !== undefined && (
                      <div className="text-[10px] font-bold text-gray-500">
                        基础体温: <span className="font-black text-emerald-600">{selectedLog.temperatureCelsius} ℃</span>
                      </div>
                    )}
                    {selectedLog.lhTestResult && (
                      <div className="text-[10px] font-bold text-gray-500">
                        LH 试纸: <span className="font-black text-emerald-600">
                          {lhOptions.find(o => o.value === selectedLog.lhTestResult)?.label || selectedLog.lhTestResult}
                        </span>
                      </div>
                    )}
                    {selectedLog.intercourse && (
                      <div className="col-span-2 text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                        <span>❤️ 已记录同房</span>
                      </div>
                    )}
                  </div>
                )}

                {selectedLog.note && (
                  <div className="border-t border-dashed border-rose-100/50 pt-3 mt-1">
                    <p className="text-[9px] font-black text-gray-400 mb-1">日志备注</p>
                    <p className="text-xs font-bold leading-relaxed text-gray-600 bg-rose-50/20 p-2.5 rounded-2xl whitespace-pre-wrap">{selectedLog.note}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-6 py-6 text-center">
                <p className="text-xs font-bold text-gray-400">这天没有任何日志记录</p>
                <p className="mt-1 text-[10px] text-gray-300">可以点击右上角“补充记录”按钮，添加健康和情绪日志。</p>
              </div>
            )}
          </section>

          <section className="rounded-[28px] bg-white/70 p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-gray-800">模式与提醒</h2>
                <p className="mt-1 text-[10px] font-bold text-gray-400">情侣双方共享，用于生活记录。</p>
              </div>
              <button
                type="button"
                onClick={() => onUpdateSettings({ mode: normalizedSettings.mode === 'cycle' ? 'trying_to_conceive' : 'cycle' })}
                className={`min-h-10 rounded-full px-4 text-[11px] font-black text-white ${normalizedSettings.mode === 'trying_to_conceive' ? 'bg-emerald-500' : 'bg-rose-500'}`}
              >
                {normalizedSettings.mode === 'trying_to_conceive' ? '备孕模式' : '周期模式'}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Stepper label="默认周期" value={normalizedSettings.defaultCycleDays} min={15} max={90} onChange={(value) => onUpdateSettings({ defaultCycleDays: value })} />
              <Stepper label="默认经期" value={normalizedSettings.defaultPeriodDays} min={1} max={15} onChange={(value) => onUpdateSettings({ defaultPeriodDays: value })} />
              <Stepper label="提前提醒" value={normalizedSettings.reminderLeadDays} min={0} max={14} onChange={(value) => onUpdateSettings({ reminderLeadDays: value })} />
            </div>
          </section>

          {normalizedSettings.mode === 'trying_to_conceive' && (
            <section className="rounded-[28px] bg-emerald-50/80 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white">
                  <Baby size={20} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base font-black text-gray-800">备孕参考窗口</h2>
                  <p className="mt-1 text-xs font-bold leading-relaxed text-gray-500">
                    预计排卵日 {formatShortDate(summary?.predictedOvulationDate)}，参考窗口 {formatShortDate(summary?.fertileWindow?.startDate)} - {formatShortDate(summary?.fertileWindow?.endDate)}。
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* 经期区间编辑与历史 */}
          <section className="rounded-[30px] bg-white/70 p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-gray-800">补记/修改经期区间</h2>
                <p className="mt-1 text-[10px] font-bold text-gray-400">区间用于预测，非日常健康日志。</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsRecordEditing(!isRecordEditing);
                  if (isRecordEditing) {
                    setEditingId(null);
                    setRecordDraft(emptyRecordDraft());
                  }
                }}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-black transition-colors ${
                  isRecordEditing ? 'bg-gray-200 text-gray-600' : 'bg-rose-50 text-rose-500'
                }`}
              >
                {isRecordEditing ? '取消' : '添加区间'}
              </button>
            </div>

            {isRecordEditing && (
              <div className="mb-4 border-b border-rose-100/50 pb-4 pt-2">
                <RecordEditor draft={recordDraft} setDraft={setRecordDraft} onSave={saveRecord} busy={busy} />
              </div>
            )}

            <div className="mt-3">
              <div className="mb-2.5 flex items-center justify-between text-xs font-bold text-gray-400">
                <span>经期区间记录历史</span>
                <span>{records.length} 条</span>
              </div>
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto scrollbar-hide">
                {records.length === 0 ? (
                  <p className="text-xs text-center text-gray-400 py-4">暂无历史区间记录</p>
                ) : (
                  records.map((record) => (
                    <article key={record.id} className="rounded-2xl bg-white/80 p-3 shadow-xs border border-rose-50/30">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-gray-800">{record.startDate}{record.endDate ? ` 至 ${record.endDate}` : ' (进行中)'}</p>
                          <p className="mt-0.5 text-[9px] font-bold text-gray-400">{durationText(record)} · 疼痛 {record.painLevel ?? 0}/5</p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button 
                            type="button" 
                            onClick={() => { 
                              setEditingId(record.id); 
                              setRecordDraft(recordToDraft(record));
                              setIsRecordEditing(true);
                              containerRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
                            }} 
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-rose-500" 
                            aria-label="编辑记录"
                          >
                            <Pencil size={11} />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => removeRecord(record)} 
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-400 hover:text-red-500" 
                            aria-label="删除记录"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                      {record.symptoms.length > 0 && <ChipList items={record.symptoms} />}
                      {record.note && <p className="mt-2 text-[10px] font-bold leading-relaxed text-gray-500 bg-rose-50/20 p-2 rounded-xl">{record.note}</p>}
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      )}

      {activeView === 'trends' && (
        <div className="space-y-5">
          {/* Trend stats grid with icons */}
          <section className="grid grid-cols-2 gap-3">
            <TrendCard label="平均周期" value={`${summary?.averageCycleDays || normalizedSettings.defaultCycleDays} 天`} detail={`波动 ${summary?.cycleVarianceDays || 0} 天`} icon={Activity} color="bg-rose-50 text-rose-500" />
            <TrendCard label="平均经期" value={`${summary?.averagePeriodDays || normalizedSettings.defaultPeriodDays} 天`} detail={`${summary?.recordCount || 0} 次区间记录`} icon={Droplets} color="bg-pink-50 text-pink-500" />
            <TrendCard label="日志天数" value={`${summary?.loggedDayCount || logs.length} 天`} detail="最近最多展示 180 天" icon={ClipboardCheck} color="bg-blue-50 text-blue-500" />
            <TrendCard label="当前周期" value={`${summary?.currentCycleDay || '--'} 天`} detail={summary?.isInPeriod ? '正在经期中' : '非经期记录'} icon={CalendarDays} color="bg-amber-50 text-amber-500" />
          </section>

          {/* Past Period Durations CSS Bar Chart */}
          {periodDurationHistory.length > 0 && (
            <section className="rounded-[28px] bg-white/70 p-5 shadow-sm">
              <h3 className="text-xs font-black text-gray-800 mb-4 flex items-center gap-1.5 border-b border-rose-100/50 pb-2.5">
                <LineChart size={14} className="text-rose-500" />
                最近 6 次经期长度趋势
              </h3>
              <div className="flex h-36 items-end justify-between gap-3 px-2 pt-4">
                {periodDurationHistory.map((item, index) => {
                  const maxDays = Math.max(...periodDurationHistory.map(d => d.days), 7) || 7;
                  const pct = (item.days / maxDays) * 100;
                  return (
                    <div key={index} className="flex flex-col items-center flex-1 group">
                      <div className="relative w-full flex justify-center">
                        <span className="absolute -top-7 scale-0 group-hover:scale-100 transition-all rounded-lg bg-gray-900 px-2 py-0.5 text-[9px] font-black text-white whitespace-nowrap shadow-md z-10">
                          {item.days} 天
                        </span>
                      </div>
                      <div 
                        className="w-5 rounded-t-full bg-gradient-to-t from-rose-300 to-rose-500 transition-all duration-500 group-hover:from-rose-400 group-hover:to-rose-600"
                        style={{ height: `${pct}%`, minHeight: '12%' }}
                      />
                      <span className="mt-2 text-[9px] font-bold text-gray-400">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Common Symptoms relative progress bars */}
          <section className="rounded-[28px] bg-white/70 p-5 shadow-sm">
            <h3 className="text-xs font-black text-gray-800 mb-4 flex items-center gap-1.5 border-b border-rose-100/50 pb-2.5">
              <Droplets size={14} className="text-rose-500" />
              常见健康症状
            </h3>
            <div className="space-y-4">
              {summary?.symptomStats?.length ? (
                (() => {
                  const maxCount = Math.max(...summary.symptomStats.map(s => s.count)) || 1;
                  return summary.symptomStats.map((item) => {
                    const pct = (item.count / maxCount) * 100;
                    return (
                      <div key={item.name}>
                        <div className="mb-1 flex items-center justify-between text-xs font-black text-gray-600">
                          <span>{item.name}</span>
                          <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[9px] font-black text-rose-500">{item.count} 次</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-rose-300 to-rose-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                <p className="text-xs text-center text-gray-400 py-4 font-bold">暂无健康日志症状统计</p>
              )}
            </div>
          </section>

          {/* AI Care Advisor with Quick Prompt pills */}
          <section className="rounded-[28px] bg-white/70 p-5 shadow-sm">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-black text-gray-700">
              <Sparkles size={14} className="text-rose-500" />
              AI 生活照顾助手
            </div>
            <p className="text-[10px] font-bold text-gray-400 mb-2 leading-relaxed">快捷生成气泡：点击快速为伴侣/自己生成温和、周全的照顾话语及妙招：</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {[
                { label: '🌿 缓解痛经妙招', prompt: '她这几天有些痛经，请写几句温柔的关怀话语，并提供 3 个舒缓痛经的日常小妙招。不要涉及医疗诊断。' },
                { label: '🍵 经期热饮做法', prompt: '女生姨妈期适合喝什么温热饮品？请给我 3 个简单快手的热饮做法（如红糖姜茶、玫瑰花茶等）。' },
                { label: '❤️ 关心敏感低落', prompt: '她在经期情绪有些低落和敏感，我该怎么说和做，才能让她觉得被陪伴和理解？请写几个具体的关心话术。' },
                { label: '👶 备孕期放松指南', prompt: '我们在备孕阶段，感觉最近情绪有点紧绷。请帮我写一段温柔的放松指南，适合两个人一起读，缓解焦虑。' },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setAiCarePrompt(item.prompt)}
                  className="rounded-xl border border-rose-100 bg-rose-50/50 hover:bg-rose-50 px-2.5 py-1.5 text-[9px] font-bold text-rose-500 transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <textarea
              value={aiCarePrompt}
              onChange={(event) => setAiCarePrompt(event.target.value)}
              rows={3}
              placeholder="想要照顾提醒、待办描述，还是一句温柔的话？"
              className="w-full resize-none rounded-2xl border border-rose-100 bg-rose-50/40 px-3 py-2 text-xs font-bold text-gray-700 outline-none placeholder:text-gray-300 focus:ring-2 focus:ring-rose-100"
            />
            <button
              type="button"
              onClick={generateAiCare}
              disabled={aiCareLoading}
              className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 text-xs font-black text-white disabled:opacity-50"
            >
              {aiCareLoading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Sparkles size={14} />}
              生成建议草稿
            </button>
            {aiCareResult && (
              <div className="mt-3 rounded-2xl bg-rose-50 p-3">
                <p className="whitespace-pre-wrap text-xs font-bold leading-relaxed text-gray-600">{aiCareResult}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDate(todayString());
                    setLogDraft((current) => ({ ...current, note: [current.note, aiCareResult].filter(Boolean).join('\n') }));
                    setActiveView('tracker');
                    setIsLogEditing(true);
                  }}
                  className="mt-3 min-h-9 rounded-full bg-rose-500 px-4 text-[11px] font-black text-white"
                >
                  填入今日日志备注
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/14 p-3">
      <p className="text-[9px] font-black text-white/60">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function ActionButton({ icon: Icon, title, description, disabled, onClick }: { icon: typeof Plus; title: string; description: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className="min-h-[104px] rounded-[24px] bg-white/70 p-4 text-left shadow-sm transition-colors disabled:opacity-45">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
        <Icon size={18} />
      </div>
      <p className="text-sm font-black text-gray-800">{title}</p>
      <p className="mt-1 text-[10px] font-bold leading-relaxed text-gray-400">{description}</p>
    </button>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <div className="rounded-2xl bg-rose-50/70 p-3 text-center">
      <p className="text-[9px] font-black text-rose-400">{label}</p>
      <div className="mt-2 flex items-center justify-center gap-2">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-rose-500">-</button>
        <span className="min-w-6 text-sm font-black text-gray-800">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-rose-500">+</button>
      </div>
    </div>
  );
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${color}`} />
      <span>{text}</span>
    </div>
  );
}

function RecordEditor({ draft, setDraft, onSave, busy }: { draft: PeriodDraft; setDraft: (draft: PeriodDraft) => void; onSave: () => void; busy: boolean }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <DateField label="开始日期" value={draft.startDate} onChange={(value) => setDraft({ ...draft, startDate: value })} />
        <DateField label="结束日期" value={draft.endDate} onChange={(value) => setDraft({ ...draft, endDate: value })} />
      </div>
      <FlowPicker value={draft.flow} onChange={(flow) => setDraft({ ...draft, flow })} />
      <RangeField label="疼痛程度" value={draft.painLevel} onChange={(painLevel) => setDraft({ ...draft, painLevel })} />
      <ChipPicker title="症状" options={symptomOptions} value={draft.symptoms} onChange={(symptoms) => setDraft({ ...draft, symptoms })} />
      <textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="备注一点这次周期的状态..." rows={3} className="w-full resize-none rounded-2xl border border-rose-100 bg-white px-3 py-3 text-xs font-bold text-gray-700 outline-none placeholder:text-gray-300 focus:ring-2 focus:ring-rose-100" />
      <button type="button" onClick={onSave} disabled={busy || !draft.startDate} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-rose-500 text-sm font-black text-white shadow-lg shadow-rose-100 disabled:opacity-50">
        <Save size={16} />
        保存经期记录
      </button>
    </div>
  );
}

function LogEditor({ draft, setDraft, onSave, onClear, hasExisting, busy, showFertility }: { draft: LogDraft; setDraft: (draft: LogDraft) => void; onSave: () => void; onClear: () => void; hasExisting: boolean; busy: boolean; showFertility: boolean }) {
  return (
    <div className="space-y-4">
      <FlowPicker value={draft.flow} onChange={(flow) => setDraft({ ...draft, flow })} />
      <RangeField label="疼痛程度" value={draft.painLevel} onChange={(painLevel) => setDraft({ ...draft, painLevel })} />
      <RangeField label="精力状态" value={draft.energyLevel} onChange={(energyLevel) => setDraft({ ...draft, energyLevel })} />
      <ChipPicker title="症状" options={symptomOptions} value={draft.symptoms} onChange={(symptoms) => setDraft({ ...draft, symptoms })} />
      <ChipPicker title="心情" options={moodOptions} value={draft.moods} onChange={(moods) => setDraft({ ...draft, moods })} />
      {showFertility && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-xs font-black text-gray-500">
            基础体温
            <input type="number" step="0.01" min="30" max="45" value={draft.temperatureCelsius} onChange={(event) => setDraft({ ...draft, temperatureCelsius: event.target.value })} placeholder="36.50" className="mt-2 w-full rounded-2xl border border-emerald-100 bg-white px-3 py-3 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-emerald-100" />
          </label>
          <label className="block text-xs font-black text-gray-500">
            LH 试纸
            <select value={draft.lhTestResult} onChange={(event) => setDraft({ ...draft, lhTestResult: event.target.value as LogDraft['lhTestResult'] })} className="mt-2 w-full rounded-2xl border border-emerald-100 bg-white px-3 py-3 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-emerald-100">
              {lhOptions.map((option) => <option key={option.value || 'empty'} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => setDraft({ ...draft, intercourse: !draft.intercourse })} className={`col-span-2 min-h-11 rounded-2xl text-xs font-black ${draft.intercourse ? 'bg-emerald-500 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
            {draft.intercourse ? '已记录同房' : '记录同房'}
          </button>
        </div>
      )}
      <textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="写下今天的身体、情绪或照顾备注..." rows={4} className="w-full resize-none rounded-2xl border border-rose-100 bg-white px-3 py-3 text-xs font-bold text-gray-700 outline-none placeholder:text-gray-300 focus:ring-2 focus:ring-rose-100" />
      <div className="grid grid-cols-[0.8fr_1.2fr] gap-3">
        <button type="button" onClick={onClear} disabled={busy || !hasExisting} className="min-h-12 rounded-2xl bg-white text-sm font-black text-gray-500 shadow-sm disabled:opacity-45">
          清空
        </button>
        <button type="button" onClick={onSave} disabled={busy} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gray-900 text-sm font-black text-white disabled:opacity-50">
          <Save size={16} />
          保存日志
        </button>
      </div>
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs font-black text-gray-500">
      {label}
      <input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-2xl border border-rose-100 bg-white px-3 py-3 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-rose-100" />
    </label>
  );
}

function FlowPicker({ value, onChange }: { value: '' | PeriodFlow; onChange: (value: '' | PeriodFlow) => void }) {
  return (
    <div>
      <p className="mb-2 text-xs font-black text-gray-500">流量</p>
      <div className="grid grid-cols-5 gap-2">
        {flowOptions.map((option) => (
          <button key={option.value || 'none'} type="button" onClick={() => onChange(option.value)} className={`min-h-10 rounded-2xl px-1 text-[10px] font-black transition-colors ${value === option.value ? 'bg-rose-500 text-white shadow-md shadow-rose-100' : 'bg-rose-50 text-rose-500'}`}>
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function RangeField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const getLevelLabel = (val: number) => {
    if (label.includes("疼")) {
      return ["无痛", "微痛", "轻度", "中度", "重度", "剧痛"][val] || "";
    }
    return ["无力", "疲惫", "一般", "充沛", "极佳", "活力"][val] || "";
  };

  return (
    <div>
      <div className="flex items-center justify-between text-xs font-black text-gray-500">
        <span>{label}</span>
        <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-black text-rose-500">
          {value}/5 - {getLevelLabel(value)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={5}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 w-full accent-rose-500 cursor-pointer"
      />
      <div className="flex justify-between text-[9px] font-bold text-gray-300 mt-1 px-1">
        <span>0</span>
        <span>1</span>
        <span>2</span>
        <span>3</span>
        <span>4</span>
        <span>5</span>
      </div>
    </div>
  );
}

function ChipPicker({ title, options, value, onChange }: { title: string; options: string[]; value: string[]; onChange: (value: string[]) => void }) {
  return (
    <div>
      <p className="mb-2 text-xs font-black text-gray-500">{title}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option} type="button" onClick={() => onChange(toggleItem(value, option))} className={`rounded-full px-3 py-2 text-[10px] font-black transition-colors ${value.includes(option) ? 'bg-rose-500 text-white shadow-md shadow-rose-100' : 'bg-rose-50 text-rose-500'}`}>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChipList({ items }: { items: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span key={item} className="rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-bold text-rose-500">{item}</span>
      ))}
    </div>
  );
}

function TrendCard({ label, value, detail, icon: Icon, color }: { label: string; value: string; detail: string; icon: typeof Activity; color: string }) {
  return (
    <div className="rounded-[24px] bg-white/70 p-4 shadow-sm flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-black text-gray-400">{label}</p>
        <p className="mt-2 text-xl font-black text-gray-800 truncate">{value}</p>
        <p className="mt-1 text-[9px] font-bold text-gray-400 truncate">{detail}</p>
      </div>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon size={14} />
      </div>
    </div>
  );
}
