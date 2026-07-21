import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, Mail, Lock, User, Sparkles, ArrowRight } from 'lucide-react';
import { authService } from '../services/api';
import { User as UserType } from '../types';

interface AuthProps {
  onSuccess: (user: UserType) => void;
}

export default function Auth({ onSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const data = await authService.login(email, password);
        onSuccess(data.user!);
      } else {
        const data = await authService.register(username, email, password);
        onSuccess(data.user!);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-pink-50 flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl relative overflow-hidden"
      >
        <div className="relative z-10">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-pink-500 rounded-2xl rotate-12 flex items-center justify-center shadow-lg shadow-pink-200">
              <Heart className="text-white fill-current" size={32} />
            </div>
          </div>

          <h1 className="text-3xl font-black text-gray-800 text-center mb-2">
            {isLogin ? '欢迎回来' : '开启恋爱日记'}
          </h1>
          <p className="text-gray-400 text-center mb-10 text-sm font-medium">
            {isLogin ? '愿每一刻浪漫都被温柔记录' : '记录属于你们的每一个甜蜜瞬间'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">昵称</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                      type="text" 
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required={!isLogin}
                      className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-pink-200 transition-all font-medium text-gray-700"
                      placeholder="你的称呼"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-pink-200 transition-all font-medium text-gray-700"
                  placeholder="love@forever.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">密码</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-pink-200 transition-all font-medium text-gray-700"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-xs font-medium text-center">{error}</p>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-pink-500 hover:bg-pink-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-pink-100 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? '处理中...' : (isLogin ? '登录' : '立即加入')}
              <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-gray-400 text-sm font-bold hover:text-pink-500 transition-colors"
            >
              {isLogin ? '还没有账号？去注册' : '已有账号？去登录'}
            </button>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 p-8 text-pink-50 opacity-50">
          <Sparkles size={120} />
        </div>
      </motion.div>
    </div>
  );
}
