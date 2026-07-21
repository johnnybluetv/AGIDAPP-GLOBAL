import * as React from "react";
import { onSnapshot, collection, query, orderBy, getDocsFromServer, getDocs } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { AiTool, CATEGORIES, Category, UserRole } from "./types";
import { Search, Filter, Menu, X, Rocket, Zap, Database, ExternalLink, Plus, ArrowUp, Edit, Trash2, Share2, Info, ThumbsUp, Globe, LogIn, LogOut, Heart, User as UserIcon, MessageSquare, Shield, AlertTriangle, ChevronLeft, ChevronRight, BookOpen, Star, Users, BarChart, Cloud, Sun, Moon, ArrowLeftRight, Image as ImageIcon, FileText, Settings, Volume2, VolumeX, History, Bookmark, Folder } from "lucide-react";
import { motion, AnimatePresence, useScroll, useSpring } from "motion/react";
import ToolCard from "./components/ToolCard";
import { Sparkles, Palette, Code2, Box, Video as VideoIcon } from "lucide-react";
import SkeletonCard from "./components/SkeletonCard";
import SubmitForm from "./components/SubmitForm";
import UserProfile from "./components/UserProfile";
import SocialFeed from "./components/SocialFeed";
import { Radio } from "lucide-react";
import AdminPortal from "./components/AdminPortal";
import CommentSection from "./components/CommentSection";
import RelatedTools from "./components/RelatedTools";
import ArticleSubmitForm from "./components/ArticleSubmitForm";
import ArticlesList from "./components/ArticlesList";
import Onboarding from "./components/Onboarding";
import SocialShare from "./components/SocialShare";
import SoundActivationModal from "./components/SoundActivationModal";
import LogoSnowfall from "./components/LogoSnowfall";
import UserWaterfall from "./components/UserWaterfall";
import { translations, Language } from "./lib/translations";
import ToolRecommender from "./components/ToolRecommender";
import RecommendedForYou from "./components/RecommendedForYou";
import StatsDashboard from "./components/StatsDashboard";
import VoiceSearch from "./components/VoiceSearch";
import DriveDashboard from "./components/DriveDashboard";
import BlazingFire from "./components/BlazingFire";
import AuthModal from "./components/AuthModal";
import NewsletterForm from "./components/NewsletterForm";
import LegalContactModal from "./components/LegalContactModal";
import AdSenseUnit from "./components/AdSenseUnit";
import { deleteDoc, doc, updateDoc, setDoc, increment, addDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useAuth } from "./context/AuthContext";
import { Helmet } from "react-helmet-async";
import Fuse from "fuse.js";
import { useWebVitals } from "./hooks/useWebVitals";

export default function App() {
  useWebVitals();
  const { user, login } = useAuth();
  const [tools, setTools] = React.useState<AiTool[]>([]);
  const [favorites, setFavorites] = React.useState<string[]>([]);
  const [bookmarks, setBookmarks] = React.useState<{ id: string; toolId: string; projectId: string | null }[]>([]);
  const [curatedProjects, setCuratedProjects] = React.useState<{ id: string; name: string; desc?: string }[]>([]);
  const [showBookmarkMenu, setShowBookmarkMenu] = React.useState(false);
  const [newProjectName, setNewProjectName] = React.useState("");
  const [newProjectDesc, setNewProjectDesc] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<Category | "All">("All");
  const [selectedQuickSector, setSelectedQuickSector] = React.useState<string>("All");
  const [selectedType, setSelectedType] = React.useState<string>("All");
  const [showFavoritesOnly, setShowFavoritesOnly] = React.useState(false);
  const [isScraping, setIsScraping] = React.useState(false);
  const [showScrollTop, setShowScrollTop] = React.useState(false);
  const [focusedSuggestionIndex, setFocusedSuggestionIndex] = React.useState(-1);
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = React.useState(false);
  const [activeTags, setActiveTags] = React.useState<string[]>([]);
  const [pricingFilter, setPricingFilter] = React.useState<"All" | "Free" | "Open Source">("All");

  // Dialog State
  const [selectedTool, setSelectedTool] = React.useState<AiTool | null>(null);
  const [isEditing, setIsEditing] = React.useState(false);
  const [editFormData, setEditFormData] = React.useState<Partial<AiTool>>({});
  const [toolToDelete, setToolToDelete] = React.useState<AiTool | null>(null);
  const [showProfile, setShowProfile] = React.useState(false);
  const [targetUserId, setTargetUserId] = React.useState<string | null>(null);
  const [showAdminPortal, setShowAdminPortal] = React.useState(false);
  const [userRole, setUserRole] = React.useState<UserRole>("User");
  const [authWarning, setAuthWarning] = React.useState<string | null>(null);
  const [toast, setToast] = React.useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [displayCount, setDisplayCount] = React.useState(10);
  const [authMode, setAuthMode] = React.useState<'signin' | 'signup' | null>(null);
  const [screenMode, setScreenMode] = React.useState<'Fluid' | 'Mobile' | 'Laptop2' | 'Desktop' | 'Macbook' | 'TV' | 'Projector' | 'Theatre'>('Fluid');
  const [showScreenModeMenu, setShowScreenModeMenu] = React.useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = React.useState(false);
  const [showWaterfallMobile, setShowWaterfallMobile] = React.useState(false);
  const [showInsights, setShowInsights] = React.useState(false);
  const [showDrive, setShowDrive] = React.useState(false);
  const [showSocialFeed, setShowSocialFeed] = React.useState(false);

  // Sync and Debug States
  const [syncStatus, setSyncStatus] = React.useState<'live' | 'offline'>('offline');
  const [indexingStatus, setIndexingStatus] = React.useState<'idle' | 'indexing' | 'success' | 'error'>('idle');
  const [indexingMessage, setIndexingMessage] = React.useState('');
  const [refreshing, setRefreshing] = React.useState(false);

  // Compare Mode State
  const [comparedTools, setComparedTools] = React.useState<AiTool[]>([]);
  const [showComparisonModal, setShowComparisonModal] = React.useState(false);

  // Language State
  const [language, setLanguage] = React.useState<Language>(() => {
    try {
      const saved = localStorage.getItem("agid_lang") as Language;
      if (saved === "en" || saved === "es" || saved === "fr" || saved === "de") return saved;
    } catch {}
    return "en";
  });

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    try {
      localStorage.setItem("agid_lang", lang);
    } catch {}
  };

  const DEMO_AI_TOOLS = React.useMemo(() => [
    {
      name: "ChatGPT",
      category: "LLM & Chat" as Category,
      type: "Web App" as const,
      url: "https://chatgpt.com",
      desc: "OpenAI's premier conversational AI assistant designed for drafting, learning, brainstorming, and deep productivity.",
      upvotes: 245,
      tags: ["llm", "chat", "openai", "productivity"],
      averageRating: 4.8,
      totalRatingsCount: 12
    },
    {
      name: "Claude 3.5 Sonnet",
      category: "LLM & Chat" as Category,
      type: "Web App" as const,
      url: "https://claude.ai",
      desc: "Anthropic's highly sophisticated model, setting new industry benchmarks for graduate-level reasoning, undergraduate-level knowledge, and coding proficiency.",
      upvotes: 312,
      tags: ["llm", "chat", "anthropic", "coding"],
      averageRating: 4.9,
      totalRatingsCount: 15
    },
    {
      name: "Midjourney v6",
      category: "Image & Art" as Category,
      type: "Software (Desktop)" as const,
      url: "https://midjourney.com",
      desc: "Generative AI program that creates stunning, photorealistic and artistic imagery from natural language descriptions via Discord.",
      upvotes: 189,
      tags: ["image", "art", "generation", "creative"],
      averageRating: 4.7,
      totalRatingsCount: 8
    },
    {
      name: "Cursor AI",
      category: "Developer Tools" as Category,
      type: "Software (Desktop)" as const,
      url: "https://cursor.com",
      desc: "An advanced, AI-powered code editor built as a fork of VS Code, enabling auto-programming, smart edits, and chat-guided design directly on your files.",
      upvotes: 278,
      tags: ["coding", "ide", "developer-tools", "productivity"],
      averageRating: 4.9,
      totalRatingsCount: 10
    },
    {
      name: "v0 by Vercel",
      category: "Developer Tools" as Category,
      type: "Web App" as const,
      url: "https://v0.dev",
      desc: "Generative UI system by Vercel that produces clean, copy-pasteable React, Tailwind CSS, and Shadcn UI components from simple text prompts.",
      upvotes: 156,
      tags: ["ui", "react", "frontend", "vercel"],
      averageRating: 4.6,
      totalRatingsCount: 5
    },
    {
      name: "ElevenLabs Voice",
      category: "Audio & Video" as Category,
      type: "API / Platform" as const,
      url: "https://elevenlabs.io",
      desc: "Highly realistic, emotive AI text-to-speech and voice cloning software with rich developer APIs for real-time synthesis.",
      upvotes: 203,
      tags: ["voice", "tts", "audio", "api"],
      averageRating: 4.8,
      totalRatingsCount: 9
    }
  ], []);

  const handleForceRefresh = async () => {
    console.log("[Force Refresh] Requesting fresh data directly from Firestore server (bypassing cache)...");
    setRefreshing(true);
    try {
      const q = query(collection(db, "ai_tools"), orderBy("createdAt", "desc"));
      let snapshot;
      try {
        snapshot = await getDocsFromServer(q);
        console.log(`[Force Refresh] SUCCESS: Retrieved ${snapshot.size} tools directly from Firestore server.`);
      } catch (serverErr) {
        console.warn("[Force Refresh] Direct server fetch failed, falling back to cache/local query:", serverErr);
        snapshot = await getDocs(q);
        console.log(`[Force Refresh] SUCCESS: Retrieved ${snapshot.size} tools via standard query.`);
      }
      const toolsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AiTool[];
      setTools(toolsData);
      setSyncStatus('live');
      setToast({ message: `Successfully refreshed! Fetched ${snapshot.size} tools.`, type: 'success' });
      setTimeout(() => setToast(null), 3000);
    } catch (error: any) {
      console.error("[Force Refresh] ERROR: Direct server and cached fetch failed:", error);
      setSyncStatus('offline');
      setToast({ message: `Refresh failed: ${error?.message || error}`, type: 'error' });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDebugIndexing = async () => {
    console.log("[Debug Indexing] Initializing automated indexation of premium AI tools...");
    setIndexingStatus("indexing");
    setIndexingMessage("Deploying premium tool documents to Firestore database...");
    let count = 0;
    try {
      for (const t of DEMO_AI_TOOLS) {
        if (tools.some(existingTool => existingTool.name.toLowerCase() === t.name.toLowerCase())) {
          console.log(`[Debug Indexing] Tool "${t.name}" already exists in the local directory. Skipping.`);
          continue;
        }
        await addDoc(collection(db, "ai_tools"), {
          ...t,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        count++;
      }
      setIndexingStatus("success");
      setIndexingMessage(`Successfully indexed ${count} premium AI tools!`);
      setToast({ message: `Successfully indexed ${count} premium AI tools!`, type: 'success' });
      setTimeout(() => setToast(null), 4000);
      console.log(`[Debug Indexing] SUCCESS: Indexed ${count} tools.`);
    } catch (err: any) {
      console.error("[Debug Indexing] ERROR: Failed to index tools:", err);
      setIndexingStatus("error");
      setIndexingMessage(`Failed to index: ${err?.message || err}`);
      setToast({ message: `Indexing failed: ${err?.message || err}`, type: 'error' });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setIndexingStatus("idle");
    }
  };

  const t = translations[language];

  // Confirmation Modal States
  const [showClearHistoryConfirm, setShowClearHistoryConfirm] = React.useState(false);

  const toggleCompareTool = (tool: AiTool) => {
    setComparedTools(prev => {
      if (prev.some(t => t.id === tool.id)) {
        return prev.filter(t => t.id !== tool.id);
      }
      if (prev.length >= 3) {
        setToast({ message: "You can compare up to 3 tools maximum", type: 'error' });
        return prev;
      }
      return [...prev, tool];
    });
  };

  // Theme State
  const [theme, setTheme] = React.useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });

  // Header scroll & dragging state
  const headerScrollRef = React.useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = React.useState(false);
  const [showRightArrow, setShowRightArrow] = React.useState(false);
  const [isHeaderDragging, setIsHeaderDragging] = React.useState(false);
  const [headerStartX, setHeaderStartX] = React.useState(0);
  const [headerScrollLeft, setHeaderScrollLeft] = React.useState(0);

  const updateScrollArrows = React.useCallback(() => {
    const el = headerScrollRef.current;
    if (el) {
      const canScrollLeft = el.scrollLeft > 2;
      const canScrollRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
      setShowLeftArrow(canScrollLeft);
      setShowRightArrow(canScrollRight);
    }
  }, []);

  const scrollHeader = (direction: 'left' | 'right') => {
    const el = headerScrollRef.current;
    if (el) {
      const scrollAmount = 350;
      el.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
      // Play sound if enabled
      if (soundPreference === 'enabled') {
        playRandomInteractiveSound();
      }
    }
  };

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    const el = headerScrollRef.current;
    if (!el) return;
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('select')) {
      return;
    }
    setIsHeaderDragging(true);
    setHeaderStartX(e.pageX - el.offsetLeft);
    setHeaderScrollLeft(el.scrollLeft);
  };

  const handleHeaderMouseMove = (e: React.MouseEvent) => {
    if (!isHeaderDragging) return;
    e.preventDefault();
    const el = headerScrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - headerStartX) * 1.5;
    el.scrollLeft = headerScrollLeft - walk;
    updateScrollArrows();
  };

  const handleHeaderMouseUpOrLeave = () => {
    setIsHeaderDragging(false);
  };

  React.useEffect(() => {
    const el = headerScrollRef.current;
    if (el) {
      const timer = setTimeout(updateScrollArrows, 300);
      
      const observer = new ResizeObserver(() => {
        updateScrollArrows();
      });
      observer.observe(el);

      return () => {
        clearTimeout(timer);
        observer.disconnect();
      };
    }
  }, [updateScrollArrows, tools, user, showSocialFeed, comparedTools]);

  // Spinning Galaxy State
  const [showSpinningGalaxy, setShowSpinningGalaxy] = React.useState(false);

  // Legal, Privacy, Contact Modal State
  const [legalModalTab, setLegalModalTab] = React.useState<'terms' | 'privacy' | 'contact' | null>(null);
  const [showSharePanel, setShowSharePanel] = React.useState<boolean>(false);

  // Sound preference state
  const [soundPreference, setSoundPreference] = React.useState<'enabled' | 'disabled' | 'unasked'>(() => {
    try {
      const saved = localStorage.getItem('sound_preference');
      if (saved === 'enabled' || saved === 'disabled') return saved;
    } catch {}
    return 'unasked';
  });

  // Synthesize rich, high-fidelity interactive sounds using Web Audio API (license-free, public domain)
  const playRandomInteractiveSound = React.useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      
      const ctx = new AudioContextClass();
      
      // Main compression and gain control
      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(0.12, ctx.currentTime);
      mainGain.connect(ctx.destination);

      const playBubble = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(mainGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      };

      const playTechBlip = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1760, ctx.currentTime + 0.03);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(mainGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      };

      const playBellChime = () => {
        const freqs = [587.33, 880, 1174.66, 1318.51];
        freqs.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          const delay = i * 0.015;
          const duration = 0.35 - (i * 0.04);
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.setValueAtTime(0.08, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
          osc.connect(gain);
          gain.connect(mainGain);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + duration + 0.05);
        });
      };

      const playArcadeCoin = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(987.77, ctx.currentTime);
        osc.frequency.setValueAtTime(1318.51, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(mainGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      };

      const playWoodBlock = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(mainGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      };

      const playTwinkle = () => {
        const baseFreq = 1100;
        for (let i = 0; i < 4; i++) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(baseFreq + (i * 280), ctx.currentTime + i * 0.035);
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.setValueAtTime(0.06, ctx.currentTime + i * 0.035);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.035 + 0.15);
          osc.connect(gain);
          gain.connect(mainGain);
          osc.start(ctx.currentTime + i * 0.035);
          osc.stop(ctx.currentTime + i * 0.035 + 0.2);
        }
      };

      const playMechanicalClick = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(1500, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(250, ctx.currentTime + 0.012);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.012);
        osc.connect(gain);
        gain.connect(mainGain);
        
        const bufferSize = ctx.sampleRate * 0.006;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.1, ctx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.006);
        noise.connect(noiseGain);
        noiseGain.connect(mainGain);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.02);
        noise.start();
        noise.stop(ctx.currentTime + 0.02);
      };

      const sounds = [
        playBubble,
        playTechBlip,
        playBellChime,
        playArcadeCoin,
        playWoodBlock,
        playTwinkle,
        playMechanicalClick
      ];

      const randomIdx = Math.floor(Math.random() * sounds.length);
      sounds[randomIdx]();
    } catch (e) {
      console.warn("Could not play synthesized sound:", e);
    }
  }, []);

  React.useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Dynamically inject Google Analytics (gtag.js) for SEO tracking
  React.useEffect(() => {
    const trackingId = import.meta.env.VITE_GOOGLE_ANALYTICS_ID;
    if (trackingId) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
      document.head.appendChild(script);

      const inlineScript = document.createElement("script");
      inlineScript.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${trackingId}');
      `;
      document.head.appendChild(inlineScript);

      return () => {
        try {
          document.head.removeChild(script);
          document.head.removeChild(inlineScript);
        } catch (e) {
          // Ignore removal errors if clean up occurs after page reload
        }
      };
    }
  }, []);

  const screenConfigs = {
    Fluid: { width: "100%", height: "100%", scale: 1 },
    Mobile: { width: "375px", height: "667px", scale: 0.8 },
    Laptop2: { width: "1366px", height: "768px", scale: 0.6 },
    Desktop: { width: "1920px", height: "1080px", scale: 0.5 },
    Macbook: { width: "1440px", height: "900px", scale: 0.6 },
    TV: { width: "3840px", height: "2160px", scale: 0.25 },
    Projector: { width: "1024px", height: "768px", scale: 0.7 },
    Theatre: { width: "2560px", height: "1080px", scale: 0.4 },
  };

  // Article State
  const [isArticleMenuOpen, setIsArticleMenuOpen] = React.useState(false);
  const [showArticlesList, setShowArticlesList] = React.useState(false);
  const [showArticleSubmit, setShowArticleSubmit] = React.useState(false);

  // Suggestions state
  const [suggestions, setSuggestions] = React.useState<AiTool[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [isSearchFocused, setIsSearchFocused] = React.useState(false);

  // Recent Searches state
  const [recentSearches, setRecentSearches] = React.useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("agid_recent_searches") || "[]");
    } catch {
      return [];
    }
  });

  const addRecentSearch = (queryStr: string) => {
    const trimmed = queryStr.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const next = [trimmed, ...prev.filter(q => q.toLowerCase() !== trimmed.toLowerCase())].slice(0, 5);
      localStorage.setItem("agid_recent_searches", JSON.stringify(next));
      return next;
    });
  };

  const removeRecentSearch = (e: React.MouseEvent, queryStr: string) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const next = prev.filter(q => q !== queryStr);
      localStorage.setItem("agid_recent_searches", JSON.stringify(next));
      return next;
    });
  };

  const clearRecentSearches = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowClearHistoryConfirm(true);
  };

  const handleConfirmClearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("agid_recent_searches");
    setShowClearHistoryConfirm(false);
  };

  const handleToggleFavorite = async (tool: AiTool) => {
    if (!user) {
      await login();
      return;
    }

    const favDocRef = doc(db, "users", user.uid, "favorites", tool.id);
    try {
      if (favorites.includes(tool.id)) {
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
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}/favorites/${tool.id}`);
    }
  };

  const handleSelectRecentSearch = (queryStr: string) => {
    setSearchQuery(queryStr);
    handleSearchChange(queryStr);
    addRecentSearch(queryStr);
  };

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Load initial offline tools instantly from localStorage/Service Worker cache on mount
  React.useEffect(() => {
    try {
      const cached = localStorage.getItem("offline_tools");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`[Offline Support] Mounted: loaded ${parsed.length} tools from offline localStorage.`);
          setTools(parsed);
          setLoading(false);
        }
      }
    } catch (e) {
      console.warn("Failed to load initial offline tools on mount:", e);
    }
  }, []);

  // Real-time synchronization
  React.useEffect(() => {
    console.log("[Firestore Listener] Setting up real-time listener for 'ai_tools'...");
    const q = query(collection(db, "ai_tools"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log(`[Firestore Listener] SUCCESS: Received 'ai_tools' update. Document count: ${snapshot.size}`);
        const toolsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AiTool[];
        setTools(toolsData);
        setLoading(false);
        setSyncStatus('live');

        // Cache to local storage and service worker for offline viewing
        try {
          localStorage.setItem("offline_tools", JSON.stringify(toolsData));
          if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: "CACHE_DATA",
              key: "tools",
              data: toolsData
            });
          }
        } catch (cacheErr) {
          console.warn("Failed to update tools cache:", cacheErr);
        }
      },
      (error) => {
        console.error("[Firestore Listener] ERROR: 'ai_tools' listener failed or was denied. Status: OFFLINE.", error);
        setSyncStatus('offline');
        setLoading(false);

        // Try fallback to offline cache when listener fails
        try {
          const cached = localStorage.getItem("offline_tools");
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setTools(parsed);
              console.log("[Offline Support] Offline mode fallback success: loaded tools from local storage.");
            }
          }
        } catch (e) {
          console.warn("Offline fallback query failed:", e);
        }

        handleFirestoreError(error, OperationType.LIST, "ai_tools");
      }
    );

    return () => {
      console.log("[Firestore Listener] Tearing down 'ai_tools' listener.");
      unsubscribe();
    };
  }, []);

  // Handle Deep Linking
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    
    // Tools Deep Link
    if (tools.length > 0) {
      const toolId = params.get('toolId');
      if (toolId) {
        const tool = tools.find(t => t.id === toolId);
        if (tool) {
          setSelectedTool(tool);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }

    // Article Deep Link
    const articleId = params.get('articleId');
    if (articleId) {
      setShowArticlesList(true);
      // We don't clean the URL here yet, ArticlesList will handle selection
    }
  }, [tools]);

  // Listen to user favorites
  React.useEffect(() => {
    if (!user) {
      setFavorites([]);
      setShowFavoritesOnly(false);
      return;
    }

    // Load initial favorites from localStorage
    try {
      const cached = localStorage.getItem(`offline_favorites_${user.uid}`);
      if (cached) {
        setFavorites(JSON.parse(cached));
      }
    } catch (e) {
      console.warn("Failed to load initial offline favorites:", e);
    }

    console.log(`[Firestore Listener] Setting up favorites listener for user: ${user.uid}`);
    const favRef = collection(db, "users", user.uid, "favorites");
    const unsubscribe = onSnapshot(favRef, 
      (snapshot) => {
        console.log(`[Firestore Listener] SUCCESS: Received user favorites snapshot. Count: ${snapshot.size}`);
        const favIds = snapshot.docs.map(doc => doc.id);
        setFavorites(favIds);

        // Cache favorites
        try {
          localStorage.setItem(`offline_favorites_${user.uid}`, JSON.stringify(favIds));
          if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: "CACHE_DATA",
              key: "favorites",
              data: favIds
            });
          }
        } catch (cacheErr) {
          console.warn("Failed to update favorites cache:", cacheErr);
        }
      },
      (error) => {
        console.error(`[Firestore Listener] ERROR: Favorites listener failed for user: ${user.uid}`, error);
        
        // Offline / Error fallback
        try {
          const cached = localStorage.getItem(`offline_favorites_${user.uid}`);
          if (cached) {
            setFavorites(JSON.parse(cached));
          }
        } catch (e) {
          console.warn("Offline favorites fallback failed:", e);
        }
      }
    );

    return () => {
      console.log(`[Firestore Listener] Tearing down favorites listener for user: ${user.uid}`);
      unsubscribe();
    };
  }, [user]);

  // Listen to user bookmarks and curated projects
  React.useEffect(() => {
    if (!user) {
      setBookmarks([]);
      setCuratedProjects([]);
      return;
    }

    console.log(`[Firestore Listener] Setting up curated_projects and bookmarks listeners for user: ${user.uid}`);
    const projectsRef = collection(db, "users", user.uid, "curated_projects");
    const unsubProjects = onSnapshot(projectsRef, (snapshot) => {
      console.log(`[Firestore Listener] SUCCESS: Curated projects update. Count: ${snapshot.size}`);
      setCuratedProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    }, (error) => {
      console.error(`[Firestore Listener] ERROR: Curated projects listener failed for user: ${user.uid}`, error);
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/curated_projects`);
    });

    const bookmarksRef = collection(db, "users", user.uid, "bookmarks");
    const unsubBookmarks = onSnapshot(bookmarksRef, (snapshot) => {
      console.log(`[Firestore Listener] SUCCESS: Bookmarks update. Count: ${snapshot.size}`);
      setBookmarks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    }, (error) => {
      console.error(`[Firestore Listener] ERROR: Bookmarks listener failed for user: ${user.uid}`, error);
      handleFirestoreError(error, OperationType.GET, `users/${user.uid}/bookmarks`);
    });

    return () => {
      console.log(`[Firestore Listener] Tearing down curated_projects and bookmarks listeners for user: ${user.uid}`);
      unsubProjects();
      unsubBookmarks();
    };
  }, [user]);

  // Reset bookmark menu and fields when selected tool changes
  React.useEffect(() => {
    setShowBookmarkMenu(false);
    setNewProjectName("");
    setNewProjectDesc("");
  }, [selectedTool]);

  // Check User Role
  React.useEffect(() => {
    if (!user) {
      setUserRole("User");
      return;
    }

    if (user.email === "johnnyblueagency@gmail.com") {
      setUserRole("Admin");
      return;
    }

    console.log(`[Firestore Listener] Setting up role check listener for user: ${user.email}`);
    const adminRef = doc(db, "admins", btoa(user.email?.toLowerCase() || ""));
    const unsubscribe = onSnapshot(adminRef, 
      (snapshot) => {
        if (snapshot.exists()) {
          console.log(`[Firestore Listener] SUCCESS: User has staff role: ${snapshot.data().role}`);
          setUserRole(snapshot.data().role as UserRole);
        } else {
          console.log(`[Firestore Listener] User is a standard reader/user`);
          setUserRole("User");
        }
      },
      (error) => {
        console.error(`[Firestore Listener] ERROR: Admin role check listener failed:`, error);
        setUserRole("User");
      }
    );

    return () => {
      console.log(`[Firestore Listener] Tearing down role check listener for user: ${user.email}`);
      unsubscribe();
    };
  }, [user]);

  // Update user profile in Firestore and send signup email notifications
  React.useEffect(() => {
    if (user) {
      const userRef = doc(db, "users", user.uid);
      getDoc(userRef)
        .then((snapshot) => {
          const isNewUser = !snapshot.exists();
          const profileData: any = {
            displayName: user.displayName,
            photoURL: user.photoURL,
            email: user.email,
            lastSeen: serverTimestamp()
          };

          if (isNewUser) {
            profileData.createdAt = serverTimestamp();
          }

          setDoc(userRef, profileData, { merge: true })
            .then(() => {
              if (isNewUser) {
                console.log("[Auth] First-time signup detected! Dispatching notifications...");
                fetch("/api/notify-signup", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName || "New User"
                  })
                })
                .then((res) => res.json())
                .then((data) => {
                  console.log("[Auth] Signup notification success:", data);
                })
                .catch((err) => {
                  console.error("[Auth] Signup notification API call failed:", err);
                });
              }
            })
            .catch((err) => {
              const errStr = String(err).toLowerCase();
              const isOffline = !navigator.onLine || 
                                errStr.includes("offline") || 
                                errStr.includes("unavailable") || 
                                err?.message?.toLowerCase().includes("offline") || 
                                err?.code === "unavailable";
              if (isOffline) {
                console.warn("[Auth] Client is offline. Failed to write user document, but operation will be retried automatically by Firestore.");
              } else {
                console.warn("[Auth] Failed to set user document:", err);
              }
            });
        })
        .catch((err) => {
          const errStr = String(err).toLowerCase();
          const isOffline = !navigator.onLine || 
                            errStr.includes("offline") || 
                            errStr.includes("unavailable") || 
                            err?.message?.toLowerCase().includes("offline") || 
                            err?.code === "unavailable";
          if (isOffline) {
            console.warn("[Auth] Client is offline. Postponing user profile fetch; Firestore will handle synchronization automatically.");
            // Offline fallback: try to write standard client profile metadata since Firestore allows offline setDoc
            const profileData: any = {
              displayName: user.displayName,
              photoURL: user.photoURL,
              email: user.email,
              lastSeen: serverTimestamp()
            };
            setDoc(userRef, profileData, { merge: true }).catch((setErr) => {
              console.warn("[Auth] Offline setDoc profile sync queued:", setErr);
            });
          } else {
            console.warn("[Auth] Failed to fetch user profile:", err);
          }
        });
    }
  }, [user]);

  // Check for onboarding
  React.useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem("agid_onboarding_seen");
    if (!hasSeenOnboarding) {
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem("agid_onboarding_seen", "true");
    setShowOnboarding(false);
  };

  // Play dynamic interactive sounds on every click / tap if enabled
  React.useEffect(() => {
    if (soundPreference !== "enabled") return;

    const handleGlobalClick = () => {
      playRandomInteractiveSound();
    };

    window.addEventListener("click", handleGlobalClick, { capture: true });
    return () => {
      window.removeEventListener("click", handleGlobalClick, { capture: true });
    };
  }, [playRandomInteractiveSound, soundPreference]);

  // Handle background spinning galaxy timer (every 5 minutes, appears for 3 seconds)
  React.useEffect(() => {
    const triggerGalaxy = () => {
      setShowSpinningGalaxy(true);
      setTimeout(() => {
        setShowSpinningGalaxy(false);
      }, 3000);
    };

    // Trigger on initial load after 1 second so the user can see it immediately
    const initialTimer = setTimeout(triggerGalaxy, 1000);

    // Set interval for every 5 minutes (300,000 ms)
    const intervalId = setInterval(triggerGalaxy, 300000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalId);
    };
  }, []);

  // Fuse instance for fuzzy search
  const fuse = React.useMemo(() => {
    return new Fuse(tools, {
      keys: ["name", "desc", "category", "tags"],
      threshold: 0.35,
      distance: 100,
      includeScore: true,
    });
  }, [tools]);

  // Dynamic Meta Tags
  React.useEffect(() => {
    const defaultTitle = "Agidapp Global";
    const defaultDesc = "Agidapp Global - The most comprehensive AI tool directory. Discover LLMs, developer tools, creative AI, and more.";

    if (selectedTool) {
      document.title = `${selectedTool.name} - AI Registry | Agidapp Global`;
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", `Explore ${selectedTool.name}: ${selectedTool.desc}. Join the Agidapp Global directory to discover the latest in AI.`);
    } else {
      document.title = defaultTitle;
      let metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute("content", defaultDesc);
      }
    }
  }, [selectedTool]);

  // Scroll listener for Top button
  React.useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleDeleteTool = async (id: string) => {
    try {
      await deleteDoc(doc(db, "ai_tools", id));
      if (selectedTool?.id === id) setSelectedTool(null);
      setToolToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `ai_tools/${id}`);
    }
  };

  const handleEditTool = (tool: AiTool) => {
    setSelectedTool(tool);
    setEditFormData(tool);
    setIsEditing(true);
  };

  const handleUpdateTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTool) return;
    try {
      const toolRef = doc(db, "ai_tools", selectedTool.id);
      await updateDoc(toolRef, {
        ...editFormData,
        updatedAt: serverTimestamp()
      });
      setIsEditing(false);
      setSelectedTool(prev => prev ? { ...prev, ...editFormData, updatedAt: new Date() } : null);

      // Add event to public global social feed
      try {
        await addDoc(collection(db, "social_feed"), {
          type: "tool_update_alert",
          toolId: selectedTool.id,
          toolName: editFormData.name,
          timestamp: serverTimestamp(),
          details: "Administrator updated details & categories"
        });
      } catch (err) {
        console.error("Failed to log update to social feed:", err);
      }

      // Notify subscribed users about the tool update
      fetch("/api/notify-subscribers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toolId: selectedTool.id,
          name: editFormData.name,
          category: editFormData.category,
          type: editFormData.type,
          url: editFormData.url,
          desc: editFormData.desc,
          apk: editFormData.apk
        })
      }).then(res => res.json())
        .then(data => {
          console.log("[Subscription Notification] Result: ", data);
        })
        .catch(err => {
          console.error("[Subscription Notification] Failed to send update alert: ", err);
        });

    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ai_tools/${selectedTool.id}`);
    }
  };

  const handleShareTool = async (tool: AiTool) => {
    const shareUrl = `https://www.agidappglobal.com/share/${tool.id}`;
    const shareData = {
      title: `${tool.name} | Agidapp Global`,
      text: tool.desc,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log("Share failed", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setToast({ message: "Shareable link copied to clipboard!", type: 'success' });
        setTimeout(() => setToast(null), 3000);
      } catch (err) {
        setToast({ message: "Failed to copy link", type: 'error' });
        setTimeout(() => setToast(null), 3000);
      }
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleVoiceCommand = (rawTranscript: string): boolean => {
    const text = rawTranscript.toLowerCase().trim();
    console.log("[Voice Command Parser] Analyzing raw text:", text);
    
    if (
      text.includes("reset") || 
      text.includes("clear filter") || 
      text.includes("show all") || 
      text.includes("start over") ||
      text === "all" ||
      text === "show all tools"
    ) {
      setSelectedCategory("All");
      setSortBy("newest");
      setShowFavoritesOnly(false);
      setPricingFilter("All");
      setSearchQuery("");
      setToast({ message: "Cleared all filters and reset directory", type: "success" });
      setTimeout(() => setToast(null), 3000);
      return true;
    }

    let targetCategory: Category | "All" | null = null;
    let categoryName = "";
    if (text.includes("developer") || text.includes("dev ") || text.includes(" dev") || text.includes("coder") || text.includes("programming")) {
      targetCategory = "Developer Tools";
      categoryName = "Developer Tools";
    } else if (text.includes("chat") || text.includes("llm") || text.includes("gpt") || text.includes("language")) {
      targetCategory = "LLM & Chat";
      categoryName = "LLM & Chat";
    } else if (text.includes("image") || text.includes("art") || text.includes("draw") || text.includes("paint") || text.includes("photo") || text.includes("picture")) {
      targetCategory = "Image & Art";
      categoryName = "Image & Art";
    } else if (text.includes("productivity") || text.includes("work") || text.includes("schedule") || text.includes("organize")) {
      targetCategory = "Productivity";
      categoryName = "Productivity";
    } else if (text.includes("audio") || text.includes("video") || text.includes("music") || text.includes("sound") || text.includes("voice")) {
      targetCategory = "Audio & Video";
      categoryName = "Audio & Video";
    } else if (text.includes("other") || text.includes("misc")) {
      targetCategory = "Other";
      categoryName = "Other Tools";
    }

    let targetSort: "newest" | "popular" | "alpha" | "rating" | null = null;
    let sortName = "";
    if (text.includes("highest rated") || text.includes("top rated") || text.includes("best rated") || text.includes("rating")) {
      targetSort = "rating";
      sortName = "Highest Rated";
    } else if (text.includes("popular") || text.includes("most upvoted") || text.includes("most popular") || text.includes("upvotes")) {
      targetSort = "popular";
      sortName = "Most Popular";
    } else if (text.includes("newest") || text.includes("latest") || text.includes("recent") || text.includes("recent tools")) {
      targetSort = "newest";
      sortName = "Newest";
    } else if (text.includes("alphabetical") || text.includes("alpha") || text.includes("name")) {
      targetSort = "alpha";
      sortName = "Alphabetical";
    }

    let targetPricing: "All" | "Free" | "Open Source" | null = null;
    let pricingName = "";
    if (text.includes("open source") || text.includes("opensource")) {
      targetPricing = "Open Source";
      pricingName = "Open Source";
    } else if (text.includes("free")) {
      targetPricing = "Free";
      pricingName = "Free";
    }

    let targetFavorites: boolean | null = null;
    if (text.includes("favorite") || text.includes("my favorite") || text.includes("favorites")) {
      targetFavorites = true;
    }

    if (targetCategory || targetSort || targetPricing || targetFavorites !== null) {
      const parts: string[] = [];

      if (targetCategory) {
        setSelectedCategory(targetCategory);
        parts.push(`Category: ${categoryName}`);
      }
      if (targetSort) {
        setSortBy(targetSort);
        parts.push(`Sorted by: ${sortName}`);
      }
      if (targetPricing) {
        setPricingFilter(targetPricing);
        parts.push(`Pricing: ${pricingName}`);
      }
      if (targetFavorites !== null) {
        setShowFavoritesOnly(targetFavorites);
        parts.push("Show Favorites");
      }

      setSearchQuery("");
      const appliedMessage = `Applied voice command: ${parts.join(" | ")}`;
      setToast({ message: appliedMessage, type: "success" });
      setTimeout(() => setToast(null), 4000);
      return true;
    }

    return false;
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setFocusedSuggestionIndex(-1);
    if (val.trim().length > 0) {
      const searchLower = val.toLowerCase().trim();
      let matched = [];
      
      if (searchLower.startsWith('#')) {
        const tagQuery = searchLower.substring(1).trim();
        matched = tools.filter(t => 
          t.tags?.some(tag => tag.toLowerCase().includes(tagQuery))
        );
      } else {
        matched = tools.filter(t => 
          t.name.toLowerCase().includes(searchLower) ||
          t.category.toLowerCase().includes(searchLower) ||
          t.tags?.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }
      
      setSuggestions(matched.slice(0, 10));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (showSuggestions && suggestions.length > 0 && focusedSuggestionIndex >= 0) {
        e.preventDefault();
        const tool = suggestions[focusedSuggestionIndex];
        setSearchQuery(tool.name);
        setShowSuggestions(false);
        setSelectedTool(tool);
        addRecentSearch(tool.name);
      } else if (searchQuery.trim()) {
        addRecentSearch(searchQuery);
        setShowSuggestions(false);
      }
      return;
    }

    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedSuggestionIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Tab" && suggestions.length > 0) {
      // Autocomplete with the first suggestion or focused one
      e.preventDefault();
      const tool = focusedSuggestionIndex >= 0 ? suggestions[focusedSuggestionIndex] : suggestions[0];
      
      const searchLower = searchQuery.toLowerCase().trim();
      if (searchLower.startsWith('#')) {
        const tagQuery = searchLower.substring(1).trim();
        const matchedTag = tool.tags?.find(tag => tag.toLowerCase().startsWith(tagQuery));
        if (matchedTag) {
          setSearchQuery(`#${matchedTag}`);
        } else {
          setSearchQuery(tool.name);
        }
      } else {
        setSearchQuery(tool.name);
      }
      setFocusedSuggestionIndex(0);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  const [sortBy, setSortBy] = React.useState<"newest" | "popular" | "alpha" | "rating">("newest");

  const popularTags = React.useMemo(() => {
    const counts: Record<string, number> = {};
    tools.forEach(t => {
      t.tags?.forEach(tag => {
        counts[tag] = (counts[tag] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30);
  }, [tools]);

  // Selection state for Featured Tools (Top 3 by upvotes)
  const featuredTools = React.useMemo(() => {
    return [...tools].sort((a, b) => b.upvotes - a.upvotes).slice(0, 3);
  }, [tools]);

  // Natural Language Query Interpreter (Simple)
  const interpretedQuery = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return null;

    const intents = {
      isFree: q.includes("free") || q.includes("open source"),
      isMobile: q.includes("mobile") || q.includes("phone") || q.includes("apk") || q.includes("android") || q.includes("ios"),
      isDev: q.includes("developer") || q.includes("api") || q.includes("sdk") || q.includes("coding"),
      isArt: q.includes("art") || q.includes("image") || q.includes("draw") || q.includes("design"),
    };

    return intents;
  }, [searchQuery]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "LLM & Chat":
        return <MessageSquare className="w-3.5 h-3.5 text-blue-400" />;
      case "Image & Art":
        return <Sparkles className="w-3.5 h-3.5 text-pink-400" />;
      case "Developer Tools":
        return <Code2 className="w-3.5 h-3.5 text-emerald-400" />;
      case "Productivity":
        return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case "Audio & Video":
        return <VideoIcon className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Box className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  // Group suggestions by category while keeping original index
  const groupedSuggestions = React.useMemo(() => {
    const groups: Record<string, Array<{ tool: AiTool; originalIndex: number }>> = {};
    suggestions.forEach((tool, originalIndex) => {
      const category = tool.category || "Other";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push({ tool, originalIndex });
    });
    return groups;
  }, [suggestions]);

  const filteredTools = React.useMemo(() => {
    let result = tools;

    // Apply Fuzzy Search if query exists
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      if (query.startsWith('#')) {
        const tagQuery = query.substring(1).trim();
        result = tools.filter(t => t.tags?.some(tag => tag.toLowerCase().includes(tagQuery)));
      } else {
        const searchResults = fuse.search(query);
        result = searchResults.map(r => r.item);
      }
    }

    // Apply Facets
    return result.filter((tool) => {
      const matchesCategory = selectedCategory === "All" || tool.category === selectedCategory;
      const matchesType = selectedType === "All" || tool.type === selectedType;
      const matchesFavorites = !showFavoritesOnly || favorites.includes(tool.id);
      const matchesTags = activeTags.length === 0 || activeTags.every(tag => tool.tags?.includes(tag));
      
      // Sector Filter logic
      let matchesQuickSector = true;
      if (selectedQuickSector !== "All") {
        if (selectedQuickSector === "Agentic AI") {
          matchesQuickSector = tool.tags?.some(t => t.toLowerCase().includes("agent")) || 
                               tool.name.toLowerCase().includes("agent") || 
                               tool.desc.toLowerCase().includes("agent");
        } else if (selectedQuickSector === "Quantum ML") {
          matchesQuickSector = tool.tags?.some(t => t.toLowerCase().includes("quantum")) || 
                               tool.name.toLowerCase().includes("quantum") || 
                               tool.desc.toLowerCase().includes("quantum");
        } else if (selectedQuickSector === "Robotics & IoT") {
          matchesQuickSector = tool.tags?.some(t => t.toLowerCase().includes("robot") || t.toLowerCase().includes("iot")) || 
                               tool.name.toLowerCase().includes("robot") || 
                               tool.name.toLowerCase().includes("iot") ||
                               tool.desc.toLowerCase().includes("robot") ||
                               tool.desc.toLowerCase().includes("iot");
        } else if (selectedQuickSector === "Neurotech AI") {
          matchesQuickSector = tool.tags?.some(t => t.toLowerCase().includes("neuro") || t.toLowerCase().includes("brain") || t.toLowerCase().includes("neural")) || 
                               tool.name.toLowerCase().includes("neuro") || 
                               tool.name.toLowerCase().includes("neural") ||
                               tool.desc.toLowerCase().includes("neuro") ||
                               tool.desc.toLowerCase().includes("neural");
        } else {
          // Main category match
          matchesQuickSector = tool.category === selectedQuickSector;
        }
      }

      // Pricing Filter logic based on description and tags
      let matchesPricing = true;
      if (pricingFilter === "Free") {
        matchesPricing = tool.desc.toLowerCase().includes("free") || tool.tags?.some(t => t.toLowerCase() === "free") || false;
      } else if (pricingFilter === "Open Source") {
        matchesPricing = tool.desc.toLowerCase().includes("open source") || tool.tags?.some(t => t.toLowerCase().includes("open source")) || false;
      }
      
      // Simple NL interpretation reinforcement
      let matchesNL = true;
      if (interpretedQuery) {
        if (interpretedQuery.isMobile && tool.type !== "Mobile / APK") matchesNL = false;
        if (interpretedQuery.isDev && tool.type !== "API / Platform") matchesNL = false;
      }

      return matchesCategory && matchesType && matchesFavorites && matchesTags && matchesNL && matchesPricing && matchesQuickSector;
    }).sort((a, b) => {
      if (sortBy === "newest") {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      }
      if (sortBy === "popular") return b.upvotes - a.upvotes;
      if (sortBy === "rating") return (b.averageRating || 0) - (a.averageRating || 0);
      if (sortBy === "alpha") return a.name.localeCompare(b.name);
      return 0;
    });
  }, [tools, searchQuery, selectedCategory, selectedType, showFavoritesOnly, favorites, sortBy, activeTags, fuse, interpretedQuery, selectedQuickSector]);

  const handleRateTool = async (toolId: string, rating: number) => {
    if (!user) {
      await login();
      return;
    }
    
    try {
      const toolRef = doc(db, "ai_tools", toolId);
      const tool = tools.find(t => t.id === toolId);
      if (!tool) return;

      const newTotalCount = (tool.totalRatingsCount || 0) + 1;
      const currentAvg = tool.averageRating || 0;
      const currentCount = tool.totalRatingsCount || 0;
      const newAverage = ((currentAvg * currentCount) + rating) / newTotalCount;

      await updateDoc(toolRef, {
        averageRating: newAverage,
        totalRatingsCount: newTotalCount
      });
      
      setSelectedTool(prev => prev ? { ...prev, averageRating: newAverage, totalRatingsCount: newTotalCount } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ai_tools/${toolId}`);
    }
  };

  const handleAuthSuccess = async (authUser: any, isNew: boolean) => {
    try {
      if (isNew && authUser) {
        await addDoc(collection(db, "notifications"), {
          type: "new_signup",
          message: `New user signed up: ${authUser.email || authUser.phoneNumber || authUser.uid}`,
          userId: authUser.uid,
          userEmail: authUser.email || "",
          timestamp: serverTimestamp(),
          read: false
        });
        setToast({ message: "Welcome! Signup successful.", type: 'success' });
      } else if (authUser) {
        setToast({ message: "Welcome back!", type: 'success' });
      }
    } catch (e) {
      console.error("Notification creation failed:", e);
    }
  };

  const incrementVisitCount = async (toolId: string) => {
    try {
      const toolRef = doc(db, "ai_tools", toolId);
      await updateDoc(toolRef, {
        visitCount: increment(1)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ai_tools/${toolId}`);
    }
  };

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + 10);
  };

  const handleExpandDirectory = async () => {
    if (userRole === "User") {
      setAuthWarning("ADMIN_PRIVILEGE_REQUIRED");
      return;
    }

    setIsScraping(true);
    try {
      const res = await fetch("/api/expand", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.uid, userEmail: user?.email })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      console.log("Expansion results:", data);
    } catch (err) {
      console.error("Expansion failed", err);
      setAuthWarning(err instanceof Error ? err.message : "RECURSIVE_INDEXING_FAILURE");
    } finally {
      setIsScraping(false);
    }
  };

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500/30 ${screenMode !== 'Fluid' ? 'flex items-center justify-center overflow-hidden' : ''}`}
         style={screenMode !== 'Fluid' ? { backgroundColor: '#020617' } : {}}
    >
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{selectedTool ? `${selectedTool.name} - AI Tool Preview | Agidapp Global` : "AGID - Artificial General Intelligence Directory"}</title>
        <meta name="title" content={selectedTool ? `${selectedTool.name} - AI Tool Preview | Agidapp Global` : "AGID - Artificial General Intelligence Directory"} />
        <meta name="description" content={selectedTool ? selectedTool.desc : "AGIDAPP GLOBAL SOFTWARE Is A comprehensive, live-updating catalog for Ai & AGI tools, software, web apps, platforms, and APKs. Artificial General Intelligence Directory APP(AGIDAPP) Is built for users to discover, compare, and manage trending digital and humanity solutions with Ai & AGI."} />
        <meta name="keywords" content="AGI, LLM, AI Directory, Machine Learning, AI tools, Artificial General Intelligence, Agidapp, Neural Networks, Deep Learning, AI Directory App" />
        <link rel="canonical" href={selectedTool ? `https://www.agidappglobal.com/share/${selectedTool.id}` : "https://www.agidappglobal.com/"} />
        <link rel="sitemap" type="application/xml" title="Sitemap" href="/sitemap.xml" />
        <meta name="google-adsense-account" content="ca-pub-7039003478830210" />
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7039003478830210" crossOrigin="anonymous"></script>
        {import.meta.env.VITE_GOOGLE_SITE_VERIFICATION && (
          <meta name="google-site-verification" content={import.meta.env.VITE_GOOGLE_SITE_VERIFICATION} />
        )}

        {/* Dynamic Schema Markup (Structured Data) */}
        <script type="application/ld+json">
          {JSON.stringify(
            selectedTool
              ? {
                  "@context": "https://schema.org",
                  "@type": "SoftwareApplication",
                  "name": selectedTool.name,
                  "description": selectedTool.desc,
                  "applicationCategory": "BusinessApplication",
                  "operatingSystem": "All",
                  "offers": {
                    "@type": "Offer",
                    "price": "0.00",
                    "priceCurrency": "USD"
                  },
                  "aggregateRating": selectedTool.averageRating
                    ? {
                        "@type": "AggregateRating",
                        "ratingValue": selectedTool.averageRating.toFixed(1),
                        "ratingCount": (selectedTool.totalRatingsCount || 1).toString()
                      }
                    : undefined
                }
              : {
                  "@context": "https://schema.org",
                  "@type": "WebSite",
                  "name": "AGID - Artificial General Intelligence Directory",
                  "url": "https://www.agidappglobal.com/",
                  "description": "AGIDAPP GLOBAL SOFTWARE Is A comprehensive, live-updating catalog for Ai & AGI tools, software, web apps, platforms, and APKs. Artificial General Intelligence Directory APP(AGIDAPP) Is built for users to discover, compare, and manage trending digital and humanity solutions with Ai & AGI.",
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": "https://www.agidappglobal.com/?search={search_term_string}",
                    "query-input": "required name=search_term_string"
                  }
                }
          )}
        </script>

        {/* Dynamic Breadcrumb List Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": selectedTool
              ? [
                  {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": "https://www.agidappglobal.com/"
                  },
                  {
                    "@type": "ListItem",
                    "position": 2,
                    "name": selectedTool.category || "AI Tools",
                    "item": `https://www.agidappglobal.com/?category=${encodeURIComponent(selectedTool.category || "AI Tools")}`
                  },
                  {
                    "@type": "ListItem",
                    "position": 3,
                    "name": selectedTool.name,
                    "item": `https://www.agidappglobal.com/share/${selectedTool.id}`
                  }
                ]
              : selectedCategory && selectedCategory !== "All"
              ? [
                  {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": "https://www.agidappglobal.com/"
                  },
                  {
                    "@type": "ListItem",
                    "position": 2,
                    "name": selectedCategory,
                    "item": `https://www.agidappglobal.com/?category=${encodeURIComponent(selectedCategory)}`
                  }
                ]
              : [
                  {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "Home",
                    "item": "https://www.agidappglobal.com/"
                  }
                ]
          })}
        </script>

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Agidapp Global" />
        <meta property="og:url" content={selectedTool ? `https://www.agidappglobal.com/share/${selectedTool.id}` : "https://www.agidappglobal.com/"} />
        <meta property="og:title" content={selectedTool ? `${selectedTool.name} - Discover on Agidapp Global` : "AGID - Artificial General Intelligence Directory"} />
        <meta property="og:description" content={selectedTool ? selectedTool.desc : "AGIDAPP GLOBAL SOFTWARE Is A comprehensive, live-updating catalog for Ai & AGI tools, software, web apps, platforms, and APKs. Artificial General Intelligence Directory APP(AGIDAPP) Is built for users to discover, compare, and manage trending digital and humanity solutions with Ai & AGI."} />
        <meta property="og:image" content="https://www.agidappglobal.com/logo.png" />
        <meta property="og:image:width" content="512" />
        <meta property="og:image:height" content="512" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:alt" content={selectedTool ? `${selectedTool.name} Logo` : "AGID Logo"} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={selectedTool ? `https://www.agidappglobal.com/share/${selectedTool.id}` : "https://www.agidappglobal.com/"} />
        <meta name="twitter:title" content={selectedTool ? `${selectedTool.name} - Discover on Agidapp Global` : "AGID - Artificial General Intelligence Directory"} />
        <meta name="twitter:description" content={selectedTool ? selectedTool.desc : "AGIDAPP GLOBAL SOFTWARE Is A comprehensive, live-updating catalog for Ai & AGI tools, software, web apps, platforms, and APKs. Artificial General Intelligence Directory APP(AGIDAPP) Is built for users to discover, compare, and manage trending digital and humanity solutions with Ai & AGI."} />
        <meta name="twitter:image" content="https://www.agidappglobal.com/logo.png" />
        <meta name="twitter:image:alt" content={selectedTool ? `${selectedTool.name} Logo` : "AGID Logo"} />
        <meta name="twitter:site" content="@AgidappGlobal" />
        <meta name="twitter:creator" content="@AgidappGlobal" />
      </Helmet>
      {/* Waterfall Desktop Lane */}
      <div className="fixed left-0 top-0 bottom-0 w-24 hidden lg:block z-[40]">
        <UserWaterfall onProfileClick={(uid) => {
          setTargetUserId(uid);
          setShowProfile(true);
        }} />
      </div>

      {/* Waterfall Mobile Button */}
      <div className="lg:hidden fixed bottom-24 right-6 z-[60]">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setShowWaterfallMobile(true)}
          className="p-4 bg-blue-600 text-white rounded-full shadow-2xl shadow-blue-600/50 flex flex-col items-center gap-1"
        >
          <Users className="w-6 h-6" />
          <span className="text-[8px] font-black uppercase tracking-widest">Connect to Users</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {showWaterfallMobile && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            className="fixed inset-0 z-[1000] lg:hidden"
          >
            <UserWaterfall 
              isMobileView 
              onProfileClick={(uid) => {
                setTargetUserId(uid);
                setShowProfile(true);
                setShowWaterfallMobile(false);
              }} 
            />
            <button 
              onClick={() => setShowWaterfallMobile(false)}
              className="absolute top-6 right-6 p-3 bg-white/10 backdrop-blur-md rounded-full text-white"
            >
              <X className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {screenMode !== 'Fluid' && (
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent" />
        </div>
      )}

      {screenMode !== 'Fluid' && (
        <button 
          onClick={() => setScreenMode('Fluid')}
          className="fixed top-8 right-8 z-[2000] px-6 py-3 bg-white text-black font-black uppercase tracking-widest rounded-2xl shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
        >
          <X className="w-5 h-5" />
          Exit {screenMode} Mode
        </button>
      )}

      <div 
        className={screenMode !== 'Fluid' ? 'relative shadow-[0_0_150px_rgba(0,0,0,0.8)] border-[12px] border-slate-800 rounded-[3rem] overflow-hidden' : ''}
        style={screenMode !== 'Fluid' ? {
          width: screenConfigs[screenMode].width,
          height: screenConfigs[screenMode].height,
          transform: `scale(${screenConfigs[screenMode].scale})`,
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
          flexShrink: 0
        } : {}}
      >
        <div className={screenMode !== 'Fluid' ? 'absolute inset-0 overflow-y-auto custom-scrollbar bg-slate-950' : ''}>
          {/* Galaxy Background */}
          <div className="galaxy-bg pointer-events-none" />
          <div className="nebula-overlay" />
          <div className="stars-1" />
          <div className="stars-2" />
          <div className="stars-3" />
          
          <LogoSnowfall tools={tools} />

      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-blue-500 z-[60] origin-left"
        style={{ scaleX }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 min-h-[5.5rem] py-2.5 flex items-center justify-between gap-4 overflow-hidden relative">
          
          {/* Brand Logo & Post Blog Button (Fixed Left Column) */}
          <div className="flex flex-col items-start gap-1.5 shrink-0 z-10 bg-slate-950/80 pr-2">
            <div className="px-2.5 py-0.5 sm:py-1 bg-blue-600 rounded-lg text-white font-black tracking-tighter text-lg sm:text-xl shadow-lg shadow-blue-600/20 select-none">
              Agidapp Global
            </div>

            {/* Post a Blog/Article Quick Button */}
            {user ? (
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 0 12px rgba(245, 158, 11, 0.2)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowArticleSubmit(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black rounded-lg font-black text-[9px] sm:text-[10px] uppercase tracking-wider transition-all border border-amber-400/20 cursor-pointer shadow-lg shadow-amber-500/10"
              >
                <Plus className="w-3 h-3 text-black" />
                Post a Blog/Article
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "rgba(30, 41, 59, 0.9)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setAuthMode('signin')}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg font-black text-[9px] sm:text-[10px] uppercase tracking-wider transition-all cursor-pointer hover:text-white"
              >
                <LogIn className="w-3 h-3 text-blue-500" />
                Post a Blog/Article
              </motion.button>
            )}
          </div>

          {/* Scrollable Track Wrapper with Arrow Nav and Fade Gradients */}
          <div className="flex-1 relative overflow-hidden h-full flex items-center">
            
            {/* Scroll indicators (Fade overlays) */}
            <AnimatePresence>
              {showLeftArrow && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-slate-950 via-slate-950/70 to-transparent z-20 pointer-events-none flex items-center justify-start pl-1"
                >
                  <button
                    onClick={() => scrollHeader('left')}
                    className="p-1.5 rounded-full bg-slate-900/95 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white transition-all shadow-lg pointer-events-auto cursor-pointer"
                    title="Scroll Left"
                  >
                    <ChevronLeft className="w-4 h-4 text-blue-400" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showRightArrow && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-slate-950 via-slate-950/70 to-transparent z-20 pointer-events-none flex items-center justify-end pr-1"
                >
                  <button
                    onClick={() => scrollHeader('right')}
                    className="p-1.5 rounded-full bg-slate-900/95 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white transition-all shadow-lg pointer-events-auto cursor-pointer"
                    title="Scroll Right"
                  >
                    <ChevronRight className="w-4 h-4 text-blue-400" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Scrollable Container (Grabbable / Scrollable) */}
            <div
              ref={headerScrollRef}
              onScroll={updateScrollArrows}
              onMouseDown={handleHeaderMouseDown}
              onMouseMove={handleHeaderMouseMove}
              onMouseUp={handleHeaderMouseUpOrLeave}
              onMouseLeave={handleHeaderMouseUpOrLeave}
              className={`w-full h-full flex items-center justify-between gap-6 overflow-x-auto scrollbar-none scroll-smooth select-none px-4 ${
                isHeaderDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
            >
              {/* Badge & Title Column */}
              <div className="flex flex-col shrink-0 text-left">
                <h1 className="hidden sm:block text-xs md:text-sm font-bold text-slate-100 uppercase tracking-widest leading-none mb-1 whitespace-nowrap">Artificial General Intelligence Directory</h1>
                <div className="flex items-center flex-nowrap gap-1.5 sm:gap-2.5">
                  {/* Sync Status Badge */}
                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider font-mono border whitespace-nowrap ${
                    syncStatus === 'live' 
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${syncStatus === 'live' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                    Sync: {syncStatus === 'live' ? 'Live' : 'Offline'}
                  </span>
                </div>
              </div>

              {/* All Right-side Action Buttons */}
              <div className="flex items-center gap-4 shrink-0 pr-6">
                
                {/* Choose a Screen Type Toggle */}
                <div className="relative shrink-0">
                  <button 
                    onClick={() => setShowScreenModeMenu(!showScreenModeMenu)}
                    className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all shadow-xl group cursor-pointer flex items-center justify-center"
                    title="Choose a Screen Type"
                  >
                    <span className="text-sm">🌈</span>
                  </button>
                  <AnimatePresence>
                    {showScreenModeMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 top-full mt-3 p-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-[100] min-w-[160px] grid grid-cols-1 gap-1"
                      >
                        {Object.keys(screenConfigs).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => {
                              setScreenMode(mode as any);
                              setShowScreenModeMenu(false);
                            }}
                            className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest text-left rounded-xl transition-all cursor-pointer ${
                              screenMode === mode 
                              ? 'bg-blue-600 text-white' 
                              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            {mode === 'Laptop2' ? 'Laptop' : mode} Mode
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Force Refresh Button */}
                <button
                  onClick={handleForceRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1 px-2.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-[9px] font-bold uppercase tracking-wider font-mono transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer shadow-lg"
                  title="Force refresh data directly from Firestore server"
                >
                  <Zap className={`w-3.5 h-3.5 text-amber-500 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{refreshing ? 'Refreshed' : 'Force Refresh'}</span>
                </button>

                {/* Debug Indexing / Seed Button */}
                <button
                  onClick={handleDebugIndexing}
                  disabled={indexingStatus === 'indexing'}
                  className="inline-flex items-center gap-1 px-2.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl text-[9px] font-bold uppercase tracking-wider font-mono transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer shadow-lg"
                  title="Seed premium tools if directory is empty"
                >
                  <Database className="w-3.5 h-3.5 text-blue-500" />
                  <span className="hidden sm:inline">{indexingStatus === 'indexing' ? 'Indexing...' : 'Debug Indexing'}</span>
                </button>
                {user ? (
                  <div className="flex items-center gap-1.5 sm:gap-2 relative shrink-0">
                    {/* Article Trigger Button */}
                    <div className="relative group flex flex-col items-center shrink-0">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowArticlesList(true)}
                        className="mb-1 bg-white text-blue-600 text-[8px] font-black uppercase px-3 py-1 rounded shadow-lg border border-blue-400/30 transition-all hover:scale-105 cursor-pointer"
                      >
                        SEE BLOGS
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setIsArticleMenuOpen(!isArticleMenuOpen)}
                        className={`p-2 sm:p-2.5 rounded-xl border transition-all shadow-lg cursor-pointer ${
                          isArticleMenuOpen 
                          ? 'bg-red-500 text-white border-red-400' 
                          : 'bg-red-600/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white'
                        }`}
                        aria-label="Article menu"
                      >
                        <BookOpen className="w-4 h-4 sm:w-5 h-5" />
                      </motion.button>
                      
                      <div className="hidden sm:flex mt-1 flex-col items-center pointer-events-none">
                        <span className="text-[6px] font-black text-red-500/80 leading-none uppercase tracking-tighter text-center">
                          Read a Blog
                        </span>
                        <span className="text-[5px] font-black text-slate-600 leading-none uppercase tracking-tighter text-center my-0.5">
                          or
                        </span>
                        <span className="text-[6px] font-black text-blue-500/80 leading-none uppercase tracking-tighter text-center">
                          Post Something
                        </span>
                      </div>

                      <AnimatePresence>
                        {isArticleMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 top-full mt-3 flex flex-col gap-2 z-[60] p-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-xl min-w-[200px]"
                          >
                            <div className="px-4 py-2 border-b border-white/5 mb-1">
                               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Blogger Portal</p>
                               <p className="text-[8px] text-slate-600 text-center uppercase mt-1">Read a Blog or Post Something</p>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setShowArticlesList(true);
                                setIsArticleMenuOpen(false);
                              }}
                              className="whitespace-nowrap px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-green-600/20 border border-green-400/20 flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              Read A Blog
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setShowArticleSubmit(true);
                                setIsArticleMenuOpen(false);
                              }}
                              className="whitespace-nowrap px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-amber-500/20 border border-amber-400/20 flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Post Something
                            </motion.button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className="flex flex-col items-center shrink-0">
                      <div className="flex flex-col items-center -mb-1 relative z-10">
                        {userRole !== "User" && (
                          <button 
                            onClick={() => setShowAdminPortal(true)}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-[7px] font-black uppercase px-2 py-0.5 rounded shadow-lg border border-blue-400/30 transition-all hover:scale-105 flex items-center gap-1 cursor-pointer"
                          >
                            <Shield className="w-2 h-2" />
                            Admin Portal
                          </button>
                        )}
                        <span className="text-[6px] font-black text-blue-500/80 tracking-[0.2em] uppercase mt-0.5 whitespace-nowrap bg-slate-950/80 px-1 rounded">
                           {userRole}
                        </span>
                      </div>
                      <button 
                        onClick={() => setShowProfile(true)}
                        className="flex items-center gap-2 sm:gap-3 p-1 pr-2 sm:pr-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl transition-all group cursor-pointer"
                      >
                        <img 
                          src={user.photoURL || null} 
                          alt={user.displayName || ""} 
                          className="w-8 h-8 sm:w-10 h-10 rounded-xl border border-slate-800 shadow-xl group-hover:scale-95 transition-transform"
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                        />
                        <div className="text-left hidden xs:block">
                          <p className="text-[10px] font-black text-white leading-none uppercase tracking-tighter">Profile</p>
                          <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{user.displayName?.split(' ')[0]}</p>
                        </div>
                      </button>
                    </div>
                  </div>
                ) : null}

                <button 
                  onClick={handleExpandDirectory}
                  disabled={isScraping}
                  className={`flex items-center gap-2 px-5 py-2.5 transition-all text-sm font-bold border rounded-xl shadow-lg ring-1 shrink-0 cursor-pointer ${
                    isScraping 
                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 ring-blue-500/20 cursor-wait' 
                    : 'bg-slate-900 text-slate-100 border-slate-800 ring-slate-700/10 hover:bg-slate-800 hover:border-slate-700'
                  }`}
                >
                  <Zap className={`w-4 h-4 ${isScraping ? 'animate-pulse text-blue-400' : 'text-blue-500'}`} />
                  {isScraping ? 'INDEXING_CORE_MODELS...' : 'Index Popular AIs'}
                </button>

                {/* Live Social Activity Feed Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSocialFeed(!showSocialFeed)}
                  className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 shadow-lg group cursor-pointer shrink-0 ${
                    showSocialFeed 
                    ? 'bg-emerald-500 text-white border-emerald-400' 
                    : 'bg-emerald-600/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white'
                  }`}
                  title="Toggle Live Activity Feed"
                >
                  <Radio className={`w-4 h-4 ${showSocialFeed ? 'text-white' : 'text-emerald-400'} animate-pulse`} />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Live Feed</span>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                </motion.button>

                {/* Language Switcher Quick-Toggle */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    const langs: Language[] = ["en", "es", "fr", "de"];
                    const idx = langs.indexOf(language);
                    const nextLang = langs[(idx + 1) % langs.length];
                    handleLanguageChange(nextLang);
                  }}
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition-all flex items-center gap-1.5 shadow-lg group cursor-pointer shrink-0"
                  title="Toggle Language / Cambiar Idioma"
                >
                  <Globe className="w-4 h-4 text-blue-400 group-hover:rotate-12 transition-transform duration-300" />
                  <span className="uppercase text-[10px] font-black">{language}</span>
                </motion.button>

                {/* Persistent Settings Panel */}
                <div className="relative shrink-0">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                    className={`p-2.5 rounded-xl border transition-all flex items-center justify-center relative shadow-lg group cursor-pointer ${
                      showSettingsMenu 
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400' 
                        : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                    title="Application Settings"
                  >
                    <Settings className="w-5 h-5 transition-transform duration-300 group-hover:rotate-45" />
                  </motion.button>

                  <AnimatePresence>
                    {showSettingsMenu && (
                      <>
                        {/* Backdrop to close settings when clicking outside */}
                        <div 
                          className="fixed inset-0 z-40 cursor-default" 
                          onClick={() => setShowSettingsMenu(false)} 
                        />
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-3 p-4 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl z-50 min-w-[280px] backdrop-blur-xl"
                        >
                          <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-800">
                            <Settings className="w-4 h-4 text-blue-400 animate-spin-slow" />
                            <h3 className="text-xs font-black uppercase tracking-widest text-white">App Settings</h3>
                          </div>

                          <div className="space-y-4">
                            {/* Interactive Sound Experience Setting */}
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                  {soundPreference === "enabled" ? (
                                    <Volume2 className="w-4 h-4 text-blue-400 animate-bounce" />
                                  ) : (
                                    <VolumeX className="w-4 h-4 text-slate-500" />
                                  )}
                                  Sound FX
                                </span>
                                <button
                                  onClick={() => {
                                    const newPref = soundPreference === "enabled" ? "disabled" : "enabled";
                                    setSoundPreference(newPref);
                                    localStorage.setItem("sound_preference", newPref);
                                    if (newPref === "enabled") {
                                      playRandomInteractiveSound();
                                    }
                                  }}
                                  className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${
                                    soundPreference === "enabled" ? "bg-blue-600" : "bg-slate-800"
                                  }`}
                                >
                                  <span
                                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                      soundPreference === "enabled" ? "translate-x-5" : "translate-x-1"
                                    }`}
                                  />
                                </button>
                              </div>
                              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wide leading-relaxed">
                                Play soundscapes on every interface click & interactive action.
                              </p>
                            </div>

                            {/* Display Language Section */}
                            <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                <Globe className="w-4 h-4 text-blue-400" />
                                Display Language
                              </span>
                              <div className="grid grid-cols-2 gap-1.5">
                                {(["en", "es", "fr", "de"] as Language[]).map((lang) => (
                                  <button
                                    key={lang}
                                    type="button"
                                    onClick={() => handleLanguageChange(lang)}
                                    className={`py-1.5 px-2 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer ${
                                      language === lang
                                        ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 font-black"
                                        : "bg-slate-900/40 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-white"
                                    }`}
                                  >
                                    {lang === "en" ? "English" : lang === "es" ? "Español" : lang === "fr" ? "Français" : "Deutsch"}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Test Soundscape Button */}
                            <button
                              onClick={() => playRandomInteractiveSound()}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-300 hover:text-white transition-all shadow-sm cursor-pointer"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                              Test Synthesized FX
                            </button>

                            {/* Informational System Config */}
                            <div className="pt-2 border-t border-slate-800 text-[8px] font-mono text-slate-500 flex justify-between items-center">
                              <span>AUDIO_ENGINE:</span>
                              <span className={soundPreference === "enabled" ? "text-emerald-400" : "text-rose-500"}>
                                {soundPreference === "enabled" ? "ONLINE" : "MUTED"}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Enhanced Theme Toggle */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:text-white transition-all flex items-center justify-center relative overflow-hidden shadow-lg group cursor-pointer shrink-0"
                  title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                  <AnimatePresence mode="wait">
                    {theme === 'dark' ? (
                      <motion.div
                        key="dark"
                        initial={{ y: -10, opacity: 0, rotate: -45 }}
                        animate={{ y: 0, opacity: 1, rotate: 0 }}
                        exit={{ y: 10, opacity: 0, rotate: 45 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="flex items-center justify-center text-amber-400"
                      >
                        <Moon className="w-5 h-5 fill-current" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="light"
                        initial={{ y: -10, opacity: 0, rotate: -45 }}
                        animate={{ y: 0, opacity: 1, rotate: 0 }}
                        exit={{ y: 10, opacity: 0, rotate: 45 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="flex items-center justify-center text-orange-500"
                      >
                        <Sun className="w-5 h-5 fill-current" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>

                {/* Compare Shortcut Badge */}
                <AnimatePresence>
                  {comparedTools.length > 0 && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowComparisonModal(true)}
                      className="relative p-2.5 rounded-xl border border-orange-500/30 bg-orange-500/10 text-orange-400 font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(249,115,22,0.25)] shrink-0"
                    >
                      <ArrowLeftRight className="w-4 h-4" />
                      <span className="hidden sm:inline">Compare</span>
                      <span className="bg-orange-500 text-slate-950 font-black rounded-full w-4.5 h-4.5 flex items-center justify-center text-[9px] -mr-1">{comparedTools.length}</span>
                    </motion.button>
                  )}
                </AnimatePresence>

                <motion.a 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  href="#submit-section"
                  className="px-3 sm:px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-bold text-[10px] sm:text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 border border-blue-400/20 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4 sm:w-5 h-5" />
                  <span>Contribute</span>
                </motion.a>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Auth Selection Modals */}
      <AuthModal
        isOpen={authMode !== null}
        onClose={() => setAuthMode(null)}
        initialMode={authMode || 'signin'}
        onSuccess={handleAuthSuccess}
      />

      {/* Hero Section */}
      <main>
        <section className="relative py-24 overflow-hidden border-b border-slate-800">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-600/10 via-transparent to-transparent opacity-50 blur-3xl -z-10" />
          
          <div className="max-w-7xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Realistic 3D Blazing Fire with Smoke */}
              <BlazingFire />

              {/* Flame-aligned Interactive Gateway */}
              <div className="max-w-2xl mx-auto mb-10 mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-4 rounded-3xl shadow-2xl">
                {!user ? (
                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <motion.button
                      whileHover={{ scale: 1.05, backgroundColor: "rgba(30, 41, 59, 0.9)" }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setAuthMode('signin')}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-slate-950 border border-slate-800 text-white rounded-2xl font-black text-sm transition-all cursor-pointer shadow-xl group hover:border-blue-500/30"
                    >
                      <LogIn className="w-4 h-4 text-blue-500 group-hover:translate-x-1 transition-transform" />
                      Sign In
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setAuthMode('signup')}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm transition-all cursor-pointer shadow-xl shadow-blue-600/10"
                    >
                      <Plus className="w-4 h-4" />
                      Sign Up
                    </motion.button>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider px-4 py-2 bg-slate-950/40 rounded-full border border-slate-800/60">
                    Logged in as <span className="text-white font-black">{user.displayName || user.email}</span>
                  </div>
                )}

                <div className="hidden sm:block w-px h-6 bg-slate-800" />

                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(239, 68, 68, 0.2)" }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowArticlesList(true)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-2xl font-black text-sm transition-all cursor-pointer shadow-xl shadow-red-900/10 border border-red-500/30"
                >
                  <BookOpen className="w-4 h-4 animate-pulse text-yellow-300" />
                  Read Blogs & Articles
                  <span className="text-[8px] bg-white/20 text-white px-1.5 py-0.5 rounded-md font-black uppercase tracking-widest ml-1 animate-pulse">
                    FREE
                  </span>
                </motion.button>
              </div>

              <span className="px-4 py-1.5 bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-widest rounded-full border border-blue-500/20 mb-6 inline-block">
                {language === "en" ? "The Definitive AI Roadmap" : language === "es" ? "La Ruta Definitiva de IA" : language === "fr" ? "La Feuille de Route IA Définitive" : "Der definitive KI-Wegweiser"}
              </span>
              <h2 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tight">
                {language === "en" ? (
                  <>Discover the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Infinite</span> <br/> AI Landscape.</>
                ) : language === "es" ? (
                  <>Descubre el <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Infinito</span> <br/> Panorama de IA.</>
                ) : language === "fr" ? (
                  <>Découvrez le <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Paysage IA</span> <br/> Infini.</>
                ) : (
                  <>Entdecken Sie die <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Unendliche</span> <br/> KI-Landschaft.</>
                )}
              </h2>
              <p className="max-w-2xl mx-auto text-lg text-slate-400 mb-12">
                {t.heroSubtitle}
              </p>

              <div className="flex flex-wrap justify-center gap-4 mb-16">
                <div className="flex flex-col items-center gap-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleExpandDirectory}
                    disabled={isScraping}
                    className="px-8 py-4 bg-white text-black rounded-2xl font-black text-lg shadow-2xl hover:bg-slate-100 transition-all flex items-center gap-3 disabled:opacity-50"
                  >
                    <Database className={`w-6 h-6 ${isScraping ? 'animate-bounce' : ''}`} />
                    {isScraping ? 'HARVESTING_NEW_AI_ENTRIES...' : 'Index 50+ Global AI tools'}
                  </motion.button>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs font-black text-blue-400 uppercase tracking-tighter">
                    {tools.length} / 1,000,000+ Items Global Inventory
                  </span>
                </div>
                {userRole === "User" && (
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-800 border border-slate-700 rounded-full">
                    <Shield className="w-3 h-3 text-slate-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Admin Access Restricted</span>
                  </div>
                )}
              </div>
                </div>
                <motion.a
                  whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.05)" }}
                  whileTap={{ scale: 0.98 }}
                  href="#submit-section"
                  className="px-8 py-4 bg-transparent border-2 border-slate-800 text-white rounded-2xl font-bold text-lg hover:border-slate-700 transition-all flex items-center gap-2 h-fit"
                >
                  <Plus className="w-6 h-6" />
                  Submit Your AI
                </motion.a>
              </div>
            </motion.div>

              {/* Live Directory Count Badge */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-5xl mx-auto mb-4 flex justify-center sm:justify-start"
              >
                <div className="inline-flex items-center gap-3 px-4 py-2 bg-blue-500/5 backdrop-blur-xl border border-blue-500/10 rounded-2xl">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Live Registry Status</span>
                  </div>
                  <div className="w-px h-3 bg-blue-500/20" />
                  <p className="text-xs font-bold text-slate-300">
                    <span className="text-white font-black">{tools.length.toLocaleString()}</span> Professional AI Tools Indexed
                  </p>
                </div>
              </motion.div>

              {/* Discovery Bar */}
            <div className="max-w-5xl mx-auto space-y-4">
              <div className={`p-[1.5px] rounded-3xl transition-all duration-300 ${
                isSearchFocused 
                ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-400 shadow-[0_0_25px_rgba(249,115,22,0.25)] ring-1 ring-orange-500/30' 
                : 'bg-white/10 hover:bg-white/15 hover:shadow-[0_0_15px_rgba(249,115,22,0.05)]'
              }`}>
                <div 
                  role="search"
                  aria-label="Find AI tools"
                  className="bg-slate-950/95 backdrop-blur-2xl p-3 rounded-[22px] flex flex-col lg:flex-row gap-2 relative w-full"
                >
                  <div className="flex-1 relative group/search bg-gradient-to-r from-yellow-400 via-yellow-300 to-amber-400 rounded-2xl border border-yellow-300/30 shadow-[0_0_20px_rgba(250,204,21,0.15)] overflow-hidden">
                    <Search className={`absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 z-10 transition-all duration-300 ${isSearchFocused ? 'text-slate-950 scale-110' : 'text-slate-900'}`} aria-hidden="true" />
                    
                    {/* Natural Language Intent Indicators */}
                    <AnimatePresence>
                      {interpretedQuery && Object.values(interpretedQuery).some(v => v) && (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          className="absolute left-14 top-2 flex gap-1 pointer-events-none z-20"
                        >
                          {interpretedQuery.isFree && <span className="text-[7px] font-black uppercase bg-slate-950 text-green-400 px-1 rounded border border-slate-900">Free</span>}
                          {interpretedQuery.isMobile && <span className="text-[7px] font-black uppercase bg-slate-950 text-blue-400 px-1 rounded border border-slate-900">Mobile</span>}
                          {interpretedQuery.isDev && <span className="text-[7px] font-black uppercase bg-slate-950 text-amber-400 px-1 rounded border border-slate-900">Developer</span>}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Auto-complete ghost text */}
                  {searchQuery && suggestions.length > 0 && (
                    (() => {
                      const searchLower = searchQuery.toLowerCase();
                      const firstSuggestion = suggestions[0];
                      let completion = "";
                      
                      if (searchLower.startsWith('#')) {
                        const tagQuery = searchLower.substring(1).trim();
                        const matchedTag = firstSuggestion.tags?.find(t => t.toLowerCase().startsWith(tagQuery));
                        if (matchedTag) {
                          completion = `#${matchedTag}`;
                        }
                      } else if (firstSuggestion.name.toLowerCase().startsWith(searchLower)) {
                        completion = firstSuggestion.name;
                      }
                      
                      if (completion && completion.toLowerCase().startsWith(searchLower)) {
                         return (
                          <div 
                            onClick={() => {
                              setSearchQuery(completion);
                              setFocusedSuggestionIndex(0);
                            }}
                            className="absolute left-14 top-1/2 -translate-y-1/2 text-slate-950 cursor-pointer font-semibold whitespace-pre z-30 pointer-events-auto select-none"
                            title="Click or press Tab to autocomplete"
                          >
                            <span className="opacity-0">{searchQuery}</span>
                            <span className="opacity-45">{completion.substring(searchQuery.length)}</span>
                            <span className="ml-2 text-[8px] bg-slate-950 text-yellow-400 px-1.5 py-0.5 rounded border border-slate-900 font-black uppercase tracking-tighter shadow-sm animate-pulse hover:bg-slate-900">
                              Tab / Tap to Complete
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()
                  )}

                  <input 
                    id="search-input"
                    type="text" 
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={showSuggestions}
                    aria-controls="search-suggestions"
                    aria-haspopup="listbox"
                    aria-label="Search by name, category, or functionality"
                    placeholder={t.searchPlaceholder}
                    className="w-full bg-transparent border-none px-14 py-4 text-slate-950 focus:outline-none placeholder:text-slate-800/60 font-bold relative z-10"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={() => {
                      setTimeout(() => {
                        setShowSuggestions(false);
                        setIsSearchFocused(false);
                      }, 250);
                    }}
                    onFocus={() => {
                      setIsSearchFocused(true);
                      if (searchQuery.length > 0) {
                        setShowSuggestions(true);
                      }
                    }}
                  />

                  {/* Search Footer Tips */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-3 z-20">
                    <VoiceSearch onResult={(text) => {
                      const isCommand = handleVoiceCommand(text);
                      if (!isCommand) {
                        handleSearchChange(text);
                        addRecentSearch(text);
                      }
                    }} />
                    <div className="flex gap-1">
                      <kbd className="px-1.5 py-0.5 bg-slate-950 border border-slate-900 rounded text-[9px] text-yellow-400 font-mono">#</kbd>
                      <span className="text-[9px] text-slate-900 font-black uppercase tracking-tighter">to search tags</span>
                    </div>
                  </div>

                  {/* Recent Searches Dropdown when search input is empty but focused */}
                  <AnimatePresence>
                    {isSearchFocused && !searchQuery && recentSearches.length > 0 && (
                      <motion.div
                        id="recent-searches-dropdown"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 right-0 mt-3 bg-slate-950/98 border border-white/10 rounded-2xl shadow-2xl z-[60] overflow-hidden backdrop-blur-xl max-h-[300px] overflow-y-auto custom-scrollbar"
                      >
                        <div className="p-3 border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 flex justify-between items-center bg-slate-900/50">
                          <span className="flex items-center gap-1.5">
                            <History className="w-3.5 h-3.5 text-blue-400" />
                            {t.recentQueries}
                          </span>
                          <button
                            onMouseDown={(e) => clearRecentSearches(e)}
                            className="text-[9px] bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 px-2 py-0.5 rounded-full font-bold transition-all cursor-pointer"
                          >
                            {t.clearHistory}
                          </button>
                        </div>
                        <div className="py-1">
                          {recentSearches.map((queryStr, idx) => (
                            <div
                              key={idx}
                              className="px-6 py-3 flex items-center justify-between hover:bg-white/5 transition-all group cursor-pointer"
                              onMouseDown={() => handleSelectRecentSearch(queryStr)}
                            >
                              <div className="flex items-center gap-3">
                                <History className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                                <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{queryStr}</span>
                              </div>
                              <button
                                onMouseDown={(e) => removeRecentSearch(e, queryStr)}
                                className="p-1 hover:bg-white/10 text-slate-500 hover:text-red-400 rounded-lg transition-all"
                                title="Remove search from history"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Suggestions Dropdown grouped by Category with full Keyboard Navigation */}
                  <AnimatePresence>
                    {showSuggestions && suggestions.length > 0 && (
                      <motion.div
                        id="search-suggestions"
                        role="listbox"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-full left-0 right-0 mt-3 bg-slate-950/98 border border-white/10 rounded-2xl shadow-2xl z-[60] overflow-hidden flex flex-col md:flex-row h-[520px] max-h-[90vh] md:max-h-[520px] backdrop-blur-xl"
                      >
                        {/* Left Suggestions List Pane */}
                        <div className="w-full md:w-3/5 lg:w-2/3 h-full overflow-y-auto custom-scrollbar flex flex-col border-r border-white/5">
                          <div className="p-3 border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 flex justify-between items-center bg-slate-900/50">
                            <span className="flex items-center gap-1.5">
                              <Sparkles className="w-3 h-3 text-orange-400 animate-pulse" />
                              Categorized AI Tools
                            </span>
                            <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">{suggestions.length} Found</span>
                          </div>

                          <div className="flex-1">
                            {(() => {
                              const searchVal = searchQuery.toLowerCase().trim().replace('#', '');
                              const matchingCategories = CATEGORIES.filter(cat => 
                                cat.toLowerCase().includes(searchVal) &&
                                cat.toLowerCase() !== selectedCategory.toLowerCase()
                              );
                              
                              const matchingTags = popularTags
                                .map(([tag]) => tag)
                                .filter(tag => tag.toLowerCase().includes(searchVal))
                                .slice(0, 5);

                              if (matchingCategories.length === 0 && matchingTags.length === 0) return null;

                              return (
                                <div className="p-4 bg-slate-950/40 border-b border-white/5 flex flex-wrap items-center gap-2">
                                  <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider">Quick Complete:</span>
                                  {matchingCategories.map(cat => (
                                    <button
                                      key={cat}
                                      onClick={() => {
                                        setSelectedCategory(cat);
                                        setSearchQuery("");
                                        setShowSuggestions(false);
                                      }}
                                      className="px-2 py-1 bg-slate-900 hover:bg-orange-500/20 hover:text-orange-300 border border-white/5 rounded-lg text-[10px] font-bold text-slate-300 transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                      <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                                      Category: {cat}
                                    </button>
                                  ))}
                                  {matchingTags.map(tag => (
                                    <button
                                      key={tag}
                                      onClick={() => {
                                        setSearchQuery(`#${tag}`);
                                        setShowSuggestions(false);
                                      }}
                                      className="px-2 py-1 bg-slate-900 hover:bg-blue-500/20 hover:text-blue-300 border border-white/5 rounded-lg text-[10px] font-bold text-slate-300 transition-all flex items-center gap-1 cursor-pointer"
                                    >
                                      <span>#</span>
                                      {tag}
                                    </button>
                                  ))}
                                </div>
                              );
                            })()}

                            {Object.entries(groupedSuggestions).map(([category, items]) => (
                              <div key={category} className="border-b border-white/5 last:border-none">
                                {/* Category Sub-header */}
                                <div className="py-2.5 px-6 flex items-center gap-2 bg-slate-900/30 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-white/5">
                                  {getCategoryIcon(category)}
                                  <span className="tracking-widest">{category}</span>
                                  <span className="ml-auto text-[8px] opacity-70 bg-white/5 px-1.5 py-0.5 rounded-full">{items.length} matched</span>
                                </div>

                                {/* Grouped Tools with keyboard index sync */}
                                {items.map(({ tool, originalIndex }) => (
                                  <button
                                    key={tool.id}
                                    role="option"
                                    aria-selected={originalIndex === focusedSuggestionIndex}
                                    onMouseEnter={() => setFocusedSuggestionIndex(originalIndex)}
                                    onClick={() => {
                                      setSearchQuery(tool.name);
                                      setShowSuggestions(false);
                                      setSelectedTool(tool);
                                      addRecentSearch(tool.name);
                                    }}
                                    className={`w-full px-6 py-3.5 flex items-center justify-between transition-all border-b border-white/5 last:border-none group text-left cursor-pointer ${
                                      originalIndex === focusedSuggestionIndex 
                                      ? 'bg-orange-500/15 border-l-2 border-orange-500 text-white pl-5.5' 
                                      : 'hover:bg-white/5 pl-6'
                                    }`}
                                  >
                                    <div className="flex items-center gap-4 text-left">
                                      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center p-1.5 border border-white/10 shadow-inner group-hover:bg-white/10 transition-colors">
                                        <img 
                                          src={`https://www.google.com/s2/favicons?domain=${new URL(tool.url).hostname}&sz=64`} 
                                          alt=""
                                          className="w-full h-full object-contain"
                                          referrerPolicy="no-referrer"
                                          loading="lazy"
                                          decoding="async"
                                        />
                                      </div>
                                      <div className="flex flex-col">
                                        <p className="font-black text-white leading-tight group-hover:text-orange-400 transition-colors uppercase tracking-tight text-sm">
                                          {tool.name}
                                        </p>
                                        <div className="flex items-center gap-2.5 mt-1">
                                          <span className="text-[10px] text-orange-400 font-mono font-bold uppercase tracking-tighter bg-orange-400/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                                            <ThumbsUp className="w-2.5 h-2.5" />
                                            {tool.upvotes}
                                          </span>
                                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{tool.category}</span>
                                          <div className="w-1 h-1 rounded-full bg-slate-700" />
                                          <span className="text-[9px] text-slate-500 font-medium uppercase tracking-widest">{tool.type}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className={`flex items-center gap-3 transition-all ${originalIndex === focusedSuggestionIndex ? 'text-orange-400 translate-x-0 opacity-100' : 'text-slate-500 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0'}`}>
                                      <div className="flex items-center gap-1">
                                        {tool.tags?.slice(0, 2).map(tag => (
                                          <span key={tag} className="text-[8px] text-slate-600 border border-slate-800 px-1.5 py-0.5 rounded uppercase font-bold">#{tag}</span>
                                        ))}
                                      </div>
                                      <ArrowUp className="w-4 h-4 rotate-45" />
                                    </div>
                                  </button>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Right live Preview Pane */}
                        <div className="hidden md:flex md:w-2/5 lg:w-1/3 bg-slate-900/35 flex-col h-full overflow-y-auto custom-scrollbar">
                          {(() => {
                            const previewTool = suggestions[focusedSuggestionIndex >= 0 ? focusedSuggestionIndex : 0];
                            if (!previewTool) return (
                              <div className="flex flex-col items-center justify-center h-full p-6 text-center text-slate-500">
                                <Search className="w-8 h-8 opacity-40 mb-3 animate-pulse" />
                                <p className="text-xs font-mono tracking-widest uppercase">Select or Hover an AI Tool to Preview</p>
                              </div>
                            );

                            return (
                              <AnimatePresence mode="wait">
                                <motion.div
                                  key={previewTool.id}
                                  initial={{ opacity: 0, x: 15 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -15 }}
                                  transition={{ duration: 0.15 }}
                                  className="p-6 flex flex-col h-full justify-between"
                                >
                                  <div className="space-y-6">
                                    {/* Logo + Name */}
                                    <div className="flex items-start gap-4">
                                      <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center p-2.5 border border-white/10 shadow-lg">
                                        <img 
                                          src={`https://www.google.com/s2/favicons?domain=${new URL(previewTool.url).hostname}&sz=64`} 
                                          alt=""
                                          className="w-full h-full object-contain"
                                          referrerPolicy="no-referrer"
                                          loading="lazy"
                                          decoding="async"
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <h4 className="text-lg font-black text-white uppercase tracking-tight truncate leading-tight">
                                          {previewTool.name}
                                        </h4>
                                        <a 
                                          href={previewTool.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer" 
                                          className="text-xs text-orange-400/80 hover:text-orange-400 font-mono flex items-center gap-1 mt-1 truncate"
                                        >
                                          <Globe className="w-3 h-3 flex-shrink-0" />
                                          <span className="truncate">{new URL(previewTool.url).hostname}</span>
                                        </a>
                                      </div>
                                    </div>

                                    {/* Categories & Type info */}
                                    <div className="flex flex-wrap gap-2">
                                      <span className="text-[9px] bg-slate-850 text-slate-300 px-2 py-1 rounded border border-white/5 font-black uppercase tracking-widest">
                                        {previewTool.category}
                                      </span>
                                      <span className="text-[9px] bg-slate-850 text-slate-300 px-2 py-1 rounded border border-white/5 font-black uppercase tracking-widest">
                                        {previewTool.type}
                                      </span>
                                    </div>

                                    {/* Description Preview Section */}
                                    <div className="space-y-2">
                                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">
                                        DIRECTORY PREVIEW SUMMARY
                                      </p>
                                      <div className="bg-slate-950/50 border border-white/5 rounded-xl p-3.5 shadow-inner">
                                        <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                          {previewTool.desc.length > 180 ? `${previewTool.desc.slice(0, 180)}...` : previewTool.desc}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Quick Stats */}
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">Upvotes</span>
                                        <span className="text-base font-black text-orange-400 font-mono">{previewTool.upvotes}</span>
                                      </div>
                                      <div className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">Rating</span>
                                        <span className="text-base font-black text-amber-400 font-mono">
                                          {previewTool.averageRating ? `${previewTool.averageRating.toFixed(1)}/5` : "N/A"}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Tags Cloud */}
                                    {previewTool.tags && previewTool.tags.length > 0 && (
                                      <div className="space-y-1.5">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">Tags</span>
                                        <div className="flex flex-wrap gap-1.5">
                                          {previewTool.tags.slice(0, 4).map(tag => (
                                            <span key={tag} className="text-[9px] bg-slate-950 text-slate-400 px-2 py-0.5 rounded border border-slate-900 font-bold">
                                              #{tag}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Bottom Footer Tip */}
                                  <div className="border-t border-white/5 pt-4 text-center">
                                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-wider flex items-center justify-center gap-1">
                                      <span>Click or Press Enter to Open</span>
                                      <ChevronRight className="w-3 h-3 text-orange-400 animate-pulse" />
                                    </p>
                                  </div>
                                </motion.div>
                              </AnimatePresence>
                            );
                          })()}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="h-px lg:h-10 lg:w-px bg-slate-800 self-center mx-1" aria-hidden="true" />
                
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all border cursor-pointer ${
                        showAdvancedFilters 
                        ? 'bg-orange-500/15 text-orange-400 border-orange-500/30 shadow-[0_0_15px_rgba(249,115,22,0.15)]' 
                        : 'bg-slate-950/50 text-slate-400 border-white/5 hover:text-orange-400 hover:border-orange-500/20'
                      }`}
                    >
                      <Filter className="w-4 h-4" />
                      <span className="text-[10px] uppercase tracking-widest font-black">Filters</span>
                    </button>

                    <div className="flex items-center px-4 gap-3 bg-slate-950/50 rounded-2xl border border-white/5 hover:border-orange-500/20 hover:bg-slate-900 transition-colors">
                      <ArrowUp className="w-4 h-4 text-slate-400" aria-hidden="true" />
                      <select 
                        aria-label="Sort by"
                        className="bg-transparent border-none text-white text-xs font-bold uppercase tracking-widest focus:outline-none flex-1 py-4 appearance-none cursor-pointer pr-4"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                      >
                        <option value="newest" className="bg-slate-900">Newest First</option>
                        <option value="popular" className="bg-slate-900">Most Popular</option>
                        <option value="rating" className="bg-slate-900">Highest Rated</option>
                        <option value="alpha" className="bg-slate-900">Alphabetical (A-Z)</option>
                      </select>
                    </div>

                    {user && (
                      <button 
                        aria-pressed={showFavoritesOnly}
                        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                        title={showFavoritesOnly ? "Show All Tools" : "Show Favorites Only"}
                        className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all border cursor-pointer ${
                          showFavoritesOnly 
                          ? 'bg-rose-500/15 text-rose-500 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]' 
                          : 'bg-slate-950/50 text-slate-400 border-white/5 hover:text-rose-400 hover:border-rose-500/20'
                        }`}
                      >
                        <Heart className={`w-5 h-5 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                      </button>
                    )}

                    <button 
                      onClick={() => {
                        setShowInsights(!showInsights);
                        if (!showInsights) {
                          setShowDrive(false);
                        }
                      }}
                      title={showInsights ? "Close Insights" : "Show Directory Insights"}
                      className={`flex items-center justify-center gap-2 px-5 py-4 rounded-2xl font-bold transition-all border cursor-pointer ${
                        showInsights 
                        ? 'bg-blue-600/25 text-blue-400 border-blue-500/40 shadow-[0_0_15px_rgba(59,130,246,0.25)]' 
                        : 'bg-slate-950/50 text-slate-400 border-white/5 hover:text-blue-400 hover:border-blue-500/20'
                      }`}
                    >
                      <BarChart className="w-4 h-4" />
                      <span className="text-[10px] uppercase tracking-widest font-black">Insights</span>
                    </button>

                    <button 
                      onClick={() => {
                        setShowDrive(!showDrive);
                        if (!showDrive) {
                          setShowInsights(false);
                        }
                      }}
                      title={showDrive ? "Close Cloud Storage" : "Google Drive Cloud"}
                      className={`flex items-center justify-center gap-2 px-5 py-4 rounded-2xl font-bold transition-all border cursor-pointer shake-every-second ${
                        showDrive 
                        ? 'bg-gradient-to-r from-sky-500/30 to-blue-500/30 text-sky-300 border-sky-400 shadow-[0_0_20px_rgba(14,165,233,0.4)]' 
                        : 'bg-gradient-to-r from-sky-500/10 to-blue-500/10 text-sky-400 border-sky-500/30 hover:border-sky-400 shadow-[0_0_12px_rgba(14,165,233,0.2)]'
                      }`}
                    >
                      <Cloud className="w-4 h-4 text-sky-400 animate-pulse" />
                      <span className="text-[10px] uppercase tracking-widest font-black text-sky-400">Google Drive Cloud</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Tag Cloud for Enhanced Discovery */}
              <div className="max-w-5xl mx-auto mt-4 px-2">
                <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest self-center mr-1">Trending:</span>
                  {popularTags.slice(0, 12).map(([tag, count]) => (
                    <button
                      key={tag}
                      onClick={() => {
                        setSearchQuery(`#${tag}`);
                      }}
                      className="px-2.5 py-1 bg-slate-900/50 hover:bg-blue-600/20 text-slate-500 hover:text-blue-400 text-[10px] rounded-lg border border-slate-800 hover:border-blue-500/30 transition-all font-black uppercase tracking-widest flex items-center gap-1.5 group"
                    >
                      <span className="text-slate-600 group-hover:text-blue-500/50">#</span>
                      {tag}
                      <span className="text-[8px] bg-slate-800 px-1 rounded text-slate-600 group-hover:text-blue-400/50">{count}</span>
                    </button>
                  ))}
                  <button 
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded-lg border border-slate-700 transition-all font-black uppercase tracking-widest flex items-center gap-1.5"
                  >
                    <Filter className="w-3 h-3" />
                    All Tags
                  </button>
                </div>
              </div>

              {/* Advanced Filters & Facets */}
              <AnimatePresence>
                {showAdvancedFilters && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-slate-900/40 rounded-3xl border border-white/5 p-6 space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Categories</label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setSelectedCategory("All")}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${selectedCategory === "All" ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                          >
                            All
                          </button>
                          {CATEGORIES.map(cat => (
                            <button
                              key={cat}
                              onClick={() => setSelectedCategory(cat)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${selectedCategory === cat ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Platform Types</label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setSelectedType("All")}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${selectedType === "All" ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                          >
                            All
                          </button>
                          {["Web App", "Software (Desktop)", "Mobile / APK", "API / Platform"].map(type => (
                            <button
                              key={type}
                              onClick={() => setSelectedType(type)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${selectedType === type ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                            >
                              {type.replace(/ \(.*\)/, '')}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Pricing Model</label>
                        <div className="flex flex-wrap gap-2">
                          {(["All", "Free", "Open Source"] as const).map(option => (
                            <button
                              key={option}
                              onClick={() => setPricingFilter(option)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${pricingFilter === option ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Popular Tags (Faceted)</label>
                        {activeTags.length > 0 && (
                          <button 
                            onClick={() => setActiveTags([])}
                            className="text-[9px] font-bold text-blue-400 uppercase tracking-tighter hover:underline"
                          >
                            Clear Tags ({activeTags.length})
                          </button>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Array.from(new Set(tools.flatMap(t => t.tags || [])))
                          .sort()
                          .slice(0, 20)
                          .map(tag => (
                            <button
                              key={tag}
                              onClick={() => {
                                setActiveTags(prev => 
                                  prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                                );
                              }}
                              className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-tighter transition-all flex items-center gap-1.5 ${
                                activeTags.includes(tag) 
                                ? 'bg-blue-500 text-white border border-blue-400' 
                                : 'bg-slate-800 text-slate-500 border border-slate-700 hover:border-slate-600 hover:text-slate-300'
                              }`}
                            >
                              #{tag}
                              {activeTags.includes(tag) && <X className="w-2.5 h-2.5" />}
                            </button>
                          ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Primary Header AdSense Placement for Approval */}
        <section className="max-w-7xl mx-auto px-6 mt-6">
          <AdSenseUnit slot="7463920184" format="auto" />
        </section>

        {/* AI Tool Recommendation Assistant Section */}
        {!loading && (
          <section className="py-8 max-w-7xl mx-auto px-6">
            <ToolRecommender
              allTools={tools}
              favorites={favorites}
              comparedTools={comparedTools}
              onCompareToggle={toggleCompareTool}
              onView={(tool) => setSelectedTool(tool)}
              onFavoriteToggle={handleToggleFavorite}
              t={t}
            />
          </section>
        )}

        {/* Featured Section */}
        {!loading && !searchQuery && selectedCategory === "All" && selectedType === "All" && !showFavoritesOnly && featuredTools.length > 0 && (
          <section className="py-12 max-w-7xl mx-auto px-6 border-b border-white/5">
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-blue-600/20 p-2 rounded-xl border border-blue-500/20">
                <Zap className="w-5 h-5 text-blue-500 fill-current" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Community Spotlight</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">The most popular tools as voted by members</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredTools.map((tool, idx) => (
                <div key={`featured-${tool.id}`} className="relative group">
                  <div className="absolute -top-3 -left-3 z-10 w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-sm shadow-xl shadow-blue-500/30 border-2 border-slate-950">
                    {idx + 1}
                  </div>
                  <ToolCard 
                    tool={tool} 
                    isFeatured
                    isFavorited={favorites.includes(tool.id)}
                    isComparing={comparedTools.some(t => t.id === tool.id)}
                    onCompareToggle={() => toggleCompareTool(tool)}
                    onView={() => setSelectedTool(tool)}
                    onEdit={() => handleEditTool(tool)}
                    onDelete={() => setToolToDelete(tool)}
                    onShare={() => handleShareTool(tool)}
                    index={idx}
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Recommended For You Section */}
        {!loading && !searchQuery && selectedCategory === "All" && selectedType === "All" && !showFavoritesOnly && (
          <RecommendedForYou
            allTools={tools}
            favorites={favorites}
            comparedTools={comparedTools}
            onCompareToggle={toggleCompareTool}
            onView={(tool) => setSelectedTool(tool)}
            onEdit={handleEditTool}
            onDelete={setToolToDelete}
            onShare={handleShareTool}
            isAdmin={userRole !== "User"}
          />
        )}

        {/* Main Grid */}
        <section className="py-20 max-w-7xl mx-auto px-6">
          <AnimatePresence>
            {showInsights && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-16"
              >
                <StatsDashboard tools={tools} />
              </motion.div>
            )}

            {showDrive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mb-16"
              >
                <DriveDashboard tools={tools} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Persistent Quick Category / Sector Navigation Bar */}
          <div className="mb-12" id="quick-category-nav">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-1.5 h-3 bg-blue-600 rounded-full animate-pulse" />
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono">Quick Sector Navigation</h3>
            </div>
            
            <div className="flex items-center gap-2 pb-2 overflow-x-auto scrollbar-none scroll-smooth">
              <button
                onClick={() => setSelectedQuickSector("All")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border cursor-pointer ${
                  selectedQuickSector === "All"
                    ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/25 font-black"
                    : "bg-slate-900 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                🌌 All Sectors
              </button>

              {[
                { name: "Agentic AI", icon: "🤖" },
                { name: "Quantum ML", icon: "⚛️" },
                { name: "LLM & Chat", icon: "💬" },
                { name: "Image & Art", icon: "🎨" },
                { name: "Developer Tools", icon: "🛠️" },
                { name: "Productivity", icon: "📈" },
                { name: "Audio & Video", icon: "🎥" },
                { name: "Robotics & IoT", icon: "⚙️" },
                { name: "Neurotech AI", icon: "🧠" }
              ].map((sector) => (
                <button
                  key={sector.name}
                  onClick={() => setSelectedQuickSector(sector.name)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border cursor-pointer flex items-center gap-2 ${
                    selectedQuickSector === sector.name
                      ? "bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-600/25 font-black"
                      : "bg-slate-900 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:border-slate-700"
                  }`}
                >
                  <span>{sector.icon}</span>
                  <span>{sector.name}</span>
                </button>
              ))}
            </div>
          </div>

          {!loading && (searchQuery || selectedCategory !== "All" || selectedType !== "All" || showFavoritesOnly || selectedQuickSector !== "All") && (
            <div 
              role="alert" 
              aria-live="polite" 
              className="mb-8 flex flex-col sm:flex-row items-center justify-between text-slate-400 text-sm font-mono tracking-tighter gap-4"
            >
              <div className="flex items-center gap-3">
                <p className="bg-white/5 border border-white/10 px-3 py-1 rounded-full font-black text-blue-400">
                  MATCHING_RECORDS: {filteredTools.length}
                </p>
                {selectedCategory !== "All" && (
                  <span className="text-[10px] uppercase font-bold text-slate-600 bg-white/5 px-2 py-0.5 rounded border border-white/5">{selectedCategory}</span>
                )}
                {selectedQuickSector !== "All" && (
                  <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-600/5 px-2 py-0.5 rounded border border-blue-500/20">{selectedQuickSector}</span>
                )}
                {selectedType !== "All" && (
                  <span className="text-[10px] uppercase font-bold text-slate-600 bg-white/5 px-2 py-0.5 rounded border border-white/5">{selectedType}</span>
                )}
                {showFavoritesOnly && (
                  <span className="text-[10px] uppercase font-bold text-red-500 bg-red-500/5 px-2 py-0.5 rounded border border-red-500/20 flex items-center gap-1">
                    <Heart className="w-3 h-3 fill-current" /> Favorites
                  </span>
                )}
              </div>
              
              <button 
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                  setSelectedQuickSector("All");
                  setSelectedType("All");
                  setShowFavoritesOnly(false);
                  setActiveTags([]);
                }}
                className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2 border border-blue-500/20 px-4 py-1.5 rounded-xl hover:bg-blue-500/5"
              >
                <X className="w-3 h-3" aria-hidden="true" /> Reset Filters
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filteredTools.length > 0 ? (
            <div className="space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <AnimatePresence mode="popLayout">
                  {filteredTools.slice(0, displayCount).map((tool: AiTool, idx: number) => (
                    <ToolCard 
                      key={tool.id} 
                      tool={tool} 
                      isFavorited={favorites.includes(tool.id)}
                      isComparing={comparedTools.some(t => t.id === tool.id)}
                      onCompareToggle={() => toggleCompareTool(tool)}
                      onView={() => setSelectedTool(tool)}
                      onEdit={() => handleEditTool(tool)}
                      onDelete={() => setToolToDelete(tool)}
                      onShare={() => handleShareTool(tool)}
                      index={idx}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Native In-Feed AdSense Placement for Approval */}
              <div className="py-2 max-w-5xl mx-auto">
                <AdSenseUnit slot="8394018274" format="horizontal" />
              </div>

              {filteredTools.length > displayCount && (
                <div className="flex justify-center mt-12 pb-20 border-b border-white/5">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLoadMore}
                    className="px-12 py-4 bg-slate-900 border border-slate-700 hover:border-blue-500/50 hover:bg-slate-850 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl group"
                  >
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-blue-500 group-hover:animate-pulse" />
                      Load More AI Tools
                      <span className="text-slate-500 text-[10px] ml-2">({filteredTools.length - displayCount} Remaining)</span>
                    </div>
                  </motion.button>
                </div>
              )}

              {/* Popular Tags Cloud */}
              <div className="mt-24 pt-20 border-t border-white/5">
                <div className="flex flex-col items-center text-center mb-10">
                  <div className="px-4 py-1.5 bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-500/20 mb-4 inline-block">
                    Global Mapping
                  </div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tight">Popular Category Tags</h2>
                  <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-2 max-w-lg">
                    Click on a tag below to instantly filter the directory by specific functionality or platform capability
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
                  {popularTags.map(([tag, count]) => (
                    <motion.button
                      key={`cloud-${tag}`}
                      whileHover={{ scale: 1.1, y: -2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setSearchQuery(`#${tag}`);
                        scrollToTop();
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all border flex items-center gap-2 group ${
                        searchQuery === `#${tag}`
                        ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-600/20'
                        : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:text-white hover:border-slate-600'
                      }`}
                    >
                      <span className="text-blue-500 group-hover:text-blue-400">#</span>
                      {tag}
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        searchQuery === `#${tag}` ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-600'
                      }`}>
                        {count}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-40 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800"
            >
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
                <Search className="w-20 h-20 text-slate-700 relative" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">No tools found</h3>
              <p className="text-slate-500">Try adjusting your search filters or contribute a new tool below.</p>
            </motion.div>
          )}
        </section>

        {/* Newsletter Section */}
        <NewsletterForm />

        {/* Submission Section */}
        <SubmitForm />
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-900 bg-slate-950 relative z-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex items-center gap-2 opacity-50">
               <div className="px-2 py-0.5 bg-white text-black font-black tracking-tighter text-sm rounded">
                  Agidapp Global
                </div>
                <span className="text-xs font-mono">v1.2.0-STABLE</span>
            </div>
            
            {/* Quick Legal and Contact Links */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-5 text-xs text-slate-400 font-bold uppercase tracking-wider">
              <button 
                type="button"
                onClick={() => setLegalModalTab('terms')}
                className="hover:text-blue-400 transition-colors cursor-pointer"
              >
                Terms of Service
              </button>
              <span className="text-slate-800 hidden xs:inline">•</span>
              <button 
                type="button"
                onClick={() => setLegalModalTab('privacy')}
                className="hover:text-blue-400 transition-colors cursor-pointer"
              >
                Privacy Policy
              </button>
              <span className="text-slate-800 hidden xs:inline">•</span>
              <button 
                type="button"
                onClick={() => setLegalModalTab('contact')}
                className="hover:text-blue-400 transition-colors cursor-pointer"
              >
                Contact & Address
              </button>
            </div>
          </div>
          
          <div className="text-slate-600 text-xs text-center md:text-right">
            &copy; 2026 Agidapp Global. <br/>
            Engineered for the Silicon Age.
          </div>
        </div>
      </footer>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 20 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 z-50 p-4 bg-blue-600 text-white rounded-2xl shadow-2xl shadow-blue-600/40 hover:bg-blue-500 transition-all border border-blue-400/20 group"
            title="Scroll to top"
          >
            <ArrowUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Details/Edit Modal */}
      <AnimatePresence>
        {selectedTool && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSelectedTool(null); setIsEditing(false); }}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-800 flex flex-col xs:flex-row xs:items-center justify-between gap-4 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center overflow-hidden border border-white/10 shadow-inner">
                    <img 
                      src={`https://www.google.com/s2/favicons?domain=${new URL(selectedTool.url).hostname}&sz=64`}
                      alt=""
                      className="w-full h-full object-contain p-2"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white leading-none mb-1">{selectedTool.name}</h2>
                    <p className="text-xs text-blue-400 font-mono font-bold tracking-tighter uppercase">{selectedTool.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end xs:self-auto">
                  <SocialShare 
                    url={`https://www.agidappglobal.com/share/${selectedTool.id}`} 
                    title={selectedTool.name} 
                    text={selectedTool.desc}
                    variant="minimal"
                  />
                  <button 
                    onClick={() => { setSelectedTool(null); setIsEditing(false); setShowSharePanel(false); }}
                    className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
                {isEditing ? (
                  <form onSubmit={handleUpdateTool} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Tool Name</label>
                        <input 
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                          value={editFormData.name}
                          onChange={e => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Category</label>
                        <select 
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none appearance-none"
                          value={editFormData.category}
                          onChange={e => setEditFormData(prev => ({ ...prev, category: e.target.value as Category }))}
                        >
                          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Official Website</label>
                      <input 
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none"
                        value={editFormData.url}
                        onChange={e => setEditFormData(prev => ({ ...prev, url: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase ml-1">Description</label>
                      <textarea 
                        rows={4}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none resize-none"
                        value={editFormData.desc}
                        onChange={e => setEditFormData(prev => ({ ...prev, desc: e.target.value }))}
                      />
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button 
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="flex-1 px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-750 transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
                      >
                        Save Changes
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-8">
                    <div className="flex flex-wrap gap-3">
                      <div className="px-4 py-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 text-sm font-bold">
                        {selectedTool.category}
                      </div>
                      <div className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl border border-slate-700 text-sm font-bold">
                        {selectedTool.type}
                      </div>
                      <div className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl border border-slate-700 text-sm font-bold flex items-center gap-2">
                        <ThumbsUp className="w-4 h-4 text-blue-400" />
                        {selectedTool.upvotes} Upvotes
                      </div>
                      {tools.filter(t => t.id !== selectedTool.id && (t.category === selectedTool.category || t.tags?.some(tag => selectedTool.tags?.includes(tag)))).length > 0 && (
                        <button
                          onClick={() => {
                            const relatedSection = document.getElementById("related-tools-section");
                            if (relatedSection) {
                              relatedSection.scrollIntoView({ behavior: "smooth" });
                            }
                          }}
                          className="px-4 py-2 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 active:scale-95 rounded-xl border border-purple-500/20 text-sm font-bold transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 text-purple-400" />
                          Similar Tools ({tools.filter(t => t.id !== selectedTool.id && (t.category === selectedTool.category || t.tags?.some(tag => selectedTool.tags?.includes(tag)))).length})
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Info className="w-4 h-4" /> About the Tool
                      </h4>
                      <p className="text-lg text-slate-300 leading-relaxed">
                        {selectedTool.desc}
                      </p>
                    </div>

                    {/* Media Files Showcase */}
                    {selectedTool.mediaFiles && selectedTool.mediaFiles.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-blue-400" /> Media Files & Banners
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {selectedTool.mediaFiles.map((file, index) => (
                            <div 
                              key={`media-item-${index}`}
                              className="group/media relative bg-slate-950 border border-slate-850 rounded-2xl overflow-hidden shadow-lg aspect-video flex items-center justify-center transition-all hover:border-blue-500/30"
                            >
                              {file.type === 'image' ? (
                                <img 
                                  src={file.url} 
                                  alt={file.name} 
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover/media:scale-105"
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : file.type === 'video' ? (
                                <div className="w-full h-full relative">
                                  <video 
                                    src={file.url} 
                                    controls 
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="p-6 text-center flex flex-col items-center gap-2">
                                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-1">
                                    <FileText className="w-6 h-6" />
                                  </div>
                                  <p className="text-xs font-black text-white truncate max-w-[180px] uppercase tracking-tight">{file.name}</p>
                                  <a 
                                    href={file.url} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    className="text-[10px] font-black text-blue-400 hover:underline uppercase tracking-wider flex items-center gap-1.5 mt-2 justify-center"
                                  >
                                    Download Doc
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                </div>
                              )}

                              {/* Hover overlay with filename */}
                              {file.type !== 'document' && (
                                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-slate-950/90 to-transparent opacity-0 group-hover/media:opacity-100 transition-opacity duration-300 pointer-events-none">
                                  <p className="text-[10px] font-black text-white uppercase tracking-wider truncate">{file.name}</p>
                                </div>
                              )}
                              
                              {/* Open link overlay */}
                              {file.type === 'image' && (
                                <a 
                                  href={file.url} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="absolute top-3 right-3 p-1.5 bg-slate-900/90 border border-slate-800 rounded-lg text-slate-400 hover:text-white opacity-0 group-hover/media:opacity-100 transition-opacity"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <a 
                        href={selectedTool.url} 
                        target="_blank" 
                        rel="noreferrer"
                        onClick={() => incrementVisitCount(selectedTool.id)}
                        className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl hover:border-blue-500/50 transition-all group/link"
                      >
                        <div className="flex items-center gap-3">
                          <Globe className="w-5 h-5 text-blue-400" />
                          <span className="font-bold text-white">Visit Website</span>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-600 group-hover/link:text-blue-400" />
                      </a>

                      <a 
                        href={selectedTool.apk || selectedTool.url} 
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => {
                          if (!selectedTool.apk) {
                            incrementVisitCount(selectedTool.id);
                          }
                        }}
                        className={`flex items-center justify-between p-4 bg-slate-950 border rounded-2xl transition-all group/link ${
                          selectedTool.apk 
                          ? 'border-slate-800 hover:border-green-500/50' 
                          : 'border-slate-800 hover:border-slate-600/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Database className={`w-5 h-5 ${selectedTool.apk ? 'text-green-400 animate-pulse' : 'text-slate-500'}`} />
                          <div>
                            <span className="font-bold text-white block text-sm">Download APK / Install App</span>
                            <span className="text-[10px] text-slate-500 block">
                              {selectedTool.apk ? "Direct APK available" : "Redirects to Official Site"}
                            </span>
                          </div>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-600 group-hover/link:text-green-400" />
                      </a>
                    </div>

                    <div className="pt-8 border-t border-slate-800 space-y-4">
                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Star className="w-4 h-4 text-amber-400" /> Rate this Tool
                      </h4>
                      <div className="flex items-center gap-4 bg-slate-950/30 p-4 rounded-2xl border border-white/5">
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => handleRateTool(selectedTool.id, star)}
                              className="p-1 hover:scale-125 transition-transform group/star"
                              title={`Rate ${star} Stars`}
                            >
                              <Star 
                                className={`w-8 h-8 transition-colors ${
                                  star <= Math.round(selectedTool.averageRating || 0) 
                                  ? "fill-amber-400 text-amber-400" 
                                  : "text-slate-600 group-hover/star:text-amber-400/50"
                                }`} 
                              />
                            </button>
                          ))}
                        </div>
                        <div className="h-10 w-px bg-slate-800" />
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <p className="text-2xl font-black text-white leading-none">{selectedTool.averageRating?.toFixed(1) || "0.0"}</p>
                            <div className="flex text-amber-400">
                              <Star className="w-3 h-3 fill-current" />
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                            {selectedTool.totalRatingsCount || 0} Professional Ratings
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-8 border-t border-slate-800 flex flex-wrap gap-4">
                      <button 
                        onClick={() => setShowSharePanel(!showSharePanel)}
                        className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all cursor-pointer ${
                          showSharePanel
                            ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 border border-blue-500/30"
                            : "bg-slate-800 text-white hover:bg-slate-750"
                        }`}
                      >
                        <Share2 className="w-5 h-5" /> Share
                      </button>

                      {user && (
                        <button 
                          onClick={async () => {
                            const favDocRef = doc(db, "users", user.uid, "favorites", selectedTool.id);
                            if (favorites.includes(selectedTool.id)) {
                              await deleteDoc(favDocRef);
                            } else {
                              await setDoc(favDocRef, { toolId: selectedTool.id, createdAt: new Date() });
                            }
                          }}
                          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                            favorites.includes(selectedTool.id)
                            ? "bg-red-500/10 text-red-500 border border-red-500/20"
                            : "bg-slate-800 text-white hover:bg-slate-750"
                          }`}
                        >
                          <Heart className={`w-5 h-5 ${favorites.includes(selectedTool.id) ? "fill-current" : ""}`} />
                          {favorites.includes(selectedTool.id) ? "Favorited" : "Favorite"}
                        </button>
                      )}

                      {user && (
                        <button 
                          onClick={() => setShowBookmarkMenu(!showBookmarkMenu)}
                          className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${
                            bookmarks.some(b => b.toolId === selectedTool.id)
                            ? "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                            : "bg-slate-800 text-white hover:bg-slate-750"
                          }`}
                        >
                          <Bookmark className={`w-5 h-5 ${bookmarks.some(b => b.toolId === selectedTool.id) ? "fill-current" : ""}`} />
                          {bookmarks.some(b => b.toolId === selectedTool.id) ? "Bookmarked" : "Bookmark"}
                        </button>
                      )}

                      <button 
                         onClick={() => handleEditTool(selectedTool)}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-slate-700 text-slate-300 rounded-xl font-bold hover:bg-slate-800 transition-all"
                      >
                        <Edit className="w-5 h-5" /> Edit
                      </button>
                      <button 
                        onClick={() => setToolToDelete(selectedTool)}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 border border-red-500/20 text-red-400 rounded-xl font-bold hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-5 h-5" /> Delete
                      </button>
                    </div>

                    {/* Social Share & Feed Preview Panel */}
                    <AnimatePresence>
                      {showSharePanel && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden mt-4"
                        >
                          <SocialShare 
                            url={`https://www.agidappglobal.com/share/${selectedTool.id}`} 
                            title={selectedTool.name} 
                            text={selectedTool.desc}
                            image={selectedTool.mediaFiles?.[0]?.url || `https://www.google.com/s2/favicons?domain=${new URL(selectedTool.url).hostname}&sz=128`}
                            variant="full"
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Bookmark Curated Projects Dropdown/Sub-panel */}
                    <AnimatePresence>
                      {user && showBookmarkMenu && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden mt-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 space-y-4"
                        >
                          <div className="flex items-center justify-between">
                            <h5 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                              <Bookmark className="w-4 h-4 text-orange-500" /> Save to Curated Project
                            </h5>
                            <button
                              onClick={() => setShowBookmarkMenu(false)}
                              className="text-slate-500 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors"
                            >
                              Close
                            </button>
                          </div>

                          {/* Project list */}
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {/* Unassigned / General Bookmark */}
                            <button
                              onClick={async () => {
                                const bRef = doc(db, "users", user.uid, "bookmarks", selectedTool.id);
                                await setDoc(bRef, {
                                  toolId: selectedTool.id,
                                  projectId: null,
                                  bookmarkedAt: new Date()
                                });
                              }}
                              className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                                bookmarks.some(b => b.toolId === selectedTool.id && b.projectId === null)
                                ? "bg-orange-500/10 border-orange-500/40 text-orange-400"
                                : "bg-slate-900/40 border-slate-800/80 text-slate-300 hover:border-slate-700"
                              }`}
                            >
                              <div>
                                <span className="font-bold text-sm block">General Bookmarks</span>
                                <span className="text-[10px] text-slate-500 block">Unassigned to any specific curated project</span>
                              </div>
                              {bookmarks.some(b => b.toolId === selectedTool.id && b.projectId === null) && (
                                <span className="text-xs font-mono font-bold uppercase tracking-widest bg-orange-500/20 px-2 py-0.5 rounded">Active</span>
                              )}
                            </button>

                            {curatedProjects.map((proj) => {
                              const isSelected = bookmarks.some(b => b.toolId === selectedTool.id && b.projectId === proj.id);
                              return (
                                <button
                                  key={proj.id}
                                  onClick={async () => {
                                    const bRef = doc(db, "users", user.uid, "bookmarks", selectedTool.id);
                                    await setDoc(bRef, {
                                      toolId: selectedTool.id,
                                      projectId: proj.id,
                                      bookmarkedAt: new Date()
                                    });
                                  }}
                                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                                    isSelected
                                    ? "bg-orange-500/10 border-orange-500/40 text-orange-400"
                                    : "bg-slate-900/40 border-slate-800/80 text-slate-300 hover:border-slate-700"
                                  }`}
                                >
                                  <div className="truncate pr-4">
                                    <span className="font-bold text-sm block truncate">{proj.name}</span>
                                    {proj.desc && <span className="text-[10px] text-slate-500 block truncate">{proj.desc}</span>}
                                  </div>
                                  {isSelected && (
                                    <span className="text-xs font-mono font-bold uppercase tracking-widest bg-orange-500/20 px-2 py-0.5 rounded shrink-0">Active</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* Remove Bookmark completely if bookmarked */}
                          {bookmarks.some(b => b.toolId === selectedTool.id) && (
                            <button
                              onClick={async () => {
                                const bRef = doc(db, "users", user.uid, "bookmarks", selectedTool.id);
                                await deleteDoc(bRef);
                              }}
                              className="w-full py-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 font-bold rounded-xl text-xs uppercase tracking-widest transition-all"
                            >
                              Remove Bookmark completely
                            </button>
                          )}

                          {/* Inline Create Curated Project Form */}
                          <div className="pt-3 border-t border-slate-900 space-y-2">
                            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-500 block">Create & Save to New Curated Project</span>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Project Name"
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-slate-700"
                              />
                              <input
                                type="text"
                                placeholder="Description (optional)"
                                value={newProjectDesc}
                                onChange={(e) => setNewProjectDesc(e.target.value)}
                                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-slate-700"
                              />
                              <button
                                onClick={async () => {
                                  if (!newProjectName.trim()) return;
                                  const newProjId = "proj_" + Date.now();
                                  const pRef = doc(db, "users", user.uid, "curated_projects", newProjId);
                                  await setDoc(pRef, {
                                    name: newProjectName.trim(),
                                    desc: newProjectDesc.trim(),
                                    createdAt: new Date()
                                  });
                                  const bRef = doc(db, "users", user.uid, "bookmarks", selectedTool.id);
                                  await setDoc(bRef, {
                                    toolId: selectedTool.id,
                                    projectId: newProjId,
                                    bookmarkedAt: new Date()
                                  });
                                  setNewProjectName("");
                                  setNewProjectDesc("");
                                }}
                                disabled={!newProjectName.trim()}
                                className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:hover:bg-orange-500 text-slate-950 font-bold rounded-xl text-xs tracking-widest transition-all"
                              >
                                Create & Save
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Native Modal AdSense Placement for Approval */}
                    <AdSenseUnit slot="1920384756" format="auto" className="border-slate-800/50 bg-slate-950/40" />

                    <CommentSection id={selectedTool.id} type="tool" isAdmin={userRole !== "User"} authorId={selectedTool.authorId} />

                    <RelatedTools 
                      currentTool={selectedTool}
                      allTools={tools}
                      favorites={favorites}
                      onView={(tool) => {
                        setSelectedTool(tool);
                        document.querySelector('.custom-scrollbar')?.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onEdit={handleEditTool}
                      onDelete={setToolToDelete}
                      onShare={handleShareTool}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Profile Modal */}
      <AnimatePresence>
        {showProfile && (
          <UserProfile 
            userId={targetUserId || user?.uid || null}
            favoriteIds={favorites}
            userRole={userRole}
            onClose={() => {
              setShowProfile(false);
              setTargetUserId(null);
            }}
            onViewTool={(tool) => { setShowProfile(false); setSelectedTool(tool); }}
            onEditTool={(tool) => { setShowProfile(false); handleEditTool(tool); }}
            onDeleteTool={(tool) => { setShowProfile(false); setToolToDelete(tool); }}
            onShareTool={(tool) => { handleShareTool(tool); }}
            onPostSomething={() => {
              setShowProfile(false);
              setShowArticleSubmit(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* Sliding Social Feed Drawer */}
      <AnimatePresence>
        {showSocialFeed && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSocialFeed(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />
            
            {/* Drawer Container */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md h-full shadow-2xl"
            >
              <SocialFeed 
                onViewTool={(toolId) => {
                  const toolObj = tools.find(t => t.id === toolId);
                  if (toolObj) {
                    setSelectedTool(toolObj);
                  }
                  setShowSocialFeed(false);
                }} 
                onClose={() => setShowSocialFeed(false)} 
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {toolToDelete && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setToolToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{t.deleteConfirmTitle}</h3>
              <p className="text-slate-400 mb-8">{t.deleteConfirmDesc} ({toolToDelete.name})</p>
              
              <div className="flex w-full gap-4">
                <button 
                  onClick={() => setToolToDelete(null)}
                  className="flex-1 px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-750 transition-all"
                >
                  {t.cancel}
                </button>
                <button 
                  onClick={() => handleDeleteTool(toolToDelete.id)}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 transition-all shadow-lg shadow-red-600/20"
                >
                  {t.delete}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear Search History Confirmation Modal */}
      <AnimatePresence>
        {showClearHistoryConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClearHistoryConfirm(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-6">
                <History className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{t.clearHistoryConfirmTitle}</h3>
              <p className="text-slate-400 mb-8">{t.clearHistoryConfirmDesc}</p>
              
              <div className="flex w-full gap-4">
                <button 
                  onClick={() => setShowClearHistoryConfirm(false)}
                  className="flex-1 px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-750 transition-all"
                >
                  {t.cancel}
                </button>
                <button 
                  onClick={handleConfirmClearRecentSearches}
                  className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-500 transition-all shadow-lg shadow-orange-600/20"
                >
                  {t.clearHistoryConfirmButton}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {authWarning && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAuthWarning(null)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-slate-900 border border-red-500/30 p-8 rounded-[2rem] shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-500 border border-red-500/20">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Access Denied</h3>
              <p className="text-sm text-slate-500 font-bold uppercase tracking-widest leading-relaxed mb-8">
                {authWarning === "ADMIN_PRIVILEGE_REQUIRED" 
                  ? "Indexing functions are restricted to verified admins and managers only."
                  : "An authentication error occurred while connecting to the core registry."}
              </p>
              <button 
                onClick={() => setAuthWarning(null)}
                className="w-full py-4 bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-750 transition-all"
              >
                Acknowledge
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdminPortal && (
          <AdminPortal onClose={() => setShowAdminPortal(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showArticleSubmit && (
          <ArticleSubmitForm 
            onClose={() => setShowArticleSubmit(false)} 
            userRole={userRole}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showArticlesList && (
          <ArticlesList 
            onClose={() => setShowArticlesList(false)} 
            currentUserRole={userRole}
            initialArticleId={new URLSearchParams(window.location.search).get('articleId')}
          />
        )}
      </AnimatePresence>

      {/* Legal & Contact Hub Modal */}
      <LegalContactModal 
        isOpen={legalModalTab !== null} 
        onClose={() => setLegalModalTab(null)} 
        initialTab={legalModalTab || 'terms'} 
      />

      <AnimatePresence>
        {showOnboarding && (
          <Onboarding onClose={completeOnboarding} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {soundPreference === "unasked" && (
          <SoundActivationModal
            onChoose={(enable) => {
              const preference = enable ? "enabled" : "disabled";
              setSoundPreference(preference);
              localStorage.setItem("sound_preference", preference);
              if (enable) {
                // Play a sample sound immediately to celebrate enabling
                setTimeout(() => {
                  playRandomInteractiveSound();
                }, 100);
              }
            }}
            playSampleSound={playRandomInteractiveSound}
          />
        )}
      </AnimatePresence>

      {/* Compare Floating Bottom Drawer */}
      <AnimatePresence>
        {comparedTools.length > 0 && !showComparisonModal && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] w-[92%] max-w-3xl bg-slate-900/95 backdrop-blur-2xl border border-orange-500/30 rounded-3xl p-4 sm:p-5 shadow-[0_15px_40px_rgba(249,115,22,0.15)] flex flex-col xs:flex-row items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4 flex-wrap justify-center xs:justify-start">
              <div className="text-left">
                <p className="text-[9px] font-black uppercase tracking-widest text-orange-400">Comparison Stack</p>
                <p className="text-xs text-white font-bold">{comparedTools.length} of 3 tools selected</p>
              </div>
              <div className="flex items-center gap-2">
                {comparedTools.map(tool => (
                  <div key={`stack-${tool.id}`} className="relative group/stack">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 p-1.5 flex items-center justify-center shadow-lg">
                      <img
                        src={`https://www.google.com/s2/favicons?sz=64&domain=${new URL(tool.url).hostname}`}
                        alt={tool.name}
                        className="w-6 h-6 object-contain"
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=80&h=80&q=80";
                        }}
                      />
                    </div>
                    <button
                      onClick={() => toggleCompareTool(tool)}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-[8px] font-bold shadow-md cursor-pointer transition-transform hover:scale-110"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {comparedTools.length < 3 && (
                  <div className="w-10 h-10 rounded-xl border border-dashed border-slate-700 flex items-center justify-center text-slate-600 font-bold text-xs" title="Select more tools to compare">
                    +
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setComparedTools([])}
                className="text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-red-400 transition-colors cursor-pointer bg-transparent border-none outline-none"
              >
                Clear All
              </button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowComparisonModal(true)}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 stroke-[2.5]" />
                Compare Now
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Side-by-side Comparative matrix Modal */}
      <AnimatePresence>
        {showComparisonModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 sm:p-6 md:p-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowComparisonModal(false)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              transition={{ type: "spring", stiffness: 260, damping: 26 }}
              className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden max-h-[85vh]"
            >
              {/* Header */}
              <div className="px-6 sm:px-8 py-5 border-b border-white/5 flex items-center justify-between bg-slate-950/40">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                    <ArrowLeftRight className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Side-by-Side Model Comparison</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">In-depth statistical cross-examination</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowComparisonModal(false)}
                  className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700/50 cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Matrix Scroll Area */}
              <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1">
                <div className="min-w-[600px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        <th className="w-1/4 pb-6 font-black text-[10px] text-slate-500 uppercase tracking-widest border-b border-white/5">Attributes</th>
                        {comparedTools.map(tool => (
                          <th key={`header-${tool.id}`} className="w-[25%] pb-6 border-b border-white/5 px-4">
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 p-1.5 flex items-center justify-center">
                                  <img
                                    src={`https://www.google.com/s2/favicons?sz=64&domain=${new URL(tool.url).hostname}`}
                                    alt={tool.name}
                                    className="w-6 h-6 object-contain"
                                    loading="lazy"
                                    decoding="async"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=80&h=80&q=80"; }}
                                  />
                                </div>
                                <h4 className="text-md font-black text-white leading-tight uppercase tracking-tight">{tool.name}</h4>
                              </div>
                            </div>
                          </th>
                        ))}
                        {/* Placeholder columns if < 3 tools are selected */}
                        {Array.from({ length: Math.max(0, 3 - comparedTools.length) }).map((_, i) => (
                          <th key={`empty-header-${i}`} className="pb-6 border-b border-white/5 opacity-20 px-4">
                            <span className="text-[10px] font-bold tracking-widest text-slate-600 uppercase">Empty Slot</span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {/* Category */}
                      <tr>
                        <td className="py-4.5 font-bold text-xs text-slate-400 uppercase tracking-widest">Category</td>
                        {comparedTools.map(tool => (
                          <td key={`cat-${tool.id}`} className="py-4.5 px-4">
                            <span className="text-xs font-extrabold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20">
                              {tool.category}
                            </span>
                          </td>
                        ))}
                        {Array.from({ length: Math.max(0, 3 - comparedTools.length) }).map((_, i) => (
                          <td key={`empty-cat-${i}`} className="py-4.5 px-4 text-slate-700 text-xs">-</td>
                        ))}
                      </tr>

                      {/* Type / Platform */}
                      <tr>
                        <td className="py-4.5 font-bold text-xs text-slate-400 uppercase tracking-widest">Deployment</td>
                        {comparedTools.map(tool => (
                          <td key={`type-${tool.id}`} className="py-4.5 px-4">
                            <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                              {tool.type}
                            </span>
                          </td>
                        ))}
                        {Array.from({ length: Math.max(0, 3 - comparedTools.length) }).map((_, i) => (
                          <td key={`empty-type-${i}`} className="py-4.5 px-4 text-slate-700 text-xs">-</td>
                        ))}
                      </tr>

                      {/* Upvotes */}
                      <tr>
                        <td className="py-4.5 font-bold text-xs text-slate-400 uppercase tracking-widest">Popularity</td>
                        {comparedTools.map(tool => (
                          <td key={`upvotes-${tool.id}`} className="py-4.5 px-4">
                            <div className="flex items-center gap-1.5 text-xs font-black text-amber-500">
                              <ThumbsUp className="w-3.5 h-3.5 fill-current" />
                              <span>{tool.upvotes} UPVOTES</span>
                            </div>
                          </td>
                        ))}
                        {Array.from({ length: Math.max(0, 3 - comparedTools.length) }).map((_, i) => (
                          <td key={`empty-upvotes-${i}`} className="py-4.5 px-4 text-slate-700 text-xs">-</td>
                        ))}
                      </tr>

                      {/* Traffic / Visits */}
                      <tr>
                        <td className="py-4.5 font-bold text-xs text-slate-400 uppercase tracking-widest">Core Views</td>
                        {comparedTools.map(tool => (
                          <td key={`visits-${tool.id}`} className="py-4.5 px-4">
                            <div className="text-xs font-mono font-medium text-slate-300">
                              {tool.visitCount || 0} VISITS
                            </div>
                          </td>
                        ))}
                        {Array.from({ length: Math.max(0, 3 - comparedTools.length) }).map((_, i) => (
                          <td key={`empty-visits-${i}`} className="py-4.5 px-4 text-slate-700 text-xs">-</td>
                        ))}
                      </tr>

                      {/* Rating */}
                      <tr>
                        <td className="py-4.5 font-bold text-xs text-slate-400 uppercase tracking-widest">Rating</td>
                        {comparedTools.map(tool => (
                          <td key={`rating-${tool.id}`} className="py-4.5 px-4">
                            <div className="flex items-center gap-1">
                              <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                              <span className="text-xs font-extrabold text-white">{tool.averageRating ? tool.averageRating.toFixed(1) : "N/A"}</span>
                              <span className="text-[10px] text-slate-500">({tool.totalRatingsCount || 0})</span>
                            </div>
                          </td>
                        ))}
                        {Array.from({ length: Math.max(0, 3 - comparedTools.length) }).map((_, i) => (
                          <td key={`empty-rating-${i}`} className="py-4.5 px-4 text-slate-700 text-xs">-</td>
                        ))}
                      </tr>

                      {/* APK availability */}
                      <tr>
                        <td className="py-4.5 font-bold text-xs text-slate-400 uppercase tracking-widest">Direct APK</td>
                        {comparedTools.map(tool => (
                          <td key={`apk-${tool.id}`} className="py-4.5 px-4">
                            {tool.apk ? (
                              <span className="text-[10px] font-black uppercase text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-md">Yes</span>
                            ) : (
                              <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-800/40 border border-white/5 px-2 py-0.5 rounded-md">No</span>
                            )}
                          </td>
                        ))}
                        {Array.from({ length: Math.max(0, 3 - comparedTools.length) }).map((_, i) => (
                          <td key={`empty-apk-${i}`} className="py-4.5 px-4 text-slate-700 text-xs">-</td>
                        ))}
                      </tr>

                      {/* Description */}
                      <tr>
                        <td className="py-4.5 font-bold text-xs text-slate-400 uppercase tracking-widest">Overview</td>
                        {comparedTools.map(tool => (
                          <td key={`desc-${tool.id}`} className="py-4.5 px-4">
                            <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 max-w-[220px]">
                              {tool.desc}
                            </p>
                          </td>
                        ))}
                        {Array.from({ length: Math.max(0, 3 - comparedTools.length) }).map((_, i) => (
                          <td key={`empty-desc-${i}`} className="py-4.5 px-4 text-slate-700 text-xs">-</td>
                        ))}
                      </tr>

                      {/* Action columns */}
                      <tr>
                        <td className="py-6 font-bold text-xs text-slate-400 uppercase tracking-widest">Action Matrix</td>
                        {comparedTools.map(tool => (
                          <td key={`action-${tool.id}`} className="py-6 px-4">
                            <div className="flex flex-col gap-2">
                              <a
                                href={tool.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all"
                              >
                                <span>Launch</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => {
                                  setSelectedTool(tool);
                                  setShowComparisonModal(false);
                                }}
                                className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg font-bold text-[10px] uppercase tracking-widest border border-slate-750 flex items-center justify-center gap-1 transition-all"
                              >
                                View Details
                              </button>
                              <button
                                onClick={() => toggleCompareTool(tool)}
                                className="text-[10px] font-bold text-red-400 hover:text-red-500 transition-colors uppercase tracking-widest text-center mt-1 cursor-pointer bg-transparent border-none outline-none"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        ))}
                        {Array.from({ length: Math.max(0, 3 - comparedTools.length) }).map((_, i) => (
                          <td key={`empty-action-${i}`} className="py-6 px-4 text-slate-700 text-xs">-</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 py-5 border-t border-white/5 bg-slate-950/40 flex justify-end gap-3">
                <button
                  onClick={() => setShowComparisonModal(false)}
                  className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-widest border border-slate-700 transition-all cursor-pointer"
                >
                  Close Matrix
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 ${
              toast.type === 'success' 
              ? 'bg-blue-600/90 border-blue-400 text-white' 
              : 'bg-red-600/90 border-red-400 text-white'
            }`}
          >
            {toast.type === 'success' ? <Zap className="w-5 h-5 fill-current" /> : <AlertTriangle className="w-5 h-5" />}
            <span className="font-black text-xs uppercase tracking-widest">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Spinning Galaxy */}
      <AnimatePresence>
        {showSpinningGalaxy && (
          <motion.div
            initial={{ opacity: 0, scale: 0.1, rotate: 0 }}
            animate={{ opacity: 0.75, scale: 1.5, rotate: 360 }}
            exit={{ opacity: 0, scale: 2.2, rotate: 720 }}
            transition={{ duration: 3, ease: "easeInOut" }}
            className="pointer-events-none fixed inset-0 z-[5] flex items-center justify-center overflow-hidden bg-slate-950/20"
          >
            {/* Elegant spinning galaxy spiral disk */}
            <div className="relative w-[700px] h-[700px] rounded-full filter blur-[1px]">
              {/* Brilliant Star Core */}
              <div className="absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-gradient-to-r from-yellow-200 via-amber-300 to-orange-500 blur-2xl animate-pulse" />
              
              {/* Spiral Arm 1 */}
              <div className="absolute inset-0 bg-gradient-to-tr from-purple-600 via-pink-500 to-transparent rounded-full opacity-50 mix-blend-screen scale-100 transform rotate-12" />
              {/* Spiral Arm 2 */}
              <div className="absolute inset-0 bg-gradient-to-bl from-blue-600 via-indigo-500 to-transparent rounded-full opacity-50 mix-blend-screen scale-90 transform -rotate-45" />
              {/* Spiral Arm 3 */}
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-rose-500 to-transparent rounded-full opacity-40 mix-blend-screen scale-110 transform rotate-90" />
              
              {/* Star particles */}
              <div className="absolute top-1/4 left-1/4 w-2 h-2 rounded-full bg-white shadow-[0_0_12px_#fff] animate-ping" />
              <div className="absolute bottom-1/4 right-1/4 w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_15px_#60a5fa] animate-ping [animation-delay:0.4s]" />
              <div className="absolute top-1/3 right-1/3 w-2 h-2 rounded-full bg-purple-300 shadow-[0_0_10px_#c084fc] animate-ping [animation-delay:0.8s]" />
              <div className="absolute bottom-1/3 left-1/3 w-2.5 h-2.5 rounded-full bg-pink-400 shadow-[0_0_12px_#f472b6] animate-ping [animation-delay:1.2s]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
