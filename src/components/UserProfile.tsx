import * as React from "react";
import { useAuth } from "../context/AuthContext";
import { collection, query, where, onSnapshot, orderBy, limit, doc, getDoc, updateDoc, serverTimestamp, setDoc, deleteDoc, increment } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { AiTool, UserActivity, UserProfile as UserProfileType } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { User, Heart, Send, History, Globe, Briefcase, Plus, Settings, LogOut, CheckCircle2, ChevronRight, Bookmark, ThumbsUp, UserPlus, UserMinus } from "lucide-react";
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
}

export default function UserProfile({ onClose, onEditTool, onDeleteTool, onViewTool, onShareTool, favoriteIds, userRole, userId }: UserProfileProps) {
  const { user: currentUser, logout } = useAuth();
  const targetUid = userId || currentUser?.uid;
  const isOwnProfile = targetUid === currentUser?.uid;

  const [profile, setProfile] = React.useState<UserProfileType | null>(null);
  const [submissions, setSubmissions] = React.useState<AiTool[]>([]);
  const [favorites, setFavorites] = React.useState<AiTool[]>([]);
  const [activities, setActivities] = React.useState<UserActivity[]>([]);
  const [activeTab, setActiveTab] = React.useState<"submissions" | "favorites" | "activity">("submissions");
  const [isEditingProfile, setIsEditingProfile] = React.useState(false);
  const [isFollowing, setIsFollowing] = React.useState(false);
  const [isFollowLoading, setIsFollowLoading] = React.useState(false);
  const [profileData, setProfileData] = React.useState({ bio: "", website: "", skills: "" });

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
          skills: (data.skills || []).join(", ")
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

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isOwnProfile) return;
    try {
      const profileRef = doc(db, "users", currentUser.uid);
      await updateDoc(profileRef, {
        bio: profileData.bio,
        website: profileData.website,
        skills: profileData.skills.split(",").map(s => s.trim()).filter(s => s),
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
                <div className="bg-slate-950/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-xl flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                       <span className="px-3 py-1 bg-blue-600 text-white text-[8px] font-black uppercase tracking-[0.2em] rounded-full border border-blue-400/50 shadow-lg whitespace-nowrap">
                         {userRole}
                       </span>
                    </div>
                    <img 
                      src={profile?.photoURL || null} 
                      alt={`${profile?.displayName || "User"}'s profile picture`} 
                      className="w-32 h-32 rounded-3xl border-4 border-slate-900 shadow-2xl"
                    />
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 border-4 border-slate-900 rounded-full" title="Online" />
                  </div>
                  
                  <h2 id="profile-heading" className="text-2xl font-black text-white mb-1">{profile?.displayName}</h2>
                  <p className="text-slate-500 font-mono text-xs mb-6 lowercase">{profile?.email}</p>

                  <div className="w-full flex justify-center gap-4 sm:gap-6 mb-8 border-y border-slate-800/50 py-4" role="group" aria-label="Statistics">
                    <div className="text-center">
                      <p className="text-xl font-black text-white">{submissions.length}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Subs</p>
                    </div>
                    <div className="text-center border-l border-slate-800/30 pl-4 sm:pl-6">
                      <p className="text-xl font-black text-white">{profile?.followersCount || 0}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Followers</p>
                    </div>
                    <div className="text-center border-l border-slate-800/30 pl-4 sm:pl-6">
                      <p className="text-xl font-black text-white">{profile?.followingCount || 0}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Following</p>
                    </div>
                    <div className="text-center border-l border-slate-800/30 pl-4 sm:pl-6">
                      <p className="text-xl font-black text-white">{favoriteIds.length}</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Favs</p>
                    </div>
                  </div>

                  {profile?.bio ? (
                    <p className="text-slate-300 text-sm italic mb-6">"{profile.bio}"</p>
                  ) : (
                    <p className="text-slate-600 text-xs italic mb-6">No bio added yet.</p>
                  )}

                  <div className="flex flex-wrap gap-2 justify-center mb-8" aria-label="Skills">
                    {profile?.skills?.map(skill => (
                      <span key={skill} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                        {skill}
                      </span>
                    )) || <p className="text-slate-700 text-[10px] uppercase font-bold tracking-widest">No skills listed</p>}
                  </div>

                  <div className="w-full space-y-3">
                    {isOwnProfile && (
                      <>
                        <button 
                          onClick={() => setIsEditingProfile(true)}
                          className="w-full flex items-center justify-center gap-2 py-3 bg-white text-black rounded-xl font-black text-sm hover:bg-slate-100 transition-all shadow-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <Settings className="w-4 h-4" aria-hidden="true" /> Edit Profile
                        </button>
                        <button 
                          onClick={logout}
                          className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-slate-500 rounded-xl font-bold text-sm hover:text-red-400 transition-all border border-slate-800 focus:ring-2 focus:ring-red-500"
                        >
                          <LogOut className="w-4 h-4" aria-hidden="true" /> Sign Out
                        </button>
                      </>
                    )}
                    {!isOwnProfile && (
                      <div className="flex flex-col gap-2 w-full">
                        <button 
                          onClick={handleFollow}
                          disabled={isFollowLoading}
                          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all shadow-lg focus:ring-2 ${
                            isFollowing 
                            ? 'bg-slate-800 text-white border border-slate-700 hover:bg-slate-700' 
                            : 'bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-500'
                          }`}
                        >
                          {isFollowLoading ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                              <Settings className="w-4 h-4" />
                            </motion.div>
                          ) : (
                            isFollowing ? <><UserMinus className="w-4 h-4" /> Unfollow</> : <><UserPlus className="w-4 h-4" /> Follow</>
                          )}
                        </button>
                        
                        {profile?.website && (
                          <a 
                            href={profile.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 text-slate-400 rounded-xl font-black text-sm hover:bg-slate-800 transition-all border border-slate-800"
                          >
                            <Globe className="w-4 h-4" /> Website
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 mt-6 lg:mt-24">
                <div role="tablist" className="flex items-center gap-8 mb-10 border-b border-slate-800" aria-label="Profile navigation">
                  <button 
                    role="tab"
                    aria-selected={activeTab === "submissions"}
                    aria-controls="submissions-panel"
                    id="tab-submissions"
                    onClick={() => setActiveTab("submissions")}
                    className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative outline-none focus:text-blue-400 ${
                      activeTab === "submissions" ? "text-blue-500" : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    Submissions
                    {activeTab === "submissions" && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 rounded-full" />}
                  </button>
                  <button 
                    role="tab"
                    aria-selected={activeTab === "favorites"}
                    aria-controls="favorites-panel"
                    id="tab-favorites"
                    onClick={() => setActiveTab("favorites")}
                    className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative outline-none focus:text-red-300 ${
                      activeTab === "favorites" ? "text-red-400" : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    Favorites
                    {activeTab === "favorites" && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-red-400 rounded-full" />}
                  </button>
                  <button 
                    role="tab"
                    aria-selected={activeTab === "activity"}
                    aria-controls="activity-panel"
                    id="tab-activity"
                    onClick={() => setActiveTab("activity")}
                    className={`pb-4 text-sm font-black uppercase tracking-widest transition-all relative outline-none focus:text-white ${
                      activeTab === "activity" ? "text-slate-100" : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    Recent Activity
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
                        {submissions.length > 0 ? submissions.map(tool => (
                          <ToolCard 
                            key={tool.id} 
                            tool={tool} 
                            isFavorited={favoriteIds.includes(tool.id)}
                            onView={() => onViewTool(tool)}
                            onEdit={() => onEditTool(tool)}
                            onDelete={() => onDeleteTool(tool)}
                            onShare={() => onShareTool(tool)}
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
                        {favorites.length > 0 ? favorites.map(tool => (
                          <ToolCard 
                            key={tool.id} 
                            tool={tool} 
                            isFavorited={favoriteIds.includes(tool.id)}
                            onView={() => onViewTool(tool)}
                            onEdit={() => onEditTool(tool)}
                            onDelete={() => onDeleteTool(tool)}
                            onShare={() => onShareTool(tool)}
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
