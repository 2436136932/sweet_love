import { motion, AnimatePresence } from 'motion/react'
import { X, ArrowUpRight, ArrowDownLeft, Gift, Star, ShoppingBag, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { pointService } from '../../services/api'
import type { PointTransaction } from '../../types'

interface PointHistoryProps {
  onClose: () => void
}

const TYPE_META: Record<string, { label: string; icon: typeof Star; color: string }> = {
  check_in: { label: '每日签到', icon: Star, color: 'text-amber-500 bg-amber-50' },
  transfer_in: { label: '收到转账', icon: ArrowDownLeft, color: 'text-emerald-500 bg-emerald-50' },
  transfer_out: { label: '转账支出', icon: ArrowUpRight, color: 'text-rose-500 bg-rose-50' },
  purchase: { label: '兑换商品', icon: ShoppingBag, color: 'text-purple-500 bg-purple-50' },
  send: { label: '赠送券', icon: Gift, color: 'text-pink-500 bg-pink-50' },
  receive: { label: '收到券', icon: Gift, color: 'text-pink-500 bg-pink-50' },
  use: { label: '使用券', icon: CheckCircle2, color: 'text-blue-500 bg-blue-50' },
  expire: { label: '券过期', icon: Clock, color: 'text-gray-500 bg-gray-50' },
  admin_adjust: { label: '系统调整', icon: AlertCircle, color: 'text-orange-500 bg-orange-50' }
}

export default function PointHistory({ onClose }: PointHistoryProps) {
  const [transactions, setTransactions] = useState<PointTransaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    pointService.getTransactions(50)
      .then(setTransactions)
      .finally(() => setLoading(false))
  }, [])

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
          className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl"
        >
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-lg font-black text-gray-800">积分流水</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="text-center py-8 text-sm text-gray-400">加载中...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">暂无积分记录</div>
            ) : (
              transactions.map((tx) => {
                const meta = TYPE_META[tx.type] || { label: tx.type, icon: Star, color: 'text-gray-500 bg-gray-50' }
                const Icon = meta.icon
                const isPositive = tx.amount > 0
                const isZero = tx.amount === 0

                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50/70"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${meta.color}`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-800">{meta.label}</div>
                      <div className="text-xs text-gray-500 truncate">{tx.description || '-'}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(tx.createdAt).toLocaleString('zh-CN', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className={`text-sm font-black ${isPositive ? 'text-emerald-500' : isZero ? 'text-gray-400' : 'text-rose-500'}`}>
                      {isPositive ? '+' : ''}{tx.amount}
                    </div>
                  </motion.div>
                )
              })
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
