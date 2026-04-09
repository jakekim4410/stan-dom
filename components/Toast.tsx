'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, ShieldCheck, Terminal } from 'lucide-react';

interface ToastProps {
  message: string;
  subMessage?: string;
  isVisible: boolean;
  onClose: () => void;
}

export default function Toast({ message, subMessage, isVisible, onClose }: ToastProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 20, x: '-50%', scale: 0.95 }}
          className="fixed bottom-10 left-1/2 z-[9999] min-w-[280px]"
        >
          <div className="glass-panel p-4 flex items-center gap-4 border-[#37C561]/50 shadow-[0_0_30px_rgba(55,197,97,0.2)]">
            <div className="scanner-line opacity-10" />
            <div className="w-10 h-10 rounded-lg bg-[#37C561]/10 flex items-center justify-center border border-[#37C561]/30">
              <Terminal size={18} className="text-[#37C561]" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black text-white uppercase tracking-wider">{message}</p>
              {subMessage && (
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{subMessage}</p>
              )}
            </div>
            <div className="w-1 h-8 bg-[#37C561]/20 rounded-full ml-2" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
