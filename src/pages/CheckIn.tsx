import { motion, AnimatePresence } from 'motion/react'
import {
  CalendarCheck,
  Flame,
  Trophy,
  Coins,
  Gift,
  History,
  Settings,
  ChevronRight
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { User, CheckInStatus, PointOverview } from '../types'
import { checkInService, pointService } from '../services/api'
import { useToast } from '../components/Toast'
import CheckInCalendar from '../components/checkin/CheckInCalendar'
import PointHistory from '../components/points/PointHistory'

interface CheckInProps {
  user: User
  checkInStatus: CheckInStatus | null
  pointOverview: PointOverview | null
  onCheckIn: () => void
  onOpenStore: () => void
}

export default function CheckIn({
  user,
  checkInStatus,
  pointOverview,
  onCheckIn,
  onOpenStore
}: CheckInProps) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [settingsBaseScore, setSettingsBaseScore] = useState(
    pointOverview?.baseScore || 10
  )
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    if (pointOverview?.baseScore) {
      setSettingsBaseScore(pointOverview.baseScore)
    }
  }, [pointOverview?.baseScore])

  const handleCheckIn = async () => {
    if (checkInStatus?.todayChecked) return
    setLoading(true)
    try {
      await checkInService.checkIn()
      showToast(
        '签到成功！积分 + ' + (pointOverview?.baseScore || 10),
        'success'
      )
      onCheckIn()
    } catch (err) {
      showToast(err instanceof Error ? err.message : '签到失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    const value = Number(settingsBaseScore)
    if (!Number.isInteger(value) || value < 1 || value > 1000) {
      showToast('基础分必须是 1-1000 的整数', 'error')
      return
    }
    setSavingSettings(true)
    try {
      await pointService.updateSettings({ baseScore: value })
      showToast('签到基础分已更新', 'success')
      setShowSettings(false)
      onCheckIn()
    } catch (err) {
      showToast(err instanceof Error ? err.message : '保存失败', 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/50 via-white to-blue-50/30 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* 页面标题 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center text-white shadow-lg shadow-pink-200">
              <CalendarCheck size={20} />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-800">每日签到</h1>
              <p className="text-xs text-gray-500">坚持打卡，积分越来越有爱</p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/80 text-xs font-bold text-gray-600 shadow-sm border border-white/60 hover:bg-white transition-colors"
          >
            <Settings size={14} />
            设置
          </motion.button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* 左侧：签到卡 + 统计 */}
          <div className="lg:col-span-1 space-y-5">
            {/* 今日签到 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/80 backdrop-blur-sm rounded-3xl p-6 border border-white/60 shadow-sm"
            >
              <div className="text-center mb-5">
                <motion.div
                  animate={
                    checkInStatus?.todayChecked ? {} : { scale: [1, 1.05, 1] }
                  }
                  transition={{ repeat: Infinity, duration: 2 }}
                  className={`
                    w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4
                    ${
                      checkInStatus?.todayChecked
                        ? 'bg-gradient-to-br from-emerald-400 to-teal-400 text-white'
                        : 'bg-gradient-to-br from-pink-400 to-rose-400 text-white shadow-xl shadow-pink-200'
                    }
                  `}
                >
                  <CalendarCheck size={40} />
                </motion.div>
                <h2 className="text-lg font-black text-gray-800">
                  {checkInStatus?.todayChecked ? '今日已签到' : '今日还未签到'}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {checkInStatus?.todayChecked
                    ? `已获得 ${pointOverview?.todayPoints || 0} 积分`
                    : `签到可获得 ${(checkInStatus?.currentStreak || 0) + 1} × ${pointOverview?.baseScore || 10} = ${((checkInStatus?.currentStreak || 0) + 1) * (pointOverview?.baseScore || 10)} 积分`}
                </p>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleCheckIn}
                disabled={loading || checkInStatus?.todayChecked}
                className={`
                  w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all
                  ${
                    checkInStatus?.todayChecked
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-200 hover:shadow-xl'
                  }
                `}
              >
                {loading
                  ? '签到中...'
                  : checkInStatus?.todayChecked
                    ? '已完成'
                    : '立即签到'}
              </motion.button>
            </motion.div>

            {/* 连续天数 */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/80 backdrop-blur-sm rounded-3xl p-5 border border-white/60 shadow-sm"
              >
                <div className="flex items-center gap-2 text-orange-500 mb-2">
                  <Flame size={18} />
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    连续签到
                  </span>
                </div>
                <div className="text-3xl font-black text-gray-800">
                  {checkInStatus?.currentStreak ?? 0}
                  <span className="text-sm font-bold text-gray-400 ml-1">
                    天
                  </span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-white/80 backdrop-blur-sm rounded-3xl p-5 border border-white/60 shadow-sm"
              >
                <div className="flex items-center gap-2 text-purple-500 mb-2">
                  <Trophy size={18} />
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    最长记录
                  </span>
                </div>
                <div className="text-3xl font-black text-gray-800">
                  {checkInStatus?.longestStreak ?? 0}
                  <span className="text-sm font-bold text-gray-400 ml-1">
                    天
                  </span>
                </div>
              </motion.div>
            </div>

            {/* 我的积分 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-3xl p-5 border border-amber-100/60 shadow-sm"
            >
              <div className="flex items-center gap-2 text-amber-600 mb-3">
                <Coins size={18} />
                <span className="text-[10px] font-black uppercase tracking-wider">
                  我的积分
                </span>
              </div>
              <div className="text-4xl font-black text-gray-800 mb-1">
                {pointOverview?.myBalance ?? 0}
              </div>
              <div className="text-xs text-gray-500">
                累计获得 {pointOverview?.myTotalEarned ?? 0} · 累计支出{' '}
                {pointOverview?.myTotalSpent ?? 0}
              </div>
            </motion.div>
          </div>

          {/* 右侧：日历 + 功能入口 */}
          <div className="lg:col-span-2 space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <CheckInCalendar
                checkedDates={checkInStatus?.checkedDates || []}
              />
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                whileTap={{ scale: 0.98 }}
                onClick={onOpenStore}
                className="bg-white/80 backdrop-blur-sm rounded-3xl p-5 border border-white/60 shadow-sm flex items-center justify-between hover:bg-white/90 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white shadow-md shadow-purple-200">
                    <Gift size={22} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-black text-gray-800">积分商城</h3>
                    <p className="text-xs text-gray-500">兑换惩罚/奖励券</p>
                  </div>
                </div>
                <ChevronRight
                  size={18}
                  className="text-gray-400"
                />
              </motion.button>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowHistory(true)}
                className="bg-white/80 backdrop-blur-sm rounded-3xl p-5 border border-white/60 shadow-sm flex items-center justify-between hover:bg-white/90 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-blue-200">
                    <History size={22} />
                  </div>
                  <div className="text-left">
                    <h3 className="font-black text-gray-800">积分流水</h3>
                    <p className="text-xs text-gray-500">查看收支明细</p>
                  </div>
                </div>
                <ChevronRight
                  size={18}
                  className="text-gray-400"
                />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showHistory && <PointHistory onClose={() => setShowHistory(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-sm p-5 shadow-2xl"
            >
              <h3 className="text-lg font-black text-gray-800 mb-4">
                签到设置
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2 block">
                    每日签到基础分
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {[5, 10, 20, 50, 100].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSettingsBaseScore(s)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          Number(settingsBaseScore) === s
                            ? 'bg-pink-500 text-white shadow-sm'
                            : 'bg-gray-50 text-gray-600 hover:bg-pink-50'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={settingsBaseScore}
                    onChange={(e) => setSettingsBaseScore(e.target.value)}
                    placeholder="自定义基础分"
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-pink-300"
                  />
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    今日可获得积分 = 连续天数 × 基础分
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setShowSettings(false)}
                  className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 font-bold text-sm"
                >
                  取消
                </button>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold text-sm shadow-lg shadow-pink-200 disabled:opacity-60"
                >
                  {savingSettings ? '保存中...' : '保存'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
