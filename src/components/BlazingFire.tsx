import * as React from "react";
import { motion } from "motion/react";

interface Particle {
  id: number;
  startX: number;
  scale: number;
  duration: number;
  delay: number;
  size: number;
}

export default function BlazingFire() {
  const [embers, setEmbers] = React.useState<Particle[]>([]);
  const [smokeClouds, setSmokeClouds] = React.useState<Particle[]>([]);

  React.useEffect(() => {
    // Generate a set of stable randomized particles for performance & consistent beauty
    const generatedEmbers = Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      startX: Math.random() * 80 - 40, // offset left/right
      scale: 0.4 + Math.random() * 0.8,
      duration: 1.5 + Math.random() * 2,
      delay: Math.random() * -3, // negative delay for pre-warmed feel
      size: 3 + Math.random() * 4,
    }));
    setEmbers(generatedEmbers);

    const generatedSmoke = Array.from({ length: 12 }).map((_, i) => ({
      id: i,
      startX: Math.random() * 60 - 30,
      scale: 1 + Math.random() * 2,
      duration: 3 + Math.random() * 3,
      delay: Math.random() * -5,
      size: 24 + Math.random() * 28,
    }));
    setSmokeClouds(generatedSmoke);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center h-48 w-full mb-4 overflow-visible pointer-events-none select-none">
      {/* Intense Ambient Radial Lights & Glowing Aura */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-orange-600/20 blur-[50px] -z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-red-600/10 blur-[40px] -z-10" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-yellow-500/15 blur-[25px] -z-10" />

      {/* 3D Realistic Smoke Plumes rising to the top */}
      <div className="absolute bottom-12 w-32 h-64 overflow-visible flex items-center justify-center">
        {smokeClouds.map((smoke) => (
          <motion.div
            key={`smoke-${smoke.id}`}
            className="absolute rounded-full bg-gradient-to-tr from-slate-700/5 via-slate-600/10 to-slate-500/0 blur-[18px]"
            style={{
              width: smoke.size,
              height: smoke.size,
              bottom: "10%",
            }}
            animate={{
              y: [-25, -220],
              x: [smoke.startX, smoke.startX + (smoke.startX > 0 ? 35 : -35)],
              scale: [0.3 * smoke.scale, 2.8 * smoke.scale],
              opacity: [0, 0.4, 0.25, 0],
            }}
            transition={{
              duration: smoke.duration,
              repeat: Infinity,
              delay: smoke.delay,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      {/* 3D Floating Ember Particles */}
      <div className="absolute bottom-12 w-24 h-48 overflow-visible flex items-center justify-center">
        {embers.map((ember) => (
          <motion.div
            key={`ember-${ember.id}`}
            className="absolute rounded-full bg-gradient-to-r from-amber-400 to-red-500"
            style={{
              width: ember.size,
              height: ember.size,
              bottom: "15%",
              filter: "blur(0.5px)",
              boxShadow: "0 0 10px rgb(245, 158, 11), 0 0 4px rgb(239, 68, 68)",
            }}
            animate={{
              y: [0, -180],
              x: [ember.startX, ember.startX + Math.sin(ember.id) * 20],
              opacity: [0, 1, 0.8, 0],
              scale: [0.5, 1, 0.2],
            }}
            transition={{
              duration: ember.duration,
              repeat: Infinity,
              delay: ember.delay,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      {/* Realistic Multi-layered 3D Flame Body */}
      <div className="absolute bottom-10 w-28 h-28 flex items-end justify-center">
        
        {/* Flame Layer 1: Fire base shadow glow effect */}
        <div className="absolute bottom-0 w-28 h-6 bg-red-950/40 rounded-full blur-md" />

        {/* Flame Layer 2: Deep Crimson / Red Outer Flame */}
        <motion.div
          animate={{
            scale: [1, 1.05, 0.95, 1],
            skewX: [0, 2, -2, 0],
            rotate: [0, 1.5, -1.5, 0],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute w-24 h-32 bg-gradient-to-t from-red-800/80 via-red-650/70 to-orange-600/0 rounded-t-[45%] rounded-b-[40%] origin-bottom blur-md"
          style={{ transformStyle: "preserve-3d" }}
        />

        {/* Flame Layer 3: Vibrant Orange Middle Flame */}
        <motion.div
          animate={{
            scaleY: [1, 1.15, 0.9, 1.05, 1],
            scaleX: [1, 0.92, 1.05, 0.96, 1],
            skewX: [0, -3, 3, -1, 0],
            rotate: [1, -2, 2, -1, 1],
          }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute w-16 h-28 bg-gradient-to-t from-orange-600 via-amber-500/80 to-yellow-500/0 rounded-t-[42%] rounded-b-[38%] origin-bottom blur-[3px]"
          style={{ transformStyle: "preserve-3d" }}
        />

        {/* Flame Layer 4: Bright Yellow Inner Core Flame */}
        <motion.div
          animate={{
            scaleY: [1, 1.2, 0.85, 1.1, 1],
            scaleX: [1, 0.88, 1.08, 0.94, 1],
            skewX: [0, 4, -4, 0],
          }}
          transition={{
            duration: 0.95,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute w-10 h-20 bg-gradient-to-t from-yellow-400 via-amber-300 to-transparent rounded-t-[40%] rounded-b-[32%] origin-bottom blur-[1px]"
        />

        {/* Flame Layer 5: Soft White Hottest Heart of the Flame */}
        <motion.div
          animate={{
            scale: [0.95, 1.1, 0.9, 1.05, 0.95],
          }}
          transition={{
            duration: 0.7,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute w-6 h-12 bg-gradient-to-t from-white via-yellow-100 to-transparent rounded-t-[50%] rounded-b-[35%] origin-bottom blur-[0.5px]"
        />

        {/* Hot Heat Distortion Wavering Wave (Simulated with a highly blurry animated overlay) */}
        <motion.div
          animate={{
            y: [0, -30],
            opacity: [0.4, 0],
            scale: [1, 1.4],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeOut",
          }}
          className="absolute w-20 h-20 bg-blue-500/5 rounded-full blur-[25px] origin-bottom pointer-events-none"
        />
      </div>

      {/* Aesthetic Fireplace Grid Platform Support */}
      <div className="absolute bottom-9 w-24 h-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent opacity-80" />
    </div>
  );
}
