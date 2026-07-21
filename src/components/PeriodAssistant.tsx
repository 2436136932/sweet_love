import { ChevronRight, Droplets } from 'lucide-react';
import { useMemo } from 'react';
import { PeriodRecord, PeriodSummary } from '../types';

function formatShortDate(value?: string) {
  if (!value) return '--';
  const [, month, day] = value.split('-');
  return `${month}/${day}`;
}

function getPeriodStatus(summary: PeriodSummary | null) {
  if (!summary || summary.recordCount === 0) {
    return {
      title: '记录第一次周期',
      detail: '一起照顾每个月的小信号',
      badge: '未记录',
    };
  }
  if (summary.isInPeriod) {
    return {
      title: `姨妈期第 ${summary.currentDay || 1} 天`,
      detail: `预计 ${formatShortDate(summary.predictedEndDate || summary.latestEndDate)} 左右结束`,
      badge: '进行中',
    };
  }
  if (summary.daysUntilNext === undefined) {
    return {
      title: '等待更多记录',
      detail: '记录越多，预测越准',
      badge: '预测中',
    };
  }
  return {
    title: summary.daysUntilNext < 0 ? '可能已经临近' : `预计还有 ${summary.daysUntilNext} 天`,
    detail: `${formatShortDate(summary.predictedStartDate)} 左右开始，平均 ${summary.averageCycleDays} 天`,
    badge: summary.daysUntilNext <= 3 && summary.daysUntilNext >= 0 ? '需要照顾' : '预测',
  };
}

export default function PeriodAssistant({
  records,
  summary,
  onOpen,
}: {
  records: PeriodRecord[];
  summary: PeriodSummary | null;
  onOpen: () => void;
}) {
  const status = useMemo(() => getPeriodStatus(summary), [summary]);

  return (
    <section className="mb-6">
      <button
        type="button"
        onClick={onOpen}
        className="relative w-full overflow-hidden rounded-[28px] border border-rose-100/80 bg-gradient-to-br from-white via-rose-50 to-pink-100/70 p-5 text-left shadow-sm"
      >
        <div className="absolute -right-8 -top-10 h-28 w-28 rounded-full bg-rose-200/40 blur-2xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-rose-500 text-white shadow-lg shadow-rose-200">
              <Droplets size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">姨妈助手</p>
                <span className="rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-black text-rose-500">{status.badge}</span>
              </div>
              <h2 className="mt-1 text-lg font-black text-gray-800">{status.title}</h2>
              <p className="mt-1 text-xs font-bold leading-relaxed text-gray-500">{status.detail}</p>
            </div>
          </div>
          <ChevronRight className="mt-2 shrink-0 text-rose-400" size={18} />
        </div>

        <div className="relative mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl bg-white/70 px-3 py-2">
            <p className="text-[9px] font-black text-gray-400">最近</p>
            <p className="mt-1 text-sm font-black text-gray-700">{formatShortDate(summary?.latestStartDate)}</p>
          </div>
          <div className="rounded-2xl bg-white/70 px-3 py-2">
            <p className="text-[9px] font-black text-gray-400">下次</p>
            <p className="mt-1 text-sm font-black text-gray-700">{formatShortDate(summary?.predictedStartDate)}</p>
          </div>
          <div className="rounded-2xl bg-white/70 px-3 py-2">
            <p className="text-[9px] font-black text-gray-400">记录</p>
            <p className="mt-1 text-sm font-black text-gray-700">{records.length} 条</p>
          </div>
        </div>
      </button>
    </section>
  );
}
