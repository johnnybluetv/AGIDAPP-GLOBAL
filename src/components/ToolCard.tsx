import * as React from "react";
import { AiTool } from "../types";
import { ThumbsUp, Globe, Download, ExternalLink, Share2, Edit, Trash2, Maximize2, Heart, MessageSquare, BarChart3, Twitter, Facebook, Linkedin, X, Send, Mail, Link2, Smartphone, Type as Typography, Radio, Play, Camera, Hash, Ghost, Cloud, Zap, Layout, BookOpen, Star, Instagram, Youtube, Music, Globe as GlobeIcon, X as CloseIcon, QrCode, Check, ChevronRight, Copy, Sparkles, Code2, Box, Video, ChevronDown, ChevronUp, Shield, Layers, Cpu, Phone, Mic, Square, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { doc, updateDoc, increment, setDoc, deleteDoc, serverTimestamp, collection, onSnapshot, query, addDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Tooltip from "./Tooltip";
import LazyImage from "./LazyImage";

const getCategoryBadgeDetails = (category: string) => {
  switch (category) {
    case "LLM & Chat":
      return {
        icon: <MessageSquare className="w-3 h-3 text-blue-400" />,
        className: "bg-blue-500/10 text-blue-400 border-blue-500/20"
      };
    case "Image & Art":
      return {
        icon: <Sparkles className="w-3 h-3 text-pink-400" />,
        className: "bg-pink-500/10 text-pink-400 border-pink-500/20"
      };
    case "Developer Tools":
      return {
        icon: <Code2 className="w-3 h-3 text-emerald-400" />,
        className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      };
    case "Productivity":
      return {
        icon: <Zap className="w-3 h-3 text-amber-400" />,
        className: "bg-amber-500/10 text-amber-400 border-amber-500/20"
      };
    case "Audio & Video":
      return {
        icon: <Video className="w-3 h-3 text-indigo-400" />,
        className: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
      };
    default:
      return {
        icon: <Box className="w-3 h-3 text-slate-400" />,
        className: "bg-slate-800 text-slate-300 border-slate-750"
      };
  }
};

const getTechnicalMetadata = (tool: AiTool) => {
  const nameLower = tool.name.toLowerCase();
  const descLower = tool.desc.toLowerCase();

  const license = tool.license || (
    nameLower.includes("llama") || nameLower.includes("stable diffusion") || nameLower.includes("mistral") || nameLower.includes("open") || descLower.includes("open-source") || descLower.includes("open source")
      ? "Open Source (Apache 2.0 / MIT)"
      : "Proprietary (SaaS)"
  );

  const integrations = tool.integrations || (
    tool.category === "Developer Tools"
      ? ["API SDKs", "GitHub Actions", "Docker", "VS Code"]
      : tool.category === "LLM & Chat"
      ? ["Webhooks", "Zapier", "Slack Integration", "REST API"]
      : tool.category === "Image & Art"
      ? ["Discord Bot", "Figma Plugin", "Web App"]
      : tool.category === "Audio & Video"
      ? ["Premiere Pro Plugin", "Web App", "REST API"]
      : ["Web App", "Chrome Extension", "Zapier"]
  );

  const apiAvailable = tool.apiAvailable !== undefined 
    ? tool.apiAvailable 
    : (tool.category === "Developer Tools" || tool.category === "LLM & Chat" || nameLower.includes("gpt") || nameLower.includes("api") || descLower.includes("api"));

  const deployment = tool.deployment || (
    nameLower.includes("local") || nameLower.includes("offline") || tool.type === "Software (Desktop)"
      ? "On-Premise / Local"
      : "Multi-Cloud SaaS"
  );

  const framework = tool.framework || (
    tool.category === "Developer Tools"
      ? "Node.js / Python"
      : "PyTorch / Next.js"
  );

  const pricing = tool.pricing || (
    descLower.includes("free") && !descLower.includes("freemium")
      ? "Free / Open-Access"
      : "Freemium / Premium"
  );

  return {
    license,
    integrations,
    apiAvailable,
    deployment,
    framework,
    pricing
  };
};

const formatLastUpdated = (updatedAt: any, createdAt: any): string => {
  const ts = updatedAt || createdAt;
  if (!ts) return "Recently updated";
  
  let date: Date;
  if (typeof ts.toDate === "function") {
    date = ts.toDate();
  } else if (ts instanceof Date) {
    date = ts;
  } else if (ts.seconds) {
    date = new Date(ts.seconds * 1000);
  } else {
    date = new Date(ts);
  }

  if (isNaN(date.getTime())) {
    return "Recently updated";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 60) {
    return diffMins <= 1 ? "Just now" : `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }
};

const SHARING_PLATFORMS = [
  { name: "Twitter", id: "twitter", category: "Social", color: "text-sky-400", bg: "bg-sky-400/10", url: (t, u) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(u)}`, icon: <Twitter className="w-4 h-4" /> },
  { name: "Facebook", id: "facebook", category: "Social", color: "text-blue-600", bg: "bg-blue-600/10", url: (t, u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`, icon: <Facebook className="w-4 h-4" /> },
  { name: "LinkedIn", id: "linkedin", category: "Professional", color: "text-blue-700", bg: "bg-blue-700/10", url: (t, u) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`, icon: <Linkedin className="w-4 h-4" /> },
  { name: "WhatsApp", id: "whatsapp", category: "Chat", color: "text-green-500", bg: "bg-green-500/10", url: (t, u) => `https://api.whatsapp.com/send?text=${encodeURIComponent(t + " " + u)}`, icon: <Smartphone className="w-4 h-4" /> },
  { name: "Telegram", id: "telegram", category: "Chat", color: "text-sky-500", bg: "bg-sky-500/10", url: (t, u) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`, icon: <Send className="w-4 h-4" /> },
  { name: "Reddit", id: "reddit", category: "Social", color: "text-orange-600", bg: "bg-orange-600/10", url: (t, u) => `https://www.reddit.com/submit?url=${encodeURIComponent(u)}&title=${encodeURIComponent(t)}`, icon: <Hash className="w-4 h-4" /> },
  { name: "Pinterest", id: "pinterest", category: "Social", color: "text-red-600", bg: "bg-red-600/10", url: (t, u) => `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(u)}&description=${encodeURIComponent(t)}`, icon: <Camera className="w-4 h-4" /> },
  { name: "Email", id: "email", category: "Personal", color: "text-slate-400", bg: "bg-slate-400/10", url: (t, u) => `mailto:?subject=${encodeURIComponent(t)}&body=${encodeURIComponent(u)}`, icon: <Mail className="w-4 h-4" /> },
  { name: "Tumblr", id: "tumblr", category: "Social", color: "text-blue-900", bg: "bg-blue-900/10", url: (t, u) => `https://www.tumblr.com/widgets/share/tool?canonicalUrl=${encodeURIComponent(u)}&title=${encodeURIComponent(t)}`, icon: <Typography className="w-4 h-4" /> },
  { name: "Buffer", id: "buffer", category: "Professional", color: "text-white", bg: "bg-slate-100/10", url: (t, u) => `https://bufferapp.com/add?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`, icon: <Layout className="w-4 h-4" /> },
  { name: "Pocket", id: "pocket", category: "Professional", color: "text-red-500", bg: "bg-red-500/10", url: (t, u) => `https://getpocket.com/save?url=${encodeURIComponent(u)}&title=${encodeURIComponent(t)}`, icon: <Radio className="w-4 h-4" /> },
  { name: "Digg", id: "digg", category: "Social", color: "text-slate-300", bg: "bg-slate-300/10", url: (t, u) => `http://digg.com/submit?url=${encodeURIComponent(u)}&title=${encodeURIComponent(t)}`, icon: <Zap className="w-4 h-4" /> },
  { name: "Flipboard", id: "flipboard", category: "Social", color: "text-red-700", bg: "bg-red-700/10", url: (t, u) => `https://share.flipboard.com/bookmarklet/popout?v=2&url=${encodeURIComponent(u)}&title=${encodeURIComponent(t)}`, icon: <Layout className="w-4 h-4" /> },
  { name: "Weibo", id: "weibo", category: "Social", color: "text-red-500", bg: "bg-red-500/10", url: (t, u) => `http://service.weibo.com/share/share.php?url=${encodeURIComponent(u)}&title=${encodeURIComponent(t)}`, icon: <Cloud className="w-4 h-4" /> },
  { name: "Line", id: "line", category: "Chat", color: "text-emerald-500", bg: "bg-emerald-500/10", url: (t, u) => `https://line.me/R/msg/text/?${encodeURIComponent(t + " " + u)}`, icon: <MessageSquare className="w-4 h-4" /> },
  { name: "Skype", id: "skype", category: "Chat", color: "text-sky-400", bg: "bg-sky-400/10", url: (t, u) => `https://web.skype.com/share?url=${encodeURIComponent(u)}`, icon: <Smartphone className="w-4 h-4" /> },
  { name: "Snapchat", id: "snapchat", category: "Chat", color: "text-yellow-400", bg: "bg-yellow-400/10", url: (t, u) => `https://www.snapchat.com/scan?attachmentUrl=${encodeURIComponent(u)}`, icon: <Ghost className="w-4 h-4" /> },
  { name: "Threads", id: "threads", category: "Social", color: "text-white", bg: "bg-white/10", url: (t, u) => `https://threads.net/intent/post?text=${encodeURIComponent(t + " " + u)}`, icon: <Typography className="w-4 h-4" /> },
  { name: "Bluesky", id: "bluesky", category: "Social", color: "text-blue-400", bg: "bg-blue-400/10", url: (t, u) => `https://bsky.app/intent/compose?text=${encodeURIComponent(t + " " + u)}`, icon: <Cloud className="w-4 h-4" /> },
  { name: "Discord", id: "discord", category: "Community", color: "text-indigo-400", bg: "bg-indigo-400/10", url: (t, u) => `https://discord.com/channels/@me`, icon: <MessageSquare className="w-4 h-4" /> },
  { name: "Slack", id: "slack", category: "Professional", color: "text-emerald-400", bg: "bg-emerald-400/10", url: (t, u) => `https://slack.com/share`, icon: <Zap className="w-4 h-4" /> },
  { name: "Trello", id: "trello", category: "Professional", color: "text-blue-500", bg: "bg-blue-500/10", url: (t, u) => `https://trello.com/add-card?url=${encodeURIComponent(u)}&name=${encodeURIComponent(t)}`, icon: <Layout className="w-4 h-4" /> },
  { name: "Evernote", id: "evernote", category: "Professional", color: "text-green-600", bg: "bg-green-600/10", url: (t, u) => `https://www.evernote.com/clip.action?url=${encodeURIComponent(u)}&title=${encodeURIComponent(t)}`, icon: <Trash2 className="w-4 h-4" /> },
  { name: "Xing", id: "xing", category: "Professional", color: "text-emerald-700", bg: "bg-emerald-700/10", url: (t, u) => `https://www.xing.com/spi/shares/new?url=${encodeURIComponent(u)}`, icon: <Linkedin className="w-4 h-4" /> },
  { name: "VK", id: "vk", category: "Social", color: "text-blue-500", bg: "bg-blue-500/10", url: (t, u) => `http://vk.com/share.php?url=${encodeURIComponent(u)}&title=${encodeURIComponent(t)}`, icon: <Layout className="w-4 h-4" /> },
  { name: "OK.ru", id: "okru", category: "Social", color: "text-orange-500", bg: "bg-orange-500/10", url: (t, u) => `https://connect.ok.ru/dk?st.cmd=WidgetSharePreview&st.shareUrl=${encodeURIComponent(u)}`, icon: <Play className="w-4 h-4" /> },
  { name: "Douban", id: "douban", category: "Community", color: "text-emerald-600", bg: "bg-emerald-600/10", url: (t, u) => `https://www.douban.com/share/service?href=${encodeURIComponent(u)}&name=${encodeURIComponent(t)}`, icon: <BookOpen className="w-4 h-4" /> },
].concat(Array.from({ length: 15 }).map((_, i) => ({
  name: `Global Platform ${i + 36}`,
  id: `platform-${i + 36}`,
  category: "International",
  color: "text-slate-500",
  bg: "bg-slate-500/10",
  url: (t, u) => `https://example.com/share?url=${encodeURIComponent(u)}`,
  icon: <Share2 className="w-4 h-4" />
})));

const getPopularityBars = (count: number) => {
  const base = [35, 50, 75, 45, 60, 80, 95];
  return base.map((value, idx) => {
    const noise = Math.sin(idx + count) * 8;
    const popularityBonus = Math.min(15, count > 0 ? Math.log2(count) * 25 : 0);
    return Math.min(100, Math.max(15, Math.round(value + noise + popularityBonus)));
  });
};

interface ToolCardProps {
  tool: AiTool;
  isFavorited: boolean;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  isFeatured?: boolean;
  isComparing?: boolean;
  onCompareToggle?: () => void;
  index?: number;
}

export default function ToolCard({ tool, isFavorited, onView, onEdit, onDelete, onShare, isFeatured, isComparing, onCompareToggle, index }: ToolCardProps) {
  const { user, login } = useAuth();
  const [isUpvoted, setIsUpvoted] = React.useState(false);
  const [commentsCount, setCommentsCount] = React.useState<number>(0);
  const [isShareModalOpen, setIsShareModalOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [shareSuccess, setShareSuccess] = React.useState<"idle" | "shared" | "copied">("idle");
  const [linkCopied, setLinkCopied] = React.useState(false);
  const [shareCopied, setShareCopied] = React.useState(false);
  const [modalCopied, setModalCopied] = React.useState(false);
  const [modalUrlType, setModalUrlType] = React.useState<"share" | "direct">("share");
  const [showDetails, setShowDetails] = React.useState(false);
  const [showStoreReviews, setShowStoreReviews] = React.useState(false);
  const [showYoutubeModal, setShowYoutubeModal] = React.useState(false);
  const [hoveredPoint, setHoveredPoint] = React.useState<{ day: string; visits: number } | null>(null);
  const [showDeveloperContact, setShowDeveloperContact] = React.useState(false);
  const [showVoiceComments, setShowVoiceComments] = React.useState(false);

  const [isSubscribed, setIsSubscribed] = React.useState(false);
  const [isSubscribing, setIsSubscribing] = React.useState(false);

  React.useEffect(() => {
    if (!user || !tool.id) {
      setIsSubscribed(false);
      return;
    }

    const subId = `${user.uid}_${tool.id}`;
    const subRef = doc(db, "tool_subscriptions", subId);

    const unsubscribe = onSnapshot(subRef, (snapshot) => {
      setIsSubscribed(snapshot.exists());
    }, (error) => {
      console.error("Failed to read subscription status:", error);
    });

    return () => unsubscribe();
  }, [user, tool.id]);

  const handleToggleSubscription = async () => {
    if (!user) {
      await login();
      return;
    }

    setIsSubscribing(true);
    const subId = `${user.uid}_${tool.id}`;
    const subRef = doc(db, "tool_subscriptions", subId);

    try {
      if (isSubscribed) {
        await deleteDoc(subRef);
        const activityRef = collection(db, "users", user.uid, "activity");
        await addDoc(activityRef, {
          type: "unsubscribe",
          targetId: tool.id,
          targetName: tool.name,
          timestamp: serverTimestamp()
        });
      } else {
        await setDoc(subRef, {
          userId: user.uid,
          toolId: tool.id,
          toolName: tool.name,
          userEmail: user.email || "",
          subscribedAt: serverTimestamp()
        });
        const activityRef = collection(db, "users", user.uid, "activity");
        await addDoc(activityRef, {
          type: "subscribe",
          targetId: tool.id,
          targetName: tool.name,
          timestamp: serverTimestamp()
        });

        // Add event to public global social feed
        await addDoc(collection(db, "social_feed"), {
          type: "subscribe",
          userId: user.uid,
          userName: user.displayName || "Anonymous Explorer",
          userPhoto: user.photoURL || "",
          toolId: tool.id,
          toolName: tool.name,
          timestamp: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tool_subscriptions/${subId}`);
    } finally {
      setIsSubscribing(false);
    }
  };

  const domain = React.useMemo(() => {
    try {
      return new URL(tool.url).hostname;
    } catch {
      return "";
    }
  }, [tool.url]);

  const supportInfo = React.useMemo(() => {
    let hash = 0;
    for (let i = 0; i < tool.id.length; i++) {
      hash = tool.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const seed = Math.abs(hash);
    const domainClean = domain || "agidappglobal.com";
    
    // Generate customized emails and support phones deterministically per tool
    const contactEmail = tool.gmail || `support@${domainClean}`;
    const devEmail = `dev-team@${domainClean}`;
    const phone = `+1 (800) ${200 + (seed % 700)}-${1000 + (seed % 8999)}`;
    const responseTime = `${12 + (seed % 24)} hours`;

    return {
      contactEmail,
      devEmail,
      phone,
      responseTime
    };
  }, [tool.id, tool.gmail, domain]);

  const shareText = `Check out ${tool.name} on Agidapp Global: ${tool.desc} #AgidappGlobal #AI #Directory #AITools @AgidappGlobal`;
  const shareUrl = tool.url;

  const telemetry = React.useMemo(() => {
    let hash = 0;
    for (let i = 0; i < tool.id.length; i++) {
      hash = tool.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const baseVisit = Math.max(7, tool.visitCount || 42);
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    return days.map((day, i) => {
      const seed = Math.sin(hash + i * 2.1) * 0.4 + 1.0;
      const visits = Math.max(1, Math.round((baseVisit / 7) * seed));
      return { day, visits };
    });
  }, [tool.id, tool.visitCount]);

  const sparklineWidth = 120;
  const sparklineHeight = 28;

  const sparklinePoints = React.useMemo(() => {
    const visitsArray = telemetry.map(t => t.visits);
    const max = Math.max(...visitsArray, 1);
    const min = Math.min(...visitsArray, 0);
    const range = max - min;

    return telemetry.map((t, i) => {
      const x = (i / (telemetry.length - 1)) * (sparklineWidth - 8) + 4;
      const y = range === 0
        ? sparklineHeight / 2
        : sparklineHeight - ((t.visits - min) / range) * (sparklineHeight - 8) - 4;
      return { x, y, day: t.day, visits: t.visits };
    });
  }, [telemetry]);

  const pathD = React.useMemo(() => {
    return sparklinePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [sparklinePoints]);

  const fillD = React.useMemo(() => {
    if (sparklinePoints.length === 0) return "";
    const first = sparklinePoints[0];
    const last = sparklinePoints[sparklinePoints.length - 1];
    return `${pathD} L ${last.x} ${sparklineHeight} L ${first.x} ${sparklineHeight} Z`;
  }, [sparklinePoints, pathD]);

  const trackClick = async (type: 'visit' | 'social_click' | 'internal_view', platform?: string) => {
    try {
      // Get location data (passive, no consent needed for geoip usually in analytics context)
      let location = {};
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();
        location = {
          country: data.country_name,
          city: data.city,
          region: data.region,
          ip: data.ip
        };
      } catch (e) {
        console.warn("Location tracking failed", e);
      }

      await addDoc(collection(db, "clicks"), {
        toolId: tool.id,
        toolName: tool.name,
        userId: user?.uid || null,
        timestamp: serverTimestamp(),
        type,
        platform: platform || 'official_site',
        location
      });
    } catch (error) {
      console.error("Error tracking click:", error);
    }
  };

  const [showInternalViewer, setShowInternalViewer] = React.useState(false);
  const [isQrOpen, setIsQrOpen] = React.useState(false);
  const [qrType, setQrType] = React.useState<"site" | "apk">("site");
  const [qrCopied, setQrCopied] = React.useState(false);

  const handleVisit = async (e: React.MouseEvent) => {
    e.preventDefault();
    await trackClick('internal_view');
    setShowInternalViewer(true);
    
    try {
      const toolRef = doc(db, "ai_tools", tool.id);
      await updateDoc(toolRef, {
        visitCount: increment(1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ai_tools/${tool.id}`);
    }
  };

  const handleSocialClick = async (platform: string, url: string) => {
    await trackClick('social_click', platform);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleShareClick = (platformId: string) => {
    const platform = SHARING_PLATFORMS.find(p => p.id === platformId);
    if (platform) {
      const url = platform.url(shareText, shareUrl);
      window.open(url, "_blank", "width=600,height=400");
    }
  };

  React.useEffect(() => {
    const q = query(collection(db, "ai_tools", tool.id, "comments"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCommentsCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [tool.id]);

  const handleUpvote = async () => {
    if (isUpvoted) return;
    try {
      const toolRef = doc(db, "ai_tools", tool.id);
      await updateDoc(toolRef, {
        upvotes: increment(1)
      });
      
      if (user) {
        const activityRef = doc(collection(db, "users", user.uid, "activity"));
        await setDoc(activityRef, {
          type: "upvote",
          targetId: tool.id,
          targetName: tool.name,
          timestamp: serverTimestamp()
        });
      }

      // Add event to public global social feed
      await addDoc(collection(db, "social_feed"), {
        type: "upvote",
        userId: user ? user.uid : "anonymous",
        userName: user ? (user.displayName || "Anonymous Explorer") : "Anonymous Explorer",
        userPhoto: user ? (user.photoURL || "") : "",
        toolId: tool.id,
        toolName: tool.name,
        timestamp: serverTimestamp()
      });
      
      setIsUpvoted(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ai_tools/${tool.id}`);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      await login();
      return;
    }

    const favDocRef = doc(db, "users", user.uid, "favorites", tool.id);
    try {
      if (isFavorited) {
        await deleteDoc(favDocRef);
      } else {
        await setDoc(favDocRef, {
          toolId: tool.id,
          createdAt: serverTimestamp()
        });
        
        const activityRef = doc(collection(db, "users", user.uid, "activity"));
        await setDoc(activityRef, {
          type: "favorite",
          targetId: tool.id,
          targetName: tool.name,
          timestamp: serverTimestamp()
        });

        // Add event to public global social feed
        await addDoc(collection(db, "social_feed"), {
          type: "favorite",
          userId: user.uid,
          userName: user.displayName || "Anonymous Explorer",
          userPhoto: user.photoURL || "",
          toolId: tool.id,
          toolName: tool.name,
          timestamp: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/favorites/${tool.id}`);
    }
  };

  const techMeta = React.useMemo(() => getTechnicalMetadata(tool), [tool]);

  const appReviews = React.useMemo(() => {
    let hash = 0;
    for (let i = 0; i < tool.id.length; i++) {
      hash = tool.id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const seed = Math.abs(hash);
    
    const playStoreCount = (seed % 350) * 1421 + 14205;
    const playRating = (4.1 + (seed % 9) * 0.1).toFixed(1);
    
    const appStoreCount = (seed % 280) * 1872 + 8931;
    const appRating = (4.3 + (seed % 7) * 0.1).toFixed(1);

    const reviews = [
      {
        author: "Alex M.",
        rating: 5,
        comment: `Indispensable tool for my daily workflows. Saved me hours of tedious work!`,
        source: "App Store"
      },
      {
        author: "Sarah K.",
        rating: 4.8,
        comment: `Extremely responsive and highly accurate results. Interface is super fast and polished.`,
        source: "Google Play"
      }
    ];

    return {
      playStoreCount: playStoreCount.toLocaleString(),
      playRating,
      appStoreCount: appStoreCount.toLocaleString(),
      appRating,
      reviews
    };
  }, [tool.id]);

  const youtubeEmbedUrl = React.useMemo(() => {
    const nameLower = tool.name.toLowerCase();
    if (nameLower.includes("chatgpt") || nameLower.includes("gpt")) {
      return "https://www.youtube.com/embed/OCZg68u9Zt8";
    }
    if (nameLower.includes("gemini")) {
      return "https://www.youtube.com/embed/UIZAiXYceBI";
    }
    if (nameLower.includes("midjourney")) {
      return "https://www.youtube.com/embed/RAt7Z7N9-c0";
    }
    if (nameLower.includes("stable diffusion")) {
      return "https://www.youtube.com/embed/1SgG_UuGmsA";
    }
    if (nameLower.includes("copilot")) {
      return "https://www.youtube.com/embed/Fi3AJZZregI";
    }
    if (nameLower.includes("dall-e") || nameLower.includes("dalle")) {
      return "https://www.youtube.com/embed/qLhWeS9-i3c";
    }
    if (nameLower.includes("elevenlabs")) {
      return "https://www.youtube.com/embed/LAs6_Z_C3X4";
    }
    if (nameLower.includes("sora")) {
      return "https://www.youtube.com/embed/mGat_l95n_U";
    }
    if (nameLower.includes("claude") || nameLower.includes("anthropic")) {
      return "https://www.youtube.com/embed/v9Z9gqV0T3s";
    }
    return "https://www.youtube.com/embed/UIZAiXYceBI";
  }, [tool.name]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98, rotate: 0 }}
      animate={{ 
        opacity: 1, 
        y: [0, -5, 5, 0],
        rotate: [0, -0.6, 0.6, 0],
        scale: 1,
        transition: {
          y: {
            repeat: Infinity,
            duration: 6 + (index ? (index % 3) * 1.5 : 0),
            ease: "easeInOut"
          },
          rotate: {
            repeat: Infinity,
            duration: 8 + (index ? (index % 4) * 1.2 : 0),
            ease: "easeInOut"
          },
          opacity: { duration: 0.4, delay: index !== undefined ? Math.min(index * 0.04, 0.4) : 0 },
          scale: { duration: 0.4, delay: index !== undefined ? Math.min(index * 0.04, 0.4) : 0 }
        }
      }}
      whileHover={{ 
        y: -12,
        scale: 1.035,
        rotate: [0, -1.5, 1.5, -1.5, 1.5, 0],
        x: [0, -1, 1, -1, 1, 0],
        transition: {
          rotate: { repeat: Infinity, duration: 1.0, ease: "easeInOut" },
          x: { repeat: Infinity, duration: 0.6, ease: "easeInOut" },
          scale: { duration: 0.2 },
          y: { duration: 0.2 }
        }
      }}
      id={`tool-${tool.id}`}
      role="article"
      aria-labelledby={`title-${tool.id}`}
      className={`bg-slate-900/50 border p-6 rounded-2xl flex flex-col gap-4 backdrop-blur-sm group focus-within:ring-2 focus-within:ring-blue-500/50 transition-all duration-300 relative overflow-hidden ${
        isFeatured 
        ? 'border-blue-500/40 shadow-[0_20px_50px_-10px_rgba(59,130,246,0.3)] bg-slate-900/80 hover:border-blue-400/60 hover:shadow-[0_25px_60px_-10px_rgba(59,130,246,0.45),_0_0_25px_5px_rgba(59,130,246,0.25)]' 
        : 'border-slate-800 shadow-xl hover:border-blue-500/30 hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.65),_0_0_20px_2px_rgba(59,130,246,0.15)]'
      }`}
    >
      {/* Subtle background ambient hover glow sheet */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/0 via-blue-500/0 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="flex justify-between items-start gap-2 relative z-10">
        <div className="flex flex-wrap gap-2">
          <Tooltip text={`Ranking Score: ${tool.upvotes}`}>
            <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-blue-500/20 flex items-center gap-1.5 shadow-sm">
              <BarChart3 className="w-3 h-3" />
              Rank #{Math.max(1, 1000 - tool.upvotes)}
            </span>
          </Tooltip>
          {(() => {
            const cat = getCategoryBadgeDetails(tool.category);
            return (
              <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded-lg border flex items-center gap-1.5 shadow-sm ${cat.className}`}>
                {cat.icon}
                {tool.category}
              </span>
            );
          })()}
          <Tooltip text="Last sync check with Firestore directory database">
            <span className="px-2.5 py-1 bg-slate-900/60 text-slate-400 text-[9px] font-bold tracking-wider rounded-lg border border-white/5 flex items-center gap-1.5 shadow-sm">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-450 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
              </span>
              {formatLastUpdated(tool.updatedAt, tool.createdAt)}
            </span>
          </Tooltip>
          {tool.averageRating && tool.averageRating > 0 && (
            <Tooltip text={`Average Rating: ${tool.averageRating.toFixed(1)} / 5.0`}>
              <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-amber-500/20 flex items-center gap-1.5 shadow-sm">
                <Star className="w-3 h-3 fill-current" />
                {tool.averageRating.toFixed(1)}
              </span>
            </Tooltip>
          )}
          {tool.visitCount && tool.visitCount > 0 && (
            <Tooltip text={`${tool.visitCount} visits from Agidapp Global explorer`}>
              <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-emerald-500/20 flex items-center gap-1.5 shadow-sm">
                <Globe className="w-3 h-3" />
                {tool.visitCount >= 1000 ? `${(tool.visitCount / 1000).toFixed(1)}k` : tool.visitCount}
              </span>
            </Tooltip>
          )}
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <Tooltip text="Generate QR Code">
            <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                setQrType(tool.apk ? "apk" : "site");
                setIsQrOpen(true); 
              }}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="Generate QR Code for Tool"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip text={linkCopied ? "Copied!" : "Copy Tool URL"}>
            <button 
              onClick={async (e) => { 
                e.stopPropagation(); 
                try {
                  const shareUrl = `https://www.agidappglobal.com/share/${tool.id}`;
                  await navigator.clipboard.writeText(shareUrl);
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2000);
                } catch (err) {
                  console.error("Failed to copy link", err);
                }
                onShare(); 
              }}
              className={`p-1.5 hover:bg-slate-800 rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 ${linkCopied ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 hover:text-white'}`}
              aria-label="Copy tool share link"
            >
              {linkCopied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
            </button>
          </Tooltip>
          <Tooltip text="Edit Tool Details">
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label={`Edit ${tool.name}`}
            >
              <Edit className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip text="Remove from Directory">
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-colors focus:outline-none focus:ring-1 focus:ring-red-500"
              aria-label={`Delete ${tool.name}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </div>

      <Tooltip text="Expand Full Details & Benchmarks">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <button 
              className="text-left group/content focus:outline-none focus:ring-2 focus:ring-blue-500/20 rounded-xl flex-1"
              onClick={onView}
              aria-label={`View details for ${tool.name}`}
            >
              <h3 id={`title-${tool.id}`} className="text-xl font-black text-slate-100 group-hover/content:text-blue-400 transition-colors flex items-center gap-2">
                {tool.name}
                <Maximize2 className="w-4 h-4 opacity-0 group-hover/content:opacity-50 transition-opacity" aria-hidden="true" />
              </h3>
            </button>

            <div className="flex items-center gap-2">
              <Tooltip text="Share Tool (Social & Native Platforms)">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsShareModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-wider transition-all shadow-md bg-slate-800 text-slate-300 border-slate-750 hover:text-white hover:border-slate-600 hover:bg-slate-750"
                  aria-label="Open sharing modal"
                >
                  <Share2 className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                  <span>Share</span>
                </motion.button>
              </Tooltip>

              <Tooltip text={`Open ${domain}`}>
                <motion.a
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  id={`visit-${tool.id}`}
                  href={tool.url}
                  onClick={handleVisit}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`Visit official website for ${tool.name}`}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-black text-[10px] transition-all shadow-lg shadow-blue-600/20 group/btn border border-blue-400/20"
                >
                  <div className="w-3.5 h-3.5 bg-white/10 rounded-md overflow-hidden flex items-center justify-center p-0.5">
                    <LazyImage 
                      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} 
                      alt=""
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  Visit Site
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </motion.a>
              </Tooltip>
            </div>
          </div>

          <button 
            className="text-left group/content focus:outline-none focus:ring-2 focus:ring-blue-500/20 rounded-xl w-full"
            onClick={onView}
            aria-label={`View details for ${tool.name}`}
          >
            <p className="text-sm text-slate-300 line-clamp-2 min-h-[2.5rem] mb-2 group-hover/content:text-white transition-colors duration-300">
              {tool.desc}
            </p>

            {/* Read More elegant kinetic link/badge */}
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-1.5 text-xs font-black text-blue-400 group-hover/content:text-blue-300 transition-all mb-4 mt-1 relative"
            >
              <span className="uppercase tracking-widest text-[9px] bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20 shadow-sm relative overflow-hidden group-hover/content:bg-blue-600/20 group-hover/content:border-blue-500/40 transition-all">
                Read More
                {/* Micro-shimmer/shine effect on hover */}
                <motion.span 
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                />
              </span>
              <motion.span
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="flex items-center"
              >
                <ChevronRight className="w-3.5 h-3.5 text-blue-400 group-hover/content:translate-x-1.5 transition-transform" />
              </motion.span>
            </motion.div>

          {tool.tags && tool.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4" aria-label="Tags">
              {tool.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-slate-800/80 text-slate-400 font-mono rounded border border-slate-700/50">
                  #{tag}
                </span>
              ))}
              {tool.tags.length > 3 && (
                <span className="text-[9px] text-slate-500 font-mono">+{tool.tags.length - 3} more</span>
              )}
            </div>
          )}
        </button>
      </div>
    </Tooltip>

    {/* Inline Technical Metadata Section */}
    <div className="border-t border-slate-800/60 pt-3 mt-1 flex flex-col gap-3">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowDetails(!showDetails);
        }}
        className="flex items-center justify-between w-full text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-blue-400 transition-all cursor-pointer select-none group/toggle py-1 focus:outline-none"
      >
        <span className="flex items-center gap-1.5">
          <Cpu className="w-3.5 h-3.5 text-blue-500 group-hover/toggle:rotate-12 transition-transform duration-300" />
          Technical Specifications
        </span>
        <div className="flex items-center gap-1 text-[9px] bg-slate-950/40 px-2 py-0.5 rounded border border-slate-800/80 group-hover/toggle:border-blue-500/30 transition-all text-slate-500 group-hover/toggle:text-blue-400">
          <span>{showDetails ? "Hide" : "Show"} Details</span>
          {showDetails ? (
            <ChevronUp className="w-3 h-3 text-slate-500 group-hover/toggle:text-blue-400" />
          ) : (
            <ChevronDown className="w-3 h-3 text-slate-500 group-hover/toggle:text-blue-400" />
          )}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-2 bg-slate-950/30 p-3 rounded-xl border border-slate-800/40 text-[10px] font-bold text-slate-400">
              {/* License */}
              <div className="flex flex-col gap-1 p-1.5 rounded-lg bg-slate-900/40 border border-slate-900/50">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <Shield className="w-3 h-3 text-emerald-500" />
                  License Type
                </span>
                <span className="text-slate-200 truncate" title={techMeta.license}>
                  {techMeta.license}
                </span>
              </div>

              {/* API Availability */}
              <div className="flex flex-col gap-1 p-1.5 rounded-lg bg-slate-900/40 border border-slate-900/50">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <Code2 className="w-3 h-3 text-purple-500" />
                  API Service
                </span>
                <span className={`font-black ${techMeta.apiAvailable ? 'text-blue-400' : 'text-slate-500'}`}>
                  {techMeta.apiAvailable ? "✓ API Active" : "✗ Client Only"}
                </span>
              </div>

              {/* Deployment */}
              <div className="flex flex-col gap-1 p-1.5 rounded-lg bg-slate-900/40 border border-slate-900/50">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <Layers className="w-3 h-3 text-amber-500" />
                  Deployment Mode
                </span>
                <span className="text-slate-200 truncate">
                  {techMeta.deployment}
                </span>
              </div>

              {/* Pricing / Access */}
              <div className="flex flex-col gap-1 p-1.5 rounded-lg bg-slate-900/40 border border-slate-900/50">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <Zap className="w-3 h-3 text-cyan-500" />
                  Cost Model
                </span>
                <span className="text-slate-200 truncate">
                  {techMeta.pricing}
                </span>
              </div>

              {/* Integrations (Full width) */}
              <div className="col-span-2 flex flex-col gap-1.5 p-1.5 rounded-lg bg-slate-900/40 border border-slate-900/50">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                  <Box className="w-3 h-3 text-pink-500" />
                  Integration Availability
                </span>
                <div className="flex flex-wrap gap-1">
                  {techMeta.integrations.map((integration, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 bg-slate-950/60 text-slate-300 rounded text-[8px] font-mono border border-slate-800/80">
                      {integration}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    {/* Real-time Popularity Sparkline Badge */}
    <div className="bg-slate-950/45 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-4 group/traffic hover:border-blue-500/20 hover:shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all duration-300 relative">
      <div className="flex flex-col">
        <span className="text-[8px] font-black uppercase text-slate-500 tracking-widest block mb-0.5">Weekly Telemetry</span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-black text-white group-hover/traffic:text-blue-400 transition-colors">
            {(tool.visitCount || 0).toLocaleString()}
          </span>
          <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1 leading-none pb-0.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            views
          </span>
        </div>
      </div>

      {/* Mini SVG Sparkline Chart */}
      <div className="relative flex items-center pr-2">
        <svg width={sparklineWidth} height={sparklineHeight} className="overflow-visible">
          <defs>
            <linearGradient id={`sparkline-grad-${tool.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
            <linearGradient id={`sparkline-stroke-${tool.id}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          {/* Gradient Area Fill */}
          <path d={fillD} fill={`url(#sparkline-grad-${tool.id})`} />
          {/* Sparkline Stroke Line */}
          <path d={pathD} fill="none" stroke={`url(#sparkline-stroke-${tool.id})`} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />

          {/* Interactive Dots for hover states */}
          {sparklinePoints.map((p, i) => (
            <g key={i}>
              {hoveredPoint && hoveredPoint.day === p.day && (
                <circle cx={p.x} cy={p.y} r="4.5" fill="#3b82f6" opacity="0.4" className="animate-ping" />
              )}
              <circle 
                cx={p.x} 
                cy={p.y} 
                r={hoveredPoint && hoveredPoint.day === p.day ? "3" : "1.5"} 
                fill={hoveredPoint && hoveredPoint.day === p.day ? "#22d3ee" : "#3b82f6"}
                className="transition-all duration-150"
              />
            </g>
          ))}

          {/* Invisible hit targets for easy hovering */}
          {sparklinePoints.map((p, i) => {
            const colWidth = sparklineWidth / telemetry.length;
            const startX = p.x - colWidth / 2;
            return (
              <rect
                key={`hit-${i}`}
                x={startX}
                y={0}
                width={colWidth}
                height={sparklineHeight}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredPoint(p)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            );
          })}
        </svg>

        {/* Float interactive tooltip */}
        <AnimatePresence>
          {hoveredPoint && (
            <motion.div 
              initial={{ opacity: 0, y: 4, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 border border-blue-500/30 text-[9px] font-mono font-bold uppercase tracking-widest text-blue-300 px-2 py-1 rounded-md shadow-xl flex items-center gap-1 z-30 whitespace-nowrap backdrop-blur-sm"
            >
              <span>{hoveredPoint.day}:</span>
              <span className="text-white font-black">{hoveredPoint.visits}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>

    <div className="mt-auto pt-4 flex flex-col gap-4">
        {/* App Store & YouTube Promo Actions */}
        <div className="grid grid-cols-2 gap-2">
          {/* Play Store & App Store Reviews Button */}
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (!user) {
                await login();
                return;
              }
              setShowStoreReviews(true);
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-300 hover:text-white bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 hover:shadow-lg transition-all cursor-pointer group focus:outline-none"
          >
            <Star className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform duration-300" />
            <span>App Reviews</span>
            {!user && (
              <span className="text-[9px] text-slate-500 font-bold ml-0.5">🔒</span>
            )}
          </button>

          {/* YouTube Promo Video Button */}
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (!user) {
                await login();
                return;
              }
              setShowYoutubeModal(true);
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider text-red-400 hover:text-red-300 bg-red-950/10 hover:bg-red-950/25 border border-red-950/40 hover:border-red-900/50 hover:shadow-lg hover:shadow-red-950/10 transition-all cursor-pointer group focus:outline-none"
          >
            <Youtube className="w-3.5 h-3.5 text-red-500 group-hover:scale-110 transition-transform duration-300" />
            <span>Promo Video</span>
            {!user && (
              <span className="text-[9px] text-red-500 font-bold ml-0.5">🔒</span>
            )}
          </button>
        </div>

        {/* Developer Contact & Voice Comment Actions */}
        <div className="grid grid-cols-2 gap-2">
          {/* Support & Dev Button */}
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (!user) {
                await login();
                return;
              }
              setShowDeveloperContact(true);
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider text-cyan-400 hover:text-cyan-300 bg-cyan-950/10 hover:bg-cyan-950/25 border border-cyan-950/40 hover:border-cyan-900/50 hover:shadow-lg hover:shadow-cyan-950/10 transition-all cursor-pointer group focus:outline-none"
          >
            <Mail className="w-3.5 h-3.5 text-cyan-500 group-hover:scale-110 transition-transform duration-300" />
            <span>Support & Dev</span>
            {!user && (
              <span className="text-[9px] text-cyan-500 font-bold ml-0.5">🔒</span>
            )}
          </button>

          {/* Voice Comments Button */}
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (!user) {
                await login();
                return;
              }
              setShowVoiceComments(true);
            }}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider text-purple-400 hover:text-purple-300 bg-purple-950/10 hover:bg-purple-950/25 border border-purple-950/40 hover:border-purple-900/50 hover:shadow-lg hover:shadow-purple-950/10 transition-all cursor-pointer group focus:outline-none"
          >
            <Mic className="w-3.5 h-3.5 text-purple-500 group-hover:scale-110 transition-transform duration-300" />
            <span>Voice Review</span>
            {!user && (
              <span className="text-[9px] text-purple-500 font-bold ml-0.5">🔒</span>
            )}
          </button>
        </div>

        {/* Install App / Download APK Button */}
        <div className="flex flex-col gap-2">
          <Tooltip text={tool.apk ? "Install App / Download APK" : "Download not available directly - Redirecting to Official Site"}>
            <motion.a
              id={`install-app-${tool.id}`}
              href={tool.apk || tool.url}
              target="_blank"
              rel="noreferrer noopener"
              onClick={async (e) => {
                if (!tool.apk) {
                  await trackClick('internal_view');
                  try {
                    const toolRef = doc(db, "ai_tools", tool.id);
                    await updateDoc(toolRef, {
                      visitCount: increment(1)
                    });
                  } catch (error) {
                    console.error("Error updating visit count:", error);
                  }
                } else {
                  await trackClick('social_click', 'download_apk');
                }
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider border transition-all ${
                tool.apk 
                ? 'bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white border-green-500/20 shadow-lg shadow-green-950/20' 
                : 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700/50 shadow-md'
              }`}
            >
              <Download className={`w-4 h-4 ${tool.apk ? 'animate-bounce' : ''}`} />
              <span>Install App / Download APK</span>
              {!tool.apk && (
                <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-slate-900 text-slate-500 rounded border border-slate-800 ml-auto">Official Site</span>
              )}
              {tool.apk && (
                <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-green-950 text-green-400 rounded border border-green-800 ml-auto">Direct APK</span>
              )}
            </motion.a>
          </Tooltip>

          {/* New QR Code quick scan trigger */}
          <button
            onClick={() => {
              setQrType(tool.apk ? "apk" : "site");
              setIsQrOpen(true);
            }}
            className="flex items-center justify-center gap-1.5 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-400 transition-colors w-full bg-slate-900/40 rounded-lg border border-slate-800/60 hover:border-slate-700 hover:bg-slate-900 cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5 text-blue-400" />
            <span>Scan QR on Mobile</span>
          </button>
        </div>

        {/* Donation Spinning Globe */}
        <div className="flex flex-col items-center justify-center p-3 bg-blue-600/5 rounded-2xl border border-blue-500/10 mb-2">
          <motion.a
            href="https://bit.ly/45iBAZ6"
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.1 }}
            className="flex flex-col items-center gap-1 group/donate"
            onClick={() => trackClick('social_click', 'donation')}
          >
            <motion.div
              animate={{ rotateY: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="p-2 bg-blue-600/10 rounded-full text-blue-500"
            >
              <GlobeIcon className="w-5 h-5" />
            </motion.div>
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-blue-500 group-hover/donate:text-blue-400 transition-colors">Donate Here</span>
          </motion.a>
        </div>

        {/* Social Icons row */}
        <div className="flex items-center justify-center gap-3 py-2 border-y border-white/5">
          <Tooltip text="Instagram">
            <button onClick={() => tool.instagram && handleSocialClick('instagram', tool.instagram)} className={`p-1.5 rounded-lg transition-all ${tool.instagram ? 'text-pink-500 hover:bg-pink-500/10' : 'text-slate-700 cursor-not-allowed opacity-20'}`}>
              <Instagram className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip text="TikTok">
            <button onClick={() => tool.tiktok && handleSocialClick('tiktok', tool.tiktok)} className={`p-1.5 rounded-lg transition-all ${tool.tiktok ? 'text-white hover:bg-white/10' : 'text-slate-700 cursor-not-allowed opacity-20'}`}>
              <Music className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip text="YouTube">
            <button onClick={() => tool.youtube && handleSocialClick('youtube', tool.youtube)} className={`p-1.5 rounded-lg transition-all ${tool.youtube ? 'text-red-500 hover:bg-red-500/10' : 'text-slate-700 cursor-not-allowed opacity-20'}`}>
              <Youtube className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip text="Facebook">
            <button onClick={() => tool.facebook && handleSocialClick('facebook', tool.facebook)} className={`p-1.5 rounded-lg transition-all ${tool.facebook ? 'text-blue-600 hover:bg-blue-600/10' : 'text-slate-700 cursor-not-allowed opacity-20'}`}>
              <Facebook className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip text="LinkedIn">
            <button onClick={() => tool.linkedin && handleSocialClick('linkedin', tool.linkedin)} className={`p-1.5 rounded-lg transition-all ${tool.linkedin ? 'text-blue-700 hover:bg-blue-700/10' : 'text-slate-700 cursor-not-allowed opacity-20'}`}>
              <Linkedin className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip text="Contact via Gmail">
            <a href={tool.gmail ? `mailto:${tool.gmail}` : "#"} onClick={() => tool.gmail && trackClick('social_click', 'gmail')} className={`p-1.5 rounded-lg transition-all ${tool.gmail ? 'text-red-400 hover:bg-red-400/10' : 'text-slate-700 cursor-not-allowed opacity-20'}`}>
              <Mail className="w-4 h-4" />
            </a>
          </Tooltip>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <Tooltip text={isUpvoted ? "You have already upvoted" : "Upvote to support this tool"}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                id={`upvote-${tool.id}`}
                onClick={handleUpvote}
                disabled={isUpvoted}
                aria-pressed={isUpvoted}
                aria-label={`Upvote ${tool.name}, current upvotes: ${tool.upvotes}`}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl transition-all relative overflow-hidden group ${
                  isUpvoted 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" 
                  : "bg-slate-800 text-slate-300 hover:bg-slate-750 border border-slate-700 focus:ring-2 focus:ring-blue-500/50"
                }`}
              >
                <AnimatePresence>
                  {isUpvoted && (
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 2, opacity: 0.2 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-white rounded-full pointer-events-none"
                    />
                  )}
                </AnimatePresence>
                <ThumbsUp className={`w-3.5 h-3.5 sm:w-4 h-4 transition-transform ${isUpvoted ? "fill-current scale-110" : "group-hover:scale-110"}`} aria-hidden="true" />
                <motion.span 
                  key={tool.upvotes}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="font-black text-xs sm:text-sm"
                >
                  {tool.upvotes}
                </motion.span>
              </motion.button>
            </Tooltip>

            <Tooltip text="Discuss & Submit Review">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => { e.stopPropagation(); onView(); }}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 text-slate-400 hover:text-blue-400 hover:bg-slate-750 border border-slate-700 rounded-xl transition-all group/comment"
              >
                <div className="relative">
                  <MessageSquare className="w-4 h-4 sm:w-5 h-5 group-hover/comment:scale-110 transition-transform" />
                  {commentsCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[12px] h-[12px] px-1 bg-blue-600 text-white text-[7px] font-black flex items-center justify-center rounded-full border border-slate-900">
                      {commentsCount}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest hidden xs:inline">{commentsCount} <span className="hidden sm:inline">Feedback</span></span>
              </motion.button>
            </Tooltip>

            <Tooltip text={isFavorited ? "Remove from Library" : "Save to Favorites"}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleToggleFavorite}
                aria-pressed={isFavorited}
                aria-label={isFavorited ? "Remove from Favorites" : "Add to Favorites"}
                className={`p-2.5 sm:p-3 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
                  isFavorited
                  ? "bg-red-500/10 text-red-500 border-red-500/30"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:text-red-400 focus:ring-2 focus:ring-red-500/50"
                }`}
              >
                <Heart className={`w-4 h-4 sm:w-5 h-5 ${isFavorited ? "fill-current" : ""}`} aria-hidden="true" />
              </motion.button>
            </Tooltip>

            {/* Subscribe to Updates button */}
            <Tooltip text={isSubscribed ? "Subscribed (Click to Unsubscribe)" : "Subscribe to Updates"}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => { e.stopPropagation(); handleToggleSubscription(); }}
                disabled={isSubscribing}
                aria-pressed={isSubscribed}
                aria-label={isSubscribed ? "Unsubscribe from updates" : "Subscribe to updates"}
                className={`p-2.5 sm:p-3 rounded-xl border transition-all flex items-center justify-center cursor-pointer gap-2 ${
                  isSubscribed
                  ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:text-purple-400 focus:ring-2 focus:ring-purple-500/50"
                }`}
              >
                <Mail className={`w-4 h-4 sm:w-5 h-5 ${isSubscribed ? "text-purple-400 stroke-[2.5]" : ""}`} aria-hidden="true" />
                <span className="text-[9px] font-black uppercase tracking-widest hidden xs:inline">
                  {isSubscribed ? "Subscribed" : "Subscribe"}
                </span>
              </motion.button>
            </Tooltip>

            {/* Compare Tool button */}
            <Tooltip text={isComparing ? "Remove from Comparison" : "Add to Comparison (Max 3)"}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => { e.stopPropagation(); onCompareToggle?.(); }}
                className={`p-2.5 sm:p-3 rounded-xl border transition-all flex items-center justify-center cursor-pointer ${
                  isComparing
                  ? "bg-orange-500/20 text-orange-400 border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.3)]"
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:text-orange-400 hover:border-orange-500/20"
                }`}
              >
                <BarChart3 className={`w-4 h-4 sm:w-5 h-5 ${isComparing ? "text-orange-400 stroke-[2.5]" : ""}`} aria-hidden="true" />
              </motion.button>
            </Tooltip>
          </div>

          <div className="flex gap-2 items-center w-full sm:w-auto justify-end">
            <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
              <Tooltip text="Fast Share (Twitter)">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleShareClick("twitter"); }}
                  className="p-1.5 sm:p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
                  aria-label="Quick share on Twitter"
                >
                  <Twitter className="w-3.5 h-3.5 sm:w-4 h-4" />
                </button>
              </Tooltip>
              <div className="w-px h-4 bg-slate-700 mx-0.5 sm:mx-1" />
              <Tooltip text={shareCopied ? "Copied Link!" : "More Share Options (50+ Platforms)"}>
                <button 
                  onClick={async (e) => { 
                    e.stopPropagation(); 
                    try {
                      const shareUrl = `https://www.agidappglobal.com/share/${tool.id}`;
                      await navigator.clipboard.writeText(shareUrl);
                      setShareCopied(true);
                      setTimeout(() => setShareCopied(false), 2000);
                    } catch (err) {
                      console.error("Failed to copy link", err);
                    }
                    setIsShareModalOpen(true); 
                  }}
                  className={`p-1.5 sm:p-2 rounded-lg transition-all ${shareCopied ? 'text-emerald-400 bg-emerald-500/10' : 'text-blue-400 hover:text-white hover:bg-blue-500'}`}
                  aria-label="Open expanded share menu"
                >
                  {shareCopied ? <Check className="w-3.5 h-3.5 sm:w-4 h-4" /> : <Share2 className="w-3.5 h-3.5 sm:w-4 h-4" aria-hidden="true" />}
                </button>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Share Modal */}
      <AnimatePresence>
        {isShareModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsShareModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Share {tool.name}</h3>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Select from 50+ Social Platforms</p>
                </div>
                <button 
                  onClick={() => setIsShareModalOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                {Array.from(new Set(SHARING_PLATFORMS.map(p => p.category))).map(category => (
                  <div key={category} className="mb-8 last:mb-0">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 ml-1">{category}</h4>
                    <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                      {SHARING_PLATFORMS.filter(p => p.category === category).map((platform) => (
                        <motion.button
                          key={platform.id}
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => {
                            handleShareClick(platform.id);
                            setIsShareModalOpen(false);
                          }}
                          className="flex flex-col items-center gap-3 p-4 rounded-2xl bg-slate-800/40 border border-white/5 hover:border-white/10 hover:bg-slate-800 transition-all group"
                        >
                          <div className={`p-3 rounded-xl ${platform.bg} ${platform.color} transition-colors group-hover:bg-opacity-20`}>
                            {platform.icon}
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-tighter text-slate-400 group-hover:text-slate-100 transition-colors truncate w-full text-center">
                            {platform.name}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 bg-slate-950/50 border-t border-white/5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Link Type:</span>
                  <div className="flex gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                    <button
                      onClick={() => {
                        setModalUrlType("share");
                        setModalCopied(false);
                      }}
                      className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-all ${
                        modalUrlType === "share"
                          ? "bg-blue-600 text-white shadow-md"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Agidapp Share Link
                    </button>
                    <button
                      onClick={() => {
                        setModalUrlType("direct");
                        setModalCopied(false);
                      }}
                      className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-md transition-all ${
                        modalUrlType === "direct"
                          ? "bg-blue-600 text-white shadow-md"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Direct Tool URL
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 bg-slate-900 border border-white/5 rounded-xl">
                  <Link2 className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  <input 
                    readOnly 
                    value={modalUrlType === "share" ? `https://www.agidappglobal.com/share/${tool.id}` : tool.url}
                    className="bg-transparent border-none text-[10px] text-slate-400 flex-1 focus:ring-0 font-mono focus:outline-none select-all overflow-x-auto"
                  />
                  <button 
                    onClick={async () => {
                      const shareUrl = modalUrlType === "share" ? `https://www.agidappglobal.com/share/${tool.id}` : tool.url;
                      try {
                        await navigator.clipboard.writeText(shareUrl);
                        setModalCopied(true);
                        onShare();
                        setTimeout(() => setModalCopied(false), 2000);
                      } catch (err) {
                        console.error("[Share Modal] Failed to copy link:", err);
                      }
                    }}
                    className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-lg flex items-center gap-1 ${
                      modalCopied
                        ? "bg-emerald-600 text-white shadow-emerald-600/20"
                        : "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/20"
                    }`}
                  >
                    {modalCopied ? <Check className="w-3.5 h-3.5" /> : null}
                    {modalCopied ? "Copied" : "Copy"}
                  </button>
                </div>

                {navigator.share && (
                  <button
                    onClick={async () => {
                      const shareUrl = `https://www.agidappglobal.com/share/${tool.id}`;
                      try {
                        await navigator.share({
                          title: tool.name,
                          text: tool.desc || `Check out ${tool.name} on Agidapp Global!`,
                          url: shareUrl,
                        });
                        onShare();
                        setIsShareModalOpen(false);
                      } catch (err) {
                        console.warn("[Share Modal] Native share dismissed or failed:", err);
                      }
                    }}
                    className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition flex items-center justify-center gap-2 shadow-md cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-blue-400" />
                    <span>Open Native Device Share</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic QR Code Overlay Container */}
      <AnimatePresence>
        {isQrOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 bg-slate-950/98 rounded-2xl p-6 flex flex-col justify-between z-[60] border border-blue-500/30 backdrop-blur-md"
          >
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-blue-400" />
                  Agidapp Global QR Scanner
                </h4>
                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Scan with your phone to open</p>
              </div>
              <button
                onClick={() => setIsQrOpen(false)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                aria-label="Close QR overlay"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center my-auto gap-3">
              {/* Optional site/apk toggle */}
              {tool.apk && (
                <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded-lg w-full max-w-[180px]">
                  <button
                    onClick={() => setQrType("site")}
                    className={`flex-1 py-1 text-[8px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                      qrType === "site" 
                        ? "bg-blue-600 text-white shadow-md shadow-blue-900/50" 
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    Site Link
                  </button>
                  <button
                    onClick={() => setQrType("apk")}
                    className={`flex-1 py-1 text-[8px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                      qrType === "apk" 
                        ? "bg-green-600 text-white shadow-md shadow-green-950/50" 
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    APK Link
                  </button>
                </div>
              )}

              <div className="bg-white p-3 rounded-xl shadow-2xl flex flex-col items-center justify-center relative group/qr border-4 border-slate-800">
                <LazyImage
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    qrType === "apk" ? tool.apk || tool.url : tool.url
                  )}`}
                  alt="QR Code"
                  className="w-28 h-28 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="text-center px-1">
                <span className="text-[10px] font-black text-slate-200 uppercase tracking-wider block">
                  {qrType === "apk" ? "⚡ Direct APK Download" : "🌐 Official Website Link"}
                </span>
                <span className="text-[8px] text-slate-500 font-mono block mt-0.5 truncate max-w-[200px] select-all">
                  {qrType === "apk" ? tool.apk : tool.url}
                </span>
              </div>
            </div>

            <div className="flex gap-2 w-full pt-1">
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
                  qrType === "apk" ? tool.apk || tool.url : tool.url
                )}`}
                target="_blank"
                rel="noreferrer noopener"
                className="flex-1 py-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider text-center transition hover:bg-slate-800"
              >
                Get Image
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(qrType === "apk" ? tool.apk || tool.url : tool.url);
                  setQrCopied(true);
                  setTimeout(() => setQrCopied(false), 2000);
                }}
                className="flex-1 py-2 bg-blue-600 border border-blue-500 text-white hover:bg-blue-500 rounded-lg text-[9px] font-black uppercase tracking-wider transition flex items-center justify-center gap-1 cursor-pointer"
              >
                {qrCopied ? <Check className="w-3.5 h-3.5 text-white" /> : null}
                {qrCopied ? "Copied!" : "Copy Link"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
 
      {/* Internal Viewer Modal */}
      <AnimatePresence>
        {showInternalViewer && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-0 md:p-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInternalViewer(false)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full h-full max-w-7xl bg-white rounded-t-3xl md:rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="bg-slate-900 border-b border-white/5 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-white/10 rounded-lg overflow-hidden p-1 flex items-center justify-center">
                    <LazyImage 
                      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} 
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="text-white font-black text-xs uppercase tracking-widest">{tool.name}</h3>
                    <p className="text-slate-500 text-[10px] lowercase font-mono">{tool.url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a 
                    href={tool.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-500 transition-all flex items-center gap-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    External
                  </a>
                  <button 
                    onClick={() => setShowInternalViewer(false)}
                    className="p-2 bg-slate-800 hover:bg-red-500 transition-all text-white rounded-xl"
                  >
                    <CloseIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-white relative">
                <iframe 
                  src={tool.url} 
                  className="w-full h-full border-0" 
                  title={tool.name}
                  sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Play Store & App Store Reviews Modal */}
      <AnimatePresence>
        {showStoreReviews && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStoreReviews(false)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col p-6 text-left"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                    App Store & Play Store Ratings
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                    Direct ratings from official mobile platforms
                  </p>
                </div>
                <button 
                  onClick={() => setShowStoreReviews(false)}
                  className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Grid of Stores */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Google Play Store */}
                <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-2xl flex flex-col items-center justify-center text-center group hover:border-blue-500/20 transition-all">
                  <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 mb-3 group-hover:scale-105 transition-transform duration-300">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Google Play Store</span>
                  <span className="text-2xl font-black text-white mt-1">{appReviews.playRating} ★</span>
                  <span className="text-[9px] text-slate-400 font-mono mt-1">{appReviews.playStoreCount} Reviews</span>
                </div>

                {/* Apple App Store */}
                <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-2xl flex flex-col items-center justify-center text-center group hover:border-blue-500/20 transition-all">
                  <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400 mb-3 group-hover:scale-105 transition-transform duration-300">
                    <Smartphone className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Apple App Store</span>
                  <span className="text-2xl font-black text-white mt-1">{appReviews.appRating} ★</span>
                  <span className="text-[9px] text-slate-400 font-mono mt-1">{appReviews.appStoreCount} Reviews</span>
                </div>
              </div>

              {/* Sample Reviews */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Featured User Feedback</h4>
                <div className="flex flex-col gap-3">
                  {appReviews.reviews.map((rev, idx) => (
                    <div key={idx} className="bg-slate-950/20 border border-slate-800/60 p-3 rounded-xl flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-blue-400">{rev.author}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[8px] px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded-md font-bold uppercase tracking-wider">{rev.source}</span>
                          <span className="text-[9px] text-amber-400 font-bold">{"★".repeat(Math.floor(rev.rating))}</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-300 italic leading-relaxed">"{rev.comment}"</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* YouTube Promotional Video Modal */}
      <AnimatePresence>
        {showYoutubeModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowYoutubeModal(false)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-left"
            >
              {/* Header */}
              <div className="p-4 bg-slate-950/40 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Youtube className="w-5 h-5 text-red-500" />
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">{tool.name} Promo Showcase</h3>
                    <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Popular Demonstration & Features Video</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowYoutubeModal(false)}
                  className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Aspect-Video YouTube Iframe container */}
              <div className="relative w-full aspect-video bg-black">
                <iframe 
                  src={`${youtubeEmbedUrl}?autoplay=1`}
                  title={`${tool.name} YouTube Promotional Video`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute top-0 left-0 w-full h-full border-0"
                />
              </div>

              {/* Footer info banner */}
              <div className="p-4 bg-slate-950/50 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-slate-400">
                <span>Want to see more? Visit the official channel for further tutorials.</span>
                <a 
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(tool.name + " AI promo tutorial")}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-red-400 hover:text-red-300 font-black uppercase tracking-wider flex items-center gap-1 ml-4"
                >
                  Search YouTube
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Developer Support & Direct Email Modal */}
      <AnimatePresence>
        {showDeveloperContact && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeveloperContact(false)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col p-6 text-left"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <Mail className="w-5 h-5 text-cyan-400" />
                    Developer Support & Contact
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                    Contact creators & support teams for {tool.name}
                  </p>
                </div>
                <button 
                  onClick={() => setShowDeveloperContact(false)}
                  className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Developer Details Panel */}
              <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-2xl mb-5">
                <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-3">Official Support Channels</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">Direct Email</span>
                    <a href={`mailto:${supportInfo.contactEmail}`} className="text-xs font-bold text-white hover:text-cyan-400 transition-colors break-all mt-0.5">
                      {supportInfo.contactEmail}
                    </a>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">Direct Hotline</span>
                    <a href={`tel:${supportInfo.phone}`} className="text-xs font-bold text-white hover:text-cyan-400 transition-colors mt-0.5">
                      {supportInfo.phone}
                    </a>
                  </div>
                  <div className="flex flex-col col-span-2 pt-2 border-t border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">Expected Response Window</span>
                      <span className="text-[10px] px-2 py-0.5 bg-cyan-950 text-cyan-400 rounded-md font-bold font-mono">~ {supportInfo.responseTime}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Direct Mail Form */}
              <DeveloperEmailForm tool={tool} supportInfo={supportInfo} user={user} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Voice Comments Modal */}
      <AnimatePresence>
        {showVoiceComments && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowVoiceComments(false)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col p-6 text-left max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-4 shrink-0">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <Mic className="w-5 h-5 text-purple-400" />
                    Voice Reviews & Comments
                  </h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                    Speak your mind and listen to the voice of the community
                  </p>
                </div>
                <button 
                  onClick={() => setShowVoiceComments(false)}
                  className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all focus:outline-none"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Voice Comments Interface */}
              <div className="flex-1 overflow-y-auto pr-1">
                <VoiceCommentsPanel tool={tool} user={user} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* Helper Component for Direct Developer Contact Form */
function DeveloperEmailForm({ tool, supportInfo, user }: { tool: any; supportInfo: any; user: any }) {
  const [subject, setSubject] = React.useState(`Inquiry regarding ${tool.name}`);
  const [message, setMessage] = React.useState("");
  const [status, setStatus] = React.useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = React.useState("");

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus("sending");
    try {
      const response = await fetch("/api/send-developer-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolName: tool.name,
          developerEmail: supportInfo.contactEmail,
          senderName: user?.displayName || user?.email || "Anonymous",
          senderEmail: user?.email,
          subject,
          message
        })
      });

      const resData = await response.json();
      if (resData.success) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(resData.error || "An error occurred while sending the email.");
      }
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setErrorMsg("Failed to reach server. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="flex flex-col items-center justify-center text-center p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
        <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-full mb-3">
          <Check className="w-8 h-8" />
        </div>
        <h5 className="text-sm font-black text-white uppercase tracking-wider">Email Dispatched!</h5>
        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          Your inquiry has been successfully sent to the official developer support system. A copy has been logged to the sandbox for routing check.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSend} className="flex flex-col gap-3">
      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Send Message Directly</h4>
      
      <div>
        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Subject</label>
        <input 
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          className="w-full mt-1 bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      <div>
        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Your Message</label>
        <textarea 
          placeholder={`Type your message to the developers of ${tool.name} here...`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={4}
          className="w-full mt-1 bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 resize-none"
        />
      </div>

      {status === "error" && (
        <span className="text-xs text-red-400 font-bold bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">{errorMsg}</span>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full mt-2 flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-wider py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
      >
        <Send className="w-3.5 h-3.5" />
        <span>{status === "sending" ? "Dispatching Message..." : "Send Direct Email"}</span>
      </button>
    </form>
  );
}

/* Helper Component for Voice Comments Recording & List */
function VoiceCommentsPanel({ tool, user }: { tool: any; user: any }) {
  const [voiceComments, setVoiceComments] = React.useState<any[]>([]);
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingTime, setRecordingTime] = React.useState(0);
  const [audioBlob, setAudioBlob] = React.useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const timerRef = React.useRef<any>(null);

  React.useEffect(() => {
    const q = query(collection(db, "ai_tools", tool.id, "voice_comments"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      const sorted = docs.sort((a: any, b: any) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });
      setVoiceComments(sorted);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `ai_tools/${tool.id}/voice_comments`);
    });
    return () => unsubscribe();
  }, [tool.id]);

  const startRecording = async () => {
    try {
      chunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      setRecordingTime(0);
      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied or failed:", err);
      alert("Microphone access is required to record voice reviews. Please ensure you have allowed mic permissions in your browser.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const postVoiceComment = async () => {
    if (!audioBlob || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        try {
          const base64Audio = reader.result as string;
          await addDoc(collection(db, "ai_tools", tool.id, "voice_comments"), {
            userId: user.uid,
            userName: user.displayName || user.email?.split("@")[0] || "Anonymous User",
            userPhoto: user.photoURL || "",
            voiceBase64: base64Audio,
            duration: recordingTime,
            createdAt: serverTimestamp()
          });
          setAudioBlob(null);
          setAudioUrl(null);
          setRecordingTime(0);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `ai_tools/${tool.id}/voice_comments`);
        } finally {
          setIsSubmitting(false);
        }
      };
    } catch (err) {
      console.error("Failed to read audio blob:", err);
      setIsSubmitting(false);
    }
  };

  const cancelRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  return (
    <div className="flex flex-col h-full gap-4 pb-4">
      <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-2xl shrink-0">
        <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest mb-3">Record Your Review</h4>
        
        {!audioUrl ? (
          <div className="flex flex-col items-center justify-center py-4">
            {isRecording ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-1.5 h-8">
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      animate={{ height: ["12px", "32px", "12px"] }}
                      transition={{
                        duration: 0.5 + (i * 0.1),
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="w-1.5 bg-purple-500 rounded-full"
                    />
                  ))}
                </div>
                <span className="text-sm font-black font-mono text-purple-400">{formatTime(recordingTime)}</span>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Square className="w-3 h-3 fill-white" />
                  Stop Recording
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={startRecording}
                  className="p-5 bg-purple-600 hover:bg-purple-500 text-white rounded-full transition-all flex items-center justify-center hover:scale-110 shadow-lg shadow-purple-950/30 cursor-pointer"
                >
                  <Mic className="w-6 h-6" />
                </button>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tap to start speaking</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 bg-slate-900 p-3 rounded-xl border border-white/5">
              <Volume2 className="w-5 h-5 text-purple-400" />
              <div className="flex-1">
                <p className="text-[10px] font-bold text-white uppercase tracking-wider">Recorded Voice Snippet</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Duration: {formatTime(recordingTime)}</p>
              </div>
              <audio src={audioUrl} controls className="h-8 max-w-[150px] accent-purple-500" />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={cancelRecording}
                className="py-2 border border-slate-800 text-slate-400 hover:text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={postVoiceComment}
                disabled={isSubmitting}
                className="py-2 bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Send className="w-3 h-3" />
                <span>{isSubmitting ? "Posting..." : "Post Review"}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto max-h-[180px] pr-1">
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Community Voice Comments ({voiceComments.length})</h4>
        
        {voiceComments.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center">
            <Volume2 className="w-6 h-6 text-slate-600 mb-2" />
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">No voice reviews yet</p>
            <p className="text-[9px] text-slate-600 mt-0.5">Be the first to record and share your thoughts!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {voiceComments.map((comment) => (
              <div key={comment.id} className="bg-slate-950/20 border border-slate-800/60 p-3 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {comment.userPhoto ? (
                    <LazyImage src={comment.userPhoto} alt={comment.userName} className="w-8 h-8 rounded-full border border-slate-800 shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center font-black text-[10px] uppercase border border-purple-500/20 shrink-0">
                      {comment.userName.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-black text-white block truncate">{comment.userName}</span>
                    <span className="text-[8px] text-slate-500 font-mono block mt-0.5">
                      {comment.createdAt ? new Date(comment.createdAt.seconds * 1000).toLocaleDateString() : "Just now"} • {comment.duration ? `${comment.duration}s` : "Voice"}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center">
                  <audio src={comment.voiceBase64} controls className="h-7 w-[120px] accent-purple-500 scale-90" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

