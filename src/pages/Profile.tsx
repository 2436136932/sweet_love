import { motion, AnimatePresence } from 'motion/react'
import {
  Settings,
  Shield,
  Palette,
  HelpCircle,
  ChevronRight,
  Heart,
  HeartOff,
  Bell,
  LogOut,
  Edit2,
  X,
  Camera,
  Users,
  Sparkles,
  Save,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronDown,
  Check,
  Plus,
  Trash2,
  Download,
  Upload,
  Lock,
  User as UserIcon,
  FileText,
  AlertTriangle,
  Loader2,
  Star,
  Calendar,
  Mail,
  Copy,
  MessageSquare
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { User, Couple } from '../types'
import {
  authService,
  userService,
  coupleService,
  uploadService,
  aiConfigService,
  aiModelService,
  privacyService,
  notificationService,
  AiConfigData,
  AiProvider,
  NotificationConfig
} from '../services/api'
import { useToast } from '../components/Toast'
import { useModalHistory } from '../hooks/useModalHistory'
import { AppImage } from '../components/AppImage'
import { useTheme } from '../contexts/ThemeContext'
import { deriveTheme } from '../lib/theme'

export default function Profile({
  user,
  couple,
  onLogout,
  onUnbind,
  onUpdateUser,
  onUpdateCouple
}: {
  user: User
  couple: Couple | null
  onLogout: () => void
  onUnbind: () => Promise<void> | void
  onUpdateUser: (user: User) => void
  onUpdateCouple: (couple: Couple) => void
}) {
  const { showToast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isEditingCouple, setIsEditingCouple] = useState(false)
  const [isEditingAi, setIsEditingAi] = useState(false)
  const [isEditingTheme, setIsEditingTheme] = useState(false)
  const [aiConfig, setAiConfig] = useState<AiConfigData | null>(null)
  const [aiSaving, setAiSaving] = useState(false)
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)
  const [showGeminiKey, setShowGeminiKey] = useState(false)
  const [showClaudeKey, setShowClaudeKey] = useState(false)
  const [openaiModels, setOpenaiModels] = useState<string[]>([])
  const [geminiModels, setGeminiModels] = useState<string[]>([])
  const [claudeModels, setClaudeModels] = useState<string[]>([])
  const [loadingOpenai, setLoadingOpenai] = useState(false)
  const [loadingGemini, setLoadingGemini] = useState(false)
  const [loadingClaude, setLoadingClaude] = useState(false)
  const [isEditingPrivacy, setIsEditingPrivacy] = useState(false)
  const [isEditingHelp, setIsEditingHelp] = useState(false)
  const [isEditingNotification, setIsEditingNotification] = useState(false)
  const [notificationConfig, setNotificationConfig] =
    useState<NotificationConfig | null>(null)
  const [notifSaving, setNotifSaving] = useState(false)
  const [privacyTab, setPrivacyTab] = useState<
    'info' | 'password' | 'export' | 'import'
  >('info')
  const [personalInfo, setPersonalInfo] = useState<any>(null)
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [passwordStrength, setPasswordStrength] = useState({
    hasUpper: false,
    hasLower: false,
    hasNumber: false,
    hasSpecial: false,
    hasLength: false
  })
  const partner = user.partner
  const userAvatar =
    user.avatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.username)}`
  const partnerAvatar =
    partner?.avatar ||
    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(partner?.username || 'partner')}`

  const [formData, setFormData] = useState({
    username: user.username,
    bio: user.bio || '',
    avatar: user.avatar || ''
  })

  const [coupleData, setCoupleData] = useState({
    name: couple?.name || '',
    bio: couple?.bio || '',
    coverImage: couple?.coverImage || '',
    startDate: couple?.startDate || ''
  })

  const [loading, setLoading] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const closeProfileModal = useModalHistory('profile-edit', isEditing, () =>
    setIsEditing(false)
  )
  const closeCoupleModal = useModalHistory(
    'profile-couple-edit',
    isEditingCouple,
    () => setIsEditingCouple(false)
  )
  const closeAiModal = useModalHistory('profile-ai-edit', isEditingAi, () =>
    setIsEditingAi(false)
  )

  useEffect(() => {
    if (isEditingAi && !aiConfig) {
      aiConfigService
        .get()
        .then(setAiConfig)
        .catch((err) => {
          console.error('Failed to load AI config', err)
          showToast('加载 AI 配置失败', 'error')
        })
    }
  }, [isEditingAi, aiConfig, showToast])

  // 密码强度实时检测
  useEffect(() => {
    setPasswordStrength({
      hasUpper: /[A-Z]/.test(newPassword),
      hasLower: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
      hasLength: newPassword.length >= 8
    })
  }, [newPassword])

  const handleLoadPersonalInfo = async () => {
    setLoadingInfo(true)
    try {
      const data = await privacyService.getPersonalInfo()
      setPersonalInfo(data)
    } catch (err) {
      console.error('Failed to load personal info', err)
      showToast('加载个人信息失败', 'error')
    } finally {
      setLoadingInfo(false)
    }
  }

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      showToast('请填写所有密码字段', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      showToast('新密码和确认密码不一致', 'error')
      return
    }
    if (newPassword.length < 8) {
      showToast('密码长度至少 8 位', 'error')
      return
    }
    if (
      !passwordStrength.hasUpper ||
      !passwordStrength.hasLower ||
      !passwordStrength.hasNumber ||
      !passwordStrength.hasSpecial
    ) {
      showToast('密码必须包含大写字母、小写字母、数字和特殊符号', 'error')
      return
    }
    setChangingPassword(true)
    try {
      const result = await privacyService.changePassword(
        oldPassword,
        newPassword,
        confirmPassword
      )
      showToast(result.message, 'success')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      showToast(err instanceof Error ? err.message : '密码修改失败', 'error')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleExportData = async () => {
    setExporting(true)
    try {
      const blob = await privacyService.exportData()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sweet_love_export_${user.username}_${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast('数据导出成功', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : '数据导出失败', 'error')
    } finally {
      setExporting(false)
    }
  }

  const handleImportData = async () => {
    if (!importFile) {
      showToast('请先选择导入文件', 'error')
      return
    }
    setImporting(true)
    try {
      const result = await privacyService.importData(importFile)
      showToast(result.message, 'success')
      setImportFile(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : '数据导入失败', 'error')
    } finally {
      setImporting(false)
    }
  }

  // Notification config
  useEffect(() => {
    if (isEditingNotification && !notificationConfig) {
      notificationService
        .get()
        .then(setNotificationConfig)
        .catch((err) => {
          console.error('Failed to load notification config', err)
          showToast('加载通知配置失败', 'error')
        })
    }
  }, [isEditingNotification, notificationConfig, showToast])

  const handleSaveNotificationConfig = async () => {
    if (!notificationConfig) return
    setNotifSaving(true)
    try {
      const updated = await notificationService.update(notificationConfig)
      setNotificationConfig(updated)
      setIsEditingNotification(false)
      showToast('通知提醒已保存', 'success')
    } catch (err) {
      console.error('Save notification config failed', err)
      showToast(err instanceof Error ? err.message : '保存失败', 'error')
    } finally {
      setNotifSaving(false)
    }
  }

  const handleSaveAiConfig = async () => {
    if (!aiConfig) return
    setAiSaving(true)
    try {
      const updated = await aiConfigService.update(aiConfig)
      setAiConfig(updated)
      showToast('AI 配置已保存', 'success')
    } catch (err) {
      console.error('Save AI config failed', err)
      showToast(err instanceof Error ? err.message : '保存失败', 'error')
    } finally {
      setAiSaving(false)
    }
  }

  const updateAiField = (
    section: 'openai' | 'gemini' | 'claude',
    key: string,
    value: any
  ) => {
    setAiConfig((prev) => {
      if (!prev) return prev
      const current = prev[section] as Record<string, any>
      return { ...prev, [section]: { ...current, [key]: value } }
    })
  }

  const fetchOpenaiModels = async () => {
    if (!aiConfig) return
    setLoadingOpenai(true)
    try {
      const list = await aiModelService.list(
        'openai-compatible',
        aiConfig.openai.baseUrl,
        aiConfig.openai.apiKey
      )
      setOpenaiModels(list)
      if (list.length === 0) showToast('未拉取到模型，可手动填写', 'error')
      else showToast(`已拉取 ${list.length} 个模型`, 'success')
    } catch (err) {
      console.error('Fetch openai models failed', err)
      showToast(err instanceof Error ? err.message : '拉取模型失败', 'error')
    } finally {
      setLoadingOpenai(false)
    }
  }

  const fetchGeminiModels = async () => {
    if (!aiConfig) return
    setLoadingGemini(true)
    try {
      const list = await aiModelService.list(
        'gemini',
        '',
        aiConfig.gemini.apiKey
      )
      setGeminiModels(list)
      if (list.length === 0) showToast('未拉取到模型，可手动填写', 'error')
      else showToast(`已拉取 ${list.length} 个模型`, 'success')
    } catch (err) {
      console.error('Fetch gemini models failed', err)
      showToast(err instanceof Error ? err.message : '拉取模型失败', 'error')
    } finally {
      setLoadingGemini(false)
    }
  }

  const fetchClaudeModels = async () => {
    setLoadingClaude(true)
    try {
      const list = await aiModelService.list('claude', '', '')
      setClaudeModels(list)
      showToast(`已加载 ${list.length} 个推荐模型`, 'success')
    } catch (err) {
      console.error('Fetch claude models failed', err)
      showToast(err instanceof Error ? err.message : '拉取模型失败', 'error')
    } finally {
      setLoadingClaude(false)
    }
  }

  React.useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        bio: user.bio || '',
        avatar: user.avatar || ''
      })
    }
  }, [user])

  React.useEffect(() => {
    if (couple) {
      setCoupleData({
        name: couple.name || '',
        bio: couple.bio || '',
        coverImage: couple.coverImage || '',
        startDate: couple.startDate || ''
      })
    }
  }, [couple])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const updatedUser = await userService.updateProfile(formData)
      onUpdateUser(updatedUser)
      setIsEditing(false)
      showToast('个人资料已保存', 'success')
    } catch (error) {
      console.error('Update profile failed:', error)
      showToast(
        error instanceof Error ? error.message : '更新资料失败，请重试',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateCoupleProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const updatedCouple = await coupleService.update(coupleData)
      onUpdateCouple(updatedCouple)
      setIsEditingCouple(false)
      showToast('情侣资料已保存', 'success')
    } catch (error) {
      console.error('Update couple profile failed:', error)
      showToast(
        error instanceof Error ? error.message : '更新情侣资料失败，请重试',
        'error'
      )
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    isCouple: boolean = false
  ) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageUploading(true)
      try {
        const url = await uploadService.upload(file)
        if (isCouple) {
          setCoupleData((prev) => ({ ...prev, coverImage: url }))
        } else {
          setFormData((prev) => ({ ...prev, avatar: url }))
        }
        showToast('图片已上传，请保存资料', 'success')
      } catch (error) {
        console.error('Upload profile image failed:', error)
        showToast(
          error instanceof Error
            ? error.message
            : '上传失败，请检查图片格式或大小',
          'error'
        )
      } finally {
        setImageUploading(false)
      }
    }
  }

  const menuItems = [
    {
      icon: Sparkles,
      label: 'AI 配置',
      color: 'bg-indigo-100 text-indigo-500',
      action: () => setIsEditingAi(true)
    },
    {
      icon: Palette,
      label: '主题装扮',
      color: 'bg-pink-100 text-pink-500',
      action: () => setIsEditingTheme(true)
    },
    {
      icon: Bell,
      label: '通知提醒',
      color: 'bg-blue-100 text-blue-500',
      action: () => setIsEditingNotification(true)
    },
    {
      icon: Shield,
      label: '隐私安全',
      color: 'bg-green-100 text-green-500',
      action: () => {
        setIsEditingPrivacy(true)
        setPrivacyTab('info')
      }
    },
    {
      icon: HelpCircle,
      label: '帮助反馈',
      color: 'bg-orange-100 text-orange-500',
      action: () => setIsEditingHelp(true)
    }
  ]

  const handleLogout = () => {
    authService.logout()
    onLogout()
  }

  return (
    <>
      <div className="flex min-h-full flex-col bg-[#FEF9F3]/30 relative">
        <header className="px-6 pt-12 pb-8 bg-white/60 backdrop-blur-md rounded-b-[48px] border-b border-white shadow-sm flex flex-col items-center">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-100 flex items-center justify-center">
              <AppImage
                src={userAvatar}
                alt={user.username}
                className="w-full h-full object-cover"
                width={128}
                height={128}
                crop="square"
                priority
              />
            </div>
            <div className="absolute -bottom-2 right-0 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-pink-500 shadow-lg">
              <Heart
                size={16}
                className="text-white fill-white"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsEditing(true)}
              className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border border-gray-100 bg-white text-gray-400 shadow-md hover:text-pink-500"
            >
              <Edit2 size={14} />
            </motion.button>
          </div>
          <h2 className="mt-4 text-xl font-black text-gray-800 tracking-tight">
            {user.username} ✨
          </h2>
          {user.bio && (
            <p className="mt-2 text-sm text-gray-500 font-medium px-8 text-center leading-relaxed">
              {user.bio}
            </p>
          )}
          <p className="text-[10px] font-black text-pink-400 uppercase tracking-[0.2em] mt-3 bg-pink-50 px-3 py-1 rounded-full border border-pink-100">
            {user.email}
          </p>
        </header>

        {/* Relationship Card */}
        <div className="px-6 -mt-6">
          <div className="bg-gradient-to-r from-pink-400 to-purple-400 rounded-[32px] p-5 shadow-xl shadow-purple-100/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-white/30 backdrop-blur-sm">
                  <AppImage
                    src={partnerAvatar}
                    alt={partner?.username || '另一半'}
                    className="w-full h-full object-cover"
                    width={80}
                    height={80}
                    crop="square"
                  />
                </div>
                <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-white/30 backdrop-blur-sm flex items-center justify-center">
                  <AppImage
                    src={userAvatar}
                    alt={user.username}
                    className="w-full h-full object-cover"
                    width={80}
                    height={80}
                    crop="square"
                  />
                </div>
              </div>
              <div>
                <p className="text-xs font-black text-on-accent">
                  已锁定：{partner?.username || '另一半'}
                </p>
                <p className="text-[9px] font-bold text-on-accent/70 uppercase tracking-widest mt-0.5">
                  Lover Joined Forever
                </p>
              </div>
            </div>
            <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/30 bg-white/20 text-on-accent backdrop-blur-md">
              <Settings size={18} />
            </button>
          </div>
        </div>

        {/* Couple Profile Section */}
        {couple && (
          <div className="px-6 mt-6">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white/60 backdrop-blur-md rounded-[32px] p-6 border border-white shadow-sm flex flex-col items-center"
            >
              <div className="relative w-full">
                <div className="w-full h-32 rounded-2xl overflow-hidden bg-pink-50/50 mb-4 border border-pink-100/50">
                  {couple.coverImage ? (
                    <AppImage
                      src={couple.coverImage}
                      className="w-full h-full object-cover"
                      alt="Cover"
                      width={720}
                      height={320}
                      crop="cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-pink-200">
                      <Heart
                        size={32}
                        className="fill-current"
                      />
                    </div>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsEditingCouple(true)}
                  className="absolute right-2 top-2 flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white/80 text-gray-400 shadow-sm backdrop-blur-sm hover:text-pink-500"
                >
                  <Edit2 size={12} />
                </motion.button>
              </div>

              <h3 className="text-lg font-black text-gray-800">
                {couple.name || '我们的约定'}
              </h3>
              <p className="text-xs text-gray-400 mt-1 font-medium italic text-center px-4">
                {couple.bio || '还没有写下属于我们的简介呢...'}
              </p>

              <div className="mt-4 flex items-center gap-4 bg-pink-50/30 px-4 py-2 rounded-2xl border border-pink-100/30">
                <div className="flex -space-x-3">
                  <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-white/30 backdrop-blur-sm">
                    <AppImage
                      src={partnerAvatar}
                      alt={partner?.username || '另一半'}
                      className="w-full h-full object-cover"
                      width={64}
                      height={64}
                      crop="square"
                    />
                  </div>
                  <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-white/30 backdrop-blur-sm">
                    <AppImage
                      src={userAvatar}
                      className="w-full h-full object-cover"
                      alt={user.username}
                      width={64}
                      height={64}
                      crop="square"
                    />
                  </div>
                </div>
                <div className="text-[10px] font-black text-pink-400 uppercase tracking-widest">
                  正在相伴中
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Menu List */}
        <div className="px-6 mt-8 space-y-4 pb-32">
          <div className="bg-white/70 backdrop-blur-md rounded-[32px] border border-white/60 p-2 overflow-hidden shadow-sm">
            {menuItems.map((item, idx) => (
              <motion.button
                whileTap={{ scale: 0.98 }}
                key={idx}
                onClick={item.action}
                className={`w-full p-4 flex items-center justify-between group ${idx !== menuItems.length - 1 ? 'border-b border-gray-50' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center ${item.color}`}
                  >
                    <item.icon size={18} />
                  </div>
                  <span className="text-sm font-bold text-gray-700">
                    {item.label}
                  </span>
                </div>
                <ChevronRight
                  size={18}
                  className="text-gray-300 group-hover:text-pink-300 transition-colors"
                />
              </motion.button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={onUnbind}
              className="w-full bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center justify-center gap-2 text-red-400 group hover:bg-red-500 hover:text-white transition-all duration-300"
            >
              <HeartOff size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                解绑
              </span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleLogout}
              className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-center gap-2 text-gray-400 group hover:bg-gray-800 hover:text-white transition-all duration-300"
            >
              <LogOut size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                登出
              </span>
            </motion.button>
          </div>

          {/* 管理员入口 */}
          {user?.role === 'admin' && (
            <div className="mb-4">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  window.location.hash = '#/admin'
                }}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 p-4 rounded-2xl flex items-center justify-center gap-2 text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-purple-200 transition-all active:scale-95"
              >
                <Shield size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                  管理后台
                </span>
              </motion.button>
            </div>
          )}
        </div>

        {/* Edit Profile Modal */}
        <AnimatePresence>
          {isEditing && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-gray-800">编辑资料</h3>
                  <button
                    onClick={closeProfileModal}
                    className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form
                  onSubmit={handleUpdateProfile}
                  className="space-y-6"
                >
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full border-2 border-pink-100 shadow-inner overflow-hidden bg-gray-50 flex items-center justify-center">
                        {formData.avatar ? (
                          <AppImage
                            src={formData.avatar}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            width={128}
                            height={128}
                            crop="square"
                          />
                        ) : (
                          <AppImage
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formData.username)}`}
                            alt="Preview"
                            width={128}
                            height={128}
                          />
                        )}
                      </div>
                      <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-pink-500 rounded-full border-2 border-white flex items-center justify-center text-white cursor-pointer shadow-lg hover:bg-pink-600 transition-colors">
                        {imageUploading ? (
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        ) : (
                          <Camera size={14} />
                        )}
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleFileChange}
                          disabled={imageUploading}
                        />
                      </label>
                    </div>
                    {imageUploading && (
                      <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-pink-400">
                        正在上传...
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        昵称
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            username: e.target.value
                          }))
                        }
                        placeholder="设置一个好听的昵称..."
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-700 placeholder:text-gray-300 focus:ring-2 focus:ring-pink-100 transition-all"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        个人简介
                      </label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            bio: e.target.value
                          }))
                        }
                        placeholder="写点什么，让另一半更懂你..."
                        rows={3}
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-700 placeholder:text-gray-300 focus:ring-2 focus:ring-pink-100 transition-all resize-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-pink-400 to-purple-400 text-on-accent p-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-accent disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
                  >
                    {loading ? '正在保存...' : '确认更改'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Couple Profile Modal */}
        <AnimatePresence>
          {isEditingCouple && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl overflow-hidden"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-gray-800">情侣资料</h3>
                  <button
                    onClick={closeCoupleModal}
                    className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                <form
                  onSubmit={handleUpdateCoupleProfile}
                  className="space-y-6"
                >
                  <div className="flex flex-col items-center">
                    <div className="relative w-full">
                      <div className="w-full h-32 rounded-2xl border-2 border-pink-100 shadow-inner overflow-hidden bg-gray-50 flex items-center justify-center">
                        {coupleData.coverImage ? (
                          <AppImage
                            src={coupleData.coverImage}
                            alt="Cover Preview"
                            className="w-full h-full object-cover"
                            width={720}
                            height={320}
                            crop="cover"
                          />
                        ) : (
                          <Heart
                            size={32}
                            className="text-pink-100"
                          />
                        )}
                      </div>
                      <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-accent rounded-full border-2 border-white flex items-center justify-center text-on-accent cursor-pointer shadow-lg hover:bg-pink-600 transition-colors">
                        {imageUploading ? (
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        ) : (
                          <Camera size={14} />
                        )}
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => handleFileChange(e, true)}
                          disabled={imageUploading}
                        />
                      </label>
                    </div>
                    {imageUploading && (
                      <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-pink-400">
                        正在上传...
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        情侣空间名称
                      </label>
                      <input
                        type="text"
                        value={coupleData.name}
                        onChange={(e) =>
                          setCoupleData((prev) => ({
                            ...prev,
                            name: e.target.value
                          }))
                        }
                        placeholder="如：我们的温馨小屋"
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-700 placeholder:text-gray-300 focus:ring-2 focus:ring-pink-100 transition-all"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        关系宣言
                      </label>
                      <textarea
                        value={coupleData.bio}
                        onChange={(e) =>
                          setCoupleData((prev) => ({
                            ...prev,
                            bio: e.target.value
                          }))
                        }
                        placeholder="写下你们的爱情格言..."
                        rows={3}
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-700 placeholder:text-gray-300 focus:ring-2 focus:ring-pink-100 transition-all resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        恋爱开始日期
                      </label>
                      <input
                        type="date"
                        value={coupleData.startDate}
                        onChange={(e) =>
                          setCoupleData((prev) => ({
                            ...prev,
                            startDate: e.target.value
                          }))
                        }
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-pink-100 transition-all"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-pink-400 to-purple-400 text-on-accent p-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-accent disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
                  >
                    {loading ? '正在保存...' : '确认更改'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit AI Config Modal */}
        <AnimatePresence>
          {isEditingAi && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                className="bg-white w-full max-w-md rounded-[40px] p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                    <Sparkles
                      size={18}
                      className="text-indigo-500"
                    />{' '}
                    AI 配置
                  </h3>
                  <button
                    onClick={closeAiModal}
                    className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {!aiConfig ? (
                  <div className="py-12 text-center text-sm text-gray-400">
                    加载中...
                  </div>
                ) : (
                  <div className="space-y-5">
                    <label className="flex items-center justify-between p-3 bg-indigo-50 rounded-2xl cursor-pointer">
                      <div>
                        <p className="text-sm font-black text-indigo-700">
                          启用应用内 AI 配置
                        </p>
                        <p className="text-[11px] text-indigo-400 mt-0.5">
                          关闭时使用 .env 默认配置
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={aiConfig.enabled}
                        onChange={(e) =>
                          setAiConfig({
                            ...aiConfig,
                            enabled: e.target.checked
                          })
                        }
                        className="w-5 h-5 accent-indigo-500"
                      />
                    </label>

                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                        当前使用的 Provider
                      </label>
                      <select
                        value={aiConfig.provider}
                        onChange={(e) =>
                          setAiConfig({
                            ...aiConfig,
                            provider: e.target.value as AiProvider
                          })
                        }
                        className="w-full mt-1.5 bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="openai-compatible">
                          OpenAI 兼容 (含 DeepSeek / Moonshot 等)
                        </option>
                        <option value="gemini">Google Gemini</option>
                        <option value="claude">Anthropic Claude</option>
                      </select>
                    </div>

                    {/* OpenAI-compatible */}
                    <div className="rounded-2xl border border-gray-100 p-4 space-y-3">
                      <p className="text-xs font-black text-gray-700">
                        OpenAI 兼容
                      </p>
                      <input
                        type="text"
                        placeholder="Base URL（如 https://api.openai.com/v1）"
                        value={aiConfig.openai.baseUrl}
                        onChange={(e) =>
                          updateAiField('openai', 'baseUrl', e.target.value)
                        }
                        className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-100"
                      />
                      <div className="relative">
                        <input
                          type={showOpenaiKey ? 'text' : 'password'}
                          placeholder="API Key"
                          value={aiConfig.openai.apiKey}
                          onChange={(e) =>
                            updateAiField('openai', 'apiKey', e.target.value)
                          }
                          className="w-full bg-gray-50 border-none rounded-xl p-3 pr-10 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-100"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {showOpenaiKey ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            list="openai-model-list"
                            placeholder="模型名（如 deepseek-v4-flash）"
                            value={aiConfig.openai.model}
                            onChange={(e) =>
                              updateAiField('openai', 'model', e.target.value)
                            }
                            className="w-full bg-gray-50 border-none rounded-xl p-3 pr-8 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-100"
                          />
                          <ChevronDown
                            size={14}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"
                          />
                          {openaiModels.length > 0 && (
                            <datalist id="openai-model-list">
                              {openaiModels.map((m) => (
                                <option
                                  key={m}
                                  value={m}
                                />
                              ))}
                            </datalist>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={fetchOpenaiModels}
                          disabled={loadingOpenai || !aiConfig.openai.baseUrl}
                          className="px-3 rounded-xl bg-indigo-50 text-indigo-500 text-xs font-black flex items-center gap-1 disabled:opacity-40"
                          title={
                            aiConfig.openai.baseUrl
                              ? '拉取可用模型'
                              : '先填写 Base URL'
                          }
                        >
                          <RefreshCw
                            size={12}
                            className={loadingOpenai ? 'animate-spin' : ''}
                          />
                          {loadingOpenai ? '拉取中' : '拉取'}
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Temperature"
                          value={aiConfig.openai.temperature ?? ''}
                          onChange={(e) =>
                            updateAiField(
                              'openai',
                              'temperature',
                              e.target.value === ''
                                ? null
                                : Number(e.target.value)
                            )
                          }
                          className="bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-100"
                        />
                        <input
                          type="number"
                          placeholder="Max tokens"
                          value={aiConfig.openai.maxTokens ?? ''}
                          onChange={(e) =>
                            updateAiField(
                              'openai',
                              'maxTokens',
                              e.target.value === ''
                                ? null
                                : Number(e.target.value)
                            )
                          }
                          className="bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-100"
                        />
                        <input
                          type="number"
                          placeholder="Timeout ms"
                          value={aiConfig.openai.timeoutMs ?? ''}
                          onChange={(e) =>
                            updateAiField(
                              'openai',
                              'timeoutMs',
                              e.target.value === ''
                                ? null
                                : Number(e.target.value)
                            )
                          }
                          className="bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
                    </div>

                    {/* Gemini */}
                    <div className="rounded-2xl border border-gray-100 p-4 space-y-3">
                      <p className="text-xs font-black text-gray-700">
                        Google Gemini
                      </p>
                      <div className="relative">
                        <input
                          type={showGeminiKey ? 'text' : 'password'}
                          placeholder="Gemini API Key"
                          value={aiConfig.gemini.apiKey}
                          onChange={(e) =>
                            updateAiField('gemini', 'apiKey', e.target.value)
                          }
                          className="w-full bg-gray-50 border-none rounded-xl p-3 pr-10 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-100"
                        />
                        <button
                          type="button"
                          onClick={() => setShowGeminiKey(!showGeminiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {showGeminiKey ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            list="gemini-model-list"
                            placeholder="模型名（如 gemini-2.0-flash）"
                            value={aiConfig.gemini.model}
                            onChange={(e) =>
                              updateAiField('gemini', 'model', e.target.value)
                            }
                            className="w-full bg-gray-50 border-none rounded-xl p-3 pr-8 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-100"
                          />
                          <ChevronDown
                            size={14}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"
                          />
                          {geminiModels.length > 0 && (
                            <datalist id="gemini-model-list">
                              {geminiModels.map((m) => (
                                <option
                                  key={m}
                                  value={m}
                                />
                              ))}
                            </datalist>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={fetchGeminiModels}
                          disabled={loadingGemini || !aiConfig.gemini.apiKey}
                          className="px-3 rounded-xl bg-indigo-50 text-indigo-500 text-xs font-black flex items-center gap-1 disabled:opacity-40"
                          title={
                            aiConfig.gemini.apiKey
                              ? '拉取可用模型'
                              : '先填写 API Key'
                          }
                        >
                          <RefreshCw
                            size={12}
                            className={loadingGemini ? 'animate-spin' : ''}
                          />
                          {loadingGemini ? '拉取中' : '拉取'}
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          step="0.1"
                          placeholder="Temperature"
                          value={aiConfig.gemini.temperature ?? ''}
                          onChange={(e) =>
                            updateAiField(
                              'gemini',
                              'temperature',
                              e.target.value === ''
                                ? null
                                : Number(e.target.value)
                            )
                          }
                          className="bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-100"
                        />
                        <input
                          type="number"
                          placeholder="Max tokens"
                          value={aiConfig.gemini.maxTokens ?? ''}
                          onChange={(e) =>
                            updateAiField(
                              'gemini',
                              'maxTokens',
                              e.target.value === ''
                                ? null
                                : Number(e.target.value)
                            )
                          }
                          className="bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-100"
                        />
                        <input
                          type="number"
                          placeholder="Timeout ms"
                          value={aiConfig.gemini.timeoutMs ?? ''}
                          onChange={(e) =>
                            updateAiField(
                              'gemini',
                              'timeoutMs',
                              e.target.value === ''
                                ? null
                                : Number(e.target.value)
                            )
                          }
                          className="bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
                    </div>

                    {/* Claude */}
                    <div className="rounded-2xl border border-gray-100 p-4 space-y-3">
                      <p className="text-xs font-black text-gray-700">
                        Anthropic Claude
                      </p>
                      <div className="relative">
                        <input
                          type={showClaudeKey ? 'text' : 'password'}
                          placeholder="Claude API Key"
                          value={aiConfig.claude.apiKey}
                          onChange={(e) =>
                            updateAiField('claude', 'apiKey', e.target.value)
                          }
                          className="w-full bg-gray-50 border-none rounded-xl p-3 pr-10 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-100"
                        />
                        <button
                          type="button"
                          onClick={() => setShowClaudeKey(!showClaudeKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {showClaudeKey ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            list="claude-model-list"
                            placeholder="模型名（如 claude-sonnet-4-5）"
                            value={aiConfig.claude.model}
                            onChange={(e) =>
                              updateAiField('claude', 'model', e.target.value)
                            }
                            className="w-full bg-gray-50 border-none rounded-xl p-3 pr-8 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-100"
                          />
                          <ChevronDown
                            size={14}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 pointer-events-none"
                          />
                          {claudeModels.length > 0 && (
                            <datalist id="claude-model-list">
                              {claudeModels.map((m) => (
                                <option
                                  key={m}
                                  value={m}
                                />
                              ))}
                            </datalist>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={fetchClaudeModels}
                          disabled={loadingClaude}
                          className="px-3 rounded-xl bg-indigo-50 text-indigo-500 text-xs font-black flex items-center gap-1 disabled:opacity-40"
                          title="加载 Claude 推荐模型"
                        >
                          <RefreshCw
                            size={12}
                            className={loadingClaude ? 'animate-spin' : ''}
                          />
                          {loadingClaude ? '加载中' : '推荐'}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="Max tokens"
                          value={aiConfig.claude.maxTokens ?? ''}
                          onChange={(e) =>
                            updateAiField(
                              'claude',
                              'maxTokens',
                              e.target.value === ''
                                ? null
                                : Number(e.target.value)
                            )
                          }
                          className="bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-100"
                        />
                        <input
                          type="number"
                          placeholder="Timeout ms"
                          value={aiConfig.claude.timeoutMs ?? ''}
                          onChange={(e) =>
                            updateAiField(
                              'claude',
                              'timeoutMs',
                              e.target.value === ''
                                ? null
                                : Number(e.target.value)
                            )
                          }
                          className="bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveAiConfig}
                      disabled={aiSaving}
                      className="w-full bg-gradient-to-r from-indigo-400 to-purple-400 text-on-accent p-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-accent disabled:opacity-50 disabled:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Save size={16} />
                      {aiSaving ? '保存中...' : '保存 AI 配置'}
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Theme Config Modal */}
        <ThemeConfigModal
          open={isEditingTheme}
          onClose={() => setIsEditingTheme(false)}
        />
      </div>
      {/* Notification Config Modal */}
      <AnimatePresence>
        {isEditingNotification && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-lg rounded-[40px] p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-500">
                    <Bell size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-800">
                      通知提醒
                    </h3>
                    <p className="text-xs text-gray-400 font-bold">
                      管理你的提醒设置
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditingNotification(false)}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {!notificationConfig ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2
                    size={24}
                    className="animate-spin text-blue-400"
                  />
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Calendar
                          size={16}
                          className="text-blue-500"
                        />
                        <span className="text-sm font-black text-gray-800">
                          纪念日提醒
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setNotificationConfig((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  anniversaryReminder: {
                                    ...prev.anniversaryReminder,
                                    enabled: !prev.anniversaryReminder.enabled
                                  }
                                }
                              : prev
                          )
                        }
                        className={`w-11 h-6 rounded-full transition-colors relative ${
                          notificationConfig.anniversaryReminder.enabled
                            ? 'bg-blue-400'
                            : 'bg-gray-200'
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                            notificationConfig.anniversaryReminder.enabled
                              ? 'left-6'
                              : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                    {notificationConfig.anniversaryReminder.enabled && (
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-xs text-gray-500 font-bold">
                          提前
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={30}
                          value={
                            notificationConfig.anniversaryReminder.daysBefore
                          }
                          onChange={(e) =>
                            setNotificationConfig((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    anniversaryReminder: {
                                      ...prev.anniversaryReminder,
                                      daysBefore: parseInt(e.target.value) || 0
                                    }
                                  }
                                : prev
                            )
                          }
                          className="w-16 bg-white border border-blue-100 rounded-xl p-2 text-center text-sm font-black text-gray-700"
                        />
                        <span className="text-xs text-gray-500 font-bold">
                          天提醒
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Star
                          size={16}
                          className="text-blue-500"
                        />
                        <span className="text-sm font-black text-gray-800">
                          每日评分提醒
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setNotificationConfig((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  dailyRating: {
                                    ...prev.dailyRating,
                                    enabled: !prev.dailyRating.enabled
                                  }
                                }
                              : prev
                          )
                        }
                        className={`w-11 h-6 rounded-full transition-colors relative ${
                          notificationConfig.dailyRating.enabled
                            ? 'bg-blue-400'
                            : 'bg-gray-200'
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                            notificationConfig.dailyRating.enabled
                              ? 'left-6'
                              : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                    {notificationConfig.dailyRating.enabled && (
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-xs text-gray-500 font-bold">
                          每天
                        </span>
                        <input
                          type="time"
                          value={notificationConfig.dailyRating.time}
                          onChange={(e) =>
                            setNotificationConfig((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    dailyRating: {
                                      ...prev.dailyRating,
                                      time: e.target.value
                                    }
                                  }
                                : prev
                            )
                          }
                          className="bg-white border border-blue-100 rounded-xl p-2 text-sm font-black text-gray-700"
                        />
                        <span className="text-xs text-gray-500 font-bold">
                          提醒评分
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check
                          size={16}
                          className="text-blue-500"
                        />
                        <span className="text-sm font-black text-gray-800">
                          待办提醒
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          setNotificationConfig((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  todoReminder: {
                                    ...prev.todoReminder,
                                    enabled: !prev.todoReminder.enabled
                                  }
                                }
                              : prev
                          )
                        }
                        className={`w-11 h-6 rounded-full transition-colors relative ${
                          notificationConfig.todoReminder.enabled
                            ? 'bg-blue-400'
                            : 'bg-gray-200'
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                            notificationConfig.todoReminder.enabled
                              ? 'left-6'
                              : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveNotificationConfig}
                    disabled={notifSaving}
                    className="w-full bg-gradient-to-r from-blue-400 to-indigo-400 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-blue-100 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {notifSaving ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <Save size={14} />
                    )}
                    {notifSaving ? '保存中...' : '保存通知设置'}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Privacy Security Modal */}
      <AnimatePresence>
        {isEditingPrivacy && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-lg rounded-[40px] p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-green-100 flex items-center justify-center text-green-500">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-800">
                      隐私安全
                    </h3>
                    <p className="text-xs text-gray-400 font-bold">
                      保护你的甜蜜数据
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditingPrivacy(false)}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex gap-1 mb-5 bg-gray-50 rounded-2xl p-1">
                {[
                  { key: 'info', label: '个人信息', icon: UserIcon },
                  { key: 'password', label: '修改密码', icon: Lock },
                  { key: 'export', label: '数据导出', icon: Download },
                  { key: 'import', label: '数据导入', icon: Upload }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setPrivacyTab(tab.key as any)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all ${
                      privacyTab === tab.key
                        ? 'bg-white text-green-600 shadow-sm'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <tab.icon size={14} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              {privacyTab === 'info' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-green-100 bg-green-50/50 p-5 text-center">
                    <UserIcon
                      size={32}
                      className="mx-auto mb-3 text-green-500"
                    />
                    <p className="text-sm font-black text-gray-800 mb-1">
                      个人信息查看
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed mb-4">
                      查看你在本应用中的基本资料、情侣关系以及相关统计数据。
                    </p>
                    <button
                      type="button"
                      onClick={handleLoadPersonalInfo}
                      disabled={loadingInfo}
                      className="w-full bg-gradient-to-r from-green-400 to-emerald-400 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-green-100 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      {loadingInfo ? (
                        <Loader2
                          size={16}
                          className="animate-spin"
                        />
                      ) : (
                        <Eye size={14} />
                      )}
                      {loadingInfo ? '加载中...' : '查看个人信息'}
                    </button>
                  </div>

                  {personalInfo && (
                    <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5 space-y-3 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-bold">用户名</span>
                        <span className="font-black text-gray-800">
                          {personalInfo.user.username}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-bold">邮箱</span>
                        <span className="font-black text-gray-800">
                          {personalInfo.user.email}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-bold">情侣</span>
                        <span className="font-black text-gray-800">
                          {personalInfo.couple
                            ? `${personalInfo.couple.name || '未命名情侣'}`
                            : '未绑定'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400 font-bold">
                          恋爱天数
                        </span>
                        <span className="font-black text-gray-800">
                          {(() => {
                            const startDate = personalInfo.couple?.startDate
                            if (!startDate) {
                              return `${personalInfo.stats?.days || 0} 天`
                            }
                            const start = new Date(startDate)
                            if (isNaN(start.getTime())) {
                              return `${personalInfo.stats?.days || 0} 天`
                            }
                            const days = Math.max(
                              0,
                              Math.floor(
                                (Date.now() - start.getTime()) /
                                  (1000 * 60 * 60 * 24)
                              )
                            )
                            return `${days} 天`
                          })()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {privacyTab === 'password' && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-black text-gray-400 mb-1.5 block">
                        当前密码
                      </label>
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="输入当前密码"
                        className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-green-100"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 mb-1.5 block">
                        新密码
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="至少 8 位，包含大小写、数字和特殊符号"
                        className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-green-100"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 mb-1.5 block">
                        确认新密码
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="再次输入新密码"
                        className={`w-full bg-gray-50 border-none rounded-xl p-3 text-sm font-bold focus:ring-2 ${
                          confirmPassword && confirmPassword !== newPassword
                            ? 'text-red-600 focus:ring-red-100'
                            : 'text-gray-700 focus:ring-green-100'
                        }`}
                      />
                      {confirmPassword && confirmPassword !== newPassword && (
                        <p className="text-[10px] text-red-500 font-bold">
                          两次密码不一致
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-black text-gray-400">密码强度</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: '大写字母', ok: passwordStrength.hasUpper },
                        { label: '小写字母', ok: passwordStrength.hasLower },
                        { label: '数字', ok: passwordStrength.hasNumber },
                        { label: '特殊符号', ok: passwordStrength.hasSpecial },
                        { label: '至少 8 位', ok: passwordStrength.hasLength }
                      ].map((item) => (
                        <div
                          key={item.label}
                          className={`flex items-center gap-1.5 text-xs font-bold ${
                            item.ok ? 'text-green-600' : 'text-gray-400'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center ${
                              item.ok ? 'bg-green-100' : 'bg-gray-100'
                            }`}
                          >
                            {item.ok ? (
                              <Check size={10} />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                            )}
                          </div>
                          {item.label}
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                    className="w-full bg-gradient-to-r from-green-400 to-emerald-400 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-green-100 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {changingPassword ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <Lock size={14} />
                    )}
                    {changingPassword ? '修改中...' : '确认修改密码'}
                  </button>
                </div>
              )}

              {privacyTab === 'export' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-green-100 bg-green-50/50 p-5 text-center">
                    <Download
                      size={32}
                      className="mx-auto mb-3 text-green-500"
                    />
                    <p className="text-sm font-black text-gray-800 mb-1">
                      导出所有数据
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      将你的所有数据（日记、待办、消息、评分、纪念日、相册等）导出为
                      JSON 文件，方便备份或迁移。
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExportData}
                    disabled={exporting}
                    className="w-full bg-gradient-to-r from-green-400 to-emerald-400 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-green-100 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {exporting ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <Download size={14} />
                    )}
                    {exporting ? '导出中...' : '立即导出数据'}
                  </button>
                </div>
              )}

              {privacyTab === 'import' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-green-100 bg-green-50/50 p-5 text-center">
                    <Upload
                      size={32}
                      className="mx-auto mb-3 text-green-500"
                    />
                    <p className="text-sm font-black text-gray-800 mb-1">
                      导入数据
                    </p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      从之前导出的 JSON 文件恢复数据。导入前请确认文件来源可信。
                    </p>
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={(e) =>
                        setImportFile(e.target.files?.[0] || null)
                      }
                      className="w-full text-xs font-bold text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-green-100 file:text-green-600 file:font-black hover:file:bg-green-200 transition-all"
                    />
                    {importFile && (
                      <p className="text-[10px] text-green-600 font-bold mt-2">
                        已选择：{importFile.name}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleImportData}
                    disabled={importing || !importFile}
                    className="w-full bg-gradient-to-r from-green-400 to-emerald-400 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-green-100 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {importing ? (
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <Upload size={14} />
                    )}
                    {importing ? '导入中...' : '开始导入'}
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Help & Feedback Modal */}
      <AnimatePresence>
        {isEditingHelp && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="bg-white w-full max-w-lg rounded-[40px] p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-500">
                    <HelpCircle size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-800">
                      帮助反馈
                    </h3>
                    <p className="text-xs text-gray-400 font-bold">
                      功能介绍与问题反馈
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditingHelp(false)}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-5">
                <div className="rounded-2xl border border-orange-100 bg-orange-50/50 p-5">
                  <h4 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
                    <MessageSquare
                      size={16}
                      className="text-orange-500"
                    />
                    应用功能介绍
                  </h4>
                  <ul className="space-y-2.5 text-xs text-gray-600 leading-relaxed">
                    <li className="flex gap-2">
                      <span className="text-orange-500 font-black">•</span>
                      <span>
                        <strong>甜蜜首页</strong>
                        ：查看恋爱天数、今日心情、纪念日提醒、每日评分和待办事项。
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-orange-500 font-black">•</span>
                      <span>
                        <strong>每日签到 & 积分</strong>
                        ：双方各自打卡累计连续天数，获得连续天数 ×
                        基础分的积分；积分可在情侣间互转。
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-orange-500 font-black">•</span>
                      <span>
                        <strong>积分商城 & 情侣券</strong>
                        ：用积分兑换奖励券、惩罚券、活动券或自定义券；券可赠送给对方，支持使用与过期管理。
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-orange-500 font-black">•</span>
                      <span>
                        <strong>恋爱日记</strong>
                        ：记录两人之间的心情点滴，支持图文和纪念日。
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-orange-500 font-black">•</span>
                      <span>
                        <strong>相册回忆</strong>
                        ：上传和管理照片、视频，支持轮播封面和地点标记。
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-orange-500 font-black">•</span>
                      <span>
                        <strong>100件小事</strong>
                        ：一起完成属于情侣的100件浪漫小事。
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-orange-500 font-black">•</span>
                      <span>
                        <strong>纪念日期</strong>：记录并提醒每一个重要的日子。
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-orange-500 font-black">•</span>
                      <span>
                        <strong>今日点餐</strong>：解决“今天吃什么”的选择困难。
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-orange-500 font-black">•</span>
                      <span>
                        <strong>温馨厨房</strong>
                        ：管理菜谱、购物清单和做饭打卡。
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-orange-500 font-black">•</span>
                      <span>
                        <strong>姨妈助手</strong>
                        ：记录经期、预测周期并生成贴心照顾待办。
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-orange-500 font-black">•</span>
                      <span>
                        <strong>留言便签</strong>：给 Ta
                        发送文字、图片和语音留言。
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-orange-500 font-black">•</span>
                      <span>
                        <strong>主题装扮 & AI 配置</strong>
                        ：自定义界面主题色，配置 AI 助手辅助生成内容。
                      </span>
                    </li>
                    <li className="flex gap-2">
                      <span className="text-orange-500 font-black">•</span>
                      <span>
                        <strong>隐私安全</strong>
                        ：查看个人信息、修改密码、导出/导入数据备份。
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-gray-50/50 p-5">
                  <h4 className="text-sm font-black text-gray-800 mb-2 flex items-center gap-2">
                    <Mail
                      size={16}
                      className="text-orange-500"
                    />
                    遇到问题？
                  </h4>
                  <p className="text-xs text-gray-500 leading-relaxed mb-4">
                    如果在使用过程中发现 Bug
                    或有任何建议，欢迎联系管理员，我们会尽快处理。
                  </p>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 font-bold mb-0.5">
                        管理员邮箱
                      </p>
                      <p className="text-sm font-black text-gray-800 truncate">
                        2436136932@qq.com
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText('2436136932@qq.com')
                        showToast('邮箱已复制', 'success')
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-100 text-orange-600 text-xs font-black hover:bg-orange-200 transition-colors"
                    >
                      <Copy size={14} />
                      复制
                    </button>
                    <a
                      href="mailto:2436136932@qq.com"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-800 text-white text-xs font-black hover:bg-gray-700 transition-colors"
                    >
                      <Mail size={14} />
                      发送邮件
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

/** 主题装扮弹窗 */
function ThemeConfigModal({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}) {
  const { selectedColor, setSelectedColor, saveTheme, presets, activeTheme } =
    useTheme()
  const { showToast } = useToast()
  const closeThemeModal = useModalHistory('theme-config', open, onClose)
  const [customHex, setCustomHex] = useState(selectedColor)
  const [customMode, setCustomMode] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setCustomHex(selectedColor)
  }, [selectedColor])

  const handleApplyPreset = async (hex: string) => {
    setSelectedColor(hex)
    setCustomMode(false)
    try {
      await saveTheme()
      showToast('主题已更新', 'success')
    } catch {
      showToast('保存失败', 'error')
    }
  }

  const handleSaveCustom = async () => {
    let hex = customHex.trim().toUpperCase()
    if (!hex.startsWith('#')) hex = '#' + hex
    if (!/^#[0-9A-F]{6}$/.test(hex)) {
      showToast('请输入有效的 HEX 颜色（如 #FF6B9D）', 'error')
      return
    }
    setSaving(true)
    try {
      setSelectedColor(hex)
      setCustomMode(true)
      await saveTheme()
      showToast('主题已更新', 'success')
    } catch {
      showToast('保存失败', 'error')
    } finally {
      setSaving(false)
    }
  }

  const palette = activeTheme.palette

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="bg-white w-full max-w-sm rounded-[40px] p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                <Palette
                  size={18}
                  className="text-pink-500"
                />
                主题装扮
              </h3>
              <button
                onClick={closeThemeModal}
                className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* 预览色板 */}
            <div className="rounded-2xl overflow-hidden border border-gray-100 mb-5">
              <div
                className="h-20 flex items-center justify-center text-on-accent font-black text-lg"
                style={{
                  background: `linear-gradient(135deg, ${palette['200']}, ${palette['500']})`
                }}
              >
                主题预览 · {selectedColor}
              </div>
            </div>

            {/* 预设色板 */}
            <div className="mb-5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-3">
                预设色板
              </p>
              <div className="grid grid-cols-4 gap-2">
                {presets.map((p) => {
                  const isSelected = selectedColor === p.hex
                  const derived = deriveTheme(p.hex)
                  return (
                    <button
                      key={p.key}
                      onClick={() => handleApplyPreset(p.hex)}
                      className={`relative flex flex-col items-center gap-1 p-1 rounded-2xl transition-all ${
                        isSelected
                          ? 'ring-2 ring-pink-400 bg-pink-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div
                        className="w-full h-10 rounded-xl shadow-sm"
                        style={{
                          background: `linear-gradient(135deg, ${derived.palette['200']}, ${derived.palette['500']})`
                        }}
                      />
                      <span className="text-[9px] font-black text-gray-500">
                        {p.name}
                      </span>
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center text-white">
                          <Check size={10} />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 自定义颜色 */}
            <div className="rounded-2xl border border-gray-100 p-4">
              <button
                type="button"
                onClick={() => setCustomMode(!customMode)}
                className="flex items-center justify-between w-full text-left mb-3"
              >
                <span className="text-xs font-black text-gray-700">
                  {customMode ? '编辑自定义颜色' : '自定义颜色'}
                </span>
                <ChevronRight
                  size={16}
                  className={`text-gray-300 transition-transform ${customMode ? 'rotate-90' : ''}`}
                />
              </button>
              {customMode && (
                <div className="space-y-3">
                  <div className="flex gap-2 items-center">
                    <div
                      className="w-12 h-12 rounded-xl shadow-inner border border-gray-100 flex-shrink-0"
                      style={{ backgroundColor: customHex }}
                    />
                    <input
                      type="text"
                      value={customHex}
                      onChange={(e) => setCustomHex(e.target.value)}
                      placeholder="#FF6B9D"
                      className="flex-1 bg-gray-50 border-none rounded-xl p-3 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-pink-100"
                      maxLength={7}
                    />
                  </div>
                  <input
                    type="color"
                    value={customHex}
                    onChange={(e) => setCustomHex(e.target.value.toUpperCase())}
                    className="w-full h-10 rounded-xl cursor-pointer border-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveCustom}
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-pink-400 to-purple-400 text-on-accent p-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-accent disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : (
                      <Save size={14} />
                    )}
                    应用自定义主题
                  </button>
                </div>
              )}
            </div>

            <p className="mt-4 text-[10px] font-bold text-gray-400 text-center">
              主题颜色将应用到整个应用界面，双方同步可见
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
