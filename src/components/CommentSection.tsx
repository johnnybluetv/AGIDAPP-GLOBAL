import * as React from "react";
import { collection, query, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, increment } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { Comment } from "../types";
import { Send, Trash2, MessageSquare, ThumbsUp, Reply, ChevronDown, ChevronUp, Clock, Flame, Pencil } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CommentSectionProps {
  id: string;
  type: 'tool' | 'article';
  isAdmin: boolean;
  authorId?: string;
}

type SortOption = "newest" | "popular";

export default function CommentSection({ id, type, isAdmin, authorId }: CommentSectionProps) {
  const { user, login } = useAuth();
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [newComment, setNewComment] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [sortBy, setSortBy] = React.useState<SortOption>("newest");
  const [replyingTo, setReplyingTo] = React.useState<Comment | null>(null);
  const [userLikes, setUserLikes] = React.useState<Set<string>>(new Set());
  const [editingCommentId, setEditingCommentId] = React.useState<string | null>(null);
  const [editingText, setEditingText] = React.useState("");

  const collectionPath = type === 'tool' ? "ai_tools" : "articles";

  // Load local likes to persist state across sessions (simple version)
  React.useEffect(() => {
    const savedLikes = localStorage.getItem(`likes_${user?.uid || 'guest'}`);
    if (savedLikes) {
      setUserLikes(new Set(JSON.parse(savedLikes)));
    }
  }, [user]);

  React.useEffect(() => {
    const q = query(
      collection(db, collectionPath, id, "comments")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Comment[];
      setComments(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `${collectionPath}/${id}/comments`);
    });

    return () => unsubscribe();
  }, [id, collectionPath]);

  const handleSubmit = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    if (!user) {
      login();
      return;
    }
    const text = parentId ? (e.currentTarget as any).replyText.value : newComment;
    if (!text?.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, collectionPath, id, "comments"), {
        parentId: parentId || null,
        userId: user.uid,
        userName: user.displayName || "Anonymous User",
        userPhoto: user.photoURL || "",
        text: text.trim(),
        likesCount: 0,
        createdAt: serverTimestamp()
      });
      if (parentId) {
        setReplyingTo(null);
      } else {
        setNewComment("");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${collectionPath}/${id}/comments`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await deleteDoc(doc(db, collectionPath, id, "comments", commentId));
      // Also delete children (simplified recursively)
      const children = comments.filter(c => c.parentId === commentId);
      for (const child of children) {
        await deleteDoc(doc(db, collectionPath, id, "comments", child.id));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionPath}/${id}/comments/${commentId}`);
    }
  };

  const handleLike = async (commentId: string) => {
    if (!user) {
      login();
      return;
    }
    const hasLiked = userLikes.has(commentId);

    try {
      await updateDoc(doc(db, collectionPath, id, "comments", commentId), {
        likesCount: increment(hasLiked ? -1 : 1)
      });
      const newLikes = new Set(userLikes);
      if (hasLiked) {
        newLikes.delete(commentId);
      } else {
        newLikes.add(commentId);
      }
      setUserLikes(newLikes);
      localStorage.setItem(`likes_${user.uid}`, JSON.stringify(Array.from(newLikes)));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${collectionPath}/${id}/comments/${commentId}`);
    }
  };

  const handleEditSave = async (commentId: string) => {
    if (!editingText.trim()) return;
    try {
      await updateDoc(doc(db, collectionPath, id, "comments", commentId), {
        text: editingText.trim()
      });
      setEditingCommentId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${collectionPath}/${id}/comments/${commentId}`);
    }
  };

  const organizedComments = React.useMemo(() => {
    const roots = comments.filter(c => !c.parentId);
    const sorted = [...roots].sort((a, b) => {
      if (sortBy === "popular") {
        return (b.likesCount || 0) - (a.likesCount || 0);
      }
      const timeA = a.createdAt?.toMillis?.() || 0;
      const timeB = b.createdAt?.toMillis?.() || 0;
      return timeB - timeA;
    });
    return sorted;
  }, [comments, sortBy]);

  const getReplies = (parentId: string) => {
    return comments
      .filter(c => c.parentId === parentId)
      .sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
  };

  const formatRelativeTime = (timestamp: any) => {
    if (!timestamp) return "Pending...";
    const date = timestamp.toMillis ? new Date(timestamp.toMillis()) : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const replies = getReplies(comment.id);
    const hasLiked = userLikes.has(comment.id);
    const isCurrentlyEditing = editingCommentId === comment.id;

    return (
      <div key={comment.id} className={`${isReply ? 'ml-12 mt-4' : 'mt-6'}`}>
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-4 group"
        >
          <img 
            src={comment.userPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.userId}`}
            alt=""
            className={`${isReply ? 'w-8 h-8' : 'w-10 h-10'} rounded-xl border border-slate-800 shadow-lg shrink-0`}
          />
          <div className="flex-1">
            <div className={`bg-slate-950/50 border border-slate-800 p-4 rounded-2xl rounded-tl-none group-hover:border-slate-700 transition-colors ${isReply ? 'bg-slate-900/30' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`${isReply ? 'text-[11px]' : 'text-xs'} font-black text-white uppercase tracking-tighter`}>
                    {comment.userName}
                  </span>
                  
                  {comment.userId === authorId && (
                    <span className="text-[8px] font-extrabold tracking-widest bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded uppercase leading-none">
                      {type === 'tool' ? 'Creator' : 'Author'}
                    </span>
                  )}
                  
                  <span className="text-[9px] text-slate-500 font-mono uppercase">
                    {formatRelativeTime(comment.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  {user?.uid === comment.userId && !isCurrentlyEditing && (
                    <button 
                      onClick={() => {
                        setEditingCommentId(comment.id);
                        setEditingText(comment.text);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-blue-400 transition-all cursor-pointer"
                      title="Edit comment"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {(user?.uid === comment.userId || isAdmin) && (
                    <button 
                      onClick={() => handleDelete(comment.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-red-400 transition-all cursor-pointer"
                      title="Delete comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {isCurrentlyEditing ? (
                <div className="mt-2 space-y-2">
                  <textarea
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-all text-sm resize-none h-20 placeholder:text-slate-700"
                    maxLength={500}
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setEditingCommentId(null)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditSave(comment.id)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <p className={`${isReply ? 'text-xs' : 'text-sm'} text-slate-300 leading-relaxed break-words whitespace-pre-wrap`}>
                  {comment.text}
                </p>
              )}
              
              <div className="mt-4 flex items-center gap-4">
                <button 
                  onClick={() => handleLike(comment.id)}
                  className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                    hasLiked ? 'text-blue-400' : 'text-slate-500 hover:text-blue-400'
                  }`}
                >
                  <ThumbsUp className={`w-3 h-3 ${hasLiked ? 'fill-current' : ''}`} />
                  {comment.likesCount || 0}
                </button>
                
                {!isReply && (
                  <button 
                    onClick={() => setReplyingTo(replyingTo?.id === comment.id ? null : comment)}
                    className="flex items-center gap-1.5 text-[10px] text-slate-500 hover:text-white font-black uppercase tracking-widest transition-all cursor-pointer"
                  >
                    <Reply className="w-3 h-3" />
                    Reply
                  </button>
                )}
              </div>
            </div>

            {replyingTo?.id === comment.id && !isReply && (
              <motion.form 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                onSubmit={(e) => handleSubmit(e, comment.id)}
                className="mt-4 relative"
              >
                <textarea
                  name="replyText"
                  placeholder={`Reply to ${comment.userName}...`}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all resize-none h-20 placeholder:text-slate-700 text-xs"
                  autoFocus
                />
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="absolute bottom-3 right-3 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:bg-slate-800 transition-all shadow-lg active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </motion.form>
            )}

            {/* Render nested replies */}
            <AnimatePresence>
              {replies.map(reply => renderComment(reply, true))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="mt-12 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-blue-500" />
          <h3 className="text-lg font-black text-white uppercase tracking-tight">Community Feedback</h3>
          <span className="text-xs font-mono text-slate-500">[{comments.length}]</span>
        </div>

        <div className="flex items-center bg-slate-900/50 p-1 rounded-xl border border-slate-800">
          <button 
            onClick={() => setSortBy("newest")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              sortBy === "newest" ? "bg-slate-800 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Clock className="w-3 h-3" />
            Newest
          </button>
          <button 
            onClick={() => setSortBy("popular")}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
              sortBy === "popular" ? "bg-slate-800 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Flame className="w-3 h-3" />
            Popular
          </button>
        </div>
      </div>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="relative">
        {!user && (
          <div className="absolute inset-0 z-10 bg-slate-950/60 backdrop-blur-[2px] rounded-2xl flex items-center justify-center">
            <button 
              type="button"
              onClick={login}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-xl hover:bg-blue-500 transition-all"
            >
              Sign in to comment
            </button>
          </div>
        )}
        <div className="relative group">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts on this AI tool..."
            className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-blue-500 transition-all resize-none h-24 placeholder:text-slate-700 text-sm shadow-inner"
            maxLength={500}
          />
          <button 
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className="absolute bottom-4 right-4 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 transition-all shadow-lg active:scale-95"
          >
            <Send className={`w-4 h-4 ${isSubmitting ? 'animate-pulse' : ''}`} />
          </button>
        </div>
        <div className="mt-2 flex justify-end">
          <span className={`text-[10px] font-mono font-bold ${newComment.length > 450 ? 'text-orange-400' : 'text-slate-600'}`}>
            {newComment.length} / 500
          </span>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {organizedComments.map((comment) => renderComment(comment))}
        </AnimatePresence>

        {comments.length === 0 && (
          <div className="text-center py-12 bg-slate-950/20 border border-dashed border-slate-800 rounded-3xl">
            <MessageSquare className="w-10 h-10 text-slate-800 mx-auto mb-3" />
            <p className="text-xs text-slate-600 uppercase font-black tracking-widest italic">Be the first to share your experience</p>
          </div>
        )}
      </div>
    </div>
  );
}
