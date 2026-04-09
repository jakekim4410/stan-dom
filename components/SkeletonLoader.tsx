'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function SkeletonLoader() {
  return (
    <div className="space-y-4 w-full">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="glassmorphism rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden bg-white/5 border-white/5">
          <motion.div 
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shadow-[0_0_20px_rgba(255,255,255,0.05)]"
          />
          <div className="w-8 h-8 rounded-lg bg-white/5 flex-shrink-0" />
          <div className="w-12 h-12 rounded-xl bg-white/5 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-24 bg-white/5 rounded" />
            <div className="h-3 w-48 bg-white/5 rounded-full" />
          </div>
          <div className="w-10 h-10 rounded-full bg-white/5 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}
