import * as React from "react";
import { motion } from "motion/react";
import { Volume2, VolumeX, Sparkles, Music } from "lucide-react";

interface SoundActivationModalProps {
  onChoose: (enable: boolean) => void;
  playSampleSound: () => void;
}

export default function SoundActivationModal({ onChoose, playSampleSound }: SoundActivationModalProps) {
  const [isPlayingSample, setIsPlayingSample] = React.useState(false);

  const handleTestSound = () => {
    setIsPlayingSample(true);
    playSampleSound();
    setTimeout(() => setIsPlayingSample(false), 800);
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="relative w-full max-w-md p-6 overflow-hidden bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl text-center"
      >
        {/* Dynamic Glowing Accents */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse" />
        <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

        {/* Pulsing Sound Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-xl animate-ping" />
            <div className="relative flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full text-slate-950 shadow-lg shadow-amber-500/20">
              <Volume2 className="w-8 h-8 animate-bounce" />
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight mb-3">
          Enable Playful Sounds?
        </h2>
        
        <p className="text-sm text-slate-300 leading-relaxed mb-6">
          Experience the directory with a delightful selection of public-domain, license-free interactive sound effects on every click!
        </p>

        {/* Preview / Test Section */}
        <div className="mb-6 p-4 rounded-2xl bg-slate-950/50 border border-slate-800 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Sample Soundscapes
            </span>
            <p className="text-xs text-slate-400 mt-0.5">Test synthesized micro-sounds</p>
          </div>
          <button
            onClick={handleTestSound}
            disabled={isPlayingSample}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border cursor-pointer transition-all ${
              isPlayingSample
                ? "bg-amber-400/20 text-amber-300 border-amber-400/30"
                : "bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Music className={`w-3.5 h-3.5 ${isPlayingSample ? "animate-spin" : ""}`} />
            {isPlayingSample ? "Playing..." : "Test Sound"}
          </button>
        </div>

        {/* Choice Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => onChoose(false)}
            className="flex-1 order-2 sm:order-1 px-5 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700/80 text-slate-300 font-bold text-sm border border-slate-700/50 cursor-pointer transition-all active:scale-95"
          >
            <span className="flex items-center justify-center gap-2">
              <VolumeX className="w-4 h-4" /> Keep Silent
            </span>
          </button>
          
          <button
            onClick={() => onChoose(true)}
            className="flex-1 order-1 sm:order-2 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/10 cursor-pointer transition-all active:scale-95"
          >
            <span className="flex items-center justify-center gap-2">
              <Volume2 className="w-4 h-4" /> Yes, Enable Sounds!
            </span>
          </button>
        </div>

        <p className="text-[10px] text-slate-500 mt-4 uppercase tracking-widest font-semibold">
          Public Domain &bull; 100% License Free
        </p>
      </motion.div>
    </div>
  );
}
