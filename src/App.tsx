import * as React from "react";
import { onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import { AiTool, CATEGORIES, Category, UserRole } from "./types";
import { Search, Filter, Menu, X, Rocket, Zap, Database, ExternalLink, Plus, ArrowUp, Edit, Trash2, Share2, Info, ThumbsUp, Globe, LogIn, LogOut, Heart, User as UserIcon, MessageSquare, Shield, AlertTriangle, ChevronRight, BookOpen, Star, Users, BarChart, Cloud } from "lucide-react";
import { motion, AnimatePresence, useScroll, useSpring } from "motion/react";
import ToolCard from "./components/ToolCard";
import SkeletonCard from "./components/SkeletonCard";
import SubmitForm from "./components/SubmitForm";
import UserProfile from "./components/UserProfile";
import AdminPortal from "./components/AdminPortal";
import CommentSection from "./components/CommentSection";
import RelatedTools from "./components/RelatedTools";
import ArticleSubmitForm from "./components/ArticleSubmitForm";
import ArticlesList from "./components/ArticlesList";
import Onboarding from "./components/Onboarding";
import LogoSnowfall from "./components/LogoSnowfall";
import UserWaterfall from "./components/UserWaterfall";
import StatsDashboard from "./components/StatsDashboard";
import VoiceSearch from "./components/VoiceSearch";
import DriveDashboard from "./components/DriveDashboard";
import BlazingFire from "./components/BlazingFire";
import { deleteDoc, doc, updateDoc, setDoc, increment, addDoc, serverTimestamp, getDoc } from "firebase/firestore";
import { useAuth } from "./context/AuthContext";
import { Helmet } from "react-helmet-async";
import Fuse from "fuse.js";

export default function App() {
  const { user, login } = useAuth();
  const [tools, setTools] = React.useState<AiTool[]>([]);
  const [favorites, setFavorites] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState<Category | "All">("All");
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
  const [showWaterfallMobile, setShowWaterfallMobile] = React.useState(false);
  const [showInsights, setShowInsights] = React.useState(false);
  const [showDrive, setShowDrive] = React.useState(false);

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

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Real-time synchronization
  React.useEffect(() => {
    const q = query(collection(db, "ai_tools"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const toolsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AiTool[];
        setTools(toolsData);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "ai_tools");
      }
    );

    return () => unsubscribe();
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

    const favRef = collection(db, "users", user.uid, "favorites");
    const unsubscribe = onSnapshot(favRef, (snapshot) => {
      const favIds = snapshot.docs.map(doc => doc.id);
      setFavorites(favIds);
    });

    return () => unsubscribe();
  }, [user]);

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

    const adminRef = doc(db, "admins", btoa(user.email?.toLowerCase() || ""));
    const unsubscribe = onSnapshot(adminRef, (snapshot) => {
      if (snapshot.exists()) {
        setUserRole(snapshot.data().role as UserRole);
      } else {
        setUserRole("User");
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Update user profile in Firestore
  React.useEffect(() => {
    if (user) {
      const userRef = doc(db, "users", user.uid);
      setDoc(userRef, {
        displayName: user.displayName,
        photoURL: user.photoURL,
        email: user.email,
        lastSeen: serverTimestamp()
      }, { merge: true });
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
    const defaultTitle = "AGID - Artificial General Intelligence Directory";
    const defaultDesc = "Explore AGID, the most comprehensive AI tool directory. Discover LLMs, developer tools, creative AI, and more.";

    if (selectedTool) {
      document.title = `${selectedTool.name} - AI Registry | AGID`;
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute("content", `Explore ${selectedTool.name}: ${selectedTool.desc}. Join the AGID directory to discover the latest in AI.`);
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
      await updateDoc(toolRef, editFormData);
      setIsEditing(false);
      setSelectedTool(prev => prev ? { ...prev, ...editFormData } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `ai_tools/${selectedTool.id}`);
    }
  };

  const handleShareTool = async (tool: AiTool) => {
    const shareUrl = `${window.location.origin}/share/${tool.id}`;
    const shareData = {
      title: `${tool.name} | AGID`,
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
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedSuggestionIndex(prev => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter" && focusedSuggestionIndex >= 0) {
      e.preventDefault();
      const tool = suggestions[focusedSuggestionIndex];
      setSearchQuery(tool.name);
      setShowSuggestions(false);
      setSelectedTool(tool);
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
      isMobile: q.includes("mobile") || q.includes("phone") || q.includes("app"),
      isDev: q.includes("dev") || q.includes("api") || q.includes("sdk"),
      isArt: q.includes("art") || q.includes("image") || q.includes("draw"),
    };

    return intents;
  }, [searchQuery]);

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

      return matchesCategory && matchesType && matchesFavorites && matchesTags && matchesNL && matchesPricing;
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
  }, [tools, searchQuery, selectedCategory, selectedType, showFavoritesOnly, favorites, sortBy, activeTags, fuse, interpretedQuery]);

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

  const handleAuthAction = async (mode: 'signin' | 'signup') => {
    try {
      const isNew = mode === 'signup';
      const result = await login();
      
      if (result && isNew) {
        // Send notification to admin
        await addDoc(collection(db, "notifications"), {
          type: "new_signup",
          message: `New user signed up: ${result.user.email}`,
          userId: result.user.uid,
          userEmail: result.user.email,
          timestamp: serverTimestamp(),
          read: false
        });
        setToast({ message: "Welcome! Signup successful.", type: 'success' });
      } else if (result) {
        setToast({ message: "Welcome back!", type: 'success' });
      }
      setAuthMode(null);
    } catch (e) {
      console.error("Auth failed", e);
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
        <title>AGID | Artificial General Intelligence Directory</title>
        <meta name="description" content="Discover the world's most comprehensive directory of AI tools, mobile APKs, and LLM platforms. Join the largest community of AI enthusiasts." />
        <link rel="canonical" href={window.location.origin} />
        {selectedTool && (
          <>
            <title>{selectedTool.name} - AI Tool Preview | AGID</title>
            <meta name="description" content={selectedTool.desc} />
            <meta property="og:title" content={`${selectedTool.name} - Discover on AGID`} />
            <meta property="og:description" content={selectedTool.desc} />
            <link rel="canonical" href={`${window.location.origin}/share/${selectedTool.id}`} />
          </>
        )}
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
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="px-3 py-1 bg-blue-600 rounded-lg text-white font-black tracking-tighter text-2xl shadow-lg shadow-blue-600/20">
                AGID
              </div>
              <div className="relative">
                <button 
                  onClick={() => setShowScreenModeMenu(!showScreenModeMenu)}
                  className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 transition-all shadow-xl group"
                  title="Choose a Screen Type"
                >
                  <span className="text-lg">🌈</span>
                </button>
                <div className="absolute top-full left-0 mt-2 pointer-events-none">
                  <p className="text-[7px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap bg-slate-950/80 px-1 rounded">
                    Choose a Screen Type
                  </p>
                </div>

                <AnimatePresence>
                  {showScreenModeMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute left-0 top-full mt-3 p-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-[100] min-w-[160px] grid grid-cols-1 gap-1"
                    >
                      {Object.keys(screenConfigs).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => {
                            setScreenMode(mode as any);
                            setShowScreenModeMenu(false);
                          }}
                          className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest text-left rounded-xl transition-all ${
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
            </div>
            <div className="hidden md:block">
              <h1 className="text-sm font-bold text-slate-100 uppercase tracking-widest">Artificial General Intelligence Directory</h1>
              <p className="text-[10px] text-slate-500 font-mono">LIVE_DATABASE_SYNC: ACTIVE</p>
            </div>
          </div>

            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-1.5 sm:gap-2 relative">
                  {/* Article Trigger Button */}
                  <div className="relative group flex flex-col items-center">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowArticlesList(true)}
                      className="mb-1 bg-white text-blue-600 text-[8px] font-black uppercase px-3 py-1 rounded shadow-lg border border-blue-400/30 transition-all hover:scale-105"
                    >
                      SEE BLOGS
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setIsArticleMenuOpen(!isArticleMenuOpen)}
                      className={`p-2 sm:p-2.5 rounded-xl border transition-all shadow-lg ${
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
                            className="whitespace-nowrap px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-green-600/20 border border-green-400/20 flex items-center justify-center gap-2"
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
                            className="whitespace-nowrap px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-amber-500/20 border border-amber-400/20 flex items-center justify-center gap-2"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Post Something
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="flex flex-col items-center -mb-1 relative z-10">
                      {userRole !== "User" && (
                        <button 
                          onClick={() => setShowAdminPortal(true)}
                          className="bg-blue-600 hover:bg-blue-500 text-white text-[7px] font-black uppercase px-2 py-0.5 rounded shadow-lg border border-blue-400/30 transition-all hover:scale-105 flex items-center gap-1"
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
                      className="flex items-center gap-2 sm:gap-3 p-1 pr-2 sm:pr-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-2xl transition-all group"
                    >
                      <img 
                        src={user.photoURL || null} 
                        alt={user.displayName || ""} 
                        className="w-8 h-8 sm:w-10 h-10 rounded-xl border border-slate-800 shadow-xl group-hover:scale-95 transition-transform"
                      />
                      <div className="text-left hidden xs:block">
                        <p className="text-[10px] font-black text-white leading-none uppercase tracking-tighter">Profile</p>
                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{user.displayName?.split(' ')[0]}</p>
                      </div>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setAuthMode('signin')}
                    className="hidden xs:flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs border border-slate-800 transition-all shadow-xl group"
                  >
                    <LogIn className="w-4 h-4 text-blue-500 group-hover:translate-x-1 transition-transform" />
                    Sign In
                  </button>
                  <button 
                    onClick={() => setAuthMode('signup')}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs transition-all shadow-xl"
                  >
                    <Plus className="w-4 h-4" />
                    Sign Up
                  </button>
                </div>
              )}

            <button 
              onClick={handleExpandDirectory}
              disabled={isScraping}
              className={`hidden lg:flex items-center gap-2 px-5 py-2.5 transition-all text-sm font-bold border rounded-xl shadow-lg ring-1 ${
                isScraping 
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/30 ring-blue-500/20 cursor-wait' 
                : 'bg-slate-900 text-slate-100 border-slate-800 ring-slate-700/10 hover:bg-slate-800 hover:border-slate-700'
              }`}
            >
              <Zap className={`w-4 h-4 ${isScraping ? 'animate-pulse text-blue-400' : 'text-blue-500'}`} />
              {isScraping ? 'INDEXING_CORE_MODELS...' : 'Index Popular AIs'}
            </button>
            <motion.a 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href="#submit-section"
              className="px-3 sm:px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl font-bold text-[10px] sm:text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center gap-2 border border-blue-400/20"
            >
              <Plus className="w-4 h-4 sm:w-5 h-5" />
              <span>Contribute</span>
            </motion.a>
          </div>
        </div>
      </header>

      {/* Auth Selection Modals */}
      <AnimatePresence>
        {authMode && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAuthMode(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center overflow-hidden"
            >
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600" />
              
              <div className="mb-6 inline-flex p-4 bg-blue-600/10 rounded-2xl text-blue-500">
                {authMode === 'signup' ? <Plus className="w-8 h-8" /> : <LogIn className="w-8 h-8" />}
              </div>

              <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
                {authMode === 'signup' ? 'Signup for first timers' : 'Welcome back / Sign in'}
              </h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8">
                {authMode === 'signup' 
                  ? 'Create your professional account to unlock all features' 
                  : 'Return users sign in below to access your favorites and profile'}
              </p>

              <button 
                onClick={() => handleAuthAction(authMode)}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3"
              >
                <div className="w-5 h-5 bg-white/10 rounded flex items-center justify-center">
                   <img src="https://www.google.com/s2/favicons?domain=google.com&sz=64" alt="" className="w-3 h-3" />
                </div>
                Continue with Google
              </button>

              <p className="mt-6 text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                By continuing, you agree to our <span className="text-slate-400">Terms of Service</span>
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

              <span className="px-4 py-1.5 bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-widest rounded-full border border-blue-500/20 mb-6 inline-block">
                The Definitive AI Roadmap
              </span>
              <h2 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tight">
                Discover the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Infinite</span> <br/> AI Landscape.
              </h2>
              <p className="max-w-2xl mx-auto text-lg text-slate-400 mb-12">
                AGID is the world's most comprehensive catalog for artificial intelligence. From LLMs to edge-computing APKs, explore tools that shape the future.
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
              <div 
                role="search"
                aria-label="Find AI tools"
                className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 p-3 rounded-3xl flex flex-col lg:flex-row gap-2 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] relative"
              >
                <div className="flex-1 relative group/search">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" aria-hidden="true" />
                  
                  {/* Natural Language Intent Indicators */}
                  <AnimatePresence>
                    {interpretedQuery && Object.values(interpretedQuery).some(v => v) && (
                      <motion.div 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="absolute left-14 top-2 flex gap-1 pointer-events-none z-20"
                      >
                        {interpretedQuery.isFree && <span className="text-[7px] font-black uppercase bg-green-500/10 text-green-400 px-1 rounded border border-green-500/20">Free</span>}
                        {interpretedQuery.isMobile && <span className="text-[7px] font-black uppercase bg-blue-500/10 text-blue-400 px-1 rounded border border-blue-500/20">Mobile</span>}
                        {interpretedQuery.isDev && <span className="text-[7px] font-black uppercase bg-amber-500/10 text-amber-400 px-1 rounded border border-amber-500/20">Developer</span>}
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
                        <div className="absolute left-14 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none font-medium whitespace-pre">
                          <span className="opacity-0">{searchQuery}</span>
                          <span className="opacity-40">{completion.substring(searchQuery.length)}</span>
                          <span className="ml-2 text-[8px] bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded border border-slate-700 font-black uppercase tracking-tighter shadow-sm animate-pulse">Tab to Complete</span>
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
                  placeholder="Ask for ChatGPT, Midjourney, or SDKs..."
                  className="w-full bg-transparent border-none px-14 py-4 text-white focus:outline-none placeholder:text-slate-500 font-medium relative z-10"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onFocus={() => searchQuery.length > 0 && setShowSuggestions(true)}
                />

                {/* Search Footer Tips */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-3 z-20">
                  <VoiceSearch onResult={(text) => handleSearchChange(text)} />
                  <div className="flex gap-1">
                    <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[9px] text-slate-400 font-mono">#</kbd>
                    <span className="text-[9px] text-slate-500 font-black uppercase tracking-tighter">to search tags</span>
                  </div>
                </div>

                {/* Suggestions Dropdown */}
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                      id="search-suggestions"
                      role="listbox"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-3 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-[60] overflow-hidden max-h-[480px] overflow-y-auto custom-scrollbar"
                    >
                      <div className="p-3 border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400 px-6 flex justify-between items-center bg-slate-950/50">
                        <span>Top Results</span>
                        <span>{suggestions.length} Found</span>
                      </div>
                      {suggestions.map((tool, idx) => (
                        <button
                          key={tool.id}
                          role="option"
                          aria-selected={idx === focusedSuggestionIndex}
                          onClick={() => {
                            setSearchQuery(tool.name);
                            setShowSuggestions(false);
                            setSelectedTool(tool);
                          }}
                          className={`w-full px-6 py-4 flex items-center justify-between transition-all border-b border-white/5 last:border-none group ${
                            idx === focusedSuggestionIndex ? 'bg-blue-600/20' : 'hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-4 text-left">
                            <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center p-1.5 border border-white/10 shadow-inner group-hover:bg-white/10 transition-colors">
                              <img 
                                src={`https://www.google.com/s2/favicons?domain=${new URL(tool.url).hostname}&sz=64`} 
                                alt=""
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="flex flex-col">
                              <p className="font-black text-white leading-tight group-hover:text-blue-400 transition-colors uppercase tracking-tight">{tool.name}</p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <span className="text-[10px] text-blue-400 font-mono font-bold uppercase tracking-tighter bg-blue-400/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                                  <ThumbsUp className="w-2.5 h-2.5" />
                                  {tool.upvotes}
                                </span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{tool.category}</span>
                                <div className="w-1 h-1 rounded-full bg-slate-700" />
                                <span className="text-[9px] text-slate-500 font-medium uppercase tracking-widest">{tool.type}</span>
                              </div>
                            </div>
                          </div>
                          <div className={`flex items-center gap-3 transition-all ${idx === focusedSuggestionIndex ? 'text-blue-400 translate-x-0 opacity-100' : 'text-slate-500 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0'}`}>
                            <div className="flex items-center gap-1">
                              {tool.tags?.slice(0, 2).map(tag => (
                                <span key={tag} className="text-[8px] text-slate-600 border border-slate-800 px-1 rounded uppercase font-bold">#{tag}</span>
                              ))}
                            </div>
                            <ArrowUp className="w-4 h-4 rotate-45" />
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="h-px lg:h-10 lg:w-px bg-slate-800 self-center mx-1" aria-hidden="true" />
              
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                    className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all border ${
                      showAdvancedFilters 
                      ? 'bg-blue-600/10 text-blue-500 border-blue-500/30' 
                      : 'bg-slate-950/50 text-slate-400 border-white/5 hover:text-slate-200 hover:border-white/10'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    <span className="text-[10px] uppercase tracking-widest font-black">Filters</span>
                  </button>

                  <div className="flex items-center px-4 gap-3 bg-slate-950/50 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
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
                      className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all border ${
                        showFavoritesOnly 
                        ? 'bg-red-500/10 text-red-500 border-red-500/30' 
                        : 'bg-slate-950/50 text-slate-400 border-white/5 hover:text-slate-200 hover:border-white/10'
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
                    className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all border ${
                      showInsights 
                      ? 'bg-blue-600/10 text-blue-500 border-blue-500/30 shadow-lg shadow-blue-500/20' 
                      : 'bg-slate-950/50 text-slate-400 border-white/5 hover:text-slate-200 hover:border-white/10'
                    }`}
                  >
                    <BarChart className="w-5 h-5" />
                  </button>

                  <button 
                    onClick={() => {
                      setShowDrive(!showDrive);
                      if (!showDrive) {
                        setShowInsights(false);
                      }
                    }}
                    title={showDrive ? "Close Cloud Storage" : "Google Drive Cloud"}
                    className={`flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold transition-all border ${
                      showDrive 
                      ? 'bg-sky-500/10 text-sky-400 border-sky-500/30' 
                      : 'bg-slate-950/50 text-slate-400 border-white/5 hover:text-slate-200 hover:border-white/10'
                    }`}
                  >
                    <Cloud className="w-5 h-5" />
                  </button>
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
                    onView={() => setSelectedTool(tool)}
                    onEdit={() => handleEditTool(tool)}
                    onDelete={() => setToolToDelete(tool)}
                    onShare={() => handleShareTool(tool)}
                  />
                </div>
              ))}
            </div>
          </section>
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

          {!loading && (searchQuery || selectedCategory !== "All" || selectedType !== "All" || showFavoritesOnly) && (
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
                  {filteredTools.slice(0, displayCount).map((tool: AiTool) => (
                      <ToolCard 
                      key={tool.id} 
                      tool={tool} 
                      isFavorited={favorites.includes(tool.id)}
                      onView={() => setSelectedTool(tool)}
                      onEdit={() => handleEditTool(tool)}
                      onDelete={() => setToolToDelete(tool)}
                      onShare={() => handleShareTool(tool)}
                    />
                  ))}
                </AnimatePresence>
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

        {/* Submission Section */}
        <SubmitForm />
      </main>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-900 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 opacity-50">
             <div className="px-2 py-0.5 bg-white text-black font-black tracking-tighter text-sm rounded">
                AGID
              </div>
              <span className="text-xs font-mono">v1.2.0-STABLE</span>
          </div>
          <div className="text-slate-600 text-xs text-center md:text-right">
            &copy; 2026 Artificial General Intelligence Directory. <br/>
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
              <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-xl sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center overflow-hidden border border-white/10 shadow-inner">
                    <img 
                      src={`https://www.google.com/s2/favicons?domain=${new URL(selectedTool.url).hostname}&sz=64`}
                      alt=""
                      className="w-full h-full object-contain p-2"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white leading-none mb-1">{selectedTool.name}</h2>
                    <p className="text-xs text-blue-400 font-mono font-bold tracking-tighter uppercase">{selectedTool.category}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setSelectedTool(null); setIsEditing(false); }}
                  className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
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
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <Info className="w-4 h-4" /> About the Tool
                      </h4>
                      <p className="text-lg text-slate-300 leading-relaxed">
                        {selectedTool.desc}
                      </p>
                    </div>

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
                        onClick={() => handleShareTool(selectedTool)}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-750 transition-all"
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

                    <CommentSection id={selectedTool.id} type="tool" isAdmin={userRole !== "User"} />

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
          />
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
              <h3 className="text-2xl font-bold text-white mb-2">Delete `{toolToDelete.name}`?</h3>
              <p className="text-slate-400 mb-8">This action is permanent and will remove the tool from the global directory for all users.</p>
              
              <div className="flex w-full gap-4">
                <button 
                  onClick={() => setToolToDelete(null)}
                  className="flex-1 px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-750 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => handleDeleteTool(toolToDelete.id)}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-500 transition-all shadow-lg shadow-red-600/20"
                >
                  Delete
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

      <AnimatePresence>
        {showOnboarding && (
          <Onboarding onClose={completeOnboarding} />
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
        </div>
      </div>
    </div>
  );
}
