import { motion, AnimatePresence } from 'motion/react'
import { X, Plus, ShoppingBag, Coins, Gift, Sparkles, Trash2, Edit2, Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { couponService } from '../../services/api'
import type { CouponTemplate, User } from '../../types'
import { useToast } from '../Toast'
import { useConfirm } from '../Confirm'

const CATEGORY_OPTIONS = [
  { value: 'reward', label: '奖励券', color: 'bg-pink-100 text-pink-600' },
  { value: 'punishment', label: '惩罚券', color: 'bg-orange-100 text-orange-600' },
  { value: 'activity', label: '活动券', color: 'bg-blue-100 text-blue-600' },
  { value: 'custom', label: '自定义', color: 'bg-purple-100 text-purple-600' }
]

interface StoreModalProps {
  user: User
  myBalance: number
  onClose: () => void
  onBuySuccess: () => void
}

export default function StoreModal({ myBalance, onClose, onBuySuccess }: StoreModalProps) {
  const { showToast } = useToast()
  const confirm = useConfirm()
  const [templates, setTemplates] = useState<CouponTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<CouponTemplate | null>(null)

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'reward',
    price: '',
    expiryDays: '30'
  })

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const data = await couponService.getTemplates()
      setTemplates(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const resetForm = () => {
    setForm({ name: '', description: '', category: 'reward', price: '', expiryDays: '30' })
    setEditingTemplate(null)
  }

  const handleOpenEditor = (template?: CouponTemplate) => {
    if (template) {
      setEditingTemplate(template)
      setForm({
        name: template.name,
        description: template.description || '',
        category: template.category,
        price: String(template.price),
        expiryDays: template.expiryDays ? String(template.expiryDays) : ''
      })
    } else {
      resetForm()
    }
    setShowEditor(true)
  }

  const handleSave = async () => {
    const price = Number(form.price)
    if (!form.name.trim() || !form.category || price <= 0) {
      showToast('请填写完整信息', 'error')
      return
    }

    try {
      if (editingTemplate) {
        await couponService.updateTemplate(editingTemplate.id, {
          name: form.name.trim(),
          description: form.description.trim(),
          category: form.category,
          price,
          expiryDays: form.expiryDays ? Number(form.expiryDays) : null
        })
        showToast('更新成功', 'success')
      } else {
        await couponService.createTemplate({
          name: form.name.trim(),
          description: form.description.trim(),
          category: form.category,
          price,
          expiryDays: form.expiryDays ? Number(form.expiryDays) : null
        })
        showToast('创建成功', 'success')
      }
      setShowEditor(false)
      resetForm()
      loadTemplates()
    } catch (err) {
      showToast(err instanceof Error ? err.message : '保存失败', 'error')
    }
  }

  const handleDelete = async (template: CouponTemplate) => {
    const ok = await confirm({
      title: '删除商品',
      message: `确定删除「${template.name}」吗？`,
      confirmText: '删除',
      cancelText: '取消'
    })
    if (!ok) return
    try {
      await couponService.deleteTemplate(template.id)
      showToast('删除成功', 'success')
      loadTemplates()
    } catch (err) {
      showToast(err instanceof Error ? err.message : '删除失败', 'error')
    }
  }

  const handleBuy = async (template: CouponTemplate) => {
    if (myBalance < template.price) {
      showToast('积分不足', 'error')
      return
    }
    const ok = await confirm({
      title: '兑换券',
      message: `确定花费 ${template.price} 积分兑换「${template.name}」吗？`,
      confirmText: '兑换',
      cancelText: '取消'
    })
    if (!ok) return
    try {
      await couponService.buy(template.id)
      showToast('兑换成功', 'success')
      onBuySuccess()
    } catch (err) {
      showToast(err instanceof Error ? err.message : '兑换失败', 'error')
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
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white">
                <ShoppingBag size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-800">积分商城</h2>
                <p className="text-xs text-gray-500">我的余额：{myBalance} 积分</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-gray-700">卡券商品</h3>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleOpenEditor()}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-pink-100 text-pink-600 text-xs font-bold"
              >
                <Plus size={14} />
                添加商品
              </motion.button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-sm text-gray-400">加载中...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">暂无商品</div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => {
                  const category = CATEGORY_OPTIONS.find((c) => c.value === template.category)
                  return (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-50/70 rounded-2xl p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${category?.color || 'bg-gray-100 text-gray-600'}`}>
                              {category?.label || template.category}
                            </span>
                            {template.isPreset && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 font-bold">
                                预设
                              </span>
                            )}
                          </div>
                          <h4 className="font-black text-gray-800">{template.name}</h4>
                          {template.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            {template.expiryDays ? `有效期 ${template.expiryDays} 天` : '永久有效'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-amber-500 font-black">
                            <Coins size={14} />
                            {template.price}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleBuy(template)}
                          disabled={myBalance < template.price}
                          className={`
                            flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all
                            ${myBalance >= template.price
                              ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md shadow-pink-200'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }
                          `}
                        >
                          {myBalance >= template.price ? '兑换' : '积分不足'}
                        </motion.button>
                        {!template.isPreset && (
                          <>
                            <button
                              onClick={() => handleOpenEditor(template)}
                              className="p-2.5 rounded-xl bg-white text-gray-500 hover:bg-gray-100 transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(template)}
                              className="p-2.5 rounded-xl bg-white text-rose-500 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* 商品编辑弹窗 */}
        <AnimatePresence>
          {showEditor && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowEditor(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl"
              >
                <h3 className="text-lg font-black text-gray-800 mb-4">
                  {editingTemplate ? '编辑商品' : '添加商品'}
                </h3>

                <div className="space-y-3">
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="券名称"
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="券描述"
                    rows={2}
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
                  />
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pink-300"
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="积分价格"
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pink-300"
                    />
                    <input
                      type="number"
                      value={form.expiryDays}
                      onChange={(e) => setForm({ ...form, expiryDays: e.target.value })}
                      placeholder="有效期(天)"
                      className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pink-300"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-5">
                  <button
                    onClick={() => setShowEditor(false)}
                    className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 font-bold text-sm"
                  >
                    取消
                  </button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-sm shadow-lg shadow-pink-200"
                  >
                    保存
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}
