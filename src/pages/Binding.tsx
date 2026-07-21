import { motion } from 'motion/react';
import { Link as LinkIcon, Heart, LogOut, Send } from 'lucide-react';
import { useEffect, useState } from 'react';
import { User } from '../types';
import { authService } from '../services/api';

export default function Binding({ user, onBound, onLogout }: { user: User, onBound: (updatedUser: User) => void, onLogout: () => void }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const normalizeInviteCode = (value: string) => value.trim().replace(/\s+/g, '').toUpperCase();
  const inviteLink = typeof window === 'undefined' ? '' : `${window.location.origin}?invite=${encodeURIComponent(user.inviteCode)}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const invite = new URLSearchParams(window.location.search).get('invite');
    if (!invite) return;

    const normalizedInvite = normalizeInviteCode(invite);
    setCode(normalizedInvite);
    if (normalizedInvite === user.inviteCode) {
      setError('这是你自己的邀请码，请把它发给 Ta，或输入 Ta 的邀请码。');
    }
  }, [user.inviteCode]);

  const copyText = async (text: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  };

  const handleBind = async () => {
    const inviteCode = normalizeInviteCode(code);
    if (!inviteCode) return;
    if (inviteCode === user.inviteCode) {
      setNotice('');
      setError('不能绑定自己的邀请码，请输入 Ta 的邀请码。');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');
    try {
      const updatedUser = await authService.bind(inviteCode);
      onBound(updatedUser);
    } catch (err: any) {
      setError(err.message || '绑定失败');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    await copyText(user.inviteCode);
    setError('');
    setNotice('已复制邀请码');
  };

  const shareInvite = async () => {
    const text = `${user.username} 邀请你加入 SweetLover，一起开启属于你们的甜蜜空间。\n邀请码：${user.inviteCode}\n链接：${inviteLink}`;
    await copyText(text);
    setError('');
    setNotice('已复制邀请文案和链接');
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center p-6 sm:p-8 font-sans relative">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full bg-white/40 backdrop-blur-xl rounded-[40px] p-8 border border-white/60 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-pink-200/30 blur-2xl rounded-full" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-200/30 blur-2xl rounded-full" />

        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-pink-50 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-pink-100 italic">
            <Heart size={40} className="text-pink-500 fill-pink-500 animate-pulse" />
          </div>
          
          <h1 className="text-2xl font-black text-gray-800 mb-2 tracking-tight">开启甜蜜空间</h1>
          <p className="text-sm text-gray-500 mb-8 leading-relaxed font-medium">把邀请码发给 Ta，或输入 Ta 的邀请码完成绑定。</p>

          <div className="space-y-4">
            <div className="bg-pink-50/50 p-4 rounded-2xl border border-pink-100 flex flex-col items-start gap-1">
              <span className="text-[10px] font-black text-pink-400 uppercase tracking-widest">我的邀请码</span>
              <div className="flex w-full justify-between items-center">
                <span className="text-xl font-bold text-gray-700 font-mono tracking-tighter">{user.inviteCode}</span>
                <button 
                  onClick={copyCode}
                  className="text-xs font-bold text-pink-500 bg-white px-3 py-1 rounded-lg border border-pink-100 shadow-sm transition-all hover:bg-pink-50"
                >
                  复制
                </button>
              </div>
            </div>

            <div className="h-px bg-gray-200/50 my-6 flex items-center justify-center">
              <span className="bg-[#FEF9F3] px-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">OR</span>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="输入 Ta 的邀请码"
                className="w-full bg-white/80 p-4 rounded-2xl border border-white focus:border-pink-300 outline-none text-sm transition-all shadow-sm placeholder:text-gray-300 font-medium"
                value={code}
                onChange={(e) => {
                  setCode(normalizeInviteCode(e.target.value));
                  setError('');
                  setNotice('');
                }}
              />
            </div>

            {notice && (
              <p className="text-emerald-500 text-xs font-bold">{notice}</p>
            )}

            {error && (
              <p className="text-red-500 text-xs font-medium">{error}</p>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleBind}
              disabled={loading || !normalizeInviteCode(code)}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-pink-200 mt-4 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LinkIcon size={18} />
                  立即绑定
                </>
              )}
            </motion.button>
          </div>

          <div className="mt-8 flex justify-center gap-4">
            <button type="button" onClick={shareInvite} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-pink-400 transition-colors">
              <Send size={14} /> 分享邀请
            </button>
            <div className="w-px h-3 bg-gray-300" />
            <button type="button" onClick={onLogout} className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-pink-400 transition-colors">
              <LogOut size={14} /> 切换账号
            </button>
          </div>
        </div>
      </motion.div>
      
      <p className="mt-8 text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] opacity-50">SweetLover App Space</p>
    </div>
  );
}
