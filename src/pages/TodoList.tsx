import { motion } from 'motion/react'
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  ImagePlus,
  Lightbulb,
  Pencil,
  Plus,
  Sparkles,
  Star,
  Trash2,
  X,
  Heart,
  Compass,
  Gift,
  Home,
  TrendingUp,
  HeartHandshake
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { TodoItem } from '../types'
import { useToast } from '../components/Toast'
import { useConfirm } from '../components/Confirm'
import { aiService, uploadService } from '../services/api'
import { useModalHistory } from '../hooks/useModalHistory'
import { Upload } from '../components/Upload'
import { AppImage } from '../components/AppImage'

const CATEGORIES = ['日常', '旅行', '约会', '纪念', '成长']

const CATEGORY_META: Record<
  string,
  {
    emoji: string
    icon: typeof Home
    colorClass: string
    borderClass: string
    bgClass: string
    textClass: string
  }
> = {
  日常: {
    emoji: '🏠',
    icon: Home,
    colorClass: 'bg-orange-50/70 text-orange-600 border-orange-100/50',
    borderClass: 'border-orange-100',
    bgClass: 'bg-orange-50/50',
    textClass: 'text-orange-600'
  },
  旅行: {
    emoji: '✈️',
    icon: Compass,
    colorClass: 'bg-blue-50/70 text-blue-600 border-blue-100/50',
    borderClass: 'border-blue-100',
    bgClass: 'bg-blue-50/50',
    textClass: 'text-blue-600'
  },
  约会: {
    emoji: '🎡',
    icon: HeartHandshake,
    colorClass: 'bg-pink-50/70 text-pink-600 border-pink-100/50',
    borderClass: 'border-pink-100',
    bgClass: 'bg-pink-50/50',
    textClass: 'text-pink-600'
  },
  纪念: {
    emoji: '🎁',
    icon: Gift,
    colorClass: 'bg-purple-50/70 text-purple-600 border-purple-100/50',
    borderClass: 'border-purple-100',
    bgClass: 'bg-purple-50/50',
    textClass: 'text-purple-600'
  },
  成长: {
    emoji: '🌱',
    icon: TrendingUp,
    colorClass: 'bg-emerald-50/70 text-emerald-600 border-emerald-100/50',
    borderClass: 'border-emerald-100',
    bgClass: 'bg-emerald-50/50',
    textClass: 'text-emerald-600'
  }
}

const getCategoryMeta = (category: string) => {
  return (
    CATEGORY_META[category] || {
      emoji: '✨',
      icon: Sparkles,
      colorClass: 'bg-pink-50/70 text-pink-600 border-pink-100/50',
      borderClass: 'border-pink-100',
      bgClass: 'bg-pink-50/50',
      textClass: 'text-pink-600'
    }
  )
}
const STATUS_FILTERS = [
  { id: 'all', label: '全部' },
  { id: 'active', label: '进行中' },
  { id: 'completed', label: '已完成' },
  { id: 'featured', label: '精选' }
] as const

const TEMPLATE_GROUPS = [
  {
    category: '日常',
    items: [
      '一起做早餐',
      '看一场老电影',
      '深夜散步',
      '交换一天歌单',
      '一起整理房间',
      '给对方写便签'
    ]
  },
  {
    category: '旅行',
    items: [
      '坐一次火车旅行',
      '去海边看日出',
      '去陌生城市住一晚',
      '拍一组旅行合照',
      '一起逛当地夜市',
      '盖一次纪念章'
    ]
  },
  {
    category: '约会',
    items: [
      '去游乐园',
      '一起看电影',
      '吃一次烛光晚餐',
      '去咖啡店待一下午',
      '一起做手工',
      '穿情侣装出门'
    ]
  },
  {
    category: '纪念',
    items: [
      '复刻第一次约会',
      '拍周年照',
      '写一封未来信',
      '做一本回忆相册',
      '交换纪念礼物',
      '记录一段视频告白'
    ]
  },
  {
    category: '成长',
    items: [
      '一起运动7天',
      '学一道新菜',
      '读同一本书',
      '存一笔旅行基金',
      '完成一次断舍离',
      '一起做年度计划'
    ]
  }
]

type TodoDraft = Pick<TodoItem, 'title' | 'category'> &
  Partial<
    Pick<
      TodoItem,
      | 'description'
      | 'targetDate'
      | 'isFeatured'
      | 'sortOrder'
      | 'completedAt'
      | 'memoryNote'
      | 'memoryImages'
    >
  >
type StatusFilter = (typeof STATUS_FILTERS)[number]['id']

const getLocalDateTimeString = (value?: string | Date) => {
  const date = value ? new Date(value) : new Date()
  if (isNaN(date.getTime())) return ''
  const tzOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16)
}

const emptyDraft = (): TodoDraft => ({
  title: '',
  category: '日常',
  description: '',
  targetDate: '',
  isFeatured: false,
  completedAt: '',
  memoryNote: '',
  memoryImages: []
})

const today = () => new Date().toISOString().slice(0, 10)
const displayDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric'
      })
    : ''

const displayDateTime = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (isNaN(date.getTime())) return ''
  const hasTime =
    value.includes('T') &&
    !value.endsWith('T00:00:00') &&
    !value.endsWith('T00:00:00.000Z') &&
    !value.endsWith('T00:00:00.000') &&
    !value.endsWith('T00:00:00Z')
  if (hasTime) {
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    })
  }
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

export default function TodoList({
  data,
  isLoading = false,
  onUpdate,
  onAdd,
  onDelete
}: {
  data: TodoItem[]
  isLoading?: boolean
  onUpdate: (id: string, patch: Partial<TodoItem>) => Promise<void> | void
  onAdd: (todo: TodoDraft) => Promise<void> | void
  onDelete: (id: string) => Promise<void> | void
}) {
  const { showToast } = useToast()
  const confirm = useConfirm()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('全部')
  const [draft, setDraft] = useState<TodoDraft>(emptyDraft)
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editing, setEditing] = useState<TodoItem | null>(null)
  const [selected, setSelected] = useState<TodoItem | null>(null)
  const [completionTodo, setCompletionTodo] = useState<TodoItem | null>(null)
  const [completionDate, setCompletionDate] = useState(() =>
    getLocalDateTimeString()
  )
  const [memoryNote, setMemoryNote] = useState('')
  const [memoryImages, setMemoryImages] = useState<string[]>([])
  const [showTemplate, setShowTemplate] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [aiIdeasOpen, setAiIdeasOpen] = useState(false)
  const [aiIdeasLoading, setAiIdeasLoading] = useState(false)
  const [aiIdeas, setAiIdeas] = useState<string[]>([])

  const completedCount = data.filter((todo) => todo.completed).length
  const featuredCount = data.filter((todo) => todo.isFeatured).length
  const remainingSlots = Math.max(0, 100 - data.length)
  const progress = Math.min(100, (completedCount / 100) * 100)

  const filteredTodos = useMemo(() => {
    return data.filter((todo) => {
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && !todo.completed) ||
        (statusFilter === 'completed' && todo.completed) ||
        (statusFilter === 'featured' && todo.isFeatured)
      const matchesCategory =
        categoryFilter === '全部' || todo.category === categoryFilter
      return matchesStatus && matchesCategory
    })
  }, [categoryFilter, data, statusFilter])

  const openAdd = (template?: TodoDraft) => {
    setEditing(null)
    if (selected) {
      setSelected(null)
      setTimeout(() => {
        setDraft({
          ...emptyDraft(),
          targetDate: getLocalDateTimeString(),
          ...template
        })
        setIsEditorOpen(true)
      }, 100)
    } else {
      setSelected(null)
      setDraft({
        ...emptyDraft(),
        targetDate: getLocalDateTimeString(),
        ...template
      })
      setIsEditorOpen(true)
    }
  }

  const openEdit = (todo: TodoItem) => {
    if (selected) {
      setSelected(null)
      setTimeout(() => {
        setEditing(todo)
        setDraft({
          title: todo.title,
          category: todo.category || '日常',
          description: todo.description || '',
          targetDate: todo.targetDate
            ? getLocalDateTimeString(todo.targetDate)
            : '',
          isFeatured: Boolean(todo.isFeatured),
          sortOrder: todo.sortOrder,
          completedAt: todo.completedAt
            ? getLocalDateTimeString(todo.completedAt)
            : '',
          memoryNote: todo.memoryNote || '',
          memoryImages: todo.memoryImages || []
        })
        setIsEditorOpen(true)
      }, 100)
    } else {
      setEditing(todo)
      setSelected(null)
      setDraft({
        title: todo.title,
        category: todo.category || '日常',
        description: todo.description || '',
        targetDate: todo.targetDate
          ? getLocalDateTimeString(todo.targetDate)
          : '',
        isFeatured: Boolean(todo.isFeatured),
        sortOrder: todo.sortOrder,
        completedAt: todo.completedAt
          ? getLocalDateTimeString(todo.completedAt)
          : '',
        memoryNote: todo.memoryNote || '',
        memoryImages: todo.memoryImages || []
      })
      setIsEditorOpen(true)
    }
  }

  const closeEditor = () => {
    setEditing(null)
    setDraft(emptyDraft())
    setIsEditorOpen(false)
  }

  const closeEditorModal = useModalHistory(
    'todo-editor',
    isEditorOpen,
    closeEditor
  )
  const closeDetailModal = useModalHistory(
    'todo-detail',
    Boolean(selected),
    () => setSelected(null)
  )
  const closeCompletionModal = useModalHistory(
    'todo-completion',
    Boolean(completionTodo),
    () => setCompletionTodo(null)
  )
  const closeTemplateModal = useModalHistory(
    'todo-templates',
    showTemplate,
    () => setShowTemplate(false)
  )
  const closeAiIdeasPanel = useModalHistory('todo-ai-ideas', aiIdeasOpen, () =>
    setAiIdeasOpen(false)
  )

  const submitDraft = async () => {
    if (!draft.title.trim()) {
      showToast('先写下想一起完成的小事', 'error')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await onUpdate(editing.id, draft)
        showToast('小事已更新', 'success')
      } else {
        await onAdd({ ...draft, sortOrder: data.length })
        showToast('小事已加入清单', 'success')
      }
      closeEditor()
    } catch (error) {
      console.error('Save todo failed:', error)
      showToast(
        error instanceof Error ? error.message : '保存失败，请稍后再试',
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  const addTemplate = async (title: string, category: string) => {
    setBusyId(title)
    try {
      await onAdd({
        title,
        category,
        description: '',
        isFeatured: false,
        sortOrder: data.length
      })
      showToast('灵感已加入清单', 'success')
    } catch (error) {
      console.error('Add template todo failed:', error)
      showToast(
        error instanceof Error ? error.message : '添加失败，请稍后再试',
        'error'
      )
    } finally {
      setBusyId(null)
    }
  }

  const generateAiIdeas = async () => {
    setAiIdeasLoading(true)
    setAiIdeas([])
    try {
      const result = await aiService.generate({
        type: 'todo_ideas',
        prompt: '生成 3-5 条适合情侣一起完成的恋爱小事，轻松一点，可当天完成。',
        context: {
          existingTodos: data.slice(0, 20).map((todo) => todo.title),
          remainingSlots
        }
      })
      const ideas = result.content
        .split('\n')
        .map((line) => line.replace(/^\s*[-*\d.、)]+/, '').trim())
        .filter(Boolean)
        .slice(0, 5)
      setAiIdeas(ideas.length ? ideas : [result.content.trim()])
    } catch (error) {
      console.error('Generate todo ideas failed:', error)
      showToast(
        error instanceof Error ? error.message : 'AI 灵感生成失败，请稍后重试',
        'error'
      )
    } finally {
      setAiIdeasLoading(false)
    }
  }

  const startCompletion = (todo: TodoItem) => {
    if (selected) {
      setSelected(null)
      setTimeout(() => {
        setCompletionTodo(todo)
        setCompletionDate(
          todo.completedAt
            ? getLocalDateTimeString(todo.completedAt)
            : getLocalDateTimeString()
        )
        setMemoryNote(todo.memoryNote || '')
        setMemoryImages(todo.memoryImages || [])
      }, 100)
    } else {
      setSelected(null)
      setCompletionTodo(todo)
      setCompletionDate(
        todo.completedAt
          ? getLocalDateTimeString(todo.completedAt)
          : getLocalDateTimeString()
      )
      setMemoryNote(todo.memoryNote || '')
      setMemoryImages(todo.memoryImages || [])
    }
  }

  const uploadMemoryImages = async (files: File | File[] | FileList | null) => {
    if (!files) return
    const filesArray =
      files instanceof FileList
        ? Array.from(files)
        : Array.isArray(files)
          ? files
          : [files]
    if (!filesArray.length) return
    setUploading(true)
    try {
      const urls = await Promise.all(
        filesArray.map((file) => uploadService.upload(file))
      )
      setMemoryImages((prev) => [...prev, ...urls])
      showToast('照片已上传', 'success')
    } catch (error) {
      console.error('Upload memory images failed:', error)
      showToast(
        error instanceof Error ? error.message : '照片上传失败',
        'error'
      )
    } finally {
      setUploading(false)
    }
  }

  const uploadEditorImages = async (files: File | File[] | FileList | null) => {
    if (!files) return
    const filesArray =
      files instanceof FileList
        ? Array.from(files)
        : Array.isArray(files)
          ? files
          : [files]
    if (!filesArray.length) return
    setUploading(true)
    try {
      const urls = await Promise.all(
        filesArray.map((file) => uploadService.upload(file))
      )
      setDraft((prev) => ({
        ...prev,
        memoryImages: [...(prev.memoryImages || []), ...urls]
      }))
      showToast('照片已上传', 'success')
    } catch (error) {
      console.error('Upload editor images failed:', error)
      showToast(
        error instanceof Error ? error.message : '照片上传失败',
        'error'
      )
    } finally {
      setUploading(false)
    }
  }

  const submitCompletion = async () => {
    if (!completionTodo) return
    setBusyId(completionTodo.id)
    try {
      await onUpdate(completionTodo.id, {
        completed: true,
        completedAt: completionDate,
        memoryNote,
        memoryImages
      })
      showToast('这一件完成啦', 'success')
      setCompletionTodo(null)
    } catch (error) {
      console.error('Complete todo failed:', error)
      showToast(
        error instanceof Error ? error.message : '更新失败，请稍后再试',
        'error'
      )
    } finally {
      setBusyId(null)
    }
  }

  const toggleTodo = async (todo: TodoItem) => {
    if (busyId) return
    if (!todo.completed) {
      startCompletion(todo)
      return
    }
    setBusyId(todo.id)
    try {
      await onUpdate(todo.id, { completed: false })
      showToast('已撤销完成', 'success')
    } catch (error) {
      console.error('Toggle todo failed:', error)
      showToast(
        error instanceof Error ? error.message : '更新失败，请稍后再试',
        'error'
      )
    } finally {
      setBusyId(null)
    }
  }

  const deleteTodo = async (todo: TodoItem) => {
    if (busyId) return
    const isConfirmed = await confirm({
      title: '确认删除待办小事',
      message: `你确定要删除待办 "${todo.title}" 吗？此操作无法撤销。`,
      confirmText: '确认删除',
      cancelText: '取消',
      type: 'danger'
    })
    if (!isConfirmed) return

    setBusyId(todo.id)
    try {
      await onDelete(todo.id)
      setSelected(null)
      showToast('小事已删除', 'success')
    } catch (error) {
      console.error('Delete todo failed:', error)
      showToast(
        error instanceof Error ? error.message : '删除失败，请稍后再试',
        'error'
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-[linear-gradient(180deg,#fff7f2_0%,#fffafd_45%,#f8fbff_100%)] lg:h-full">
      <header className="sticky top-0 z-30 shrink-0 bg-[#fff7f2]/95 px-5 pb-3 pt-7 backdrop-blur">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-pink-400">
              Bucket List
            </p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-gray-900">
              100件恋爱小事
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (aiIdeasOpen) closeAiIdeasPanel()
                else setAiIdeasOpen(true)
                if (!aiIdeasOpen && aiIdeas.length === 0) void generateAiIdeas()
              }}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-pink-500 shadow-lg shadow-rose-100/50 ring-1 ring-white/80"
              title="AI 灵感"
            >
              <Sparkles size={20} />
            </button>
            <button
              onClick={() => setShowTemplate(true)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-amber-500 shadow-lg shadow-rose-100/50 ring-1 ring-white/80"
              title="灵感模板"
            >
              <Lightbulb size={20} />
            </button>
            <button
              onClick={() => openAdd()}
              disabled={data.length >= 100}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-500 text-white shadow-lg shadow-pink-100 disabled:opacity-40"
              title="新增小事"
            >
              <Plus size={22} />
            </button>
          </div>
        </div>
      </header>

      <main className="px-5 pb-32 pt-2 lg:flex-1 lg:overflow-y-auto lg:scrollbar-hide">
        <section className="relative overflow-hidden rounded-[28px] border border-white/90 bg-white/90 p-5 shadow-xl shadow-rose-100/35">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                已完成进度
              </p>
              <p className="mt-1 text-3xl font-black text-gray-900 leading-none">
                <span className="text-pink-500">{completedCount}</span>
                <span className="text-base text-gray-300 font-bold">
                  {' '}
                  / 100
                </span>
              </p>
            </div>
            <div className="flex gap-2">
              <Stat
                label="剩余"
                value={remainingSlots}
                type="remaining"
              />
              <Stat
                label="精选"
                value={featuredCount}
                type="featured"
              />
            </div>
          </div>
          <div className="relative mt-5 h-3.5 rounded-full bg-pink-50/50 p-[2px] border border-pink-100/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full rounded-full bg-gradient-to-r from-pink-500 via-amber-400 to-emerald-500 shadow-[0_1px_4px_rgba(244,63,94,0.15)]"
            />
            {/* Sliding Heart Indicator */}
            <motion.div
              initial={{ left: 0 }}
              animate={{ left: `calc(${progress}% - 8px)` }}
              transition={{ type: 'spring', stiffness: 80, damping: 15 }}
              className="absolute -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-rose-500 shadow-md border border-rose-100/70"
            >
              <Heart
                size={12}
                className="fill-rose-500 text-rose-500 animate-pulse"
              />
            </motion.div>
          </div>
        </section>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1.5 scrollbar-hide">
          {STATUS_FILTERS.map((item) => {
            const isActive = statusFilter === item.id
            return (
              <button
                key={item.id}
                onClick={() => setStatusFilter(item.id)}
                className={`flex min-h-10 items-center justify-center gap-1.5 shrink-0 rounded-2xl px-4 text-[11px] font-black transition-all ${
                  isActive
                    ? 'bg-accent text-on-accent shadow-lg shadow-accent/20 scale-[1.02]'
                    : 'bg-white/95 text-gray-500 border border-white/80 hover:bg-white hover:text-gray-700'
                }`}
              >
                {item.id === 'all' && (
                  <Sparkles
                    size={12}
                    className={isActive ? 'text-pink-300' : 'text-pink-400'}
                  />
                )}
                {item.id === 'active' && (
                  <Clock3
                    size={12}
                    className={isActive ? 'text-sky-300' : 'text-sky-400'}
                  />
                )}
                {item.id === 'completed' && (
                  <CheckCircle2
                    size={12}
                    className={
                      isActive ? 'text-emerald-300' : 'text-emerald-400'
                    }
                  />
                )}
                {item.id === 'featured' && (
                  <Star
                    size={12}
                    className={
                      isActive
                        ? 'fill-amber-300 text-amber-300'
                        : 'text-amber-500 fill-amber-400/20'
                    }
                  />
                )}
                {item.label}
              </button>
            )
          })}
        </div>
        <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1.5 scrollbar-hide">
          {['全部', ...CATEGORIES].map((category) => {
            const isSelected = categoryFilter === category
            const meta = category !== '全部' ? getCategoryMeta(category) : null

            let btnStyle = ''
            if (isSelected) {
              if (category === '全部') {
                btnStyle =
                  'bg-pink-500 text-white shadow-md shadow-pink-100 border border-pink-500 scale-[1.02]'
              } else if (meta) {
                btnStyle = `${meta.colorClass} shadow-md border ${meta.borderClass} scale-[1.02]`
              }
            } else {
              btnStyle =
                'bg-white/95 text-gray-500 border border-white/80 hover:bg-white hover:text-gray-700'
            }

            return (
              <button
                key={category}
                onClick={() => setCategoryFilter(category)}
                className={`flex min-h-10 items-center justify-center gap-1.5 shrink-0 rounded-2xl px-4 text-[11px] font-black transition-all ${btnStyle}`}
              >
                {category === '全部' ? (
                  <Heart
                    size={12}
                    className={
                      isSelected ? 'fill-white text-white' : 'text-pink-400'
                    }
                  />
                ) : meta ? (
                  <meta.icon
                    size={12}
                    className={isSelected ? meta.textClass : 'text-gray-400'}
                  />
                ) : null}
                {category}
              </button>
            )
          })}
        </div>

        {aiIdeasOpen && (
          <section className="mb-4 mt-3 rounded-[26px] border border-pink-100 bg-gradient-to-br from-pink-50/60 to-rose-50/30 p-4.5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-pink-400">
                  AI Ideas
                </p>
                <h2 className="text-sm font-black text-gray-900">
                  恋爱小事灵感
                </h2>
              </div>
              <button
                type="button"
                onClick={generateAiIdeas}
                disabled={aiIdeasLoading}
                className="rounded-2xl bg-accent px-3 py-2 text-[10px] font-black text-on-accent hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {aiIdeasLoading ? '生成中...' : '换一组'}
              </button>
            </div>
            {aiIdeasLoading && (
              <p className="rounded-2xl bg-white/80 p-3 text-xs font-bold text-pink-500 border border-pink-100/50">
                AI 正在想几个甜甜的小任务...
              </p>
            )}
            {!aiIdeasLoading && aiIdeas.length > 0 && (
              <div className="space-y-2">
                {aiIdeas.map((idea) => (
                  <div
                    key={idea}
                    className="flex items-center gap-2 rounded-2xl bg-white/70 border border-pink-100/30 p-2 pl-3"
                  >
                    <p className="min-w-0 flex-1 truncate text-xs font-bold text-gray-700">
                      {idea}
                    </p>
                    <button
                      type="button"
                      onClick={() => addTemplate(idea, '约会')}
                      disabled={busyId === idea}
                      className="shrink-0 rounded-xl bg-pink-500 hover:bg-pink-600 transition-colors px-3.5 py-2 text-[10px] font-black text-white disabled:opacity-50"
                    >
                      采用
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
        {isLoading && filteredTodos.length === 0 && (
          <EmptyState
            title="正在加载小事"
            note="把清单铺开，马上就好。"
            loading
          />
        )}
        {!isLoading && filteredTodos.length === 0 && (
          <EmptyState
            title="这里还没有小事"
            note="从灵感模板里挑一个，或写下你们自己的约定。"
          />
        )}

        <div className="space-y-3">
          {filteredTodos.map((todo, index) => {
            const absoluteIndex =
              data.findIndex((item) => item.id === todo.id) + 1
            const absoluteIndexStr = String(absoluteIndex).padStart(2, '0')
            const meta = getCategoryMeta(todo.category)
            const CategoryIcon = meta.icon

            return (
              <motion.article
                key={todo.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.035, 0.3) }}
                onClick={() => setSelected(todo)}
                className={`group relative overflow-hidden rounded-[24px] border p-4.5 shadow-sm transition-all hover:shadow-[0_8px_30px_rgba(244,63,94,0.06)] hover:-translate-y-0.5 duration-300 ${
                  todo.completed
                    ? 'border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-teal-50/40'
                    : todo.isFeatured
                      ? 'border-amber-100 bg-gradient-to-br from-amber-50/40 via-white to-amber-50/10'
                      : 'border-rose-100/40 bg-white/95 backdrop-blur-sm hover:border-pink-200/60'
                }`}
              >
                {/* Milestone Number Badge */}
                <div className="absolute right-4 top-4 font-mono text-[10px] font-black tracking-wider text-pink-200/80 transition-colors group-hover:text-pink-300/80">
                  No.{absoluteIndexStr}
                </div>

                <div className="flex items-start gap-3.5">
                  {/* Heart Checkbox Button */}
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      toggleTodo(todo)
                    }}
                    disabled={busyId === todo.id}
                    className={`group/btn mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border-2 transition-all duration-300 ${
                      todo.completed
                        ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-100'
                        : 'border-pink-100 bg-white text-transparent hover:border-pink-300 hover:bg-pink-50/30'
                    }`}
                    title={todo.completed ? '撤销完成' : '勾选完成'}
                  >
                    {busyId === todo.id ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                    ) : todo.completed ? (
                      <Heart
                        size={18}
                        className="fill-white stroke-[2.5] stroke-white animate-pulse"
                      />
                    ) : (
                      <Heart
                        size={18}
                        className="stroke-[2.5] text-pink-300 transition-all group-hover/btn:scale-110 group-hover/btn:text-pink-500 group-hover/btn:fill-pink-500/20"
                      />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 pr-14">
                      {todo.isFeatured && (
                        <Star
                          size={13}
                          className="fill-amber-400 text-amber-400 shrink-0"
                        />
                      )}
                      <h3
                        className={`text-sm font-black transition-all ${
                          todo.completed
                            ? 'text-emerald-800/80 line-through decoration-emerald-300/80'
                            : 'text-gray-900'
                        }`}
                      >
                        {todo.title}
                      </h3>
                    </div>

                    {/* Metadata tags */}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-black">
                      <span
                        className={`flex items-center gap-1 rounded-full border px-2 py-0.5 ${meta.colorClass}`}
                      >
                        <CategoryIcon size={10} />
                        {todo.category}
                      </span>
                      {todo.targetDate && (
                        <span className="flex items-center gap-1 rounded-full bg-white/60 border border-gray-100 text-gray-400 px-2 py-0.5">
                          <CalendarDays size={10} />
                          {displayDateTime(todo.targetDate)}
                        </span>
                      )}
                      {todo.completedAt && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-50/80 border border-emerald-100/50 text-emerald-600 px-2 py-0.5">
                          <CheckCircle2 size={10} />
                          {displayDateTime(todo.completedAt)}
                        </span>
                      )}
                    </div>

                    {todo.description && (
                      <p className="mt-2 line-clamp-2 text-xs font-bold leading-relaxed text-gray-500 pl-1 border-l border-gray-100">
                        {todo.description}
                      </p>
                    )}
                  </div>

                  {/* Clean Subtle Delete Button */}
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      deleteTodo(todo)
                    }}
                    disabled={busyId === todo.id}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-gray-300 opacity-40 group-hover:opacity-100 transition-all duration-200 hover:bg-rose-50 hover:text-rose-500"
                    title="删除"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                {/* Memory note (if completed) */}
                {todo.completed && todo.memoryNote && (
                  <div className="mt-3 rounded-2xl bg-amber-50/30 p-3 border-l-2 border-amber-300 text-xs font-bold leading-relaxed text-gray-600">
                    <span className="mr-1 text-[11px] text-amber-500 select-none">
                      ✍️
                    </span>
                    <span className="font-serif italic">{todo.memoryNote}</span>
                  </div>
                )}

                {/* Memory photos (Polaroid style) */}
                {!!todo.memoryImages?.length && (
                  <div className="mt-3.5 flex flex-wrap gap-3 pl-1">
                    {todo.memoryImages.slice(0, 3).map((src, imgIdx) => {
                      const rotations = ['-rotate-2', 'rotate-1', '-rotate-1']
                      const rotClass = rotations[imgIdx % rotations.length]
                      return (
                        <div
                          key={src}
                          className={`inline-block bg-white p-1.5 pb-4 rounded-xs shadow-md border border-gray-100/50 ${rotClass} hover:rotate-0 hover:scale-105 transition-all duration-300`}
                        >
                          <AppImage
                            src={src}
                            alt=""
                            className="h-16 w-16 rounded-xs object-cover"
                            width={128}
                            height={128}
                            crop="square"
                            sizes="64px"
                          />
                        </div>
                      )
                    })}
                    {todo.memoryImages.length > 3 && (
                      <div className="flex h-22 items-center justify-center rounded-2xl bg-white/60 border border-gray-100 text-xs font-black text-gray-400 px-4">
                        +{todo.memoryImages.length - 3} 张回忆
                      </div>
                    )}
                  </div>
                )}
              </motion.article>
            )
          })}
        </div>
      </main>

      {isEditorOpen && (
        <TodoEditor
          draft={draft}
          setDraft={setDraft}
          editing={editing}
          saving={saving}
          uploading={uploading}
          onUpload={uploadEditorImages}
          onClose={closeEditorModal}
          onSubmit={submitDraft}
        />
      )}

      {selected && (
        <DetailModal
          todo={selected}
          busy={busyId === selected.id}
          onClose={closeDetailModal}
          onEdit={() => openEdit(selected)}
          onComplete={() => startCompletion(selected)}
          onToggle={() => toggleTodo(selected)}
          onDelete={() => deleteTodo(selected)}
        />
      )}

      {completionTodo && (
        <CompletionModal
          todo={completionTodo}
          date={completionDate}
          setDate={setCompletionDate}
          note={memoryNote}
          setNote={setMemoryNote}
          images={memoryImages}
          setImages={setMemoryImages}
          uploading={uploading}
          saving={busyId === completionTodo.id}
          onUpload={uploadMemoryImages}
          onClose={closeCompletionModal}
          onSubmit={submitCompletion}
        />
      )}

      {showTemplate && (
        <TemplateDrawer
          onClose={closeTemplateModal}
          onAdd={addTemplate}
          busyId={busyId}
        />
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  type
}: {
  label: string
  value: number
  type: 'remaining' | 'featured'
}) {
  const isFeatured = type === 'featured'
  return (
    <div
      className={`rounded-2xl p-2 px-3 transition-all text-left flex items-center gap-2 ${
        isFeatured
          ? 'bg-amber-50/60 border border-amber-100/50 text-amber-900'
          : 'bg-rose-50/60 border border-rose-100/50 text-rose-900'
      }`}
    >
      <div
        className={`p-1.5 rounded-xl ${isFeatured ? 'bg-amber-100/80 text-amber-500' : 'bg-rose-100/80 text-rose-500'}`}
      >
        {isFeatured ? (
          <Star
            size={12}
            className="fill-amber-500"
          />
        ) : (
          <Clock3 size={12} />
        )}
      </div>
      <div>
        <p className="text-[9px] font-black uppercase tracking-wider text-gray-400 leading-none">
          {label}
        </p>
        <p className="text-base font-black leading-none mt-1">{value}</p>
      </div>
    </div>
  )
}

function EmptyState({
  title,
  note,
  loading = false
}: {
  title: string
  note: string
  loading?: boolean
}) {
  return (
    <div className="mt-6 flex h-64 flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-pink-100 bg-white/50 backdrop-blur-xs px-8 text-center transition-all duration-300">
      <div
        className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 text-pink-400 shadow-sm ${loading ? 'animate-pulse' : ''}`}
      >
        {loading ? (
          <Sparkles
            size={24}
            className="animate-spin text-pink-400"
          />
        ) : (
          <Heart
            size={24}
            className="fill-pink-300 text-pink-400"
          />
        )}
      </div>
      <p className="text-sm font-black text-gray-700">{title}</p>
      <p className="mt-2 max-w-xs text-xs font-bold leading-relaxed text-gray-400">
        {note}
      </p>
    </div>
  )
}

function TodoEditor({
  draft,
  setDraft,
  editing,
  saving,
  uploading,
  onUpload,
  onClose,
  onSubmit
}: {
  draft: TodoDraft
  setDraft: (draft: TodoDraft) => void
  editing: TodoItem | null
  saving: boolean
  uploading: boolean
  onUpload: (files: File | File[] | FileList | null) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <ModalFrame onClose={onClose}>
      <h2 className="text-xl font-black text-gray-900">
        {editing ? '编辑小事' : '新增小事'}
      </h2>
      <div className="mt-5 max-h-[70vh] space-y-3 overflow-y-auto p-1.5 scrollbar-hide">
        <input
          value={draft.title}
          onChange={(event) =>
            setDraft({ ...draft, title: event.target.value })
          }
          placeholder="想一起完成的事"
          className="field"
          autoFocus
        />
        <textarea
          value={draft.description || ''}
          onChange={(event) =>
            setDraft({ ...draft, description: event.target.value })
          }
          placeholder="写一点小提示、地点或约定"
          className="field min-h-20 resize-none"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <select
            value={draft.category}
            onChange={(event) =>
              setDraft({ ...draft, category: event.target.value })
            }
            className="field"
          >
            {CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
          <input
            type="datetime-local"
            value={draft.targetDate || ''}
            onChange={(event) =>
              setDraft({ ...draft, targetDate: event.target.value })
            }
            className="field"
          />
        </div>
        <button
          onClick={() => setDraft({ ...draft, isFeatured: !draft.isFeatured })}
          className={`flex w-full items-center justify-between rounded-2xl border p-4 text-sm font-black ${
            draft.isFeatured
              ? 'border-amber-200 bg-amber-50 text-amber-600'
              : 'border-gray-100 bg-gray-50 text-gray-500'
          }`}
        >
          <span className="flex items-center gap-2">
            <Star
              size={17}
              className={draft.isFeatured ? 'fill-amber-400' : ''}
            />{' '}
            标记为精选
          </span>
          <span>{draft.isFeatured ? '已开启' : '未开启'}</span>
        </button>

        {/* Completion Fields Edit Area */}
        {editing?.completed && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest text-left">
              完成回忆编辑
            </h3>
            <div className="text-left">
              <label className="block text-[10px] font-black text-gray-400 mb-1">
                完成时间
              </label>
              <input
                type="datetime-local"
                value={draft.completedAt || ''}
                onChange={(event) =>
                  setDraft({ ...draft, completedAt: event.target.value })
                }
                className="field"
              />
            </div>
            <div className="text-left">
              <label className="block text-[10px] font-black text-gray-400 mb-1">
                回忆感悟
              </label>
              <textarea
                value={draft.memoryNote || ''}
                onChange={(event) =>
                  setDraft({ ...draft, memoryNote: event.target.value })
                }
                placeholder="这一刻有什么想记住的？"
                className="field min-h-20 resize-none"
              />
            </div>
            <div className="text-left">
              <label className="block text-[10px] font-black text-gray-400 mb-1">
                回忆照片
              </label>
              <Upload
                multiple
                value={draft.memoryImages || []}
                onChange={(urls) => setDraft({ ...draft, memoryImages: urls })}
                onFileSelect={(files) => {
                  if (files) {
                    onUpload(files)
                  }
                }}
                autoUpload={false}
                uploading={uploading}
                placeholder="添加照片"
              />
            </div>
          </div>
        )}

        <button
          onClick={onSubmit}
          disabled={!draft.title.trim() || saving}
          className="w-full rounded-2xl bg-pink-500 py-4 text-sm font-black text-white shadow-lg shadow-pink-100 disabled:opacity-40"
        >
          {saving ? '保存中...' : editing ? '保存修改' : '加入清单'}
        </button>
      </div>
    </ModalFrame>
  )
}

function DetailModal({
  todo,
  busy,
  onClose,
  onEdit,
  onComplete,
  onToggle,
  onDelete
}: {
  todo: TodoItem
  busy: boolean
  onClose: () => void
  onEdit: () => void
  onComplete: () => void
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <ModalFrame onClose={onClose}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-pink-400">
            {todo.category}
          </p>
          <h2 className="mt-1 text-xl font-black text-gray-900">
            {todo.title}
          </h2>
        </div>
        {todo.isFeatured && (
          <Star
            size={20}
            className="fill-amber-400 text-amber-400"
          />
        )}
      </div>
      {todo.description && (
        <p className="mt-4 rounded-2xl bg-gray-50 p-4 text-sm font-bold leading-relaxed text-gray-600 text-left">
          {todo.description}
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-black text-gray-500">
        <Info
          icon={<CalendarDays size={15} />}
          label="计划"
          value={todo.targetDate ? displayDateTime(todo.targetDate) : '未设置'}
        />
        <Info
          icon={<Clock3 size={15} />}
          label="状态"
          value={todo.completed ? '已完成' : '进行中'}
        />
      </div>
      {todo.completed && (
        <section className="mt-4 rounded-[24px] bg-emerald-50 p-4 max-h-48 overflow-y-auto scrollbar-hide text-left">
          <p className="text-xs font-black text-emerald-700">
            完成回忆{' '}
            {todo.completedAt ? ` · ${displayDateTime(todo.completedAt)}` : ''}
          </p>
          <p className="mt-2 text-sm font-bold leading-relaxed text-emerald-900/75">
            {todo.memoryNote || '这件小事已经被你们一起完成。'}
          </p>
          {!!todo.memoryImages?.length && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {todo.memoryImages.map((src) => (
                <AppImage
                  key={src}
                  src={src}
                  alt=""
                  className="aspect-square rounded-2xl object-cover"
                  width={240}
                  height={240}
                  crop="square"
                  sizes="33vw"
                />
              ))}
            </div>
          )}
        </section>
      )}
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={onEdit}
          className="rounded-2xl bg-gray-100 py-3 text-xs font-black text-gray-600"
        >
          <Pencil
            size={15}
            className="mr-1 inline"
          />
          编辑
        </button>
        <button
          onClick={todo.completed ? onToggle : onComplete}
          disabled={busy}
          className="rounded-2xl bg-pink-500 py-3 text-xs font-black text-white disabled:opacity-40"
        >
          {todo.completed ? '撤销完成' : '记录完成'}
        </button>
      </div>
      <button
        onClick={onDelete}
        disabled={busy}
        className="mt-3 w-full rounded-2xl bg-rose-50 py-3 text-xs font-black text-rose-500 disabled:opacity-40"
      >
        删除这件小事
      </button>
    </ModalFrame>
  )
}

function CompletionModal({
  todo,
  date,
  setDate,
  note,
  setNote,
  images,
  setImages,
  uploading,
  saving,
  onUpload,
  onClose,
  onSubmit
}: {
  todo: TodoItem
  date: string
  setDate: (value: string) => void
  note: string
  setNote: (value: string) => void
  images: string[]
  setImages: (value: string[]) => void
  uploading: boolean
  saving: boolean
  onUpload: (files: File | File[] | FileList | null) => void
  onClose: () => void
  onSubmit: () => void
}) {
  return (
    <ModalFrame onClose={onClose}>
      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
        完成回忆
      </p>
      <h2 className="mt-1 text-xl font-black text-gray-900">{todo.title}</h2>
      <div className="mt-5 space-y-3">
        <input
          type="datetime-local"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="field"
        />
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="这一刻有什么想记住的？"
          className="field min-h-24 resize-none"
        />
        <Upload
          multiple
          value={images}
          onChange={setImages}
          onFileSelect={(files) => {
            if (files) {
              onUpload(files)
            }
          }}
          autoUpload={false}
          uploading={uploading}
          placeholder="添加完成照片"
        />
        <button
          onClick={onSubmit}
          disabled={saving || uploading}
          className="w-full rounded-2xl bg-emerald-500 py-4 text-sm font-black text-white shadow-lg shadow-emerald-100 disabled:opacity-40"
        >
          {saving ? '记录中...' : '保存完成回忆'}
        </button>
      </div>
    </ModalFrame>
  )
}

function TemplateDrawer({
  onClose,
  onAdd,
  busyId
}: {
  onClose: () => void
  onAdd: (title: string, category: string) => void
  busyId: string | null
}) {
  return (
    <ModalFrame
      onClose={onClose}
      wide
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">
            Ideas
          </p>
          <h2 className="mt-1 text-xl font-black text-gray-900">灵感模板</h2>
        </div>
        <Lightbulb className="text-amber-400" />
      </div>
      <div className="mt-5 max-h-[62vh] space-y-5 overflow-y-auto p-1.5 scrollbar-hide">
        {TEMPLATE_GROUPS.map((group) => (
          <section key={group.category}>
            <h3 className="mb-2 text-xs font-black text-gray-500">
              {group.category}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {group.items.map((item) => (
                <button
                  key={item}
                  onClick={() => onAdd(item, group.category)}
                  disabled={busyId === item}
                  className="rounded-2xl bg-gray-50 p-3 text-left text-xs font-black leading-relaxed text-gray-700 ring-1 ring-gray-100 transition-all hover:bg-pink-50 hover:text-pink-600 disabled:opacity-40"
                >
                  {busyId === item ? '加入中...' : item}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </ModalFrame>
  )
}

function Info({
  icon,
  label,
  value
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-gray-50 p-3">
      <span className="text-pink-400">{icon}</span>
      <span>
        <span className="text-gray-400">{label}</span> · {value}
      </span>
    </div>
  )
}

function ModalFrame({
  children,
  onClose,
  wide = false
}: {
  children: ReactNode
  onClose: () => void
  wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-gray-950/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`relative max-h-[88vh] w-full ${wide ? 'max-w-md' : 'max-w-sm'} overflow-hidden rounded-[32px] bg-white p-6 shadow-2xl`}
      >
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-2xl bg-gray-50 text-gray-400"
        >
          <X size={18} />
        </button>
        {children}
      </motion.div>
    </div>
  )
}
