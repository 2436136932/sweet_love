import { motion, AnimatePresence } from 'motion/react'
import {
  X,
  Gift,
  CheckCircle2,
  Clock,
  AlertCircle,
  Send,
  Sparkles
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { couponService } from '../../services/api'
import type { UserCoupon } from '../../types'
import { useToast } from '../Toast'

const STATUS_TABS = [
  { id: 'unused', label: '未使用' },
  { id: 'used', label: '已使用' },
  { id: 'expired', label: '已过期' }
]

const CATEGORY_LABELS: Record<string, string> = {
  reward: '奖励券',
  punishment: '惩罚券',
  activity: '活动券',
  custom: '自定义'
}

interface CouponWalletProps {
  partnerName: string
  onClose: () => void
  onSendSuccess: () => void
}

export default function CouponWallet({
  partnerName,
  onClose,
  onSendSuccess
}: CouponWalletProps) {
  const { showToast } = useToast()
  const [coupons, setCoupons] = useState<UserCoupon[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('unused')
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [sendNote, setSendNote] = useState('')

  const loadCoupons = async () => {
    setLoading(true)
    try {
      const data = await couponService.getMyCoupons()
      setCoupons(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCoupons()
  }, [])

  const filtered = coupons.filter((c) => c.status === activeTab)

  const handleSend = async (couponId: string) => {
    setSendingId(couponId)
    try {
      await couponService.send(couponId, sendNote.trim() || undefined)
      showToast(`券已赠送给 ${partnerName}`, 'success')
      setSendNote('')
      loadCoupons()
      onSendSuccess()
    } catch (err) {
      showToast(err instanceof Error ? err.message : '赠送失败', 'error')
    } finally {
      setSendingId(null)
    }
  }

  const handleUse = async (couponId: string) => {
    try {
      await couponService.use(couponId)
      showToast('券已使用', 'success')
      loadCoupons()
    } catch (err) {
      showToast(err instanceof Error ? err.message : '使用失败', 'error')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'used':
        return (
          <CheckCircle2
            size={16}
            className="text-emerald-500"
          />
        )
      case 'expired':
        return (
          <AlertCircle
            size={16}
            className="text-gray-400"
          />
        )
      default:
        return (
          <Clock
            size={16}
            className="text-amber-500"
          />
        )
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl"
        >
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center text-white">
                <Gift size={20} />
              </div>
              <h2 className="text-lg font-black text-gray-800">我的券包</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <X
                size={18}
                className="text-gray-500"
              />
            </button>
          </div>

          <div className="flex gap-2 p-4 border-b border-gray-100">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 py-2 rounded-xl text-xs font-bold transition-colors
                  ${
                    activeTab === tab.id
                      ? 'bg-pink-500 text-white shadow-md shadow-pink-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="text-center py-8 text-sm text-gray-400">
                加载中...
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles
                  size={40}
                  className="text-gray-300 mx-auto mb-3"
                />
                <p className="text-sm text-gray-400">
                  {activeTab === 'unused'
                    ? '还没有券，快去积分商城兑换吧'
                    : '暂无记录'}
                </p>
              </div>
            ) : (
              filtered.map((coupon) => (
                <motion.div
                  key={coupon.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-50/70 rounded-2xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-100 text-pink-600 font-bold">
                          {CATEGORY_LABELS[coupon.template.category] ||
                            coupon.template.category}
                        </span>
                        <span className="text-[10px] flex items-center gap-1 text-gray-400">
                          {getStatusIcon(coupon.status)}
                          {coupon.status === 'used'
                            ? '已使用'
                            : coupon.status === 'expired'
                              ? '已过期'
                              : '未使用'}
                        </span>
                      </div>
                      <h4 className="font-black text-gray-800">
                        {coupon.template.name}
                      </h4>
                      {coupon.template.description && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {coupon.template.description}
                        </p>
                      )}
                      {coupon.note && (
                        <p className="text-xs text-pink-500 mt-1">
                          备注：{coupon.note}
                        </p>
                      )}
                      <div className="text-[10px] text-gray-400 mt-1">
                        {coupon.expiresAt
                          ? `有效期至 ${new Date(coupon.expiresAt).toLocaleDateString('zh-CN')}`
                          : '永久有效'}
                      </div>
                    </div>
                  </div>

                  {coupon.status === 'unused' && (
                    <div className="flex gap-2 mt-3">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleUse(coupon.id)}
                        className="flex-1 py-2 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-white text-xs font-black"
                      >
                        使用
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          if (sendingId === coupon.id) {
                            handleSend(coupon.id)
                          } else {
                            setSendingId(coupon.id)
                          }
                        }}
                        className="flex items-center gap-1 px-3 rounded-xl bg-pink-100 text-pink-600 text-xs font-bold"
                      >
                        <Send size={14} />
                        {sendingId === coupon.id ? '确认赠送' : '赠送'}
                      </motion.button>
                    </div>
                  )}

                  {sendingId === coupon.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3"
                    >
                      <input
                        type="text"
                        value={sendNote}
                        onChange={(e) => setSendNote(e.target.value)}
                        placeholder={`给 ${partnerName} 的留言`}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-gray-100 text-xs focus:outline-none focus:ring-2 focus:ring-pink-300"
                      />
                    </motion.div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
