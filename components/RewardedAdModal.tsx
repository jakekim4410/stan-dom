'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PlayCircle, Loader2, Gift } from 'lucide-react';
import { claimAdReward } from '@/actions/claimAdReward';

interface RewardedAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RewardedAdModal({ isOpen, onClose, onSuccess }: RewardedAdModalProps) {
  const [timeLeft, setTimeLeft] = useState(15);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  // 리셋
  useEffect(() => {
    if (isOpen) {
      setTimeLeft(15);
      setIsPlaying(false);
      setIsProcessing(false);
      setRewardClaimed(false);
    }
  }, [isOpen]);

  // 타이머 로직
  useEffect(() => {
    if (!isPlaying || timeLeft <= 0 || rewardClaimed) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAdComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying, timeLeft, rewardClaimed]);

  const handleAdComplete = async () => {
    setIsProcessing(true);
    const res = await claimAdReward();
    setIsProcessing(false);

    if (res.success) {
      setRewardClaimed(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } else {
      alert(res.error || 'Failed to claim reward. Please try again later.');
      onClose();
    }
  };

  const handleCloseAttempt = () => {
    if (isPlaying && !rewardClaimed) {
      const confirmClose = window.confirm("If you close now, you won't get the reward. Are you sure?");
      if (!confirmClose) return;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/90 backdrop-blur-md"
          onClick={handleCloseAttempt}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/5">
            <h3 className="text-white font-bold flex items-center gap-2">
              <Gift className="text-[var(--neon-lime)]" size={18} />
              Sponsored Ad
            </h3>
            <button
              onClick={handleCloseAttempt}
              className="text-zinc-500 hover:text-white transition-colors p-1"
            >
              <X size={20} />
            </button>
          </div>

          {/* Ad Content */}
          <div className="relative aspect-video bg-black flex flex-col items-center justify-center p-6 text-center">
            {rewardClaimed ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-16 h-16 rounded-full bg-[var(--neon-lime)]/20 flex items-center justify-center">
                  <Gift size={32} className="text-[var(--neon-lime)]" />
                </div>
                <div>
                  <h4 className="text-white font-bold text-xl mb-1">Reward Claimed!</h4>
                  <p className="text-[var(--neon-lime)] font-black text-lg">+3 Voltage</p>
                </div>
              </motion.div>
            ) : isPlaying ? (
              <div className="flex flex-col items-center gap-6">
                <div className="relative w-20 h-20">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                    <circle
                      cx="50" cy="50" r="45"
                      fill="none"
                      stroke="var(--neon-lime)"
                      strokeWidth="4"
                      strokeDasharray="283"
                      strokeDashoffset={283 - (283 * (15 - timeLeft)) / 15}
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-black text-white">{timeLeft}</span>
                  </div>
                </div>
                <p className="text-zinc-400 text-sm font-medium">Please wait while the ad plays...</p>
                
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-[var(--neon-lime)] animate-spin" />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <p className="text-zinc-300 font-medium">Watch a short video to earn <br/><span className="text-[var(--neon-lime)] font-black">+3 Voltage</span></p>
                <button
                  onClick={() => setIsPlaying(true)}
                  className="flex items-center gap-2 px-6 py-3 bg-[var(--neon-lime)] text-black rounded-xl font-black hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(var(--neon-lime-rgb),0.3)]"
                >
                  <PlayCircle size={20} />
                  Watch Ad Now
                </button>
              </div>
            )}
          </div>
          
          {/* Ad Footer (mock) */}
          <div className="p-3 bg-white/5 text-center">
            <p className="text-[10px] text-zinc-500">Google AdSense placeholder</p>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
