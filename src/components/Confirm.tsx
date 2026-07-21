/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createContext, ReactNode, useCallback, useContext, useMemo, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Info } from 'lucide-react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  }, []);

  const value = useMemo(() => ({ confirm }), [confirm]);

  const typeConfig = {
    danger: {
      icon: AlertTriangle,
      iconColor: 'text-rose-500 bg-rose-50 border-rose-100',
      confirmBtn: 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-100/50 focus:ring-rose-100/50',
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-amber-500 bg-amber-50 border-amber-100',
      confirmBtn: 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-100/50 focus:ring-amber-100/50',
    },
    info: {
      icon: Info,
      iconColor: 'text-pink-500 bg-pink-50 border-pink-100',
      confirmBtn: 'bg-pink-500 hover:bg-pink-600 text-white shadow-pink-100/50 focus:ring-pink-100/50',
    },
  };

  const currentType = options?.type || 'danger';
  const config = typeConfig[currentType];
  const IconComponent = config.icon;

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <AnimatePresence>
        {isOpen && options && (
          <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCancel}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl shadow-gray-200/50 backdrop-blur-xl"
            >
              <div className="flex flex-col items-center text-center">
                {/* Icon */}
                <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border ${config.iconColor}`}>
                  <IconComponent size={28} />
                </div>

                {/* Title */}
                <h3 className="mb-2 text-lg font-black text-gray-800 leading-tight">
                  {options.title || '确认操作'}
                </h3>

                {/* Message */}
                <p className="mb-6 text-sm font-bold text-gray-500 leading-relaxed px-2">
                  {options.message}
                </p>

                {/* Actions */}
                <div className="flex w-full gap-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 rounded-2xl border border-gray-100 bg-gray-50/50 py-3 text-sm font-bold text-gray-500 transition-all duration-300 hover:bg-gray-50 active:scale-95 focus:outline-none focus:ring-2 focus:ring-gray-100"
                  >
                    {options.cancelText || '取消'}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    className={`flex-1 rounded-2xl py-3 text-sm font-bold transition-all duration-300 active:scale-95 shadow-lg focus:outline-none focus:ring-2 ${config.confirmBtn}`}
                  >
                    {options.confirmText || '确认'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return context.confirm;
}
