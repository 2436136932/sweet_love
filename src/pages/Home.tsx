import { motion } from 'motion/react'
import {
  Heart,
  Calendar,
  MessageCircle,
  Star,
  ChevronRight,
  CheckSquare,
  Book,
  Sparkles,
  Send,
  Utensils,
  Briefcase,
  Moon,
  SmilePlus,
  BatteryLow,
  Laptop,
  X,
  Video,
  Bell,
  Trash2
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  PageType,
  Anniversary,
  TodoItem,
  Couple,
  DailyRating,
  User,
  MealOrderDay,
  AlbumImage,
  PeriodRecord,
  PeriodSummary,
  MomentStatus,
  PublicUser
} from '../types'
import { useEffect, useMemo, useState } from 'react'
import {
  aiService,
  ratingService,
  userService,
  coupleService,
  notificationListService,
  NotificationItem
} from '../services/api'
import { useToast } from '../components/Toast'
import { getRemainingDays } from '../lib/utils'
import { useModalHistory } from '../hooks/useModalHistory'
import Stack from '../components/Stack'
import CoverCarousel from '../components/CoverCarousel'
import { AppImage } from '../components/AppImage'
import { buildImageUrl } from '../lib/imageUrl'

const momentStatusOptions: Array<{
  key: MomentStatus
  label: string
  fallback: string
  icon: LucideIcon
  color: string
}> = [
  {
    key: 'missing',
    label: '想你了',
    fallback: '想你了',
    icon: Heart,
    color: 'bg-pink-100 text-pink-600 border-pink-100'
  },
  {
    key: 'busy',
    label: '在忙',
    fallback: '在忙，晚点回',
    icon: Briefcase,
    color: 'bg-amber-100 text-amber-600 border-amber-100'
  },
  {
    key: 'resting',
    label: '休息中',
    fallback: '在休息',
    icon: Moon,
    color: 'bg-indigo-100 text-indigo-600 border-indigo-100'
  },
  {
    key: 'happy',
    label: '开心',
    fallback: '心情很好',
    icon: SmilePlus,
    color: 'bg-emerald-100 text-emerald-600 border-emerald-100'
  },
  {
    key: 'tired',
    label: '有点累',
    fallback: '需要抱抱',
    icon: BatteryLow,
    color: 'bg-slate-100 text-slate-600 border-slate-100'
  },
  {
    key: 'eating',
    label: '吃饭中',
    fallback: '正在吃饭',
    icon: Utensils,
    color: 'bg-orange-100 text-orange-600 border-orange-100'
  },
  {
    key: 'working',
    label: '工作中',
    fallback: '专心工作中',
    icon: Laptop,
    color: 'bg-blue-100 text-blue-600 border-blue-100'
  }
]

const momentStatusMap = momentStatusOptions.reduce(
  (map, option) => ({ ...map, [option.key]: option }),
  {} as Record<MomentStatus, (typeof momentStatusOptions)[number]>
)

function momentTimeLabel(value?: string | null) {
  if (!value) return ''
  const diffMs = Date.now() - new Date(value).getTime()
  if (diffMs < 5 * 60 * 1000) return '刚刚'
  if (diffMs < 24 * 60 * 60 * 1000) return '今天更新'
  if (diffMs < 48 * 60 * 60 * 1000) return '昨天更新'
  return `${Math.max(2, Math.floor(diffMs / (24 * 60 * 60 * 1000)))} 天前`
}

function formatShortDate(value?: string) {
  if (!value) return '--'
  const [, month, day] = value.split('-')
  return `${month}/${day}`
}

export default function Home({
  user,
  onNavigate,
  anniversaries,
  todos,
  couple,
  dailyRatings,
  mealOrder,
  albumImages,
  periodRecords,
  periodSummary,
  notifications,
  unreadCount,
  onUpdateRatings,
  onUpdateUser,
  onOpenPeriod,
  onNotificationsChange
}: {
  user: User
  onNavigate: (page: PageType) => void
  anniversaries: Anniversary[]
  todos: TodoItem[]
  couple: Couple | null
  dailyRatings: DailyRating[]
  mealOrder: MealOrderDay | null
  albumImages: AlbumImage[]
  periodRecords: PeriodRecord[]
  periodSummary: PeriodSummary | null
  notifications: NotificationItem[]
  unreadCount: number
  onUpdateRatings: (ratings: DailyRating[]) => void
  onUpdateUser: (user: User) => void
  onOpenPeriod: () => void
  onNotificationsChange: (
    notifications: NotificationItem[],
    unreadCount: number
  ) => void
}) {
  const { showToast } = useToast()
  const [ratingScore, setRatingScore] = useState(0)
  const [ratingNote, setRatingNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [momentPanelOpen, setMomentPanelOpen] = useState(false)
  const [momentStatus, setMomentStatus] = useState<MomentStatus>(
    user.momentStatus || 'missing'
  )
  const [momentStatusText, setMomentStatusText] = useState(
    user.momentStatusText || ''
  )
  const [momentSaving, setMomentSaving] = useState(false)
  const [loveAiPrompt, setLoveAiPrompt] = useState('')
  const [loveAiResult, setLoveAiResult] = useState('')
  const [loveAiLoading, setLoveAiLoading] = useState(false)
  const [loveAiOpen, setLoveAiOpen] = useState(false)
  const [coverCarousel, setCoverCarousel] = useState<string[] | null>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const partner = user.partner
  const userAvatar =
    user.avatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.username)}`
  const partnerAvatar =
    partner?.avatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(partner?.username || 'partner')}`
  const closeMomentPanel = useModalHistory('home-moment', momentPanelOpen, () =>
    setMomentPanelOpen(false)
  )
  const closeLoveAiPanel = useModalHistory('home-ai', loveAiOpen, () =>
    setLoveAiOpen(false)
  )
  const myRating = useMemo(
    () => dailyRatings.find((rating) => rating.userId === user.id),
    [dailyRatings, user.id]
  )
  const partnerRating = useMemo(
    () => dailyRatings.find((rating) => rating.userId !== user.id),
    [dailyRatings, user.id]
  )
  const orderedRatings = useMemo(
    () => [myRating, partnerRating].filter(Boolean) as DailyRating[],
    [myRating, partnerRating]
  )

  useEffect(() => {
    if (myRating) {
      setRatingScore(myRating.score)
      setRatingNote(myRating.note || '')
    }
  }, [myRating])

  useEffect(() => {
    setMomentStatus(user.momentStatus || 'missing')
    setMomentStatusText(user.momentStatusText || '')
  }, [user.momentStatus, user.momentStatusText])

  // 封面轮播图数据
  useEffect(() => {
    setCoverCarousel(couple?.coverCarousel ?? null)
  }, [couple?.coverCarousel])

  const handleNotifOpen = async () => {
    setNotifOpen(true)
    // 自动检查新提醒
    try {
      await notificationListService.check()
      const data = await notificationListService.getAll()
      onNotificationsChange(data.notifications, data.unreadCount)
    } catch (err) {
      console.error('Failed to check notifications', err)
    }
  }

  const handleMarkRead = async (id: string) => {
    try {
      await notificationListService.markRead(id)
      const updated = notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
      onNotificationsChange(updated, Math.max(0, unreadCount - 1))
    } catch (err) {
      console.error('Failed to mark read', err)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationListService.markAllRead()
      onNotificationsChange(
        notifications.map((n) => ({ ...n, read: true })),
        0
      )
    } catch (err) {
      console.error('Failed to mark all read', err)
    }
  }

  const handleDeleteNotif = async (id: string) => {
    try {
      await notificationListService.delete(id)
      const wasRead = notifications.find((n) => n.id === id)?.read
      onNotificationsChange(
        notifications.filter((n) => n.id !== id),
        Math.max(0, unreadCount - (wasRead ? 0 : 1))
      )
    } catch (err) {
      console.error('Failed to delete notification', err)
    }
  }

  const formatNotifTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return date.toLocaleDateString('zh-CN', {
      month: 'numeric',
      day: 'numeric'
    })
  }

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'anniversary':
        return '🎉'
      case 'daily_rating':
        return '💕'
      case 'todo':
        return '📋'
      default:
        return '🔔'
    }
  }

  const stats = {
    days: couple?.startDate
      ? Math.max(
          0,
          Math.floor(
            (new Date().getTime() -
              new Date(couple.startDate + 'T00:00:00').getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 520
  }

  const pendingTodos = todos.filter((t) => !t.completed)
  const completedTodoCount = todos.filter((t) => t.completed).length
  const todoGoalTotal = 100
  const todoProgress = Math.min(
    100,
    Math.round((completedTodoCount / todoGoalTotal) * 100)
  )
  const nextTodo = pendingTodos[0]
  const nearestAnniversary = useMemo(() => {
    if (anniversaries.length === 0) return null
    return [...anniversaries].sort(
      (a, b) => getRemainingDays(a.date) - getRemainingDays(b.date)
    )[0]
  }, [anniversaries])
  const anniversaryDaysLeft = nearestAnniversary
    ? getRemainingDays(nearestAnniversary.date)
    : null
  const importantAnniversaryCount = anniversaries.filter(
    (anniversary) => anniversary.isImportant
  ).length
  const mealOrderQuantity =
    mealOrder?.items.reduce((sum, item) => sum + item.quantity, 0) || 0
  const photoWallItems = useMemo(() => {
    const featured = albumImages.filter((image) => image.isFeatured)
    return (featured.length > 0 ? featured : albumImages).slice(0, 4)
  }, [albumImages])
  const scrollToRating = () => {
    document
      .getElementById('daily-rating')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const dailyLoveTasks = [
    {
      id: 'rating',
      title: myRating ? '今日心动已记录' : '给今天打个分',
      description: myRating
        ? `你给了 ${myRating.score} 颗心${partnerRating ? '，TA 也回应了' : '，等 TA 回应'}`
        : '用 5 颗心记录今天的恋爱温度',
      icon: Heart,
      color: 'bg-pink-100 text-pink-500',
      done: Boolean(myRating),
      actionLabel: myRating ? '更新' : '去评分',
      onClick: scrollToRating
    },
    {
      id: 'kitchen',
      title: mealOrderQuantity > 0 ? '今日厨房已安排' : '去情侣厨房看看',
      description:
        mealOrderQuantity > 0
          ? `小票里已有 ${mealOrderQuantity} 份，一起等开饭`
          : '看菜谱、生成买菜清单、记录做饭打卡',
      icon: Utensils,
      color: 'bg-orange-100 text-orange-500',
      done: mealOrderQuantity > 0,
      actionLabel: mealOrderQuantity > 0 ? '查看' : '厨房',
      onClick: () => onNavigate('kitchen')
    },
    {
      id: 'todo',
      title: pendingTodos.length > 0 ? '完成一个小愿望' : '小愿望都完成啦',
      description:
        pendingTodos.length > 0
          ? `还有 ${pendingTodos.length} 个未完成：${pendingTodos[0].title}`
          : '可以去补一个新的约会灵感',
      icon: CheckSquare,
      color: 'bg-purple-100 text-purple-500',
      done: pendingTodos.length === 0,
      actionLabel: pendingTodos.length > 0 ? '去完成' : '添加',
      onClick: () => onNavigate('todo')
    },
    {
      id: 'diary',
      title: '留下今天的小片段',
      description: '写一段心情、放一张照片，给以后回看',
      icon: Book,
      color: 'bg-blue-100 text-blue-500',
      done: false,
      actionLabel: '写日记',
      onClick: () => onNavigate('diary')
    }
  ]
  const completedLoveTasks = dailyLoveTasks.filter((task) => task.done).length
  const periodNeedsAttention = Boolean(
    periodSummary?.isInPeriod ||
    (periodSummary?.daysUntilNext !== undefined &&
      ((periodSummary.daysUntilNext >= 0 && periodSummary.daysUntilNext <= 3) ||
        (periodSummary.daysUntilNext < 0 && periodSummary.daysUntilNext >= -7)))
  )
  const periodFocus = useMemo(() => {
    if (!periodSummary || periodRecords.length === 0) {
      return {
        title: '还没有周期记录',
        detail: '补一次开始日，之后会自动预测',
        shortTitle: '待记录'
      }
    }

    if (periodSummary.isInPeriod) {
      const currentDay = periodSummary.currentDay || 1
      return {
        title: `姨妈期第 ${currentDay} 天`,
        detail: `预计 ${formatShortDate(periodSummary.predictedEndDate || periodSummary.latestEndDate)} 结束`,
        shortTitle: `第 ${currentDay} 天`
      }
    }

    const daysUntilNext = periodSummary.daysUntilNext ?? 0
    if (daysUntilNext < 0) {
      return {
        title: `经期已推迟 ${Math.abs(daysUntilNext)} 天`,
        detail: `预计开始于 ${formatShortDate(periodSummary.predictedStartDate)} · 平均 ${periodSummary.averageCycleDays} 天`,
        shortTitle: `推迟 ${Math.abs(daysUntilNext)} 天`
      }
    }
    return {
      title:
        daysUntilNext === 0 ? '预计今天开始' : `预计还有 ${daysUntilNext} 天`,
      detail: `${formatShortDate(periodSummary.predictedStartDate)} 开始 · 平均 ${periodSummary.averageCycleDays} 天`,
      shortTitle: daysUntilNext === 0 ? '今天' : `${daysUntilNext} 天后`
    }
  }, [periodRecords.length, periodSummary])
  const primaryFocus = !myRating
    ? {
        label: '今日重点',
        title: '给今天打个分',
        detail: '用 5 颗心同步今天的恋爱温度',
        icon: Heart,
        onClick: scrollToRating
      }
    : periodNeedsAttention
      ? {
          label: '今日重点',
          title: periodSummary?.isInPeriod
            ? '照顾她的今天'
            : periodSummary?.daysUntilNext !== undefined &&
                periodSummary.daysUntilNext < 0
              ? '经期已推迟'
              : '经期快到了',
          detail: periodFocus.detail,
          icon: Calendar,
          onClick: onOpenPeriod
        }
      : pendingTodos.length > 0
        ? {
            label: '今日重点',
            title: '完成一个小愿望',
            detail: nextTodo?.title || '把今天的小事做完一件',
            icon: CheckSquare,
            onClick: () => onNavigate('todo')
          }
        : {
            label: '今日重点',
            title: '一起决定吃什么',
            detail:
              mealOrderQuantity > 0
                ? `小票里已有 ${mealOrderQuantity} 份`
                : '去厨房找一个今晚菜谱',
            icon: Utensils,
            onClick: () => onNavigate('kitchen')
          }
  const PrimaryFocusIcon = primaryFocus.icon
  const secondaryActions = [
    {
      id: 'period',
      icon: Calendar,
      label: '姨妈',
      title: periodFocus.shortTitle,
      onClick: onOpenPeriod
    },
    {
      id: 'kitchen',
      icon: Utensils,
      label: '厨房',
      title: mealOrderQuantity > 0 ? `${mealOrderQuantity} 份` : '吃什么',
      onClick: () => onNavigate('kitchen')
    },
    {
      id: 'ai',
      icon: Sparkles,
      label: 'AI',
      title: loveAiOpen ? '收起' : '问一句',
      onClick: () => setLoveAiOpen((open) => !open)
    }
  ]

  const handleRatingSubmit = async () => {
    if (ratingScore === 0) return
    setSubmitting(true)
    try {
      await ratingService.submit({ score: ratingScore, note: ratingNote })
      const updatedRatings = await ratingService.getTodayStatus()
      onUpdateRatings(updatedRatings)
      showToast(myRating ? '今日评分已更新' : '今日评分已提交', 'success')
    } catch (error) {
      console.error('Submit rating failed:', error)
      showToast(
        error instanceof Error ? error.message : '评分保存失败，请稍后重试',
        'error'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleMomentSave = async () => {
    setMomentSaving(true)
    try {
      const updatedUser = await userService.updateMomentStatus({
        momentStatus,
        momentStatusText: momentStatusText.trim()
      })
      onUpdateUser(updatedUser)
      setMomentPanelOpen(false)
      showToast('此刻状态已更新', 'success')
    } catch (error) {
      console.error('Update moment status failed:', error)
      showToast(
        error instanceof Error ? error.message : '此刻状态保存失败，请稍后重试',
        'error'
      )
    } finally {
      setMomentSaving(false)
    }
  }

  const handleMomentClear = async () => {
    setMomentSaving(true)
    try {
      const updatedUser = await userService.updateMomentStatus({
        momentStatus: null,
        momentStatusText: ''
      })
      onUpdateUser(updatedUser)
      setMomentStatus('missing')
      setMomentStatusText('')
      setMomentPanelOpen(false)
      showToast('此刻状态已清除', 'success')
    } catch (error) {
      console.error('Clear moment status failed:', error)
      showToast(
        error instanceof Error ? error.message : '此刻状态清除失败，请稍后重试',
        'error'
      )
    } finally {
      setMomentSaving(false)
    }
  }

  const handleLoveAiGenerate = async () => {
    const prompt =
      loveAiPrompt.trim() || '帮我写一句今天可以发给另一半的温柔留言'
    setLoveAiLoading(true)
    setLoveAiResult('')
    try {
      const result = await aiService.generate({
        type: 'love_chat',
        prompt,
        context: {
          coupleName: couple?.name,
          daysTogether: stats.days,
          pendingTodos: pendingTodos.slice(0, 3).map((todo) => todo.title),
          nextAnniversary: nearestAnniversary?.title
        }
      })
      setLoveAiResult(result.content)
    } catch (error) {
      console.error('Generate love AI failed:', error)
      showToast(
        error instanceof Error ? error.message : 'AI 生成失败，请稍后重试',
        'error'
      )
    } finally {
      setLoveAiLoading(false)
    }
  }

  return (
    <div className="px-6 py-8 lg:px-8 lg:py-7">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between lg:hidden">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
            <Heart
              size={16}
              className="text-pink-500 fill-pink-500"
            />
          </div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight">
            {couple?.name || 'SweetLover'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="打开通知"
            onClick={handleNotifOpen}
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/60 bg-white/70 text-gray-600 shadow-sm backdrop-blur-sm"
          >
            <Bell
              size={20}
              className="text-gray-600"
            />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            aria-label="打开留言"
            onClick={() => onNavigate('messages')}
            className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/60 bg-white/70 text-gray-600 shadow-sm backdrop-blur-sm"
          >
            <MessageCircle
              size={20}
              className="text-gray-600"
            />
            <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full border border-white" />
          </button>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] lg:items-start lg:gap-6">
        <div className="lg:min-w-0">
          {/* Couple Card */}
          <section className="mb-5 lg:mb-6">
            <div className="relative h-[210px] overflow-hidden rounded-[30px] bg-gradient-to-br from-pink-100 via-white to-amber-100 shadow-lg shadow-pink-100/50 lg:h-[300px] lg:rounded-[34px]">
              <CoverCarousel
                initialImages={coverCarousel}
                onUpdateCouple={(updated) => {
                  setCoverCarousel(updated.coverCarousel ?? null)
                  coupleService.getCoverCarousel()
                }}
              />
              <div className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[11px] font-black tracking-[0.16em] text-pink-500 shadow-lg shadow-gray-900/10">
                <Heart
                  size={15}
                  className="fill-pink-500"
                />
                相爱中
              </div>
              <button
                onClick={() => onNavigate('profile')}
                className="absolute right-3 top-3 z-10 rounded-[22px] bg-white px-3.5 py-2.5 text-center shadow-lg shadow-gray-900/10 transition-transform hover:scale-105 active:scale-95"
                title="点击修改纪念日"
              >
                {couple?.startDate ? (
                  <>
                    <p className="text-2xl font-black leading-none text-pink-500">
                      {stats.days}
                    </p>
                    <p className="mt-1 text-[10px] font-black text-gray-500">
                      天
                    </p>
                  </>
                ) : (
                  <span className="flex flex-col items-center justify-center gap-1 text-pink-500">
                    <Calendar size={16} />
                    <span className="text-[9px] font-black">纪念日</span>
                  </span>
                )}
              </button>
              <div className="absolute bottom-5 left-5 right-5 z-10 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                <div className="mb-2 flex items-center gap-2 opacity-90">
                  <Heart
                    size={16}
                    className="fill-current"
                  />
                  <Sparkles size={11} />
                </div>
                <p className="truncate text-3xl font-black leading-tight lg:text-4xl">
                  {couple?.name || 'SweetLover'}
                </p>
                <p className="mt-1.5 text-sm font-bold opacity-95">
                  第{stats.days}天 · 一直甜甜的
                </p>
              </div>
            </div>

            <div className="mt-3 rounded-[28px] border border-white/80 bg-white/80 p-3 shadow-sm backdrop-blur-md">
              <div className="mb-1.5 flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  <span className="text-xs font-black text-gray-800">
                    此刻状态
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMomentPanelOpen(true)}
                  className="flex min-h-10 items-center rounded-full bg-pink-50 px-4 text-[10px] font-black text-pink-500"
                >
                  设置
                </button>
              </div>
              <div className="space-y-2">
                <MomentStatusRow
                  person={user}
                  avatar={userAvatar}
                  fallbackName={user.username}
                  emptyText="设置此刻"
                  editable
                  tone="pink"
                  onClick={() => setMomentPanelOpen(true)}
                />
                <div className="h-px bg-pink-100/70" />
                <MomentStatusRow
                  person={partner}
                  avatar={partnerAvatar}
                  fallbackName={partner?.username || '另一半'}
                  emptyText="还没更新"
                  tone="blue"
                />
              </div>
            </div>
            {momentPanelOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 rounded-[28px] border border-white/70 bg-white/85 p-4 shadow-sm backdrop-blur-md"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-pink-400">
                      Moment
                    </p>
                    <h3 className="text-sm font-black text-gray-800">
                      设置此刻状态
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={closeMomentPanel}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm"
                    aria-label="关闭"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {momentStatusOptions.map((option) => {
                    const Icon = option.icon
                    const active = momentStatus === option.key
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => setMomentStatus(option.key)}
                        className={`min-h-[58px] rounded-2xl border px-1.5 py-2 text-[10px] font-black transition-all ${
                          active
                            ? `${option.color} shadow-sm ring-2 ring-white`
                            : 'border-white bg-white/75 text-gray-500'
                        }`}
                      >
                        <Icon
                          size={16}
                          className="mx-auto mb-1"
                        />
                        {option.label}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between">
                    <label
                      className="text-xs font-black text-gray-500"
                      htmlFor="moment-status-text"
                    >
                      一句短语
                    </label>
                    <span className="text-[10px] font-bold text-gray-300">
                      {momentStatusText.length}/30
                    </span>
                  </div>
                  <input
                    id="moment-status-text"
                    type="text"
                    value={momentStatusText}
                    onChange={(event) =>
                      setMomentStatusText(event.target.value.slice(0, 30))
                    }
                    placeholder={momentStatusMap[momentStatus].fallback}
                    maxLength={30}
                    className="w-full rounded-2xl border border-pink-100 bg-white px-3 py-3 text-xs font-bold text-gray-700 outline-none placeholder:text-gray-300 focus:ring-2 focus:ring-pink-100"
                  />
                </div>
                <div className="mt-3 grid grid-cols-[0.8fr_1.2fr] gap-2">
                  <button
                    type="button"
                    onClick={handleMomentClear}
                    disabled={
                      momentSaving ||
                      (!user.momentStatus && !user.momentStatusText)
                    }
                    className="min-h-11 rounded-2xl bg-gray-100 text-xs font-black text-gray-500 disabled:opacity-50"
                  >
                    清除
                  </button>
                  <button
                    type="button"
                    onClick={handleMomentSave}
                    disabled={momentSaving}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-accent text-on-accent text-xs font-black shadow-lg shadow-accent disabled:opacity-60"
                  >
                    {momentSaving ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    保存状态
                  </button>
                </div>
              </motion.div>
            )}
          </section>

          <section className="mb-6 space-y-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={primaryFocus.onClick}
              className="flex w-full items-center gap-3 rounded-[26px] bg-accent p-4 text-left text-on-accent shadow-lg shadow-accent/20"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-on-accent">
                <PrimaryFocusIcon size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-black text-on-accent/60">
                  {primaryFocus.label}
                </span>
                <span className="mt-0.5 block truncate text-base font-black">
                  {primaryFocus.title}
                </span>
                <span className="mt-1 block truncate text-xs font-bold text-on-accent/70">
                  {primaryFocus.detail}
                </span>
              </span>
              <ChevronRight
                size={18}
                className="shrink-0 text-on-accent/50"
              />
            </motion.button>

            <div className="grid grid-cols-3 gap-2">
              {secondaryActions.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={action.onClick}
                    className="min-h-[76px] rounded-[22px] border border-white/70 bg-white/70 px-2.5 py-3 text-left shadow-sm backdrop-blur-sm transition-colors active:bg-white"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">
                        <Icon size={16} />
                      </span>
                      <ChevronRight
                        size={13}
                        className="text-gray-300"
                      />
                    </div>
                    <p className="mt-2 text-[10px] font-black text-gray-400">
                      {action.label}
                    </p>
                    <p className="mt-0.5 truncate text-xs font-black text-gray-800">
                      {action.title}
                    </p>
                  </button>
                )
              })}
            </div>

            {loveAiOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[26px] border border-white/80 bg-white/80 p-4 shadow-sm backdrop-blur-md"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-black text-gray-800">
                      恋爱助手
                    </h2>
                    <p className="mt-1 text-[10px] font-bold text-gray-400">
                      留言、约会、安慰话术都可以先生成草稿
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeLoveAiPanel}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-gray-400 shadow-sm"
                    aria-label="关闭 AI 助手"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-3">
                  <textarea
                    value={loveAiPrompt}
                    onChange={(event) => setLoveAiPrompt(event.target.value)}
                    rows={2}
                    placeholder="想写晚安、约会计划、安慰话术..."
                    className="w-full resize-none rounded-2xl border border-pink-100 bg-white px-3 py-3 text-xs font-bold text-gray-700 outline-none placeholder:text-gray-300 focus:ring-2 focus:ring-pink-100"
                  />
                  <button
                    type="button"
                    onClick={handleLoveAiGenerate}
                    disabled={loveAiLoading}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-accent text-xs font-black text-on-accent shadow-lg shadow-accent/20 disabled:opacity-60"
                  >
                    {loveAiLoading ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    问问 AI
                  </button>
                  {loveAiResult && (
                    <div className="rounded-2xl bg-pink-50 px-3 py-3 text-xs font-bold leading-relaxed text-gray-700">
                      {loveAiResult}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </section>

          {photoWallItems.length > 0 && (
            <section className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-gray-800">
                    精选照片墙
                  </h2>
                  <p className="mt-1 text-[10px] font-bold text-gray-400">
                    从相册里挑出来的今日回忆
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('album')}
                  className="flex min-h-10 items-center gap-1 rounded-full bg-white/70 px-3 text-[10px] font-bold uppercase tracking-widest text-pink-500"
                >
                  相册 <ChevronRight size={12} />
                </button>
              </div>
              <div
                className="relative flex flex-col gap-4 rounded-[28px] border-2 border-dashed border-pink-200/40 bg-[#FAF8F5]/90 p-5 shadow-sm overflow-hidden"
                style={{
                  backgroundImage:
                    'radial-gradient(#E8E2D9 1.1px, transparent 1.1px)',
                  backgroundSize: '14px 14px'
                }}
              >
                {/* 可爱手帐贴纸 */}
                <div className="absolute top-3 right-4 rotate-[-10deg] select-none pointer-events-none opacity-80 z-20">
                  <Heart className="w-4 h-4 text-pink-400 fill-pink-300 drop-shadow-sm" />
                </div>

                <div className="mx-auto size-[208px] shrink-0 sm:size-[232px] relative z-10">
                  <Stack
                    randomRotation
                    sensitivity={230}
                    sendToBackOnClick
                    autoplay
                    autoplayDelay={1800}
                    pauseOnHover
                    cards={photoWallItems.map((item) => (
                      <div
                        key={item.id}
                        className="relative size-full flex flex-col bg-white p-2.5 pb-7 shadow-md border border-gray-100 rounded-[2px] text-left"
                      >
                        {/* 照片区域 */}
                        <div className="relative flex-1 w-full overflow-hidden bg-pink-50 rounded-sm">
                          {item.mediaType === 'video' ? (
                            <video
                              src={buildImageUrl(item.src)}
                              className="size-full object-cover"
                              muted
                              playsInline
                            />
                          ) : (
                            <AppImage
                              src={item.src}
                              alt={item.title}
                              className="size-full object-cover"
                              width={464}
                              height={464}
                              crop="square"
                              sizes="232px"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          {item.mediaType === 'video' && (
                            <div className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white z-10 shadow-sm">
                              <Video size={10} />
                            </div>
                          )}
                        </div>
                        {/* 拍立得下方手写文字区 */}
                        <div className="mt-2 flex flex-col justify-center leading-none text-center">
                          <p className="truncate font-serif italic font-bold text-[11px] text-gray-700 w-full px-0.5">
                            {item.title || '无题回忆'}
                          </p>
                        </div>
                      </div>
                    ))}
                  />
                </div>
                <div className="min-w-0 text-center relative z-10">
                  <p className="text-sm font-black text-gray-800">
                    拖一拖，翻到下一张回忆
                  </p>
                  <p className="mt-1 text-xs font-bold leading-relaxed text-gray-400">
                    {photoWallItems.length}{' '}
                    张精选会自动轮播，也可以点击照片切换。
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate('album')}
                    className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full bg-accent px-4 text-xs font-black text-on-accent shadow-lg shadow-accent/20"
                  >
                    打开相册
                  </button>
                </div>
              </div>
            </section>
          )}
        </div>
        <div className="lg:min-w-0">
          {/* Anniversary & Quick Links */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => onNavigate('anniversaries')}
              className="min-h-[150px] bg-purple-500/10 backdrop-blur-sm p-4 rounded-[24px] border border-white/50 text-left relative overflow-hidden group shadow-sm"
            >
              <div className="relative z-10 flex h-full flex-col">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="p-2 bg-purple-100 rounded-xl">
                    <Calendar
                      size={16}
                      className="text-purple-500"
                    />
                  </div>
                  <span className="rounded-full bg-white/60 px-2 py-1 text-[9px] font-black text-purple-500">
                    {importantAnniversaryCount > 0
                      ? `${importantAnniversaryCount} 个重要`
                      : '纪念日'}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">
                  下一个纪念日
                </span>
                <p className="mt-1 line-clamp-1 text-sm font-black text-gray-800">
                  {nearestAnniversary?.title || '还没有记录'}
                </p>
                {nearestAnniversary ? (
                  <div className="mt-auto flex items-end justify-between gap-2 pt-4">
                    <div>
                      <p className="text-[10px] font-bold text-gray-400">
                        {nearestAnniversary.date}
                      </p>
                      <p className="mt-0.5 text-xs font-bold text-gray-500">
                        快到啦
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xl font-black leading-none text-purple-500">
                        {anniversaryDaysLeft}
                      </span>
                      <span className="ml-1 text-xs font-black text-purple-300">
                        天
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-auto pt-4">
                    <p className="text-xs font-bold leading-relaxed text-gray-400">
                      记录相识、生日、第一次约会这些值得记住的日子
                    </p>
                  </div>
                )}
              </div>
              <div className="absolute top-0 right-0 w-12 h-12 bg-purple-200/20 rounded-bl-full group-hover:scale-110 transition-transform" />
            </button>

            <button
              onClick={() => onNavigate('todo')}
              className="min-h-[150px] bg-pink-500/10 backdrop-blur-sm p-4 rounded-[24px] border border-white/50 text-left relative overflow-hidden group shadow-sm"
            >
              <div className="relative z-10 flex h-full flex-col">
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="p-2 bg-pink-100 rounded-xl">
                    <Star
                      size={16}
                      className="text-pink-500"
                    />
                  </div>
                  <span className="rounded-full bg-white/60 px-2 py-1 text-[9px] font-black text-pink-500">
                    {completedTodoCount}/{todoGoalTotal}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-pink-600 uppercase tracking-wider">
                  100 件恋爱小事
                </span>
                <p className="mt-1 line-clamp-1 text-sm font-black text-gray-800">
                  {nextTodo
                    ? nextTodo.title
                    : todos.length > 0
                      ? '今天全部完成啦'
                      : '添加第一个小愿望'}
                </p>
                <div className="mt-auto pt-4">
                  <div className="mb-2 flex items-center justify-between text-[10px] font-black">
                    <span className="text-gray-400">
                      {pendingTodos.length > 0
                        ? `待完成 ${pendingTodos.length} 个`
                        : '没有待完成'}
                    </span>
                    <span className="text-pink-500">{todoProgress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-pink-200/50">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${todoProgress}%` }}
                      className="h-full rounded-full bg-gradient-to-r from-pink-400 to-purple-400"
                    />
                  </div>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-12 h-12 bg-pink-200/20 rounded-bl-full group-hover:scale-110 transition-transform" />
            </button>
          </div>

          {/* Daily Love Checklist */}
          <section className="mb-6">
            <div className="flex items-end justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
                  今日恋爱清单
                  <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-black text-pink-600">
                    {completedLoveTasks}/{dailyLoveTasks.length}
                  </span>
                </h2>
                <p className="mt-1 text-[10px] font-bold text-gray-400">
                  不是普通待办，是今天可以一起完成的小互动
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="打开通知"
                  onClick={handleNotifOpen}
                  className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-gray-100 bg-white text-gray-500 shadow-sm hover:bg-gray-50 transition-colors"
                >
                  <Bell size={16} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4.5 w-4.5 min-w-[18px] items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-white px-1">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => onNavigate('todo')}
                  className="flex min-h-10 shrink-0 items-center gap-1 rounded-full bg-white/70 px-3 text-[10px] font-bold uppercase tracking-widest text-pink-500"
                >
                  愿望库 <ChevronRight size={12} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {dailyLoveTasks.map((task, index) => {
                const Icon = task.icon
                return (
                  <motion.button
                    key={task.id}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.04 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={task.onClick}
                    className="min-h-[132px] rounded-3xl border border-white/60 bg-white/65 p-3 text-left shadow-sm backdrop-blur-sm transition-colors hover:bg-white/80"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${task.color}`}
                      >
                        <Icon size={19} />
                      </div>
                      {task.done && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[8px] font-black text-emerald-600">
                          DONE
                        </span>
                      )}
                    </div>
                    <p className="mt-3 truncate text-sm font-black text-gray-800">
                      {task.title}
                    </p>
                    <p className="mt-1 line-clamp-2 min-h-[30px] text-[10px] font-bold leading-relaxed text-gray-400">
                      {task.description}
                    </p>
                    <span
                      className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black ${task.done ? 'bg-gray-100 text-gray-500' : 'bg-accent text-on-accent'}`}
                    >
                      {task.actionLabel}
                      <ChevronRight size={12} />
                    </span>
                  </motion.button>
                )
              })}
            </div>
          </section>

          {/* Daily Rating Section */}
          <section
            id="daily-rating"
            className="mb-10 scroll-mt-6"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 border border-white shadow-sm overflow-hidden"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                    <Sparkles
                      size={16}
                      className="text-amber-500"
                    />
                  </div>
                  <h3 className="text-sm font-black text-gray-800">
                    今日情侣评分
                  </h3>
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  {new Date().toLocaleDateString()}
                </span>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-pink-50/50 rounded-2xl border border-pink-100/30">
                  <p className="text-xs text-pink-600 font-bold text-center">
                    {myRating
                      ? '想改一下今天的幸福指数吗？'
                      : '今天我们的幸福指数是多少？'}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 py-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <motion.button
                      key={star}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setRatingScore(star)}
                      disabled={submitting}
                      className={`p-2 rounded-xl transition-all disabled:opacity-60 ${ratingScore >= star ? 'text-pink-500' : 'text-gray-200 hover:text-pink-200'}`}
                    >
                      <Heart
                        size={32}
                        className={
                          ratingScore >= star
                            ? 'fill-current'
                            : 'stroke-current'
                        }
                      />
                    </motion.button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ratingNote}
                    onChange={(e) => setRatingNote(e.target.value)}
                    placeholder="留下一句今日密语..."
                    disabled={submitting}
                    className="flex-1 bg-white/80 border border-gray-100 rounded-xl px-4 py-2 text-xs font-bold text-gray-600 placeholder:text-gray-300 focus:ring-2 focus:ring-pink-100 focus:border-transparent outline-none transition-all disabled:opacity-60"
                  />
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleRatingSubmit}
                    disabled={ratingScore === 0 || submitting}
                    className="min-w-12 p-3 bg-accent text-on-accent rounded-xl shadow-lg shadow-accent disabled:opacity-50 flex items-center justify-center"
                    title={myRating ? '更新今日评分' : '提交今日评分'}
                  >
                    {submitting ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <Send size={16} />
                    )}
                  </motion.button>
                </div>

                {orderedRatings.length > 0 && (
                  <div className="space-y-3 pt-1">
                    {orderedRatings.map((rating) => {
                      const isMine = rating.userId === user.id
                      return (
                        <div
                          key={rating.id}
                          className={`flex items-center gap-3 p-4 rounded-2xl border-2 ${isMine ? 'bg-pink-100/20 border-pink-100/30' : 'bg-indigo-100/10 border-indigo-100/20'}`}
                        >
                          <div
                            className={`w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm ${isMine ? 'text-pink-500' : 'text-indigo-500'}`}
                          >
                            <Star
                              size={24}
                              className="fill-current"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-gray-700">
                                {isMine ? '我的评分' : 'TA 的评分'}
                              </span>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((s) => (
                                  <Heart
                                    key={s}
                                    size={14}
                                    className={
                                      s <= rating.score
                                        ? isMine
                                          ? 'text-pink-500 fill-pink-500'
                                          : 'text-indigo-400 fill-indigo-400'
                                        : 'text-gray-200'
                                    }
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="mt-1.5 relative">
                              <div className="absolute -left-2 top-0 text-gray-200 font-serif text-2xl opacity-50">
                                “
                              </div>
                              <p className="text-[11px] text-gray-500 font-bold pl-2 pr-2 italic">
                                {rating.note || '今天也是超级爱你的一天～'}
                              </p>
                              <div className="absolute -right-1 bottom-0 text-gray-200 font-serif text-2xl opacity-50">
                                ”
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {!partnerRating && myRating && (
                  <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/30">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2 animate-pulse">
                      <Heart
                        size={16}
                        className="text-gray-300"
                      />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] italic">
                      等待 TA 的心动回应
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </section>
        </div>
      </div>

      {/* Notification Panel */}
      {notifOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="bg-white w-full max-w-md rounded-[40px] p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                <Bell
                  size={18}
                  className="text-accent"
                />{' '}
                通知提醒
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs font-bold text-accent hover:underline"
                  >
                    全部已读
                  </button>
                )}
                <button
                  onClick={() => setNotifOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {notifications.length === 0 ? (
              <div className="py-16 text-center">
                <div className="text-4xl mb-3">🔔</div>
                <p className="text-sm font-bold text-gray-400">暂无通知</p>
                <p className="text-xs text-gray-300 mt-1">
                  纪念日、打卡、待办提醒会出现在这里
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => !notif.read && handleMarkRead(notif.id)}
                    className={`relative rounded-2xl border p-4 transition-all ${
                      notif.read
                        ? 'border-gray-100 bg-gray-50/50'
                        : 'border-accent/20 bg-accent/5 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl shrink-0">
                        {getNotifIcon(notif.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-black ${
                            notif.read ? 'text-gray-500' : 'text-gray-800'
                          }`}
                        >
                          {notif.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                          {notif.message}
                        </p>
                        <p className="text-[10px] text-gray-300 mt-2">
                          {formatNotifTime(notif.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteNotif(notif.id)
                        }}
                        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    {!notif.read && (
                      <span className="absolute top-3 right-3 w-2 h-2 bg-accent rounded-full" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  )
}

function MomentStatusRow({
  person,
  avatar,
  fallbackName,
  emptyText,
  editable,
  onClick,
  tone = 'pink'
}: {
  person?: User | PublicUser | null
  avatar: string
  fallbackName: string
  emptyText: string
  editable?: boolean
  onClick?: () => void
  tone?: 'pink' | 'blue'
}) {
  const config = person?.momentStatus
    ? momentStatusMap[person.momentStatus]
    : null
  const statusText = person?.momentStatusText || config?.fallback || emptyText
  const timeLabel = momentTimeLabel(person?.momentStatusUpdatedAt)
  const ActionIcon = tone === 'blue' ? Star : Heart
  const accent =
    tone === 'blue'
      ? {
          icon: 'bg-blue-500',
          button: 'bg-blue-500 text-white shadow-blue-200',
          text: 'text-blue-500'
        }
      : {
          icon: 'bg-accent',
          button: 'bg-accent text-on-accent shadow-accent',
          text: 'text-pink-500'
        }
  const Wrapper = editable ? 'button' : 'div'
  return (
    <Wrapper
      type={editable ? 'button' : undefined}
      onClick={onClick}
      className={`flex min-h-[62px] min-w-0 items-center gap-3 rounded-[22px] px-1 py-1.5 text-left ${editable ? 'transition-transform active:scale-[0.98]' : ''}`}
    >
      <div className="relative size-12 shrink-0">
        <div className="size-10 overflow-hidden rounded-full border-[3px] border-white shadow-md">
          <AppImage
            src={avatar}
            alt={fallbackName}
            className="size-full object-cover"
            width={80}
            height={80}
            crop="square"
            sizes="40px"
          />
        </div>
        <span
          className={`absolute bottom-0 right-0 flex size-5 items-center justify-center rounded-full border-2 border-white text-white shadow-sm ${accent.icon}`}
        >
          {editable ? (
            <Heart
              size={10}
              className="fill-white"
            />
          ) : (
            <Sparkles size={9} />
          )}
        </span>
      </div>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-black text-gray-800">
            {person?.username || fallbackName}
          </p>
          {timeLabel && (
            <span className="max-w-[56px] shrink-0 truncate text-[9px] font-bold text-gray-300">
              {timeLabel}
            </span>
          )}
        </div>
        <p className="mt-1 truncate text-xs font-bold text-gray-500">
          {statusText}
        </p>
      </div>
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${editable ? `shadow-lg ${accent.button}` : 'bg-gray-100 text-gray-400'}`}
      >
        <ActionIcon
          size={14}
          className={tone === 'pink' ? 'fill-current' : ''}
        />
      </span>
    </Wrapper>
  )
}
