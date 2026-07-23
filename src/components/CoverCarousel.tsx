import { motion, AnimatePresence } from 'motion/react'
import { useState, useEffect } from 'react'
import {
  Heart,
  Image as ImageIcon,
  Plus,
  Check,
  X,
  Camera,
  Edit3
} from 'lucide-react'
import { buildImageUrl } from '../lib/imageUrl'
import { coupleService } from '../services/api'
import { useToast } from '../components/Toast'
import { useModalHistory } from '../hooks/useModalHistory'

export interface CoverCandidate {
  id: string
  src: string
  title: string
  date: string
}

function CoverCarousel({
  initialImages,
  onUpdateCouple
}: {
  initialImages?: string[] | null
  onUpdateCouple: (couple: { coverCarousel?: string[] }) => void
}) {
  const { showToast } = useToast()

  const images =
    initialImages && initialImages.length > 0 ? initialImages : undefined
  const [current, setCurrent] = useState(0)
  const [editOpen, setEditOpen] = useState(false)

  // Auto rotate
  useEffect(() => {
    if (!images || images.length <= 1) return
    const timer = setInterval(() => {
      setCurrent((i) => (i + 1) % images.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [images])

  if (!images) {
    return <EmptyCover onSelect={onUpdateCouple} />
  }

  // 用 buildImageUrl 解析每个图片路径
  const resolvedUrls = images.map((src) => buildImageUrl(src))

  return (
    <>
      <div className="absolute inset-0">
        {resolvedUrls.map((url, index) => (
          <motion.img
            key={images[index] + index}
            src={url}
            alt="Cover"
            className="absolute inset-0 h-full w-full object-cover"
            animate={{
              opacity: index === current ? 1 : 0,
              transform: index === current ? 'scale(1.02)' : 'scale(1.08)'
            }}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
            draggable="false"
            loading="lazy"
          />
        ))}
        {/* 渐变色压暗底部，保证文字可读 */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-950/35 to-transparent" />
        {/* 指示器 */}
        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 z-10 flex gap-1.5 -translate-x-1/2">
            {images.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === current ? 'w-5 bg-white' : 'w-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* 编辑按钮（有图时也允许修改） */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setEditOpen(true)}
        className="absolute right-3 bottom-3 z-10 flex items-center gap-1.5 rounded-full bg-black/40 backdrop-blur-sm px-3.5 py-2 text-[11px] font-black text-white shadow-lg transition-all hover:scale-105 active:scale-95"
        title="修改封面图"
      >
        <Edit3 size={13} />
        <span className="hidden sm:inline">修改</span>
      </motion.button>

      <PickerModal
        open={editOpen}
        currentImages={images}
        onToggleOpen={() => setEditOpen(false)}
        onSave={(chosen) => {
          onUpdateCouple({ coverCarousel: chosen })
          showToast(`已更新 ${chosen.length} 张封面轮播图`, 'success')
        }}
      />
    </>
  )
}

/** 无封面时的友好提示 + 选择弹窗 */
function EmptyCover({
  onSelect
}: {
  onSelect: (couple: { coverCarousel?: string[] }) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-pink-100 via-rose-50 to-amber-100">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center gap-2 text-pink-300"
        >
          <Heart
            size={28}
            className="fill-pink-200"
          />
          <p className="text-xs font-black tracking-[0.2em] uppercase text-pink-300">
            还没有封面哦
          </p>
        </motion.div>
      </div>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen(true)}
        className="absolute right-3 bottom-3 z-10 flex items-center gap-1.5 rounded-full bg-white px-3.5 py-2 text-[11px] font-black text-pink-500 shadow-lg shadow-gray-900/10 transition-all hover:scale-105 active:scale-95"
        title="从相册中选择封面"
      >
        <Plus size={13} />
        <span className="hidden sm:inline">选封面</span>
      </motion.button>

      <PickerModal
        open={open}
        currentImages={undefined}
        onToggleOpen={() => setOpen(false)}
        onSave={(chosen) => {
          onSelect({ coverCarousel: chosen })
        }}
      />
    </>
  )
}

/** 图片选择弹窗（无图 / 有图复用同一组件） */
function PickerModal({
  open,
  currentImages,
  onToggleOpen,
  onSave
}: {
  open: boolean
  currentImages?: string[] | null
  onToggleOpen: () => void
  onSave: (chosen: string[]) => void
}) {
  const [saving, setSaving] = useState(false)
  const [candidates, setCandidates] = useState<CoverCandidate[]>([])
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const closePicker = useModalHistory('cover-picker', open, onToggleOpen)
  const { showToast } = useToast()

  useEffect(() => {
    if (!open) return
    setLoading(true)
    coupleService
      .getCoverCandidates()
      .then((data) => {
        setCandidates(data)
        // 回填当前已选的
        const currentSet = new Set(currentImages || [])
        const next: Record<string, boolean> = {}
        data.forEach((c) => {
          if (currentSet.has(c.src)) next[c.id] = true
        })
        setSelectedIds(next)
      })
      .catch((err) => {
        console.error(err)
        showToast('加载相册图片失败', 'error')
      })
      .finally(() => setLoading(false))
  }, [open])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = { ...prev }
      const count = Object.keys(next).filter((k) => next[k]).length
      if (next[id]) {
        delete next[id]
      } else if (count >= 10) {
        showToast('最多选择 10 张图片', 'error')
        return prev
      } else {
        next[id] = true
      }
      return next
    })
  }

  const handleSave = async () => {
    const chosen = candidates.filter((c) => selectedIds[c.id]).map((c) => c.src)
    if (chosen.length === 0) {
      showToast('请至少选择一张图片', 'error')
      return
    }
    setSaving(true)
    try {
      await coupleService.updateCoverCarousel(chosen)
      onSave(chosen)
      onToggleOpen()
    } catch (err) {
      console.error(err)
      showToast('保存失败，请稍后重试', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <PickerContent
          loading={loading}
          candidates={candidates}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
          saving={saving}
          handleSave={handleSave}
          closePicker={closePicker}
        />
      )}
    </AnimatePresence>
  )
}

/** 选择弹窗的实际内容 */
function PickerContent({
  loading,
  candidates,
  selectedIds,
  toggleSelect,
  saving,
  handleSave,
  closePicker
}: {
  loading: boolean
  candidates: CoverCandidate[]
  selectedIds: Record<string, boolean>
  toggleSelect: (id: string) => void
  saving: boolean
  handleSave: () => void
  closePicker: () => void
}) {
  const selectedCount = Object.keys(selectedIds).filter(
    (k) => selectedIds[k]
  ).length

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-white w-full max-w-sm rounded-[40px] p-6 shadow-2xl max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
            <Camera
              size={18}
              className="text-pink-500"
            />
            选择封面图
          </h3>
          <button
            onClick={closePicker}
            className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-[11px] font-bold text-gray-400 mb-3">
          从相册中勾选 {selectedCount}/10 张，会自动轮播
        </p>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-400">
              加载中...
            </div>
          ) : candidates.length === 0 ? (
            <div className="py-8 text-center">
              <ImageIcon
                size={28}
                className="mx-auto text-gray-200 mb-2"
              />
              <p className="text-sm font-bold text-gray-400">相册还没有图片</p>
              <p className="text-[11px] text-gray-300 mt-1">
                先去相册上传一些照片吧
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {candidates.map((c) => {
                const checked = !!selectedIds[c.id]
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleSelect(c.id)}
                    className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all ${
                      checked
                        ? 'border-pink-500 ring-2 ring-pink-200'
                        : 'border-white hover:border-pink-200'
                    }`}
                  >
                    <img
                      src={buildImageUrl(c.src)}
                      alt={c.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {checked && (
                      <div className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 text-white shadow-md">
                        <Check size={12} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving || selectedCount === 0}
          className="mt-4 min-h-11 rounded-2xl bg-gradient-to-r from-pink-400 to-purple-400 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-pink-100 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          {saving ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          ) : (
            <Check size={14} />
          )}
          设置封面
        </button>
      </motion.div>
    </div>
  )
}

export default CoverCarousel
