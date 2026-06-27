import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { Volume2, VolumeX, Eye, Gauge, Sparkles } from "lucide-react";

interface UserWaterfallProps {
  onProfileClick: (uid: string) => void;
  isMobileView?: boolean;
}

export default function UserWaterfall({ onProfileClick, isMobileView = false }: UserWaterfallProps) {
  const [activeUsers, setActiveUsers] = React.useState<any[]>([]);
  const [fallingUsers, setFallingUsers] = React.useState<{ id: string; user: any; x: number; duration: number; delay: number; rotationSpeed: number }[]>([]);
  const [isAudioEnabled, setIsAudioEnabled] = React.useState(false);
  const [speed, setSpeed] = React.useState(1); // 0 (paused), 0.5 (slow), 1 (normal), 1.5 (fast), 2 (blazing)
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  // Fallback sound if primary is sluggish
  const audioUrl = "https://www.soundjay.com/nature/sounds/waterfall-01.mp3";

  // Fetch recent users
  React.useEffect(() => {
    const q = query(collection(db, "users"), orderBy("lastSeen", "desc"), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as any));
      setActiveUsers(users.filter(u => u.photoURL));
    });
    return unsubscribe;
  }, []);

  // Audio setup
  React.useEffect(() => {
    if (isAudioEnabled && speed > 0) {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
        audioRef.current.loop = true;
        audioRef.current.volume = 0.15;
      }
      // Dynamically adjust audio volume based on speed
      audioRef.current.volume = 0.05 + (speed * 0.1);
      audioRef.current.play().catch(e => console.log("Audio playback blocked", e));
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }, [isAudioEnabled, speed]);

  // Cleanup audio
  React.useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Generate falling users
  React.useEffect(() => {
    if (activeUsers.length === 0 || speed === 0) return;

    const spawnInterval = 3000 / speed;
    const interval = setInterval(() => {
      const randomUser = activeUsers[Math.floor(Math.random() * activeUsers.length)];
      if (!randomUser || !randomUser.photoURL) return;

      const newFalling = {
        id: Math.random().toString(),
        user: randomUser,
        x: 10 + Math.random() * 80, // Keep away from borders slightly for perfect view
        duration: (8 + Math.random() * 8) / speed,
        delay: Math.random() * 0.3,
        rotationSpeed: (Math.random() > 0.5 ? 1 : -1) * (12 + Math.random() * 18)
      };

      setFallingUsers(prev => [...prev.slice(-15), newFalling]); // Cap at 15 to prevent DOM bloat and boost rendering performance
    }, spawnInterval);

    return () => clearInterval(interval);
  }, [activeUsers, speed]);

  const speedOptions = [
    { label: "Motion Off", value: 0 },
    { label: "Slow Flow", value: 0.5 },
    { label: "Realistic", value: 1 },
    { label: "Fast Cascade", value: 1.5 },
    { label: "Blazing Direct", value: 2 }
  ];

  const waterfallContent = (
    <div className={`relative h-full w-full flex flex-col justify-between select-none ${isMobileView ? 'bg-slate-950/95 backdrop-blur-2xl' : ''}`}>
      {/* Waterfall Background Lane */}
      <div className={`absolute inset-0 bg-blue-950/10 border-r border-blue-500/10 shadow-inner overflow-hidden ${isMobileView ? 'border-none' : ''}`}>
        
        {/* Animated Water Strays / Streams */}
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          {speed > 0 && Array.from({ length: 12 }).map((_, i) => (
            <motion.div
              key={`stream-${i}`}
              initial={{ y: "-120%" }}
              animate={{ y: "120%" }}
              transition={{ 
                duration: (3 + Math.random() * 4) / speed, 
                repeat: Infinity, 
                ease: "linear",
                delay: i * 0.4
              }}
              style={{
                left: `${(i / 12) * 100}%`,
                width: '1px',
                height: `${150 + Math.random() * 150}px`
              }}
              className="absolute bg-gradient-to-b from-transparent via-blue-400/40 to-transparent opacity-80"
            />
          ))}
        </div>

        {/* Dynamic Water Mist Waves (Slower deep layers) */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          {speed > 0 && Array.from({ length: 4 }).map((_, i) => (
            <motion.div
              key={`haze-${i}`}
              initial={{ y: "-100%" }}
              animate={{ y: "100%" }}
              transition={{ 
                duration: (6 + i * 2) / speed, 
                repeat: Infinity, 
                ease: "linear",
                delay: i * 1.5 
              }}
              className="absolute w-full h-1/3 bg-gradient-to-b from-transparent via-sky-500/15 to-transparent blur-2xl"
            />
          ))}
        </div>

        {/* Bottom Splash Spray Effect (Lush & Interactive) */}
        {speed > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-blue-500/20 via-sky-400/5 to-transparent pointer-events-none z-10">
            {/* Spray Particles */}
            {Array.from({ length: 6 }).map((_, i) => (
              <motion.div
                key={`spray-${i}`}
                animate={{
                  y: [0, -20 - Math.random() * 40, 0],
                  x: [0, (Math.random() - 0.5) * 30, 0],
                  scale: [0.5, 1.5, 0.5],
                  opacity: [0, 0.6, 0]
                }}
                transition={{
                  duration: (1 + Math.random() * 1.5) / speed,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.2
                }}
                className="absolute bottom-4 bg-white/25 rounded-full blur-sm"
                style={{
                  left: `${15 + i * 14}%`,
                  width: `${12 + Math.random() * 16}px`,
                  height: `${12 + Math.random() * 16}px`,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Falling Avatars / Users */}
      <div className="absolute inset-0 overflow-hidden">
        <AnimatePresence>
          {speed > 0 && fallingUsers.map((item) => (
            <motion.button
              key={item.id}
              initial={{ y: -120, x: `${item.x}%`, opacity: 0, scale: 0.6, rotate: -item.rotationSpeed }}
              animate={{ 
                y: "112vh", 
                opacity: [0, 1, 1, 0.8, 0],
                scale: [0.7, 1.05, 1, 0.8, 0.5],
                rotate: item.rotationSpeed * 2,
                x: `${item.x + (Math.sin(Date.now() / 800) * 4)}%` 
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ 
                duration: item.duration, 
                ease: "linear",
                delay: item.delay
              }}
              onClick={() => onProfileClick(item.user.uid)}
              className="absolute z-10 p-1 group cursor-pointer focus:outline-none"
              style={{ width: "52px", height: "52px", willChange: "transform, opacity", transform: "translateZ(0)" }}
            >
              <div className="relative w-full h-full">
                {/* Flow glow ripple behind the user photo */}
                <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-md group-hover:scale-125 transition-transform duration-300 animate-pulse" />
                
                <img 
                  src={item.user.photoURL!} 
                  alt={item.user.displayName || "User"} 
                  className="w-full h-full rounded-full object-cover border-2 border-white/30 shadow-xl group-hover:border-sky-400 group-hover:scale-110 transition-all duration-300 relative z-10"
                  referrerPolicy="no-referrer"
                />
                
                {/* Active Indicator */}
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-slate-950 shadow z-20 flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                </span>
                
                {/* High fidelity tag on hover */}
                <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-900/95 backdrop-blur border border-slate-700/80 text-white text-[10px] font-black uppercase tracking-widest whitespace-nowrap rounded-xl shadow-2xl scale-0 group-hover:scale-100 transition-all duration-200 origin-left z-50 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  {item.user.displayName || "Explorer"}
                </div>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Realistic Mist Splash Label at the bottom edge */}
      {!isMobileView && speed > 0 && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 text-center pointer-events-none select-none z-10">
          <motion.div
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="text-[9px] font-black text-sky-400/40 uppercase tracking-[0.25em]"
          >
            Cascade Active
          </motion.div>
        </div>
      )}

      {/* Waterfall Controls Controller Dashboard */}
      <div className="mt-auto px-4 pb-10 flex flex-col items-center gap-4 z-20 w-full">
        {/* Speed Slider Option / Controls Hub */}
        <div className="w-full max-w-[124px] bg-slate-950/90 border border-slate-800/80 rounded-2xl p-2.5 backdrop-blur shadow-2xl flex flex-col gap-3">
          
          {/* Audio controller button */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-wider">Audio Sound</span>
            <button
              onClick={() => setIsAudioEnabled(!isAudioEnabled)}
              className={`p-1.5 rounded-lg transition-all border ${
                isAudioEnabled 
                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' 
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-white'
              }`}
              title={isAudioEnabled ? "Silence Stream" : "Water Sound effect"}
            >
              {isAudioEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="h-[1px] bg-slate-800/50 w-full" />

          {/* Speed Selector controller button */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[7px] font-black text-slate-500 uppercase tracking-widest px-0.5">
              <span>Velocity</span>
              <span className="text-sky-400 font-mono">{speed > 0 ? `${speed}x` : "Off"}</span>
            </div>
            
            <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded-lg w-full">
              {/* Motion toggle option controls */}
              <button
                onClick={() => setSpeed(prev => prev === 0 ? 1 : 0)}
                className={`flex-1 py-1 rounded text-[7.5px] font-black uppercase tracking-tighter text-center transition-all ${
                  speed === 0 
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                  : 'text-slate-500 hover:text-slate-300'
                }`}
                title={speed === 0 ? "Resume Waterfall" : "Freeze Waterfall / Save Performance"}
              >
                {speed === 0 ? "Run" : "Freeze"}
              </button>

              <button
                onClick={() => {
                  if (speed <= 0.5) setSpeed(1);
                  else if (speed <= 1) setSpeed(1.5);
                  else if (speed <= 1.5) setSpeed(2);
                  else setSpeed(0.5);
                }}
                disabled={speed === 0}
                className={`flex-1 py-1 rounded text-[7.5px] font-black uppercase tracking-tighter text-center transition-all ${
                  speed > 0 
                  ? 'bg-blue-500/20 text-blue-400' 
                  : 'text-slate-700 cursor-not-allowed'
                }`}
              >
                Cycle
              </button>
            </div>
          </div>
        </div>

        {/* Rotated text */}
        {!isMobileView && (
          <div className="text-[8px] font-black text-blue-500/40 uppercase tracking-[0.3em] vertical-text rotate-180 select-none pointer-events-none mt-2">
            Dynamic Connect
          </div>
        )}
      </div>
    </div>
  );

  return waterfallContent;
}
