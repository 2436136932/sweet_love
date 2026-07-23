import { motion, AnimatePresence } from 'motion/react'
import { X, Coins, ArrowRight, Heart } from 'lucide-react'
import { useState } from 'react'
import { pointService } from '../../services/api'
import type { User } from '../../types'
import { useToast } from '../Toast'

interface TransferModalProps {
  user: User
  partnerName: string
  myBalance: number
  onClose: () => void
  onSuccess: () => void
}

export default function TransferModal({ partnerName, myBalance, onClose, onSuccess }: TransferModalProps) {
  const { showToast } = useToast()
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'input' | 'confirm'>('input')

  const amountNum = Number(amount) || 0
  const canSubmit = amountNum > 0 && amountNum <= myBalance

  const handleSubmit = async () => {
    if (!canSubmit) return
    if (step === 'input') {
      setStep('confirm')
      return
    }

    setLoading(true)
    try {
      await pointService.transfer(amountNum, note.trim() || undefined)
      showToast(`成功转账 ${amountNum} 积分给 ${partnerName}`, 'success')
      onSuccess()
      onClose()
    } catch (err) {
      showToast(err instanceof Error ? err.message : '转账失败', 'error')
    } finally {
      setLoading(false)
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
          className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-sm p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-black text-gray-800">
              {step === 'input' ? '积分转账' : '确认转账'}
            </h2>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          {step === 'input' ? (
            <div className="space-y-4">
              <div className="bg-amber-50 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-600">
                  <Coins size={18} />
                  <span className="text-xs font-bold">我的余额</span>
                </div>
                <span className="text-xl font-black text-gray-800">{myBalance}</span>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 block">转账数量</label>
                <input
                  type="number"
                  min={1}
                  max={myBalance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="输入积分数量"
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-2 block">转账附言</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="写点什么吧～"
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-pink-300"
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`
                  w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all
                  ${canSubmit
                    ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                下一步
              </motion.button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-center gap-4 py-4">
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-pink-100 flex items-center justify-center text-pink-500 mx-auto mb-2">
                    <Coins size={24} />
                  </div>
                  <div className="text-sm font-bold text-gray-700">我</div>
                </div>
                <div className="flex flex-col items-center">
                  <ArrowRight size={24} className="text-pink-400" />
                  <span className="text-lg font-black text-pink-500">{amountNum}</span>
                </div>
                <div className="text-center">
                  <div className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 mx-auto mb-2">
                    <Heart size={24} />
                  </div>
                  <div className="text-sm font-bold text-gray-700">{partnerName}</div>
                </div>
              </div>

              {note && (
                <div className="bg-gray-50 rounded-2xl p-4 text-sm text-gray-600 text-center">
                  “{note}”
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('input')}
                  disabled={loading}
                  className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 font-bold text-sm"
                >
                  返回
                </button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-sm shadow-lg shadow-pink-200"
                >
                  {loading ? '转账中...' : '确认转账'}
                </motion.button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
