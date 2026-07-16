import * as React from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, ThumbsUp, Heart, Mail, Video, Mic, RefreshCw, X, Radio, ArrowUpRight, Clock, Sparkles } from "lucide-react";

interface SocialEvent {
  id: string;
  type: "upvote" | "favorite" | "subscribe" | "comment" | "voice_comment" | "tool_update_alert";
  userId?: string;
  userName?: string;
  userPhoto?: string;
  toolId: string;
  toolName: string;
  timestamp: any;
  details?: string;
}

const SEED_EVENTS: SocialEvent[] = [
  {
    id: "seed-1",
    type: "tool_update_alert",
    toolId: "chatgpt",
    toolName: "ChatGPT",
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    details: "Updated description & technical metadata"
  },
  {
    id: "seed-2",
    type: "upvote",
    userName: "Alex Rivera",
    userPhoto: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=60",
    toolId: "gemini",
    toolName: "Gemini Pro",
    timestamp: new Date(Date.now() - 1000 * 60 * 45)
  },
  {
    id: "seed-3",
    type: "comment",
    userName: "Sarah Chen",
    userPhoto: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=60",
    toolId: "midjourney",
    toolName: "Midjourney v6",
    timestamp: new Date(Date.now() - 1000 * 60 * 120),
    details: "The fidelity of these image outputs is absolutely incredible. A total game changer for design prototyping."
  },
  {
    id: "seed-4",
    type: "subscribe",
    userName: "Michael K.",
    userPhoto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=60",
    toolId: "elevenlabs",
    toolName: "ElevenLabs",
    timestamp: new Date(Date.now() - 1000 * 60 * 180)
  }
];

const getEventIcon = (type: string) => {
  switch (type) {
    case "upvote":
      return <ThumbsUp className="w-3.5 h-3.5 text-blue-400" />;
    case "favorite":
      return <Heart className="w-3.5 h-3.5 text-red-400 fill-current" />;
    case "subscribe":
      return <Mail className="w-3.5 h-3.5 text-purple-400" />;
    case "comment":
      return <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />;
    case "voice_comment":
      return <Mic className="w-3.5 h-3.5 text-amber-400" />;
    case "tool_update_alert":
      return <Sparkles className="w-3.5 h-3.5 text-indigo-400" />;
    default:
      return <Radio className="w-3.5 h-3.5 text-slate-400" />;
  }
};

const getEventBg = (type: string) => {
  switch (type) {
    case "upvote":
      return "bg-blue-500/10 border-blue-500/20";
    case "favorite":
      return "bg-red-500/10 border-red-500/20";
    case "subscribe":
      return "bg-purple-500/10 border-purple-500/20";
    case "comment":
      return "bg-emerald-500/10 border-emerald-500/20";
    case "voice_comment":
      return "bg-amber-500/10 border-amber-500/20";
    case "tool_update_alert":
      return "bg-indigo-500/10 border-indigo-500/20 animate-pulse";
    default:
      return "bg-slate-800 border-slate-700";
  }
};

interface SocialFeedProps {
  onViewTool: (toolId: string) => void;
  onClose?: () => void;
}

export default function SocialFeed({ onViewTool, onClose }: SocialFeedProps) {
  const [events, setEvents] = React.useState<SocialEvent[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const q = query(
      collection(db, "social_feed"),
      orderBy("timestamp", "desc"),
      limit(25)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEvents: SocialEvent[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetchedEvents.push({
          id: doc.id,
          type: data.type,
          userId: data.userId,
          userName: data.userName,
          userPhoto: data.userPhoto,
          toolId: data.toolId,
          toolName: data.toolName,
          timestamp: data.timestamp?.toDate() || new Date(),
          details: data.details
        });
      });

      // Combine fetched live events with static seeds if short
      if (fetchedEvents.length > 0) {
        setEvents(fetchedEvents);
      } else {
        setEvents(SEED_EVENTS);
      }
      setLoading(false);
    }, (error) => {
      console.error("Failed to fetch live social feed events:", error);
      setEvents(SEED_EVENTS);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/95 border-l border-slate-800/80 backdrop-blur-xl shadow-2xl relative overflow-hidden">
      {/* Glow ambient background elements */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="p-6 border-b border-slate-800/60 flex items-center justify-between relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <h2 className="text-sm font-black uppercase tracking-widest text-white">Live Activity Feed</h2>
          </div>
          <p className="text-[10px] text-slate-500 font-mono mt-1">Real-time global user interactions</p>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Feed List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 relative z-10 scrollbar-thin">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 space-y-4">
            <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Loading feed...</span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {events.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="p-4 bg-slate-900/40 border border-slate-850 rounded-2xl hover:bg-slate-900/80 hover:border-slate-800/80 transition-all flex gap-3 group relative overflow-hidden"
              >
                {/* Visual Glow Layer */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/2 group-hover:to-purple-500/2 transition-all duration-300 pointer-events-none" />

                {/* Avatar / Icon Container */}
                <div className="flex-shrink-0">
                  {event.userPhoto ? (
                    <img 
                      src={event.userPhoto} 
                      alt={event.userName || "User"} 
                      className="w-8 h-8 rounded-xl object-cover border border-slate-800"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${getEventBg(event.type)}`}>
                      {getEventIcon(event.type)}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black text-slate-200 truncate">
                      {event.userName || (event.type === "tool_update_alert" ? "🚀 System Alert" : "Anonymous Explorer")}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono flex items-center gap-1 shrink-0">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTimeAgo(event.timestamp)}
                    </span>
                  </div>

                  {/* Message body */}
                  <p className="text-xs text-slate-400 mt-1 leading-normal">
                    {(() => {
                      switch (event.type) {
                        case "upvote":
                          return <>upvoted <span className="text-blue-400 font-bold hover:underline cursor-pointer" onClick={() => onViewTool(event.toolId)}>{event.toolName}</span></>;
                        case "favorite":
                          return <>favorited <span className="text-red-400 font-bold hover:underline cursor-pointer" onClick={() => onViewTool(event.toolId)}>{event.toolName}</span> to their library</>;
                        case "subscribe":
                          return <>subscribed to update alerts for <span className="text-purple-400 font-bold hover:underline cursor-pointer" onClick={() => onViewTool(event.toolId)}>{event.toolName}</span></>;
                        case "comment":
                          return <>reviewed <span className="text-emerald-400 font-bold hover:underline cursor-pointer" onClick={() => onViewTool(event.toolId)}>{event.toolName}</span></>;
                        case "voice_comment":
                          return <>left a voice review on <span className="text-amber-400 font-bold hover:underline cursor-pointer" onClick={() => onViewTool(event.toolId)}>{event.toolName}</span></>;
                        case "tool_update_alert":
                          return <>Administrator updated details for <span className="text-indigo-400 font-bold hover:underline cursor-pointer" onClick={() => onViewTool(event.toolId)}>{event.toolName}</span></>;
                        default:
                          return <>interacted with <span className="text-slate-400 font-bold hover:underline cursor-pointer" onClick={() => onViewTool(event.toolId)}>{event.toolName}</span></>;
                      }
                    })()}
                  </p>

                  {/* Detail quote */}
                  {event.details && (
                    <div className="mt-2 text-[11px] text-slate-500 italic bg-slate-950/40 px-3 py-1.5 border border-slate-900 rounded-lg max-h-16 overflow-y-auto leading-relaxed">
                      "{event.details}"
                    </div>
                  )}
                </div>

                {/* Arrow Link to View Tool */}
                <button 
                  onClick={() => onViewTool(event.toolId)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-slate-950/80 border border-slate-850 rounded-lg hover:bg-slate-850 opacity-0 group-hover:opacity-100 transition-all cursor-pointer hover:border-slate-700 hover:text-white text-slate-400"
                  aria-label={`View details of ${event.toolName}`}
                >
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer statistics */}
      <div className="p-4 border-t border-slate-800/60 bg-slate-950 text-center relative z-10">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 block">
          AGIDAPP Global • Interactive Social Experience
        </span>
      </div>
    </div>
  );
}
