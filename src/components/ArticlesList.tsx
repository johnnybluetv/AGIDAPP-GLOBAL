import * as React from "react";
import { collection, query, orderBy, onSnapshot, doc, getDoc, updateDoc, setDoc, deleteDoc, serverTimestamp, increment as firestoreIncrement } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { Article, UserRole } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, X, Clock, User, ChevronRight, BookOpenCheck, Info, Eye, Heart, Share2, Twitter, Linkedin, Facebook, Check, Globe, Copy, MessageSquare, AlertCircle } from "lucide-react";
import Markdown from "react-markdown";
import { Helmet } from "react-helmet-async";
import CommentSection from "./CommentSection";
import { useAuth } from "../context/AuthContext";
import ShareModal from "./ShareModal";
import AdSenseUnit from "./AdSenseUnit";

interface ArticlesListProps {
  onClose: () => void;
  currentUserRole: UserRole;
  initialArticleId?: string | null;
}

export default function ArticlesList({ onClose, currentUserRole, initialArticleId }: ArticlesListProps) {
  const { user } = useAuth();
  const [articles, setArticles] = React.useState<Article[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedArticle, setSelectedArticle] = React.useState<Article | null>(null);
  const [mobileView, setMobileView] = React.useState<'list' | 'content'>('list');
  const [likedArticles, setLikedArticles] = React.useState<string[]>([]);
  const [copied, setCopied] = React.useState<string | null>(null);

  // ShareModal State
  const [shareModalConfig, setShareModalConfig] = React.useState<{
    isOpen: boolean;
    url: string;
    title: string;
    text?: string;
    image?: string;
  }>({
    isOpen: false,
    url: "",
    title: "",
    text: "",
    image: "",
  });

  const handleOpenShareModal = (article: Article, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    const shareUrl = `${window.location.origin}?articleId=${article.id}`;
    setShareModalConfig({
      isOpen: true,
      url: shareUrl,
      title: article.title,
      text: `Read "${article.title}" by ${article.authorName} on Agidapp Global Knowledge!`,
      image: article.mediaUrl || "",
    });
  };

  const getReadTime = (content: string) => {
    const wordsPerMinute = 225;
    const words = content.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min read`;
  };

  const handleToggleLike = async (articleId: string) => {
    if (!user) {
      alert("Please sign in or register to upvote articles.");
      return;
    }
    const isLiked = likedArticles.includes(articleId);
    try {
      const userLikeRef = doc(db, "users", user.uid, "liked_articles", articleId);
      const articleRef = doc(db, "articles", articleId);
      
      if (isLiked) {
        await deleteDoc(userLikeRef);
        await updateDoc(articleRef, {
          likesCount: firestoreIncrement(-1)
        });
      } else {
        await setDoc(userLikeRef, {
          articleId,
          likedAt: serverTimestamp()
        });
        await updateDoc(articleRef, {
          likesCount: firestoreIncrement(1)
        });
      }
    } catch (e) {
      console.error("Failed to toggle upvote/like:", e);
    }
  };

  // Sync user's liked articles
  React.useEffect(() => {
    if (!user) {
      setLikedArticles([]);
      return;
    }
    const likedRef = collection(db, "users", user.uid, "liked_articles");
    const unsubscribe = onSnapshot(likedRef, (snapshot) => {
      setLikedArticles(snapshot.docs.map(doc => doc.id));
    }, (error) => {
      console.error("Error loading user likes:", error);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSelectArticle = async (article: Article) => {
    setSelectedArticle(article);
    setMobileView('content');
    // Update view count in background
    try {
      const artRef = doc(db, "articles", article.id);
      await updateDoc(artRef, {
        views: firestoreIncrement(1)
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `articles/${article.id}`);
    }
  };

  // Load initial offline articles on mount instantly
  React.useEffect(() => {
    try {
      const cached = localStorage.getItem("offline_articles");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`[Offline Support] Loaded ${parsed.length} articles from offline cache.`);
          setArticles(parsed);
          setLoading(false);
          if (initialArticleId) {
            const art = parsed.find(a => a.id === initialArticleId);
            if (art) {
              setSelectedArticle(art);
              setMobileView('content');
            }
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load initial offline articles:", e);
    }
  }, [initialArticleId]);

  React.useEffect(() => {
    const q = query(collection(db, "articles"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const artData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Article));
      setArticles(artData);
      setLoading(false);

      // Cache articles
      try {
        localStorage.setItem("offline_articles", JSON.stringify(artData));
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: "CACHE_DATA",
            key: "articles",
            data: artData
          });
        }
      } catch (cacheErr) {
        console.warn("Failed to update articles cache:", cacheErr);
      }

      if (initialArticleId) {
        const art = artData.find(a => a.id === initialArticleId);
        if (art) {
          setSelectedArticle(art);
          setMobileView('content');
        }
      }
    }, (error) => {
      console.error("[Firestore Articles] Failed to fetch articles, attempting fallback:", error);
      setLoading(false);
      try {
        const cached = localStorage.getItem("offline_articles");
        if (cached) {
          setArticles(JSON.parse(cached));
        }
      } catch (e) {
        console.warn("Offline articles fallback failed:", e);
      }
    });
    return () => unsubscribe();
  }, [initialArticleId]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-3xl overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-5xl h-[90vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            {mobileView === 'content' && selectedArticle && (
              <button 
                onClick={() => setMobileView('list')}
                className="md:hidden p-2 bg-slate-800 text-slate-400 rounded-lg hover:text-white"
              >
                <X className="w-5 h-5 rotate-90" />
              </button>
            )}
            <div className="p-2 bg-green-500/10 rounded-xl border border-green-500/20 shadow-inner">
              <BookOpenCheck className="w-5 h-5 sm:w-6 h-6 text-green-400" />
            </div>
            <div className="overflow-hidden">
              <h2 className="text-lg sm:text-2xl font-black text-white uppercase tracking-tight truncate">AGI Tools Knowledge</h2>
              <p className="text-[8px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2 truncate">
                <Info className="w-3 h-3 text-blue-400" />
                Latest insights and tutorials
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 sm:p-3 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl sm:rounded-2xl transition-all border border-transparent hover:border-slate-700"
          >
            <X className="w-5 h-5 sm:w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* List Sidebar */}
          <div className={`${mobileView === 'content' ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-slate-800 flex-col bg-slate-950/30`}>
            <div className="p-4 bg-slate-900/20 border-b border-slate-800">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Recent Publications</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-4 bg-slate-900/50 rounded-xl animate-pulse space-y-2">
                    <div className="h-4 bg-slate-800 rounded w-3/4" />
                    <div className="h-3 bg-slate-800 rounded w-1/2" />
                  </div>
                ))
              ) : articles.length === 0 ? (
                <div className="p-8 text-center text-slate-600 font-black uppercase text-xs tracking-widest italic opacity-50">
                  No articles available
                </div>
              ) : (
                articles.map(article => (
                  <button
                    key={article.id}
                    onClick={() => handleSelectArticle(article)}
                    className={`w-full text-left p-4 rounded-2xl transition-all group relative overflow-hidden ${
                      selectedArticle?.id === article.id 
                      ? 'bg-blue-600 shadow-lg shadow-blue-600/20 border border-blue-400/20' 
                      : 'bg-slate-900/30 border border-slate-800/50 hover:bg-slate-800/50 hover:border-slate-700'
                    }`}
                  >
                    <h3 className={`text-sm font-black leading-tight mb-2 ${selectedArticle?.id === article.id ? 'text-white' : 'text-slate-200 group-hover:text-blue-400'}`}>
                      {article.title}
                    </h3>
                    <div className="flex items-center justify-between">
                       <span className={`text-[9px] font-bold uppercase tracking-tighter ${selectedArticle?.id === article.id ? 'text-blue-100' : 'text-slate-500'}`}>
                        {article.authorName.split(' ')[0]}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => handleOpenShareModal(article, e)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            selectedArticle?.id === article.id 
                            ? 'bg-blue-700 hover:bg-blue-800 text-white border-blue-400/20' 
                            : 'bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-blue-400 border-slate-800/80'
                          }`}
                          title="Share Article"
                        >
                          <Share2 className="w-3 h-3" />
                        </motion.button>
                        <ChevronRight className={`w-3 h-3 transition-transform ${selectedArticle?.id === article.id ? 'text-white translate-x-1' : 'text-slate-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'}`} />
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className={`${mobileView === 'list' ? 'hidden md:block' : 'block'} flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-12 custom-scrollbar relative`}>
            <AnimatePresence mode="wait">
              {selectedArticle ? (
                <motion.article
                  key={selectedArticle.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-3xl mx-auto"
                >
                  <Helmet>
                    <title>{selectedArticle.title} | Agidapp Global Knowledge</title>
                    <meta name="description" content={selectedArticle.content.substring(0, 160)} />
                    <meta name="author" content={selectedArticle.authorName} />
                    <meta property="og:title" content={`${selectedArticle.title} | Agidapp Global Knowledge`} />
                    <meta property="og:description" content={selectedArticle.content.substring(0, 160)} />
                    <meta property="og:type" content="article" />
                    <meta property="og:site_name" content="Agidapp Global" />
                    <meta property="og:url" content={`https://www.agidappglobal.com/blog/${selectedArticle.id}`} />
                    <meta property="og:image" content={selectedArticle.mediaUrl || "https://www.agidappglobal.com/logo.png"} />
                    <meta name="twitter:card" content="summary_large_image" />
                    <meta name="twitter:title" content={`${selectedArticle.title} | Agidapp Global Knowledge`} />
                    <meta name="twitter:description" content={selectedArticle.content.substring(0, 160)} />
                    <meta name="twitter:image" content={selectedArticle.mediaUrl || "https://www.agidappglobal.com/logo.png"} />
                    <meta name="robots" content="index, follow" />
                    <link rel="canonical" href={`https://www.agidappglobal.com/blog/${selectedArticle.id}`} />
                    <script type="application/ld+json">
                      {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "BlogPosting",
                        "headline": selectedArticle.title,
                        "description": selectedArticle.content.substring(0, 160),
                        "author": {
                          "@type": "Person",
                          "name": selectedArticle.authorName
                        },
                        "datePublished": selectedArticle.createdAt?.toDate().toISOString(),
                        "mainEntityOfPage": {
                          "@type": "WebPage",
                          "@id": `https://www.agidappglobal.com/blog/${selectedArticle.id}`
                        }
                      })}
                    </script>
                  </Helmet>
                  <div className="mb-10 pb-10 border-b border-slate-800">
                    <div className="flex items-center gap-3 mb-6">
                      {selectedArticle.authorRole !== 'User' && (
                        <span className="bg-blue-500/10 text-blue-400 text-[9px] font-black uppercase px-2 py-0.5 rounded border border-blue-500/20 tracking-widest">
                          {selectedArticle.authorRole} Verified
                        </span>
                      )}
                      <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                        <Clock className="w-3 h-3" />
                        {selectedArticle.createdAt?.toDate().toLocaleDateString()}
                        <span className="text-slate-700 mx-1">•</span>
                        <span>{getReadTime(selectedArticle.content)}</span>
                      </div>
                      {['Admin', 'Manager', 'Editor'].includes(currentUserRole) && (
                        <div className="flex items-center gap-2 text-blue-400 text-[10px] font-bold uppercase tracking-widest bg-blue-400/5 px-2 py-1 rounded-lg border border-blue-400/10">
                          <Eye className="w-3 h-3" />
                          {selectedArticle.views || 0} Analytics Views
                        </div>
                      )}
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black text-white mb-8 leading-[1.1] tracking-tight">
                      {selectedArticle.title}
                    </h1>
                    <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                      <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700 shadow-inner">
                        {selectedArticle.authorPhoto ? (
                             <img src={selectedArticle.authorPhoto} alt="" className="w-full h-full object-cover" />
                        ) : (
                             <User className="w-6 h-6 text-slate-600" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-black text-white">{selectedArticle.authorName}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{selectedArticle.authorRole}</div>
                      </div>
                    </div>

                    {/* Social Media Sharing and Upvote/Like Action Panel */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 mt-6 bg-slate-900/40 rounded-2xl border border-slate-800/80">
                      {/* Left: Like/Upvote and Views */}
                      <div className="flex items-center gap-3">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleToggleLike(selectedArticle.id)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                            likedArticles.includes(selectedArticle.id)
                              ? "bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-lg shadow-rose-500/10"
                              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/30"
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${likedArticles.includes(selectedArticle.id) ? "fill-rose-400 text-rose-400" : ""}`} />
                          <span>{selectedArticle.likesCount || 0} Upvotes</span>
                        </motion.button>

                        <div className="flex items-center gap-2 text-slate-500 text-[9px] font-bold uppercase tracking-widest bg-slate-950 px-3 py-2.5 rounded-xl border border-slate-800">
                          <Eye className="w-3.5 h-3.5 text-blue-400" />
                          <span>{selectedArticle.views || 0} Views</span>
                        </div>
                      </div>

                      {/* Right: Consolidated Unified Social Share button */}
                      <div className="flex items-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(59, 130, 246, 0.3)" }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleOpenShareModal(selectedArticle)}
                          className="flex items-center gap-2 px-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all border border-blue-500/30 cursor-pointer shadow-lg shadow-blue-500/10"
                        >
                          <Share2 className="w-4 h-4" />
                          <span>Share Article</span>
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* Media Content */}
                  {(selectedArticle.mediaUrl || selectedArticle.videoEmbedUrl) && (
                    <div className="mb-12 space-y-6">
                      {selectedArticle.mediaUrl && selectedArticle.mediaType === 'image' && (
                        <div className="rounded-3xl overflow-hidden border border-slate-800 bg-slate-900/50 shadow-2xl">
                          <img 
                            src={selectedArticle.mediaUrl} 
                            alt={selectedArticle.title} 
                            className="w-full h-auto object-cover"
                          />
                        </div>
                      )}
                      {selectedArticle.mediaUrl && selectedArticle.mediaType === 'video' && (
                        <div className="rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl">
                          <video 
                            src={selectedArticle.mediaUrl} 
                            controls 
                            className="w-full aspect-video outline-none"
                          />
                        </div>
                      )}
                      {selectedArticle.videoEmbedUrl && (
                        <div className="rounded-3xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl aspect-video relative">
                          <iframe
                            src={selectedArticle.videoEmbedUrl}
                            className="absolute inset-0 w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title="Embedded Video"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="prose prose-invert prose-blue max-w-none prose-headings:font-black prose-p:text-slate-300 prose-p:text-lg prose-p:leading-relaxed prose-strong:text-white prose-code:text-blue-400">
                    <div className="markdown-body">
                        <Markdown>{selectedArticle.content}</Markdown>
                    </div>
                  </div>

                  {/* Native Article AdSense Placement for Approval */}
                  <AdSenseUnit slot="5829104839" format="auto" className="my-10 border-slate-800/50 bg-slate-900/20" />

                  <div className="mt-20 pt-10 border-t border-slate-800">
                    <CommentSection id={selectedArticle.id} type="article" isAdmin={currentUserRole !== "User"} authorId={selectedArticle.authorId} />
                  </div>
                </motion.article>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 space-y-6 opacity-30">
                  <div className="w-24 h-24 bg-slate-900 rounded-3xl border border-slate-800 flex items-center justify-center shadow-2xl">
                    <BookOpen className="w-12 h-12 text-slate-700" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Select an article</h2>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">To begin reading our curated knowledge base</p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Unified Share Modal */}
      <ShareModal
        isOpen={shareModalConfig.isOpen}
        onClose={() => setShareModalConfig(prev => ({ ...prev, isOpen: false }))}
        url={shareModalConfig.url}
        title={shareModalConfig.title}
        text={shareModalConfig.text}
        image={shareModalConfig.image}
      />
    </div>
  );
}
