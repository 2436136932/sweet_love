import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'

interface CheckInCalendarProps {
  checkedDates: string[]
}

export default function CheckInCalendar({ checkedDates }: CheckInCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  const startDay = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  const checkedSet = useMemo(() => new Set(checkedDates), [checkedDates])

  const calendarDays = useMemo(() => {
    const days: { date: number; dateStr: string; isToday: boolean; checked: boolean; inMonth: boolean }[] = []

    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startDay - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i
      const dateStr = new Date(year, month - 1, d).toISOString().slice(0, 10)
      days.push({ date: d, dateStr, isToday: false, checked: checkedSet.has(dateStr), inMonth: false })
    }

    const todayStr = new Date().toISOString().slice(0, 10)
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = new Date(year, month, d).toISOString().slice(0, 10)
      days.push({
        date: d,
        dateStr,
        isToday: dateStr === todayStr,
        checked: checkedSet.has(dateStr),
        inMonth: true
      })
    }

    const remaining = (7 - (days.length % 7)) % 7
    for (let d = 1; d <= remaining; d++) {
      const dateStr = new Date(year, month + 1, d).toISOString().slice(0, 10)
      days.push({ date: d, dateStr, isToday: false, checked: checkedSet.has(dateStr), inMonth: false })
    }

    return days
  }, [year, month, startDay, daysInMonth, checkedSet])

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-3xl p-5 border border-white/60 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-700">
          {year}年{month + 1}月
        </h3>
        <div className="flex gap-1">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl bg-white/80 text-gray-500 hover:bg-white transition-colors"
          >
            <ChevronLeft size={18} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl bg-white/80 text-gray-500 hover:bg-white transition-colors"
          >
            <ChevronRight size={18} />
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {weekDays.map((day) => (
          <div key={day} className="text-center text-[10px] font-semibold text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((day, idx) => (
          <motion.div
            key={`${day.dateStr}-${idx}`}
            whileHover={day.inMonth ? { scale: 1.1 } : {}}
            className={`
              aspect-square flex items-center justify-center rounded-2xl text-xs font-medium relative
              ${day.inMonth ? 'text-gray-700' : 'text-gray-300'}
              ${day.isToday && !day.checked ? 'ring-2 ring-pink-300 bg-pink-50/50' : ''}
              ${day.checked ? 'bg-gradient-to-br from-pink-400 to-rose-400 text-white shadow-md shadow-pink-200' : 'bg-transparent'}
            `}
          >
            {day.date}
            {day.checked && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full"
              />
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
