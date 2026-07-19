import * as React from "react";
import { useAuth } from "../context/AuthContext";
import { collection, query, where, onSnapshot, orderBy, limit, doc, getDoc, updateDoc, serverTimestamp, setDoc, deleteDoc, increment } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { AiTool, UserActivity, UserProfile as UserProfileType } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { User, Heart, Send, History, Globe, Briefcase, Plus, Settings, LogOut, CheckCircle2, ChevronRight, Bookmark, ThumbsUp, UserPlus, UserMinus, UserCheck, UserX, Clock, Award, MapPin, Building, Quote, Rss, Loader2, Trash2, Folder, FolderPlus, Download } from "lucide-react";
import ToolCard from "./ToolCard";

interface UserProfileProps {
  onClose: () => void;
  onEditTool: (tool: AiTool) => void;
  onDeleteTool: (tool: AiTool) => void;
  onViewTool: (tool: AiTool) => void;
  onShareTool: (tool: AiTool) => void;
  favoriteIds: string[];
  userRole: string;
  userId?: string | null;
  onPostSomething?: () => void;
}

export default function UserProfile({ onClose, onEditTool, onDeleteTool, onViewTool, onShareTool, favoriteIds, userRole, userId, onPostSomething }: UserProfileProps) {
  const { user: currentUser, logout } = useAuth();
  const targetUid = userId || currentUser?.uid;
  const isOwnProfile = targetUid === currentUser?.uid;

  const [profile, setProfile] = React.useState<UserProfileType | null>(null);
  const [submissions, setSubmissions] = React.useState<AiTool[]>([]);
  const [favorites, setFavorites] = React.useState<AiTool[]>([]);
  const [curatedProjects, setCuratedProjects] = React.useState<any[]>([]);
  const [bookmarks, setBookmarks] = React.useState<any[]>([]);
  const [bookmarkTools, setBookmarkTools] = React.useState<AiTool[]>([]);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string>("all");
  const [isCreatingProject, setIsCreatingProject] = React.useState(false);
  const [newProjectName, setNewProjectName] = React.useState("");
  const [newProjectDesc, setNewProjectDesc] = React.useState("");
  const [isProjectLoading, setIsProjectLoading] = React.useState(false);
  const [activities, setActivities] = React.useState<UserActivity[]>([]);
  const [activeTab, setActiveTab] = React.useState<"submissions" | "favorites" | "bookmarks" | "activity" | "social_feed">("submissions");
  const [isEditingProfile, setIsEditingProfile] = React.useState(false);
  const [isFollowing, setIsFollowing] = React.useState(false);
  const [isFollowLoading, setIsFollowLoading] = React.useState(false);
  const [dragOverFolderId, setDragOverFolderId] = React.useState<string | null>(null);
  
  // LinkedIn-style Connections State
  const [connectionStatus, setConnectionStatus] = React.useState<'not_connected' | 'pending_sent' | 'pending_received' | 'connected'>('not_connected');
  const [isConnectionLoading, setIsConnectionLoading] = React.useState(false);
  const [userArticles, setUserArticles] = React.useState<any[]>([]);
  const [recommendationText, setRecommendationText] = React.useState("");
  const [isSubmittingRec, setIsSubmittingRec] = React.useState(false);

  const [profileData, setProfileData] = React.useState({
    bio: "",
    website: "",
    skills: "",
    headline: "",
    currentPosition: "",
    location: ""
  });

  // Track connection status real-time
  React.useEffect(() => {
    if (!currentUser || !targetUid || isOwnProfile) return;

    // Listen for connection status
    const reqSentRef = doc(db, "connection_requests", `${currentUser.uid}_${targetUid}`);
    const reqRecvRef = doc(db, "connection_requests", `${targetUid}_${currentUser.uid}`);
    const connRef = doc(db, "users", currentUser.uid, "connections", targetUid);

    let unsubSent = () => {};
    let unsubRecv = () => {};
    let unsubConn = () => {};

    unsubConn = onSnapshot(connRef, (connSnap) => {
      if (connSnap.exists()) {
        setConnectionStatus('connected');
      } else {
        unsubSent = onSnapshot(reqSentRef, (sentSnap) => {
          if (sentSnap.exists() && sentSnap.data()?.status === 'pending') {
            setConnectionStatus('pending_sent');
          } else {
            unsubRecv = onSnapshot(reqRecvRef, (recvSnap) => {
              if (recvSnap.exists() && recvSnap.data()?.status === 'pending') {
                setConnectionStatus('pending_received');
              } else {
                setConnectionStatus('not_connected');
              }
            });
          }
        });
      }
    });

    return () => {
      unsubConn();
      unsubSent();
      unsubRecv();
    };
  }, [currentUser, targetUid, isOwnProfile]);

  // Fetch articles written by this user to display in social tab
  React.useEffect(() => {
    if (!targetUid) return;
    const articlesQuery = query(collection(db, "articles"), where("authorId", "==", targetUid), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(articlesQuery, (snap) => {
      setUserArticles(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return unsub;
  }, [targetUid]);

  // Check if current user is following target user
  React.useEffect(() => {
    if (!currentUser || !targetUid || isOwnProfile) return;

    const followRef = doc(db, "users", currentUser.uid, "following", targetUid);
    const unsub = onSnapshot(followRef, (docSnap) => {
      setIsFollowing(docSnap.exists());
    });
    return unsub;
  }, [currentUser, targetUid, isOwnProfile]);

  React.useEffect(() => {
    if (!targetUid) return;

    // Fetch Profile
    const profileRef = doc(db, "users", targetUid);
    const unsubProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile({ uid: targetUid, ...data } as UserProfileType);
        setProfileData({
          bio: data.bio || "",
          website: data.website || "",
          skills: (data.skills || []).join(", "),
          headline: data.headline || "",
          currentPosition: data.currentPosition || "",
          location: data.location || ""
        });
      }
    });

    // Fetch Submissions
    const subQuery = query(collection(db, "ai_tools"), where("authorId", "==", targetUid), orderBy("createdAt", "desc"));
    const unsubSub = onSnapshot(subQuery, (snapshot) => {
      setSubmissions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AiTool)));
    });

    // Fetch Activity
    const actQuery = query(collection(db, "users", targetUid, "activity"), orderBy("timestamp", "desc"), limit(20));
    const unsubAct = onSnapshot(actQuery, (snapshot) => {
      setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserActivity)));
    });

    return () => {
      unsubProfile();
      unsubSub();
      unsubAct();
    };
  }, [targetUid]);

  // Handle favorites separately because we need to fetch them by IDs
  React.useEffect(() => {
    if (favoriteIds.length === 0) {
      setFavorites([]);
      return;
    }
    
    // In a real app, you'd batch fetch these or use a query. 
    // Here we'll listen to the main tools collection and filter.
    const toolsRef = collection(db, "ai_tools");
    const unsubFavs = onSnapshot(toolsRef, (snapshot) => {
      const allTools = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AiTool));
      setFavorites(allTools.filter(t => favoriteIds.includes(t.id)));
    });

    return unsubFavs;
  }, [favoriteIds]);

  // Listen to bookmarks and curated projects for this user profile
  React.useEffect(() => {
    if (!targetUid) return;

    const projectsRef = collection(db, "users", targetUid, "curated_projects");
    const unsubProjects = onSnapshot(projectsRef, (snapshot) => {
      setCuratedProjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${targetUid}/curated_projects`);
    });

    const bookmarksRef = collection(db, "users", targetUid, "bookmarks");
    const unsubBookmarks = onSnapshot(bookmarksRef, (snapshot) => {
      setBookmarks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${targetUid}/bookmarks`);
    });

    return () => {
      unsubProjects();
      unsubBookmarks();
    };
  }, [targetUid]);

  // Load bookmark tools from bookmarks
  React.useEffect(() => {
    if (bookmarks.length === 0) {
      setBookmarkTools([]);
      return;
    }

    const toolsRef = collection(db, "ai_tools");
    const unsubTools = onSnapshot(toolsRef, (snapshot) => {
      const allTools = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AiTool));
      const bookmarkedToolIds = bookmarks.map(b => b.toolId);
      setBookmarkTools(allTools.filter(t => bookmarkedToolIds.includes(t.id)));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "ai_tools");
    });

    return unsubTools;
  }, [bookmarks]);

  const handleExport = (format: "json" | "csv") => {
    const filteredTools = bookmarkTools.filter(tool => {
      const bookmarkObj = bookmarks.find(b => b.toolId === tool.id);
      if (!bookmarkObj) return false;
      if (selectedProjectId === "all") return true;
      if (selectedProjectId === "unassigned") return bookmarkObj.projectId === null;
      return bookmarkObj.projectId === selectedProjectId;
    });

    if (filteredTools.length === 0) {
      alert("This collection is empty. Add some bookmarks first!");
      return;
    }

    let projectName = "all_bookmarks";
    if (selectedProjectId === "unassigned") {
      projectName = "general_bookmarks";
    } else if (selectedProjectId !== "all") {
      const proj = curatedProjects.find(p => p.id === selectedProjectId);
      if (proj) {
        projectName = proj.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
      }
    }

    if (format === "json") {
      const exportData = filteredTools.map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        type: t.type,
        url: t.url,
        description: t.desc,
        upvotes: t.upvotes || 0,
        averageRating: t.averageRating || 0,
        tags: t.tags || []
      }));
      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${projectName}_export.json`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      const headers = ["ID", "Name", "Category", "Platform Type", "URL", "Description", "Upvotes", "Average Rating", "Tags"];
      const rows = filteredTools.map(tool => [
        `"${tool.id.replace(/"/g, '""')}"`,
        `"${tool.name.replace(/"/g, '""')}"`,
        `"${tool.category.replace(/"/g, '""')}"`,
        `"${tool.type.replace(/"/g, '""')}"`,
        `"${tool.url.replace(/"/g, '""')}"`,
        tool.desc ? `"${tool.desc.replace(/"/g, '""').replace(/\n/g, ' ')}"` : '""',
        tool.upvotes || 0,
        tool.averageRating || 0,
        tool.tags ? `"${tool.tags.join(", ").replace(/"/g, '""')}"` : '""'
      ]);

      const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${projectName}_export.csv`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isOwnProfile) return;
    try {
      const profileRef = doc(db, "users", currentUser.uid);
      await updateDoc(profileRef, {
        bio: profileData.bio,
        website: profileData.website,
        skills: profileData.skills.split(",").map(s => s.trim()).filter(s => s),
        headline: profileData.headline,
        currentPosition: profileData.currentPosition,
        location: profileData.location,
        updatedAt: serverTimestamp()
      });
      setIsEditingProfile(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
    }
  };

  const handleFollow = async () => {
    if (!currentUser || !targetUid || isFollowLoading) return;
    setIsFollowLoading(true);

    try {
      const myFollowingRef = doc(db, "users", currentUser.uid, "following", targetUid);
      const theirFollowersRef = doc(db, "users", targetUid, "followers", currentUser.uid);
      
      const myRef = doc(db, "users", currentUser.uid);
      const theirRef = doc(db, "users", targetUid);

      if (isFollowing) {
        // Unfollow
        await deleteDoc(myFollowingRef);
        await deleteDoc(theirFollowersRef);
        await updateDoc(myRef, { followingCount: increment(-1) });
        await updateDoc(theirRef, { followersCount: increment(-1) });
      } else {
        // Follow
        await setDoc(myFollowingRef, { 
          uid: targetUid, 
          displayName: profile?.displayName, 
          photoURL: profile?.photoURL,
          timestamp: serverTimestamp() 
        });
        await setDoc(theirFollowersRef, { 
          uid: currentUser.uid, 
          displayName: currentUser.displayName, 
          photoURL: currentUser.photoURL,
          timestamp: serverTimestamp() 
        });
        await updateDoc(myRef, { followingCount: increment(1) });
        await updateDoc(theirRef, { followersCount: increment(1) });
      }
    } catch (error) {
      console.error("Follow error:", error);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!currentUser || !targetUid || isConnectionLoading) return;
    setIsConnectionLoading(true);
    try {
      const requestRef = doc(db, "connection_requests", `${currentUser.uid}_${targetUid}`);
      await setDoc(requestRef, {
        senderId: currentUser.uid,
        senderName: currentUser.displayName || "Anonymous Professional",
        senderPhoto: currentUser.photoURL || "",
        senderHeadline: currentUser.email || "", // Fallback
        receiverId: targetUid,
        status: "pending",
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Connect request error:", error);
    } finally {
      setIsConnectionLoading(false);
    }
  };

  const handleAcceptConnection = async () => {
    if (!currentUser || !targetUid || isConnectionLoading) return;
    setIsConnectionLoading(true);
    try {
      // 1. Delete request
      const requestRef = doc(db, "connection_requests", `${targetUid}_${currentUser.uid}`);
      await deleteDoc(requestRef);

      // 2. Add connection on both sides
      const myConnRef = doc(db, "users", currentUser.uid, "connections", targetUid);
      const theirConnRef = doc(db, "users", targetUid, "connections", currentUser.uid);

      await setDoc(myConnRef, {
        uid: targetUid,
        displayName: profile?.displayName || "User",
        photoURL: profile?.photoURL || "",
        headline: profile?.headline || "",
        timestamp: serverTimestamp()
      });

      await setDoc(theirConnRef, {
        uid: currentUser.uid,
        displayName: currentUser.displayName || "User",
        photoURL: currentUser.photoURL || "",
        headline: currentUser.email || "", // fallback
        timestamp: serverTimestamp()
      });

      // 3. Increment counters
      const myProfileRef = doc(db, "users", currentUser.uid);
      const theirProfileRef = doc(db, "users", targetUid);
      await updateDoc(myProfileRef, { connectionsCount: increment(1) });
      await updateDoc(theirProfileRef, { connectionsCount: increment(1) });

      // 4. Create Activity
      const activityRef = doc(collection(db, "users", currentUser.uid, "activity"));
      await setDoc(activityRef, {
        type: "connection",
        targetId: targetUid,
        targetName: profile?.displayName || "User",
        timestamp: serverTimestamp()
      });
    } catch (error) {
      console.error("Accept connection error:", error);
    } finally {
      setIsConnectionLoading(false);
    }
  };

  const handleIgnoreConnection = async () => {
    if (!currentUser || !targetUid || isConnectionLoading) return;
    setIsConnectionLoading(true);
    try {
      const requestRef = doc(db, "connection_requests", `${targetUid}_${currentUser.uid}`);
      await deleteDoc(requestRef);
    } catch (error) {
      console.error("Ignore request error:", error);
    } finally {
      setIsConnectionLoading(false);
    }
  };

  const handleRemoveConnection = async () => {
    if (!currentUser || !targetUid || isConnectionLoading) return;
    setIsConnectionLoading(true);
    try {
      const myConnRef = doc(db, "users", currentUser.uid, "connections", targetUid);
      const theirConnRef = doc(db, "users", targetUid, "connections", currentUser.uid);

      await deleteDoc(myConnRef);
      await deleteDoc(theirConnRef);

      const myProfileRef = doc(db, "users", currentUser.uid);
      const theirProfileRef = doc(db, "users", targetUid);
      await updateDoc(myProfileRef, { connectionsCount: increment(-1) });
      await updateDoc(theirProfileRef, { connectionsCount: increment(-1) });
    } catch (error) {
      console.error("Remove connection error:", error);
    } finally {
      setIsConnectionLoading(false);
    }
  };

  const handleEndorseSkill = async (skillName: string) => {
    if (!currentUser || !targetUid || isOwnProfile) return;
    try {
      const targetRef = doc(db, "users", targetUid);
      const currentEndorsements = profile?.endorsements || {};
      const skillEndorsers = currentEndorsements[skillName] || [];

      let updatedEndorsers: string[] = [];
      if (skillEndorsers.includes(currentUser.uid)) {
        // Remove endorsement
        updatedEndorsers = skillEndorsers.filter(id => id !== currentUser.uid);
      } else {
        // Add endorsement
        updatedEndorsers = [...skillEndorsers, currentUser.uid];
      }

      await updateDoc(targetRef, {
        [`endorsements.${skillName}`]: updatedEndorsers
      });
    } catch (error) {
      console.error("Endorse skill error:", error);
    }
  };

  const handleSubmitRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !targetUid || !recommendationText.trim() || isSubmittingRec) return;
    setIsSubmittingRec(true);
    try {
      const targetRef = doc(db, "users", targetUid);
      const currentRecs = profile?.recommendations || [];

      const newRec = {
        id: `${currentUser.uid}_${Date.now()}`,
        fromId: currentUser.uid,
        fromName: currentUser.displayName || "Anonymous Expert",
        fromPhoto: currentUser.photoURL || "",
        text: recommendationText.trim(),
        createdAt: new Date().toISOString()
      };

      await updateDoc(targetRef, {
        recommendations: [newRec, ...currentRecs]
      });

      setRecommendationText("");
    } catch (error) {
      console.error("Submit recommendation error:", error);
    } finally {
      setIsSubmittingRec(false);
    }
  };

  const handleDeleteRecommendation = async (recId: string) => {
    if (!currentUser || !targetUid) return;
    try {
      const targetRef = doc(db, "users", targetUid);
      const currentRecs = profile?.recommendations || [];
      const updatedRecs = currentRecs.filter(r => r.id !== recId);
      
      await updateDoc(targetRef, {
        recommendations: updatedRecs
      });
    } catch (error) {
      console.error("Delete recommendation error:", error);
    }
  };

  if (!profile && !targetUid) return null;

  return (
    <div 
      className="fixed inset-0 z-[150] overflow-y-auto custom-scrollbar"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-heading"
    >
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        aria-hidden="true"
      />
      
      <div className="relative min-h-screen py-12 px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="max-w-6xl mx-auto bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden"
        >
          {/* Cover / Header */}
          <div className="h-48 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-3 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all backdrop-blur-md focus:ring-2 focus:ring-white/50"
              aria-label="Close profile"
            >
              <History className="w-5 h-5 rotate-45" aria-hidden="true" />
            </button>
          </div>

          <div className="px-10 pb-10">
            <div className="flex flex-col lg:flex-row gap-10 -mt-20">
              {/* Sidebar Profile Card */}
              <div className="w-full lg:w-80 shrink-0">
                <div className="bg-slate-950/60 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-xl flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                       <span className="px-3 py-1 bg-gradient-to-r from-blue-600 to-sky-500 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-full border border-blue-400/50 shadow-lg whitespace-nowrap">
                         {userRole}
                       </span>
                    </div>
                    <img 
                      src={profile?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=60"} 
                      alt={`${profile?.displayName || "User"}'s profile picture`} 
                      className="w-32 h-32 rounded-3xl border-4 border-slate-900 shadow-2xl object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 border-4 border-slate-900 rounded-full flex items-center justify-center text-white" title="Active Professional">
                      <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping" />
                    </div>
                  </div>
                  
                  <h2 id="profile-heading" className="text-2xl font-black text-white mb-1 flex items-center gap-1.5 justify-center">
                    {profile?.displayName}
                    <CheckCircle2 className="w-4 h-4 text-blue-400 fill-blue-500/10 shrink-0" />
                  </h2>

                  {/* LinkedIn Style Headline */}
                  {profile?.headline ? (
                    <p className="text-slate-300 text-xs font-black uppercase tracking-widest mt-1 px-2 py-0.5 bg-blue-500/10 border border-blue-500/10 rounded-lg">{profile.headline}</p>
                  ) : (
                    <p className="text-slate-500 text-xs italic mt-1">No headline added yet.</p>
                  )}

                  {/* LinkedIn Position & Company */}
                  {profile?.currentPosition && (
                    <p className="text-xs text-slate-400 font-bold mt-2 flex items-center gap-1 justify-center uppercase tracking-wider">
                      <Building className="w-3.5 h-3.5 text-slate-500" />
                      {profile.currentPosition}
                    </p>
                  )}

                  {/* Location */}
                  {profile?.location && (
                    <p className="text-[10px] text-slate-500 font-mono mt-1 flex items-center gap-1 justify-center lowercase">
                      <MapPin className="w-3 h-3" />
                      {profile.location}
                    </p>
                  )}

                  <p className="text-slate-500 font-mono text-[10px] mb-6 lowercase mt-2">{profile?.email}</p>

                  {/* LinkedIn Statistics (including Connections Count) */}
                  <div className="w-full grid grid-cols-2 gap-4 mb-8 border-y border-slate-800/50 py-4" role="group" aria-label="Statistics">
                    <div className="text-center">
                      <p className="text-xl font-black text-white">{submissions.length}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Subs</p>
                    </div>
                    <div className="text-center border-l border-slate-800/30 pl-4">
                      <p className="text-xl font-black text-blue-400">{profile?.connectionsCount || 0}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Connections</p>
                    </div>
                    <div className="text-center border-t border-slate-850 pt-3">
                      <p className="text-lg font-bold text-slate-300">{profile?.followersCount || 0}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Followers</p>
                    </div>
                    <div className="text-center border-l border-slate-850 border-t pt-3 pl-4">
                      <p className="text-lg font-bold text-slate-300">{favoriteIds.length}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Favs</p>
                    </div>
                  </div>

                  {/* About / Summary Section */}
                  {profile?.bio ? (
                    <p className="text-slate-300 text-xs italic mb-6 leading-relaxed">"{profile.bio}"</p>
                  ) : (
                    <p className="text-slate-600 text-xs italic mb-6">No professional summary added.</p>
                  )}

                  {/* LinkedIn Endorsements & Skills Badge */}
                  <div className="w-full mb-8 text-left">
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-blue-400" />
                      Skills & Endorsements
                    </p>
                    <div className="flex flex-wrap gap-2" aria-label="Skills">
                      {profile?.skills && profile.skills.length > 0 ? (
                        profile.skills.map(skill => {
                          const skillEndorsements = profile.endorsements?.[skill] || [];
                          const isEndorsedByMe = currentUser && skillEndorsements.includes(currentUser.uid);
                          return (
                            <button
                              key={skill}
                              type="button"
                              disabled={isOwnProfile}
                              onClick={() => handleEndorseSkill(skill)}
                              className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tighter flex items-center gap-1.5 transition-all cursor-pointer ${
                                isEndorsedByMe
                                ? 'bg-blue-600/20 border border-blue-500/30 text-blue-400'
                                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                              }`}
                              title={isOwnProfile ? "Others can endorse your skills" : isEndorsedByMe ? "Click to retract endorsement" : "Click to endorse skill"}
                            >
                              <span>{skill}</span>
                              {skillEndorsements.length > 0 && (
                                <span className={`text-[9px] px-1 rounded font-mono font-black ${isEndorsedByMe ? 'bg-blue-500/20' : 'bg-slate-950'}`}>
                                  {skillEndorsements.length}
                                </span>
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <p className="text-slate-700 text-[10px] uppercase font-bold tracking-widest">No skills listed</p>
                      )}
                    </div>
                  </div>

                  {/* Dynamic Action Buttons Section */}
                  <div className="w-full space-y-3">
                    {isOwnProfile && (
                      <>
                        <button 
                          onClick={() => setIsEditingProfile(true)}
                          className="w-full flex items-center justify-center gap-2 py-3 bg-white text-black rounded-xl font-black text-sm hover:bg-slate-100 transition-all shadow-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <Settings className="w-4 h-4" aria-hidden="true" /> Edit Profile
                        </button>
                        {onPostSomething && (
                          <motion.button 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onPostSomething}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-amber-500 hover:bg-amber-400 text-black rounded-xl font-black text-sm transition-all shadow-lg shadow-amber-500/20 border border-amber-400/20 cursor-pointer"
                          >
                            <Plus className="w-4 h-4" aria-hidden="true" /> Post Something
                          </motion.button>
                        )}
                        <button 
                          onClick={logout}
                          className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-slate-500 rounded-xl font-bold text-sm hover:text-red-400 transition-all border border-slate-800 focus:ring-2 focus:ring-red-500"
                        >
                          <LogOut className="w-4 h-4" aria-hidden="true" /> Sign Out
                        </button>
                      </>
                    )}
                    {!isOwnProfile && (
                      <div className="flex flex-col gap-2.5 w-full">
                        {/* LinkedIn Connect Main Button */}
                        {connectionStatus === 'connected' ? (
                          <div className="flex gap-2 w-full">
                            <button 
                              type="button"
                              className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 rounded-xl font-black text-xs uppercase tracking-wider"
                              disabled
                            >
                              <UserCheck className="w-4 h-4" /> Connected
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveConnection}
                              disabled={isConnectionLoading}
                              className="px-3 bg-slate-900 border border-slate-850 hover:border-red-500/20 text-slate-500 hover:text-red-400 rounded-xl transition-all cursor-pointer"
                              title="Disconnect"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          </div>
                        ) : connectionStatus === 'pending_sent' ? (
                          <button 
                            type="button"
                            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 border border-slate-700 text-slate-400 rounded-xl font-black text-xs uppercase tracking-wider cursor-not-allowed"
                            disabled
                          >
                            <Clock className="w-4 h-4 animate-pulse" /> Pending Request
                          </button>
                        ) : connectionStatus === 'pending_received' ? (
                          <div className="flex flex-col gap-2 w-full">
                            <button 
                              type="button"
                              onClick={handleAcceptConnection}
                              disabled={isConnectionLoading}
                              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer"
                            >
                              Accept Invitation
                            </button>
                            <button 
                              type="button"
                              onClick={handleIgnoreConnection}
                              disabled={isConnectionLoading}
                              className="w-full flex items-center justify-center gap-2 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer"
                            >
                              Ignore
                            </button>
                          </div>
                        ) : (
                          <button 
                            type="button"
                            onClick={handleConnect}
                            disabled={isConnectionLoading}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer"
                          >
                            {isConnectionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4" /> Connect</>}
                          </button>
                        )}

                        {/* Professional Secondary Actions: Follow */}
                        <div className="flex gap-2">
                          <button 
                            onClick={handleFollow}
                            disabled={isFollowLoading}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border ${
                              isFollowing 
                              ? 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-white' 
                              : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                            }`}
                          >
                            {isFollowing ? 'Following' : 'Follow'}
                          </button>

                          {profile?.website && (
                            <a 
                              href={profile.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white rounded-xl font-bold text-xs uppercase tracking-wider border border-slate-800 transition-all"
                            >
                              <Globe className="w-4 h-4 text-sky-400" /> Website
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 mt-6 lg:mt-24">
                <div role="tablist" className="flex items-center gap-6 sm:gap-8 mb-10 border-b border-slate-800 overflow-x-auto scrollbar-none" aria-label="Profile navigation">
                  <button 
                    role="tab"
                    aria-selected={activeTab === "submissions"}
                    aria-controls="submissions-panel"
                    id="tab-submissions"
                    onClick={() => setActiveTab("submissions")}
                    className={`pb-4 text-xs sm:text-sm font-black uppercase tracking-widest transition-all relative outline-none shrink-0 focus:text-blue-400 ${
                      activeTab === "submissions" ? "text-blue-500" : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    Submissions
                    {activeTab === "submissions" && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full" />}
                  </button>
                  <button 
                    role="tab"
                    aria-selected={activeTab === "social_feed"}
                    aria-controls="social-panel"
                    id="tab-social"
                    onClick={() => setActiveTab("social_feed")}
                    className={`pb-4 text-xs sm:text-sm font-black uppercase tracking-widest transition-all relative outline-none shrink-0 focus:text-sky-400 ${
                      activeTab === "social_feed" ? "text-sky-400" : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    Posts & Articles
                    {activeTab === "social_feed" && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-sky-400 rounded-full" />}
                  </button>
                  <button 
                    role="tab"
                    aria-selected={activeTab === "favorites"}
                    aria-controls="favorites-panel"
                    id="tab-favorites"
                    onClick={() => setActiveTab("favorites")}
                    className={`pb-4 text-xs sm:text-sm font-black uppercase tracking-widest transition-all relative outline-none shrink-0 focus:text-red-300 ${
                      activeTab === "favorites" ? "text-red-400" : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    Favorites
                    {activeTab === "favorites" && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-red-400 rounded-full" />}
                  </button>
                  <button 
                    role="tab"
                    aria-selected={activeTab === "bookmarks"}
                    aria-controls="bookmarks-panel"
                    id="tab-bookmarks"
                    onClick={() => setActiveTab("bookmarks")}
                    className={`pb-4 text-xs sm:text-sm font-black uppercase tracking-widest transition-all relative outline-none shrink-0 focus:text-orange-300 ${
                      activeTab === "bookmarks" ? "text-orange-400" : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    Bookmarks
                    {activeTab === "bookmarks" && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-orange-400 rounded-full" />}
                  </button>
                  <button 
                    role="tab"
                    aria-selected={activeTab === "activity"}
                    aria-controls="activity-panel"
                    id="tab-activity"
                    onClick={() => setActiveTab("activity")}
                    className={`pb-4 text-xs sm:text-sm font-black uppercase tracking-widest transition-all relative outline-none shrink-0 focus:text-white ${
                      activeTab === "activity" ? "text-slate-100" : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    Activity
                    {activeTab === "activity" && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-full" />}
                  </button>
                </div>

                <div className="min-h-[400px]">
                  <AnimatePresence mode="wait">
                    {activeTab === "submissions" && (
                      <motion.div 
                        id="submissions-panel"
                        role="tabpanel"
                        tabIndex={0}
                        aria-labelledby="tab-submissions"
                        key="submissions"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6 outline-none"
                      >
                        {submissions.length > 0 ? submissions.map((tool, idx) => (
                          <ToolCard 
                            key={tool.id} 
                            tool={tool} 
                            isFavorited={favoriteIds.includes(tool.id)}
                            onView={() => onViewTool(tool)}
                            onEdit={() => onEditTool(tool)}
                            onDelete={() => onDeleteTool(tool)}
                            onShare={() => onShareTool(tool)}
                            index={idx}
                          />
                        )) : (
                          <div className="col-span-2 py-20 bg-slate-950/30 border border-slate-800 border-dashed rounded-[2rem] flex flex-col items-center justify-center text-center">
                            <Plus className="w-12 h-12 text-slate-700 mb-4" aria-hidden="true" />
                            <h4 className="text-xl font-bold text-white mb-2">No Tools Submitted Yet</h4>
                            <p className="text-slate-500 max-w-xs transition-colors hover:text-slate-400 cursor-pointer" onClick={onClose}>
                              Contribute your first AI tool to help grow our global directory.
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {activeTab === "social_feed" && (
                      <motion.div 
                        id="social-panel"
                        role="tabpanel"
                        tabIndex={0}
                        aria-labelledby="tab-social"
                        key="social_feed"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-6 outline-none"
                      >
                        {isOwnProfile && onPostSomething && (
                          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-5 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                              <h4 className="text-sm font-black text-white">Share your latest AI build or tech insights!</h4>
                              <p className="text-xs text-slate-400 mt-1">Publish articles, updates, and reviews to the global directory.</p>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={onPostSomething}
                              className="whitespace-nowrap px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                              Write/Post Article
                            </motion.button>
                          </div>
                        )}

                        {userArticles.length > 0 ? userArticles.map(art => (
                          <div key={art.id} className="bg-slate-950/50 border border-slate-800/80 p-6 rounded-3xl hover:border-slate-700 transition-all">
                            <div className="flex items-center gap-3 mb-4">
                              <img 
                                src={profile?.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=60"} 
                                alt={profile?.displayName} 
                                className="w-10 h-10 rounded-xl object-cover border border-slate-800"
                                referrerPolicy="no-referrer"
                              />
                              <div>
                                <h4 className="text-sm font-black text-white">{profile?.displayName}</h4>
                                <p className="text-[10px] text-slate-500 font-mono">Published {art.createdAt ? new Date(art.createdAt.seconds * 1000).toLocaleDateString() : 'recently'}</p>
                              </div>
                            </div>
                            <h3 className="text-lg font-black text-white mb-2">{art.title}</h3>
                            <p className="text-slate-300 text-sm mb-4 leading-relaxed">{art.summary || art.content}</p>

                            {art.mediaFiles && art.mediaFiles.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                                {art.mediaFiles.map((media: any, index: number) => (
                                  <div key={index} className="relative rounded-2xl overflow-hidden border border-slate-800/60 aspect-video bg-slate-900">
                                    {media.type?.startsWith('image') ? (
                                      <img src={media.url} alt="Media upload" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : media.type?.startsWith('video') ? (
                                      <video src={media.url} controls className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                                        <History className="w-8 h-8 text-blue-400 mb-1" />
                                        <span className="text-xs text-slate-400 font-mono truncate max-w-full">{media.name}</span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center justify-between border-t border-slate-900 pt-4 mt-2">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                                {art.category || 'Post'}
                              </span>
                              <div className="flex gap-2">
                                <span className="px-3 py-1 bg-white/5 border border-white/5 rounded-lg text-xs text-slate-400">
                                  {art.viewsCount || 0} views
                                </span>
                              </div>
                            </div>
                          </div>
                        )) : (
                          <div className="py-20 bg-slate-950/30 border border-slate-800 border-dashed rounded-[2rem] flex flex-col items-center justify-center text-center px-4">
                            <Quote className="w-12 h-12 text-slate-700 mb-4" aria-hidden="true" />
                            <h4 className="text-xl font-bold text-white mb-2">No Published Posts</h4>
                            <p className="text-slate-500 max-w-xs mb-5">
                              {profile?.displayName || "This user"} hasn't published any product updates or tech insights yet.
                            </p>
                            {isOwnProfile && onPostSomething && (
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={onPostSomething}
                                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center gap-2 cursor-pointer"
                              >
                                <Plus className="w-4 h-4" />
                                Post Your First Article
                              </motion.button>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}

                    {activeTab === "favorites" && (
                      <motion.div 
                        id="favorites-panel"
                        role="tabpanel"
                        tabIndex={0}
                        aria-labelledby="tab-favorites"
                        key="favorites"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6 outline-none"
                      >
                        {favorites.length > 0 ? favorites.map((tool, idx) => (
                          <ToolCard 
                            key={tool.id} 
                            tool={tool} 
                            isFavorited={favoriteIds.includes(tool.id)}
                            onView={() => onViewTool(tool)}
                            onEdit={() => onEditTool(tool)}
                            onDelete={() => onDeleteTool(tool)}
                            onShare={() => onShareTool(tool)}
                            index={idx}
                          />
                        )) : (
                          <div className="col-span-2 py-20 bg-slate-950/30 border border-slate-800 border-dashed rounded-[2rem] flex flex-col items-center justify-center text-center">
                            <Heart className="w-12 h-12 text-slate-700 mb-4" aria-hidden="true" />
                            <h3 className="text-xl font-bold text-white mb-2">Your Heart is Empty</h3>
                            <p className="text-slate-500 max-w-xs">
                              Start exploring the directory and favorite the tools you love.
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {activeTab === "bookmarks" && (
                      <motion.div 
                        id="bookmarks-panel"
                        role="tabpanel"
                        tabIndex={0}
                        aria-labelledby="tab-bookmarks"
                        key="bookmarks"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-8 outline-none animate-fadeIn"
                      >
                        {/* Curated Projects (Collections) Section */}
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div>
                              <h3 className="text-lg font-black text-white">Curated Projects</h3>
                              <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                                <span>Organize your saved tools into custom themed collections.</span>
                                {isOwnProfile && (
                                  <span className="text-orange-450 font-black tracking-wider uppercase text-[9px] bg-orange-500/10 px-2.5 py-0.5 rounded border border-orange-500/20 inline-flex items-center gap-1 animate-pulse">
                                    💡 Drag & drop tools below to organize!
                                  </span>
                                )}
                              </p>
                            </div>
                            {isOwnProfile && (
                              <button
                                onClick={() => setIsCreatingProject(!isCreatingProject)}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                              >
                                <FolderPlus className="w-4 h-4 text-orange-400" />
                                {isCreatingProject ? "Cancel" : "New Project"}
                              </button>
                            )}
                          </div>

                          {/* Create Project Form inline */}
                          <AnimatePresence>
                            {isCreatingProject && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden bg-slate-950/40 border border-slate-800/80 p-5 rounded-2xl space-y-4"
                              >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Project Name *</label>
                                    <input 
                                      type="text" 
                                      required
                                      placeholder="e.g. Design Kit, Developer Utilities" 
                                      value={newProjectName}
                                      onChange={(e) => setNewProjectName(e.target.value)}
                                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-slate-700 font-bold"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 block mb-1">Description (Optional)</label>
                                    <input 
                                      type="text" 
                                      placeholder="e.g. Curated stack for my next freelance work" 
                                      value={newProjectDesc}
                                      onChange={(e) => setNewProjectDesc(e.target.value)}
                                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-slate-700"
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsCreatingProject(false);
                                      setNewProjectName("");
                                      setNewProjectDesc("");
                                    }}
                                    className="px-4 py-2 text-slate-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!newProjectName.trim() || isProjectLoading}
                                    onClick={async () => {
                                      if (!newProjectName.trim()) return;
                                      setIsProjectLoading(true);
                                      try {
                                        const newProjId = "proj_" + Date.now();
                                        await setDoc(doc(db, "users", targetUid, "curated_projects", newProjId), {
                                          name: newProjectName.trim(),
                                          desc: newProjectDesc.trim(),
                                          createdAt: new Date()
                                        });
                                        setNewProjectName("");
                                        setNewProjectDesc("");
                                        setIsCreatingProject(false);
                                      } catch (err) {
                                        console.error("Failed to create curated project", err);
                                      } finally {
                                        setIsProjectLoading(false);
                                      }
                                    }}
                                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-slate-950 text-xs font-black uppercase tracking-widest rounded-xl transition-colors"
                                  >
                                    {isProjectLoading ? "Creating..." : "Create Project"}
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Projects Folders View */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {/* All Bookmarks Selector */}
                            <button
                              onClick={() => setSelectedProjectId("all")}
                              className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all ${
                                selectedProjectId === "all"
                                ? "bg-orange-500/10 border-orange-500/40 shadow-inner ring-1 ring-orange-500/25"
                                : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700"
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <Folder className={`w-6 h-6 ${selectedProjectId === "all" ? "text-orange-400" : "text-slate-600"}`} />
                                <span className="text-[10px] font-mono font-bold bg-slate-900 px-2 py-0.5 rounded text-slate-400">
                                  {bookmarks.length}
                                </span>
                              </div>
                              <div>
                                <h4 className="text-xs font-black text-white uppercase tracking-wider block truncate">All Bookmarks</h4>
                                <span className="text-[10px] text-slate-500 block truncate">Total saved collection</span>
                              </div>
                            </button>

                             {/* Unassigned Bookmarks Selector */}
                             <button
                               onClick={() => setSelectedProjectId("unassigned")}
                               onDragOver={(e) => {
                                 if (isOwnProfile) {
                                   e.preventDefault();
                                   setDragOverFolderId("unassigned");
                                 }
                               }}
                               onDragLeave={() => {
                                 if (isOwnProfile) setDragOverFolderId(null);
                               }}
                               onDrop={async (e) => {
                                 e.preventDefault();
                                 setDragOverFolderId(null);
                                 if (!isOwnProfile || !targetUid) return;
                                 const toolId = e.dataTransfer.getData("text/plain");
                                 if (toolId) {
                                   try {
                                     const bRef = doc(db, "users", targetUid, "bookmarks", toolId);
                                     await setDoc(bRef, {
                                       toolId,
                                       projectId: null,
                                       bookmarkedAt: new Date()
                                     });
                                   } catch (err) {
                                     console.error("Failed to move bookmark to unassigned:", err);
                                   }
                                 }
                               }}
                               className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all duration-200 ${
                                 dragOverFolderId === "unassigned"
                                 ? "bg-orange-500/20 border-orange-500 scale-105 shadow-[0_0_20px_rgba(249,115,22,0.3)] ring-2 ring-orange-500/50"
                                 : selectedProjectId === "unassigned"
                                 ? "bg-orange-500/10 border-orange-500/40 shadow-inner ring-1 ring-orange-500/25"
                                 : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700"
                               }`}
                             >
                               <div className="flex items-center justify-between w-full">
                                 <Folder className={`w-6 h-6 ${dragOverFolderId === "unassigned" || selectedProjectId === "unassigned" ? "text-orange-400" : "text-slate-600"}`} />
                                 <span className="text-[10px] font-mono font-bold bg-slate-900 px-2 py-0.5 rounded text-slate-400">
                                   {bookmarks.filter(b => b.projectId === null).length}
                                 </span>
                               </div>
                               <div>
                                 <h4 className="text-xs font-black text-white uppercase tracking-wider block truncate font-sans">General Bookmarks</h4>
                                 <span className="text-[10px] text-slate-500 block truncate font-sans">Unassigned tools</span>
                               </div>
                             </button>
 
                             {/* Custom Projects */}
                             {curatedProjects.map((proj) => {
                               const projBookmarks = bookmarks.filter(b => b.projectId === proj.id);
                               const isSelected = selectedProjectId === proj.id;
                               const isDragOver = dragOverFolderId === proj.id;
                               return (
                                 <button
                                   key={proj.id}
                                   onClick={() => setSelectedProjectId(proj.id)}
                                   onDragOver={(e) => {
                                     if (isOwnProfile) {
                                       e.preventDefault();
                                       setDragOverFolderId(proj.id);
                                     }
                                   }}
                                   onDragLeave={() => {
                                     if (isOwnProfile) setDragOverFolderId(null);
                                   }}
                                   onDrop={async (e) => {
                                     e.preventDefault();
                                     setDragOverFolderId(null);
                                     if (!isOwnProfile || !targetUid) return;
                                     const toolId = e.dataTransfer.getData("text/plain");
                                     if (toolId) {
                                       try {
                                         const bRef = doc(db, "users", targetUid, "bookmarks", toolId);
                                         await setDoc(bRef, {
                                           toolId,
                                           projectId: proj.id,
                                           bookmarkedAt: new Date()
                                         });
                                       } catch (err) {
                                         console.error("Failed to move bookmark to project:", err);
                                       }
                                     }
                                   }}
                                   className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all duration-200 relative group ${
                                     isDragOver
                                     ? "bg-orange-500/20 border-orange-500 scale-105 shadow-[0_0_20px_rgba(249,115,22,0.3)] ring-2 ring-orange-500/50"
                                     : isSelected
                                     ? "bg-orange-500/10 border-orange-500/40 shadow-inner ring-1 ring-orange-500/25"
                                     : "bg-slate-950/40 border-slate-800/80 hover:border-slate-700"
                                   }`}
                                 >
                                   <div className="flex items-center justify-between w-full">
                                     <Folder className={`w-6 h-6 ${isDragOver || isSelected ? "text-orange-400" : "text-slate-600"}`} />
                                     <span className="text-[10px] font-mono font-bold bg-slate-900 px-2 py-0.5 rounded text-slate-400">
                                       {projBookmarks.length}
                                     </span>
                                   </div>
                                   <div className="w-full min-w-0">
                                     <h4 className="text-xs font-black text-white uppercase tracking-wider block truncate">{proj.name}</h4>
                                     <span className="text-[10px] text-slate-500 block truncate">{proj.desc || "Curated projects"}</span>
                                   </div>
                                 </button>
                               );
                             })}
                          </div>
                        </div>

                        {/* Selected Project Stats & Management */}
                        {selectedProjectId !== "all" && selectedProjectId !== "unassigned" && (
                          <div className="bg-slate-950/30 border border-slate-800/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="truncate">
                              <h4 className="text-sm font-black text-white uppercase tracking-wider">
                                {curatedProjects.find(p => p.id === selectedProjectId)?.name || "Selected Project"}
                              </h4>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {curatedProjects.find(p => p.id === selectedProjectId)?.desc || "No custom description provided for this collection."}
                              </p>
                            </div>
                            {isOwnProfile && (
                              <button
                                onClick={async () => {
                                  if (!window.confirm("Are you sure you want to delete this project collection? Bookmarks inside it will remain in your general collection.")) return;
                                  
                                  // Update all bookmarks associated with this project to projectId = null
                                  const associated = bookmarks.filter(b => b.projectId === selectedProjectId);
                                  for (const b of associated) {
                                    await setDoc(doc(db, "users", targetUid, "bookmarks", b.id), {
                                      ...b,
                                      projectId: null
                                    });
                                  }

                                  // Delete project document
                                  await deleteDoc(doc(db, "users", targetUid, "curated_projects", selectedProjectId));
                                  setSelectedProjectId("all");
                                }}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
                              >
                                <Trash2 className="w-4 h-4" /> Delete Collection
                              </button>
                            )}
                          </div>
                        )}

                        {/* Filtered Tools list with Export Toolbar */}
                        <div className="space-y-4">
                          {(() => {
                            const filteredTools = bookmarkTools.filter(tool => {
                              const bookmarkObj = bookmarks.find(b => b.toolId === tool.id);
                              if (!bookmarkObj) return false;
                              if (selectedProjectId === "all") return true;
                              if (selectedProjectId === "unassigned") return bookmarkObj.projectId === null;
                              return bookmarkObj.projectId === selectedProjectId;
                            });

                            return (
                              <>
                                {/* Export & Stats Toolbar */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-950/20 border border-slate-800/60 p-4 rounded-2xl gap-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono font-bold text-slate-400">
                                      {selectedProjectId === "all" ? "All Saved Bookmarks" : selectedProjectId === "unassigned" ? "General Bookmarks" : (curatedProjects.find(p => p.id === selectedProjectId)?.name || "Curated Project")}
                                    </span>
                                    <span className="text-[10px] font-mono font-bold bg-slate-900 px-2 py-0.5 rounded text-slate-500">
                                      {filteredTools.length} {filteredTools.length === 1 ? "tool" : "tools"}
                                    </span>
                                  </div>

                                  {filteredTools.length > 0 && (
                                    <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Export Project:</span>
                                      <button
                                        onClick={() => handleExport("json")}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                      >
                                        <Download className="w-3.5 h-3.5 text-blue-400" />
                                        JSON
                                      </button>
                                      <button
                                        onClick={() => handleExport("csv")}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                      >
                                        <Download className="w-3.5 h-3.5 text-emerald-400" />
                                        CSV
                                      </button>
                                    </div>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {filteredTools.length > 0 ? (
                                    filteredTools.map((tool, idx) => (
                                      <div
                                        key={tool.id}
                                        draggable={isOwnProfile}
                                        onDragStart={(e) => {
                                          if (isOwnProfile) {
                                            e.dataTransfer.setData("text/plain", tool.id);
                                            e.dataTransfer.effectAllowed = "move";
                                          }
                                        }}
                                        className={isOwnProfile ? "cursor-grab active:cursor-grabbing hover:shadow-2xl transition-all hover:scale-[1.01] active:scale-[0.99]" : ""}
                                        title={isOwnProfile ? "Drag this tool card to a project folder above to move it!" : ""}
                                      >
                                        <ToolCard 
                                          tool={tool} 
                                          isFavorited={favoriteIds.includes(tool.id)}
                                          onView={() => onViewTool(tool)}
                                          onEdit={() => onEditTool(tool)}
                                          onDelete={() => onDeleteTool(tool)}
                                          onShare={() => onShareTool(tool)}
                                          index={idx}
                                        />
                                      </div>
                                    ))
                                  ) : (
                                    <div className="col-span-2 py-20 bg-slate-950/30 border border-slate-800 border-dashed rounded-[2rem] flex flex-col items-center justify-center text-center font-sans">
                                      <Bookmark className="w-12 h-12 text-slate-700 mb-4" aria-hidden="true" />
                                      <h3 className="text-xl font-bold text-white mb-2">Collection is Empty</h3>
                                      <p className="text-slate-500 max-w-xs">
                                        {isOwnProfile 
                                          ? "Bookmark tools and organize them into your projects from their detail panels."
                                          : `${profile?.displayName || "This user"} has no tools in this curated project yet.`}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </motion.div>
                    )}

                    {activeTab === "activity" && (
                      <motion.div 
                        id="activity-panel"
                        role="tabpanel"
                        tabIndex={0}
                        aria-labelledby="tab-activity"
                        key="activity"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4 outline-none"
                      >
                        {activities.length > 0 ? activities.map(act => {
                          const Icon = act.type === 'submission' ? Send : act.type === 'favorite' ? Heart : ThumbsUp;
                          const color = act.type === 'submission' ? 'text-blue-500' : act.type === 'favorite' ? 'text-red-500' : 'text-blue-400';
                          return (
                            <div key={act.id} className="bg-slate-950/50 border border-slate-800 p-5 rounded-2xl flex items-center justify-between group hover:bg-slate-900 transition-all focus-within:ring-1 focus-within:ring-white/20">
                              <div className="flex items-center gap-5">
                                <div className={`w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center p-3 border border-white/5 ${color} shadow-inner`}>
                                  <Icon className="w-full h-full" aria-hidden="true" />
                                </div>
                                <div>
                                  <p className="text-sm text-slate-200 font-black mb-0.5">
                                    <span className="uppercase tracking-widest text-[10px] text-slate-500 mr-2 font-bold">{act.type}</span>
                                    {act.targetName}
                                  </p>
                                  <p className="text-[10px] text-slate-500 font-mono italic">
                                    {act.timestamp?.toDate().toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <button 
                                onClick={() => {
                                  getDoc(doc(db, "ai_tools", act.targetId)).then(d => {
                                    if(d.exists()) onViewTool({id: d.id, ...d.data() } as AiTool);
                                  });
                                }}
                                className="p-3 bg-slate-800 text-slate-500 hover:text-white rounded-xl transition-all border border-slate-700 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                aria-label={`View tool ${act.targetName}`}
                              >
                                <ChevronRight className="w-5 h-5" aria-hidden="true" />
                              </button>
                            </div>
                          );
                        }) : (
                          <div className="py-20 bg-slate-950/30 border border-slate-800 border-dashed rounded-[2rem] flex flex-col items-center justify-center text-center">
                            <History className="w-12 h-12 text-slate-700 mb-4" aria-hidden="true" />
                            <h4 className="text-xl font-bold text-white mb-2">No History Recorded</h4>
                            <p className="text-slate-500 max-w-xs">
                              Your activity history will appear here once you interact with the community.
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* LinkedIn style Recommendation Section */}
                <div className="mt-12 pt-10 border-t border-slate-800">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-black text-white flex items-center gap-2">
                        <Quote className="w-5 h-5 text-blue-400" />
                        Recommendations ({profile?.recommendations?.length || 0})
                      </h3>
                      <p className="text-xs text-slate-500 font-mono">Professional endorsements from certified members</p>
                    </div>
                  </div>

                  {/* Recommendation Input Form: available for logged-in connected users (not own profile) */}
                  {!isOwnProfile && currentUser && connectionStatus === 'connected' && (
                    <form onSubmit={handleSubmitRecommendation} className="bg-slate-950/40 border border-slate-800 p-5 rounded-2xl mb-8 space-y-4">
                      <div className="flex items-start gap-3">
                        <img 
                          src={currentUser.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=60"} 
                          alt="Your profile picture" 
                          className="w-10 h-10 rounded-xl object-cover shrink-0 border border-slate-800"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 space-y-2">
                          <label htmlFor="recommendation" className="sr-only">Write a recommendation</label>
                          <textarea 
                            id="recommendation"
                            value={recommendationText}
                            onChange={e => setRecommendationText(e.target.value)}
                            placeholder={`Recommend ${profile?.displayName || "this professional"} to others...`}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none h-20 resize-none transition-all placeholder:text-slate-600"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={!recommendationText.trim() || isSubmittingRec}
                          className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider disabled:opacity-50 transition-all cursor-pointer"
                        >
                          {isSubmittingRec ? "Submitting..." : "Submit Recommendation"}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Display list of Recommendations */}
                  <div className="space-y-4">
                    {profile?.recommendations && profile.recommendations.length > 0 ? (
                      profile.recommendations.map(rec => {
                        const canDelete = currentUser && (currentUser.uid === rec.fromId || isOwnProfile);
                        return (
                          <div key={rec.id} className="bg-slate-950/20 border border-slate-900 p-5 rounded-2xl relative group hover:border-slate-800/80 transition-all">
                            <div className="flex items-start gap-4">
                              <img 
                                src={rec.fromPhoto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=60"} 
                                alt={rec.fromName} 
                                className="w-10 h-10 rounded-xl object-cover border border-slate-800 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-black text-white truncate">{rec.fromName}</h4>
                                <p className="text-[10px] text-slate-500 font-mono mt-0.5 mb-2">
                                  {rec.createdAt ? new Date(rec.createdAt).toLocaleDateString() : 'Professional Endorsement'}
                                </p>
                                <p className="text-slate-300 text-xs italic leading-relaxed">
                                  "{rec.text}"
                                </p>
                              </div>
                            </div>
                            
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDeleteRecommendation(rec.id)}
                                className="absolute top-4 right-4 p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all rounded-lg hover:bg-red-500/10 cursor-pointer"
                                title="Delete Recommendation"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-10 bg-slate-950/10 border border-slate-900 border-dashed rounded-2xl flex flex-col items-center justify-center text-center">
                        <Quote className="w-8 h-8 text-slate-800 mb-2" />
                        <p className="text-slate-600 text-xs italic">No professional recommendations given yet.</p>
                        {currentUser && connectionStatus !== 'connected' && !isOwnProfile && (
                          <p className="text-[10px] text-slate-500 mt-1 max-w-xs">
                            Connect with {profile?.displayName || "this user"} to leave a professional recommendation.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditingProfile && (
          <div 
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditingProfile(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              aria-hidden="true"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl bg-slate-900 border border-slate-800 p-10 rounded-[2rem] shadow-2xl"
            >
              <h3 id="edit-profile-title" className="text-3xl font-black text-white mb-8">Personalize Your Profile</h3>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="bio" className="text-sm font-black uppercase tracking-widest text-slate-500 ml-1">Bio</label>
                  <textarea 
                    id="bio"
                    value={profileData.bio}
                    onChange={e => setProfileData(p => ({ ...p, bio: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none h-24 resize-none transition-all placeholder:text-slate-700"
                    placeholder="Tell the community about yourself..."
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="headline" className="text-sm font-black uppercase tracking-widest text-slate-500 ml-1">Professional Headline</label>
                  <input 
                    id="headline"
                    type="text"
                    value={profileData.headline}
                    onChange={e => setProfileData(p => ({ ...p, headline: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
                    placeholder="e.g. Senior AI Research Scientist"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="currentPosition" className="text-sm font-black uppercase tracking-widest text-slate-500 ml-1">Company / Position</label>
                  <input 
                    id="currentPosition"
                    type="text"
                    value={profileData.currentPosition}
                    onChange={e => setProfileData(p => ({ ...p, currentPosition: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
                    placeholder="e.g. Google DeepMind"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="location" className="text-sm font-black uppercase tracking-widest text-slate-500 ml-1">Location</label>
                  <input 
                    id="location"
                    type="text"
                    value={profileData.location}
                    onChange={e => setProfileData(p => ({ ...p, location: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
                    placeholder="e.g. San Francisco, CA (or Remote)"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="website" className="text-sm font-black uppercase tracking-widest text-slate-500 ml-1">Website / Portfolio</label>
                  <input 
                    id="website"
                    type="url"
                    value={profileData.website}
                    onChange={e => setProfileData(p => ({ ...p, website: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
                    placeholder="https://yourportfolio.com"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="skills-edit" className="text-sm font-black uppercase tracking-widest text-slate-500 ml-1">Skills (Comma separated)</label>
                  <input 
                    id="skills-edit"
                    type="text"
                    value={profileData.skills}
                    onChange={e => setProfileData(p => ({ ...p, skills: e.target.value }))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
                    placeholder="React, AI Engineering, LLMs..."
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="flex-1 py-4 bg-slate-800 text-white rounded-xl font-black hover:bg-slate-750 transition-all focus:ring-2 focus:ring-white/20"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20 focus:ring-2 focus:ring-blue-400"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
