import * as React from "react";
import { motion } from "motion/react";

export default function SkeletonCard() {
  return (
    <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl relative overflow-hidden h-full flex flex-col">
      {/* Shimmer overlay */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear",
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12 pointer-events-none"
      />

      <div className="flex gap-2 mb-4">
        <div className="w-20 h-5 bg-slate-800/80 rounded-full" />
        <div className="w-16 h-5 bg-slate-800/80 rounded-full" />
      </div>

      <div className="w-3/4 h-8 bg-slate-800/80 rounded-lg mb-3" />
      <div className="w-full h-16 bg-slate-800/80 rounded-xl mb-6" />

      <div className="flex flex-wrap gap-1.5 mb-6">
        <div className="w-12 h-4 bg-slate-800/60 rounded" />
        <div className="w-16 h-4 bg-slate-800/60 rounded" />
        <div className="w-14 h-4 bg-slate-800/60 rounded" />
      </div>

      <div className="mt-auto grid grid-cols-3 gap-3">
        <div className="h-10 bg-slate-800/80 rounded-xl" />
        <div className="h-10 bg-slate-800/80 rounded-xl" />
        <div className="h-10 bg-slate-800/80 rounded-xl" />
      </div>
    </div>
  );
}
