import * as React from "react";
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp, updateDoc, limit, orderBy } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { AdminRole, UserRole, ClickLog } from "../types";
import { X, Shield, Plus, Trash2, UserPlus, Mail, AlertTriangle, Check, Crown, Edit3, BarChart3, Users, Globe, MapPin, MousePointer2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface AdminPortalProps {
  onClose: () => void;
}

type AdminTab = 'staff' | 'analytics' | 'notifications';

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
        </div>
      </motion.div>
    </div>
  );
}
