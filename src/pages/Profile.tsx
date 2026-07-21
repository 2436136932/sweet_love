import { motion, AnimatePresence } from 'motion/react';
import { Settings, Shield, Palette, HelpCircle, ChevronRight, Heart, HeartOff, Moon, Bell, LogOut, Edit2, X, Camera, Users } from 'lucide-react';
import React, { useState } from 'react';
import { User, Couple } from '../types';
import { authService, userService, coupleService, uploadService } from '../services/api';
import { useToast } from '../components/Toast';
import { useModalHistory } from '../hooks/useModalHistory';
import { AppImage } from '../components/AppImage';

export default function Profile({ 
  user, 
  couple,
  onLogout, 
  onUnbind, 
  onUpdateUser,
  onUpdateCouple
}: { 
  user: User, 
  couple: Couple | null,
  onLogout: () => void, 
  onUnbind: () => Promise<void> | void,
  onUpdateUser: (user: User) => void,
  onUpdateCouple: (couple: Couple) => void
}) {
  const { showToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingCouple, setIsEditingCouple] = useState(false);
  const partner = user.partner;
  const userAvatar = user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.username)}`;
  const partnerAvatar = partner?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(partner?.username || 'partner')}`;
  
  const [formData, setFormData] = useState({
    username: user.username,
    bio: user.bio || '',
    avatar: user.avatar || ''
  });

  const [coupleData, setCoupleData] = useState({
    name: couple?.name || '',
    bio: couple?.bio || '',
    coverImage: couple?.coverImage || '',
    startDate: couple?.startDate || ''
  });

  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const closeProfileModal = useModalHistory('profile-edit', isEditing, () => setIsEditing(false));
  const closeCoupleModal = useModalHistory('profile-couple-edit', isEditingCouple, () => setIsEditingCouple(false));

  React.useEffect(() => {
    if (user) {
      setFormData({
        username: user.username,
        bio: user.bio || '',
        avatar: user.avatar || ''
      });
    }
  }, [user]);

  React.useEffect(() => {
    if (couple) {
      setCoupleData({
        name: couple.name || '',
        bio: couple.bio || '',
        coverImage: couple.coverImage || '',
        startDate: couple.startDate || ''
      });
    }
  }, [couple]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updatedUser = await userService.updateProfile(formData);
      onUpdateUser(updatedUser);
      setIsEditing(false);
      showToast('个人资料已保存', 'success');
    } catch (error) {
      console.error("Update profile failed:", error);
      showToast(error instanceof Error ? error.message : '更新资料失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCoupleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updatedCouple = await coupleService.update(coupleData);
      onUpdateCouple(updatedCouple);
      setIsEditingCouple(false);
      showToast('情侣资料已保存', 'success');
    } catch (error) {
      console.error("Update couple profile failed:", error);
      showToast(error instanceof Error ? error.message : '更新情侣资料失败，请重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isCouple: boolean = false) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageUploading(true);
      try {
        const url = await uploadService.upload(file);
        if (isCouple) {
          setCoupleData(prev => ({ ...prev, coverImage: url }));
        } else {
          setFormData(prev => ({ ...prev, avatar: url }));
        }
        showToast('图片已上传，请保存资料', 'success');
      } catch (error) {
        console.error("Upload profile image failed:", error);
        showToast(error instanceof Error ? error.message : '上传失败，请检查图片格式或大小', 'error');
      } finally {
        setImageUploading(false);
      }
    }
  };

  const menuItems = [
    { icon: Palette, label: '主题装扮', color: 'bg-pink-100 text-pink-500' },
    { icon: Bell, label: '通知提醒', color: 'bg-blue-100 text-blue-500' },
    { icon: Moon, label: '沉浸模式', color: 'bg-purple-100 text-purple-500' },
    { icon: Shield, label: '隐私安全', color: 'bg-green-100 text-green-500' },
    { icon: HelpCircle, label: '帮助反馈', color: 'bg-orange-100 text-orange-500' },
  ];

  const handleLogout = () => {
    authService.logout();
    onLogout();
  };

  return (
    <div className="flex min-h-full flex-col bg-[#FEF9F3]/30 relative">
      <header className="px-6 pt-12 pb-8 bg-white/60 backdrop-blur-md rounded-b-[48px] border-b border-white shadow-sm flex flex-col items-center">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl overflow-hidden bg-gray-100 flex items-center justify-center">
            <AppImage src={userAvatar} alt={user.username} className="w-full h-full object-cover" width={128} height={128} crop="square" priority />
          </div>
          <div className="absolute -bottom-2 right-0 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-pink-500 shadow-lg">
            <Heart size={16} className="text-white fill-white" />
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
        <h2 className="mt-4 text-xl font-black text-gray-800 tracking-tight">{user.username} ✨</h2>
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
                <AppImage src={partnerAvatar} alt={partner?.username || '另一半'} className="w-full h-full object-cover" width={80} height={80} crop="square" />
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-white/30 backdrop-blur-sm flex items-center justify-center">
                <AppImage src={userAvatar} alt={user.username} className="w-full h-full object-cover" width={80} height={80} crop="square" />
              </div>
            </div>
            <div>
              <p className="text-xs font-black text-white">已锁定：{partner?.username || '另一半'}</p>
              <p className="text-[9px] font-bold text-white/70 uppercase tracking-widest mt-0.5">Lover Joined Forever</p>
            </div>
          </div>
          <button className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/30 bg-white/20 text-white backdrop-blur-md">
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
                  <AppImage src={couple.coverImage} className="w-full h-full object-cover" alt="Cover" width={720} height={320} crop="cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-pink-200">
                    <Heart size={32} className="fill-current" />
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
            
            <h3 className="text-lg font-black text-gray-800">{couple.name || '我们的约定'}</h3>
            <p className="text-xs text-gray-400 mt-1 font-medium italic text-center px-4">
              {couple.bio || '还没有写下属于我们的简介呢...'}
            </p>
            
            <div className="mt-4 flex items-center gap-4 bg-pink-50/30 px-4 py-2 rounded-2xl border border-pink-100/30">
              <div className="flex -space-x-3">
                <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-white/30 backdrop-blur-sm">
                  <AppImage src={partnerAvatar} alt={partner?.username || '另一半'} className="w-full h-full object-cover" width={64} height={64} crop="square" />
                </div>
                <div className="w-8 h-8 rounded-full border-2 border-white overflow-hidden bg-white/30 backdrop-blur-sm">
                  <AppImage src={userAvatar} className="w-full h-full object-cover" alt={user.username} width={64} height={64} crop="square" />
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
              className={`w-full p-4 flex items-center justify-between group ${idx !== menuItems.length - 1 ? 'border-b border-gray-50' : ''}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${item.color}`}>
                  <item.icon size={18} />
                </div>
                <span className="text-sm font-bold text-gray-700">{item.label}</span>
              </div>
              <ChevronRight size={18} className="text-gray-300 group-hover:text-pink-300 transition-colors" />
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
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">解绑</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="w-full bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-center gap-2 text-gray-400 group hover:bg-gray-800 hover:text-white transition-all duration-300"
          >
            <LogOut size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest leading-none">登出</span>
          </motion.button>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
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

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="flex flex-col items-center">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full border-2 border-pink-100 shadow-inner overflow-hidden bg-gray-50 flex items-center justify-center">
                      {formData.avatar ? (
                        <AppImage src={formData.avatar} alt="Preview" className="w-full h-full object-cover" width={128} height={128} crop="square" />
                      ) : (
                        <AppImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(formData.username)}`} alt="Preview" width={128} height={128} />
                      )}
                    </div>
                    <label className="absolute -bottom-1 -right-1 w-8 h-8 bg-pink-500 rounded-full border-2 border-white flex items-center justify-center text-white cursor-pointer shadow-lg hover:bg-pink-600 transition-colors">
                      {imageUploading ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Camera size={14} />}
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={imageUploading} />
                    </label>
                  </div>
                  {imageUploading && <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-pink-400">正在上传...</p>}
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">昵称</label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="设置一个好听的昵称..."
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-700 placeholder:text-gray-300 focus:ring-2 focus:ring-pink-100 transition-all"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">个人简介</label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="写点什么，让另一半更懂你..."
                      rows={3}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-700 placeholder:text-gray-300 focus:ring-2 focus:ring-pink-100 transition-all resize-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-pink-400 to-purple-400 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-pink-100 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
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
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
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

              <form onSubmit={handleUpdateCoupleProfile} className="space-y-6">
                <div className="flex flex-col items-center">
                  <div className="relative w-full">
                    <div className="w-full h-32 rounded-2xl border-2 border-pink-100 shadow-inner overflow-hidden bg-gray-50 flex items-center justify-center">
                      {coupleData.coverImage ? (
                        <AppImage src={coupleData.coverImage} alt="Cover Preview" className="w-full h-full object-cover" width={720} height={320} crop="cover" />
                      ) : (
                        <Heart size={32} className="text-pink-100" />
                      )}
                    </div>
                    <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-pink-500 rounded-full border-2 border-white flex items-center justify-center text-white cursor-pointer shadow-lg hover:bg-pink-600 transition-colors">
                      {imageUploading ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <Camera size={14} />}
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, true)} disabled={imageUploading} />
                    </label>
                  </div>
                  {imageUploading && <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-pink-400">正在上传...</p>}
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">情侣空间名称</label>
                    <input
                      type="text"
                      value={coupleData.name}
                      onChange={(e) => setCoupleData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="如：我们的温馨小屋"
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-700 placeholder:text-gray-300 focus:ring-2 focus:ring-pink-100 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">关系宣言</label>
                    <textarea
                      value={coupleData.bio}
                      onChange={(e) => setCoupleData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="写下你们的爱情格言..."
                      rows={3}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-700 placeholder:text-gray-300 focus:ring-2 focus:ring-pink-100 transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">恋爱开始日期</label>
                    <input
                      type="date"
                      value={coupleData.startDate}
                      onChange={(e) => setCoupleData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-pink-100 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-pink-400 to-purple-400 text-white p-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-pink-100 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
                >
                  {loading ? '正在保存...' : '确认更改'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
