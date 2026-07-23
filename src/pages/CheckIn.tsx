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
import { useState } from 'react'
import type { User, CheckInStatus, PointOverview } from '../types'
import { checkInService } from '../services/api'
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

  const handleCheckIn = async () => {
    if (checkInStatus?.todayChecked) return
    setLoading(true)
    try {
      await checkInService.checkIn()
      showToast('签到成功！积分 + ' + (pointOverview?.baseScore || 10), 'success')
      onCheckIn()
    } catch (err) {
      showToast(err instanceof Error ? err.message : '签到失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50/50 via-white to-blue-50/30 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* 页面标题 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center text-white shadow-lg shadow-pink-200">
            <CalendarCheck size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-800">每日签到</h1>
            <p className="text-xs text-gray-500">坚持打卡，积分越来越有爱</p>
          </div>
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
                  animate={checkInStatus?.todayChecked ? {} : { scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className={`
                    w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4
                    ${checkInStatus?.todayChecked
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
                  ${checkInStatus?.todayChecked
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-200 hover:shadow-xl'
                  }
                `}
              >
                {loading ? '签到中...' : checkInStatus?.todayChecked ? '已完成' : '立即签到'}
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
                  <span className="text-[10px] font-black uppercase tracking-wider">连续签到</span>
                </div>
                <div className="text-3xl font-black text-gray-800">
                  {checkInStatus?.currentStreak ?? 0}
                  <span className="text-sm font-bold text-gray-400 ml-1">天</span>
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
                  <span className="text-[10px] font-black uppercase tracking-wider">最长记录</span>
                </div>
                <div className="text-3xl font-black text-gray-800">
                  {checkInStatus?.longestStreak ?? 0}
                  <span className="text-sm font-bold text-gray-400 ml-1">天</span>
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
                <span className="text-[10px] font-black uppercase tracking-wider">我的积分</span>
              </div>
              <div className="text-4xl font-black text-gray-800 mb-1">
                {pointOverview?.myBalance ?? 0}
              </div>
              <div className="text-xs text-gray-500">
                累计获得 {pointOverview?.myTotalEarned ?? 0} · 累计支出 {pointOverview?.myTotalSpent ?? 0}
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
              <CheckInCalendar checkedDates={checkInStatus?.checkedDates || []} />
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
                <ChevronRight size={18} className="text-gray-400" />
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
                <ChevronRight size={18} className="text-gray-400" />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showHistory && (
          <PointHistory onClose={() => setShowHistory(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
