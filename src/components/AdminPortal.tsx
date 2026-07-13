import * as React from "react";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, updateDoc, limit, orderBy, addDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { AdminRole, UserRole, ClickLog } from "../types";
import { X, Shield, Plus, Trash2, UserPlus, Mail, AlertTriangle, Check, Crown, Edit3, BarChart3, Users, Globe, MapPin, MousePointer2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface AdminPortalProps {
  onClose: () => void;
}

type AdminTab = 'staff' | 'analytics' | 'notifications' | 'import' | 'seo';

export default function AdminPortal({ onClose }: AdminPortalProps) {
  const { user } = useAuth();
  const [admins, setAdmins] = React.useState<AdminRole[]>([]);
  const [clicks, setClicks] = React.useState<ClickLog[]>([]);
  const [activeTab, setActiveTab] = React.useState<AdminTab>('staff');
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newEmail, setNewEmail] = React.useState("");
  const [newRole, setNewRole] = React.useState<UserRole>("Editor");
  const [isAdding, setIsAdding] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Bulk Import Tool State
  const [importJson, setImportJson] = React.useState("");
  const [importStatus, setImportStatus] = React.useState<"idle" | "parsing" | "saving" | "success" | "error">("idle");
  const [importMessage, setImportMessage] = React.useState("");
  const [parsedTools, setParsedTools] = React.useState<any[]>([]);

  // SEO & Indexing Control State
  const [pinging, setPinging] = React.useState(false);
  const [pingResult, setPingResult] = React.useState<any>(null);

  const handlePingSearchEngines = async () => {
    setPinging(true);
    setPingResult(null);
    try {
      const res = await fetch("/api/seo/ping", { method: "POST" });
      const data = await res.json();
      setPingResult(data);
    } catch (err: any) {
      setPingResult({ success: false, error: err.message });
    } finally {
      setPinging(false);
    }
  };

  React.useEffect(() => {
    const qAdmins = query(collection(db, "admins"));
    const unsubAdmins = onSnapshot(qAdmins, (snapshot) => {
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as (AdminRole & { id: string })[];
      setAdmins(data as any);
    });

    const qClicks = query(collection(db, "clicks"), orderBy("timestamp", "desc"), limit(1000));
    const unsubClicks = onSnapshot(qClicks, (snapshot) => {
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as ClickLog[];
      setClicks(data);
    });

    const qNotifs = query(collection(db, "notifications"), orderBy("timestamp", "desc"), limit(50));
    const unsubNotifs = onSnapshot(qNotifs, (snapshot) => {
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setNotifications(data);
      setLoading(false);
    });

    return () => {
      unsubAdmins();
      unsubClicks();
      unsubNotifs();
    };
  }, []);

  const analyticsData = React.useMemo(() => {
    const toolsMap: Record<string, number> = {};
    const countriesMap: Record<string, number> = {};
    const citiesMap: Record<string, number> = {};
    const typesMap: Record<string, number> = {};

    clicks.forEach(c => {
      toolsMap[c.toolName] = (toolsMap[c.toolName] || 0) + 1;
      if (c.location?.country) {
        countriesMap[c.location.country] = (countriesMap[c.location.country] || 0) + 1;
      }
      if (c.location?.city) {
        citiesMap[`${c.location.city}, ${c.location.country || ''}`] = (citiesMap[`${c.location.city}, ${c.location.country || ''}`] || 0) + 1;
      }
      typesMap[c.type] = (typesMap[c.type] || 0) + 1;
    });

    const topTools = Object.entries(toolsMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));
    const topCountries = Object.entries(countriesMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }));
    const topCities = Object.entries(citiesMap).sort((a, b) => b[1] - a[1]).slice(0, 10);

    return { topTools, topCountries, topCities, typesMap, total: clicks.length };
  }, [clicks]);

  const handleParseImport = () => {
    try {
      setImportStatus("parsing");
      setImportMessage("");
      if (!importJson.trim()) {
        throw new Error("Please paste JSON content first.");
      }
      
      const parsed = JSON.parse(importJson);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      
      const validated = items.map((item: any, idx: number) => {
        if (!item.name) {
          throw new Error(`Tool at index ${idx} is missing required 'name' field.`);
        }
        if (!item.url) {
          throw new Error(`Tool "${item.name}" (index ${idx}) is missing required 'url' field.`);
        }
        
        return {
          name: String(item.name).trim(),
          category: (item.category || "Other") as any,
          type: (item.type || "Web App") as any,
          url: String(item.url).trim(),
          apk: item.apk ? String(item.apk).trim() : "",
          desc: String(item.desc || "Compiled general intelligence AI app description.").trim(),
          upvotes: Number(item.upvotes || 0),
          averageRating: Number(item.averageRating || 5),
          totalRatingsCount: Number(item.totalRatingsCount || 1),
          tags: Array.isArray(item.tags) ? item.tags.map(t => String(t).trim()) : [],
          createdAt: new Date(),
        };
      });

      setParsedTools(validated);
      setImportStatus("idle");
      setImportMessage(`Parsed ${validated.length} tools successfully! Ready to import.`);
    } catch (err: any) {
      setImportStatus("error");
      setImportMessage(err?.message || "Invalid JSON array format.");
      setParsedTools([]);
    }
  };

  const handleSaveImportedTools = async () => {
    if (parsedTools.length === 0) return;
    setImportStatus("saving");
    setImportMessage("Saving tools directly to Firestore directory database...");
    
    let count = 0;
    try {
      for (const tool of parsedTools) {
        await addDoc(collection(db, "ai_tools"), {
          ...tool,
          createdAt: tool.createdAt || serverTimestamp(),
          updatedAt: tool.updatedAt || serverTimestamp()
        });
        count++;
      }
      setImportStatus("success");
      setImportMessage(`Successfully imported ${count} tools directly to Firestore directory!`);
      setParsedTools([]);
      setImportJson("");
    } catch (err: any) {
      setImportStatus("error");
      setImportMessage(`Import failed after saving ${count} items: ${err?.message || err}`);
    }
  };
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || isAdding) return;
    setError(null);
    setIsAdding(true);

    try {
      // Note: In a real app we'd need to resolve email to UID. 
      // For this prototype, we'll store the record by a unique ID and assume 
      // the security rules check the email field or we'd have a server-side sync.
      // But for simplicity here, we use a placeholder ID or the email as ID.
      const adminId = btoa(newEmail.trim().toLowerCase());
      await setDoc(doc(db, "admins", adminId), {
        email: newEmail.trim().toLowerCase(),
        role: newRole,
        addedBy: user?.email || "System",
        createdAt: serverTimestamp()
      });
      setNewEmail("");
      setNewRole("Editor");
    } catch (err) {
      setError("Failed to add admin. Permission denied?");
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveAdmin = async (adminId: string) => {
    try {
      await deleteDoc(doc(db, "admins", adminId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `admins/${adminId}`);
    }
  };

  const handleUpdateRole = async (adminId: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, "admins", adminId), {
        role: newRole,
        updatedAt: serverTimestamp()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `admins/${adminId}`);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
      >
        {/* Header */}
        <div className="px-10 py-8 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-600/30">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Control Room</h2>
              <div className="flex items-center gap-1 mt-1">
                <button 
                  onClick={() => setActiveTab('staff')}
                  className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'staff' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Users className="w-3 h-3 inline mr-1.5" /> Staff
                </button>
                <div className="w-px h-2 bg-slate-800 mx-1" />
                <button 
                  onClick={() => setActiveTab('analytics')}
                  className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'analytics' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <BarChart3 className="w-3 h-3 inline mr-1.5" /> Analytics
                </button>
                <div className="w-px h-2 bg-slate-800 mx-1" />
                <button 
                  onClick={() => setActiveTab('notifications')}
                  className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'notifications' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Mail className="w-3 h-3 inline mr-1.5" /> Alerts
                  {notifications.filter(n => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </button>
                <div className="w-px h-2 bg-slate-800 mx-1" />
                <button 
                  type="button"
                  onClick={() => setActiveTab('import')}
                  className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'import' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Plus className="w-3 h-3 inline mr-1.5" /> Import Tools
                </button>
                <div className="w-px h-2 bg-slate-800 mx-1" />
                <button 
                  type="button"
                  onClick={() => setActiveTab('seo')}
                  className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === 'seo' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <Globe className="w-3 h-3 inline mr-1.5" /> SEO & Indexing
                </button>
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {activeTab === 'staff' && (
            <div className="flex flex-col lg:flex-row gap-10">
              {/* Management Panel */}
              <div className="flex-1 space-y-8">
                <div className="bg-slate-950/50 border border-slate-800 p-8 rounded-[2rem]">
                  <div className="flex items-center gap-3 mb-6">
                    <UserPlus className="w-5 h-5 text-blue-500" />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Enroll Privileged User</h3>
                  </div>
                  <form onSubmit={handleAddAdmin} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                        <input 
                          type="email"
                          required
                          value={newEmail}
                          onChange={e => setNewEmail(e.target.value)}
                          placeholder="e.g. colleague@company.com"
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-12 pr-4 py-4 text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Assigned Role</label>
                      <div className="grid grid-cols-3 gap-3">
                        {(["Manager", "Editor"]).map((role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => setNewRole(role as UserRole)}
                            className={`py-4 rounded-2xl text-xs font-black uppercase tracking-tighter transition-all border ${
                              newRole === role 
                              ? 'bg-blue-600/10 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                              : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
                            }`}
                          >
                            {role}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button 
                      type="submit"
                      disabled={isAdding}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50"
                    >
                      {isAdding ? "Processing..." : "Grant Privileges"}
                    </button>

                    {error && (
                      <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] font-bold uppercase">
                        <AlertTriangle className="w-4 h-4" />
                        {error}
                      </div>
                    )}
                  </form>
                </div>

                <div className="p-6 bg-blue-600/5 border border-blue-500/10 rounded-[2rem]">
                  <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Crown className="w-3 h-3" /> System Root Admin
                  </h4>
                  <p className="text-sm text-slate-400 font-medium">
                    <span className="text-white font-black">johnnyblueagency@gmail.com</span> is the directory creator and has permanent global access.
                  </p>
                </div>
              </div>

              {/* User List */}
              <div className="flex-1 flex flex-col gap-4">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Authorized Staff ({admins.length})</h3>
                <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-2">
                  {admins.map((admin: any) => (
                    <div key={admin.id} className="bg-slate-950/50 border border-slate-800 p-5 rounded-2xl flex items-center justify-between group hover:border-slate-700 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                          admin.role === 'Manager' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-green-500/10 border-green-500/20 text-green-400'
                        }`}>
                          {admin.role === 'Manager' ? <Crown className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-black text-white lowercase leading-none mb-1">{admin.email}</p>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{admin.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                          <button 
                            onClick={() => handleRemoveAdmin(admin.id)}
                            className="p-2.5 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center"
                            title="Revoke access"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'analytics' && (
            <div className="space-y-10">
              {/* Analytics Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-slate-950/50 border border-slate-800 p-6 rounded-3xl">
                  <div className="flex items-center gap-3 mb-4">
                    <MousePointer2 className="w-4 h-4 text-blue-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Engagements</span>
                  </div>
                  <p className="text-4xl font-black text-white leading-none">{analyticsData.total}</p>
                  <p className="text-[8px] text-slate-600 uppercase tracking-widest mt-2">Clicks & Visits</p>
                </div>
                {/* Add more metric cards if needed */}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-slate-950/50 border border-slate-800 p-8 rounded-[2.5rem] flex flex-col h-[400px]">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                      <BarChart3 className="w-5 h-5 text-blue-500" />
                      <h3 className="text-sm font-black text-white uppercase tracking-widest">Top Performing Tools</h3>
                    </div>
                  </div>
                  <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsData.topTools} layout="vertical">
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 900}} />
                        <ReTooltip 
                          contentStyle={{backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px'}}
                          itemStyle={{color: '#fff', fontSize: '10px'}}
                        />
                        <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                          {analyticsData.topTools.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'][index % 5]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-950/50 border border-slate-800 p-8 rounded-[2.5rem] flex flex-col h-[400px]">
                  <div className="flex items-center gap-3 mb-8">
                    <Globe className="w-5 h-5 text-blue-500" />
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Audience Geography</h3>
                  </div>
                  <div className="flex-1 w-full flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                    {analyticsData.topCountries.length > 0 ? (
                      analyticsData.topCountries.map((c, i) => (
                        <div key={c.name} className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl border border-white/5">
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 flex items-center justify-center bg-blue-600/10 text-blue-500 rounded-lg text-[10px] font-black">{i + 1}</span>
                            <span className="text-xs font-bold text-white uppercase tracking-widest">{c.name}</span>
                          </div>
                          <span className="text-xs font-black text-slate-500">{c.value} CLICKS</span>
                        </div>
                      ))
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-700">
                        <MapPin className="w-12 h-12 mb-4 opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No Geo Data Recorded</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/50 border border-slate-800 p-8 rounded-[2.5rem]">
                <div className="flex items-center gap-3 mb-8">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Recent Detailed Click History (Geo Audit)</h3>
                </div>
                <div className="overflow-hidden border border-white/5 rounded-2xl bg-slate-900/50">
                  <table className="w-full text-left">
                    <thead className="bg-slate-800/50 border-b border-white/5">
                      <tr>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Tool Name</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Action</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Location</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">City</th>
                        <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {clicks.slice(0, 20).map(c => (
                        <tr key={c.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4">
                            <span className="text-xs font-bold text-white uppercase tracking-tighter truncate max-w-[150px] inline-block">{c.toolName}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-blue-600/10 text-blue-400 text-[8px] font-black uppercase rounded-md border border-blue-500/20">{c.type}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Globe className="w-3 h-3 text-slate-600" />
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{c.location?.country || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] text-slate-500 font-mono tracking-widest">{c.location?.city || '-'}</span>
                          </td>
                          <td className="px-6 py-4 text-[10px] text-slate-700 font-mono">
                            {c.timestamp?.toDate ? c.timestamp.toDate().toLocaleTimeString() : 'Recent'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <Mail className="w-6 h-6 text-blue-500" />
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">System Alerts & Signups</h3>
                </div>
              </div>
              <div className="space-y-4">
                {notifications.map(n => (
                  <div key={n.id} className="bg-slate-950/50 border border-slate-800 p-6 rounded-2xl flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${n.type === 'new_signup' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        {n.type === 'new_signup' ? <Plus className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white mb-1">{n.message}</p>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">
                          {n.timestamp?.toDate ? n.timestamp.toDate().toLocaleString() : 'Just now'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl">
                    <p className="text-xs font-black text-slate-600 uppercase tracking-widest">No recent alerts</p>
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'import' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Plus className="w-6 h-6 text-blue-500" />
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Bulk Tool Importer</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Paste a JSON array of tools to populate the directory immediately</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/50 border border-slate-800 p-8 rounded-3xl space-y-6">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">JSON Content (Array of Tool Objects)</label>
                  <textarea
                    rows={10}
                    value={importJson}
                    onChange={(e) => setImportJson(e.target.value)}
                    placeholder={`[\n  {\n    "name": "Gemini Ultra 2.0",\n    "category": "LLM & Chat",\n    "type": "Web App",\n    "url": "https://gemini.google.com",\n    "desc": "Google's most capable AI and AGI model for general multi-modal reasoning tasks.",\n    "tags": ["gemini", "llm", "google", "agent"],\n    "upvotes": 120\n  }\n]`}
                    className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white font-mono text-xs focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
                  />
                </div>

                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={handleParseImport}
                    disabled={importStatus === "saving" || !importJson.trim()}
                    className="px-6 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                  >
                    Validate & Parse JSON
                  </button>

                  {parsedTools.length > 0 && (
                    <button
                      onClick={handleSaveImportedTools}
                      disabled={importStatus === "saving"}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
                    >
                      {importStatus === "saving" ? "Importing..." : `Commit ${parsedTools.length} Tools to Directory`}
                    </button>
                  )}
                </div>

                {importMessage && (
                  <div className={`p-4 rounded-xl text-xs font-semibold ${
                    importStatus === "success" ? "bg-green-500/10 border border-green-500/20 text-green-400" :
                    importStatus === "error" ? "bg-red-500/10 border border-red-500/20 text-red-400" :
                    "bg-blue-500/10 border border-blue-500/20 text-blue-400"
                  }`}>
                    {importMessage}
                  </div>
                )}

                {parsedTools.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Parsed Preview List ({parsedTools.length})</h4>
                    <div className="border border-white/5 rounded-2xl overflow-hidden bg-slate-900/40">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-800/50 border-b border-white/5">
                          <tr>
                            <th className="px-4 py-3 font-black text-slate-500 uppercase tracking-widest">Name</th>
                            <th className="px-4 py-3 font-black text-slate-500 uppercase tracking-widest">Category</th>
                            <th className="px-4 py-3 font-black text-slate-500 uppercase tracking-widest">Type</th>
                            <th className="px-4 py-3 font-black text-slate-500 uppercase tracking-widest">Tags</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {parsedTools.map((t, idx) => (
                            <tr key={idx} className="hover:bg-white/5">
                              <td className="px-4 py-3 font-bold text-white uppercase tracking-tighter">{t.name}</td>
                              <td className="px-4 py-3 text-slate-400 font-mono text-[10px] uppercase tracking-widest">{t.category}</td>
                              <td className="px-4 py-3 text-slate-400 font-mono text-[10px] uppercase tracking-widest">{t.type}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1">
                                  {t.tags.map((tag: string) => (
                                    <span key={tag} className="px-1.5 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[9px] text-blue-400 font-semibold font-mono">#{tag}</span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'seo' && (
            <div className="space-y-8 text-left">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
                    <Globe className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-white uppercase tracking-tight">SEO & Search Indexing Hub</h3>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Manage and request Google & Bing index crawl cycles instantly</p>
                  </div>
                </div>
              </div>

              {/* Dynamic Status Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Google Site Verification Status */}
                <div className="bg-slate-950/50 border border-slate-800 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Google Verification Tag</h4>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase tracking-widest rounded">
                      Active In Head
                    </span>
                  </div>
                  <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl font-mono text-xs text-slate-300 break-all">
                    {import.meta.env.VITE_GOOGLE_SITE_VERIFICATION ? (
                      <span className="text-blue-400 font-bold">{import.meta.env.VITE_GOOGLE_SITE_VERIFICATION}</span>
                    ) : (
                      <span className="text-slate-500 italic">No environment VITE_GOOGLE_SITE_VERIFICATION set (using default fallback)</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    The Verification Tag is dynamically compiled into both the HTML shell (`/index.html`) and injected inside the header runtime.
                  </p>
                </div>

                {/* Sitemap Status */}
                <div className="bg-slate-950/50 border border-slate-800 p-6 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Dynamic XML Sitemap</h4>
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-black uppercase tracking-widest rounded">
                      Live Generator
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                    <span className="text-xs font-mono text-slate-300 truncate mr-2">/sitemap.xml</span>
                    <a 
                      href="/sitemap.xml" 
                      target="_blank" 
                      rel="noreferrer" 
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5"
                    >
                      View XML
                    </a>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-normal">
                    Generates valid sitemap listings on-the-fly for every AI tool, categories, and articles registered in your Firestore database.
                  </p>
                </div>
              </div>

              {/* Indexing Requests Actions */}
              <div className="bg-slate-950/50 border border-slate-800 p-8 rounded-3xl space-y-6">
                <div>
                  <h4 className="text-sm font-black text-white uppercase tracking-tight">Crawl Request Command (Ping)</h4>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Submit your sitemap directly to search engines to speed up tool indexation</p>
                </div>

                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={handlePingSearchEngines}
                    disabled={pinging}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-600/10"
                  >
                    {pinging ? "Dispatching Pings..." : "Trigger Sitemap Crawl Request"}
                  </button>
                </div>

                {pingResult && (
                  <div className={`p-5 rounded-2xl text-xs font-medium space-y-3 ${
                    pingResult.success ? "bg-green-500/5 border border-green-500/15 text-green-300" : "bg-red-500/5 border border-red-500/15 text-red-300"
                  }`}>
                    <p className="font-bold flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${pingResult.success ? "bg-green-500" : "bg-red-500"}`} />
                      {pingResult.success ? "Sitemap Submission Results:" : "Submission Failed:"}
                    </p>
                    {pingResult.success ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1 text-[11px] font-mono">
                        <div className="bg-slate-900 border border-white/5 p-3 rounded-xl flex items-center justify-between">
                          <span>Google Bot Ping:</span>
                          <span className={pingResult.results?.google?.ok ? "text-emerald-400 font-bold" : "text-amber-400"}>
                            {pingResult.results?.google?.status ? `Status ${pingResult.results.google.status}` : "Queued/Redirected"}
                          </span>
                        </div>
                        <div className="bg-slate-900 border border-white/5 p-3 rounded-xl flex items-center justify-between">
                          <span>Bing Bot Ping:</span>
                          <span className={pingResult.results?.bing?.ok ? "text-emerald-400 font-bold" : "text-amber-400"}>
                            {pingResult.results?.bing?.status ? `Status ${pingResult.results.bing.status}` : "Queued/Redirected"}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="font-mono text-[11px] text-red-400">{pingResult.error || "Unknown server-side error"}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Checklist / Education to Request Google Indexing */}
              <div className="bg-slate-950/50 border border-slate-850 p-8 rounded-3xl space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  <h4 className="text-xs font-black text-white uppercase tracking-widest">Google Search Console Indexing Steps</h4>
                </div>
                <div className="text-xs text-slate-400 space-y-3 leading-relaxed">
                  <p>Because search engines require site ownership verification to execute immediate crawling, complete these steps to index your directory pages within minutes:</p>
                  <ol className="list-decimal list-inside space-y-2 pl-2">
                    <li>Open <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="text-blue-400 font-bold hover:underline">Google Search Console</a>.</li>
                    <li>Add your custom domain: <code className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-blue-300">https://www.agidappglobal.com</code></li>
                    <li>Select <strong>HTML Tag</strong> verification and verify using the key shown above.</li>
                    <li>Go to the <strong>Sitemaps</strong> section on the left sidebar and paste: <code className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-blue-300">sitemap.xml</code>, then click Submit.</li>
                    <li>Use the top search bar (URL Inspection) to paste any specific AI tool or article link, then click <strong>"Request Indexing"</strong> to force immediate crawlers to index that page.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
