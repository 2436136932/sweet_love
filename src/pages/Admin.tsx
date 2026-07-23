import { Shield, Users, Heart, Book, Image, MessageSquare, RefreshCw, ArrowLeft, UserCog, ChevronRight } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { cn } from '../lib/utils'

// ============================================================================
// 类型
// ============================================================================

interface AdminUser {
  id: string
  username: string
  email: string
  role: string
  partnerId: string | null
  createdAt: string
}

interface AdminCouple {
  id: string
  userA: { id: string; username: string; email: string }
  userB: { id: string; username: string; email: string }
}

interface AdminStats {
  userCount: number
  coupleCount: number
  diaryCount: number
  albumCount: number
  messageCount: number
}

// ============================================================================
// API 封装
// ============================================================================

const getHeaders = () => {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

async function fetchAdmin<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: getHeaders(), ...init })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: '请求失败' }))
    throw new Error(err.message || '请求失败')
  }
  return res.json()
}

// ============================================================================
// 组件
// ============================================================================

export default function Admin({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<'stats' | 'users' | 'couples'>('stats')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [couples, setCouples] = useState<AdminCouple[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userSearch, setUserSearch] = useState('')

  const loadStats = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchAdmin<AdminStats>('/api/admin/stats')
      setStats(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    }
  }, [])

  const loadUsers = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchAdmin<AdminUser[]>('/api/admin/users')
      setUsers(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    }
  }, [])

  const loadCouples = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchAdmin<AdminCouple[]>('/api/admin/couples')
      setCouples(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([loadStats(), loadUsers(), loadCouples()]).finally(() =>
      setLoading(false)
    )
  }, [loadStats, loadUsers, loadCouples])

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await fetchAdmin(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole })
      })
      await loadUsers()
    } catch (e) {
      alert(e instanceof Error ? e.message : '操作失败')
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  )

  const tabs = [
    { id: 'stats' as const, label: '概览', icon: Shield },
    { id: 'users' as const, label: '用户', icon: Users },
    { id: 'couples' as const, label: '情侣', icon: Heart }
  ]

  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 pb-24 pt-4">
      {/* 头部 */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-lg font-black text-gray-800">管理后台</h1>
          <p className="text-[10px] font-bold text-gray-400">Admin Panel</p>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="mb-4 rounded-2xl bg-red-50 p-4 text-xs font-bold text-red-500">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            关闭
          </button>
        </div>
      )}

      {/* 加载中 */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={24} className="animate-spin text-gray-300" />
        </div>
      ) : (
        <>
          {/* Tab 切换 */}
          <div className="mb-4 flex gap-2">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-xl px-4 py-2 text-[11px] font-black transition-all',
                  tab === t.id
                    ? 'bg-accent text-on-accent shadow-md'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                )}
              >
                <t.icon size={14} />
                {t.label}
              </button>
            ))}
          </div>

          {/* 概览 */}
          {tab === 'stats' && stats && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '用户数', value: stats.userCount, icon: Users, color: 'bg-blue-500' },
                { label: '情侣对数', value: stats.coupleCount, icon: Heart, color: 'bg-rose-500' },
                { label: '日记数', value: stats.diaryCount, icon: Book, color: 'bg-amber-500' },
                { label: '相册图片', value: stats.albumCount, icon: Image, color: 'bg-green-500' },
                { label: '留言数', value: stats.messageCount, icon: MessageSquare, color: 'bg-purple-500' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg text-white', item.color)}>
                      <item.icon size={14} />
                    </div>
                    <span className="text-[10px] font-black text-gray-400">{item.label}</span>
                  </div>
                  <p className="text-2xl font-black text-gray-800">{item.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* 用户管理 */}
          {tab === 'users' && (
            <div>
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="搜索用户名或邮箱..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold outline-none transition-colors placeholder:text-gray-300 focus:border-accent"
                />
              </div>
              <div className="space-y-2">
                {filteredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-3 shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-gray-800">
                        {u.username}
                      </p>
                      <p className="truncate text-[10px] font-bold text-gray-400">
                        {u.email}
                      </p>
                      {u.partnerId && (
                        <p className="text-[9px] font-bold text-rose-400">已绑定</p>
                      )}
                    </div>
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className={cn(
                        'rounded-xl border px-3 py-1.5 text-[10px] font-black outline-none transition-colors',
                        u.role === 'admin'
                          ? 'border-rose-200 bg-rose-50 text-rose-600'
                          : 'border-gray-200 bg-gray-50 text-gray-500'
                      )}
                    >
                      <option value="user">用户</option>
                      <option value="admin">管理员</option>
                    </select>
                  </div>
                ))}
                {filteredUsers.length === 0 && (
                  <p className="py-8 text-center text-xs font-bold text-gray-400">
                    没有匹配的用户
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 情侣管理 */}
          {tab === 'couples' && (
            <div className="space-y-2">
              {couples.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-[10px] font-black text-rose-500">
                      {c.userA.username[0]}
                    </span>
                    <ChevronRight size={12} className="text-gray-300" />
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-100 text-[10px] font-black text-rose-500">
                      {c.userB.username[0]}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs font-bold text-gray-500">
                    {c.userA.username} ({c.userA.email}) & {c.userB.username} ({c.userB.email})
                  </p>
                </div>
              ))}
              {couples.length === 0 && (
                <p className="py-8 text-center text-xs font-bold text-gray-400">
                  暂无情侣关系
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}