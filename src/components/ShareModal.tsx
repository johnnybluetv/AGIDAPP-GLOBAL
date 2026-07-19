import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Share2, Sparkles } from "lucide-react";
import SocialShare from "./SocialShare";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
  text?: string;
  image?: string;
}

export default function ShareModal({
  isOpen,
  onClose,
  url,
  title,
  text,
  image,
}: ShareModalProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-lg bg-slate-950 border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl z-10"
          >
            {/* Header */}
            <div className="relative p-6 border-b border-slate-900 flex items-center justify-between bg-slate-900/40">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <Share2 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-tight flex items-center gap-1.5">
                    Share Content
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                    Spread the word across the web
                  </p>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-colors border border-slate-900"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              <div className="bg-slate-900/30 p-4 border border-slate-900 rounded-2xl">
                <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Sharing Article</span>
                <h4 className="text-sm font-bold text-white mt-1 line-clamp-2 leading-snug">
                  {title}
                </h4>
              </div>

              {/* Centralized Social Share */}
              <SocialShare
                url={url}
                title={title}
                text={text}
                image={image}
                variant="full"
              />
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-900/20 border-t border-slate-900 text-center">
              <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
                Agidapp Global Content Distribution
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
