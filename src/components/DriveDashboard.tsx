import * as React from "react";
import { useAuth } from "../context/AuthContext";
import { AiTool } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  Folder, 
  FolderOpen, 
  FileText, 
  FileSpreadsheet, 
  FileImage, 
  File, 
  AlertCircle, 
  Plus, 
  Search, 
  Trash2, 
  ExternalLink, 
  Download, 
  Cloud, 
  RefreshCw, 
  Check, 
  Info,
  Loader2,
  Lock
} from "lucide-react";

interface DriveDashboardProps {
  tools: AiTool[];
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  webContentLink?: string;
  createdTime?: string;
  modifiedTime?: string;
}

export default function DriveDashboard({ tools }: DriveDashboardProps) {
  const { accessToken, login, logout, user } = useAuth();
  const [files, setFiles] = React.useState<DriveFile[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [isBackupLoading, setIsBackupLoading] = React.useState(false);
  const [backupSuccessMessage, setBackupSuccessMessage] = React.useState<string | null>(null);
  
  // Custom interactive dialogs states
  const [newFolderModal, setNewFolderModal] = React.useState(false);
  const [newFolderName, setNewFolderName] = React.useState("");
  const [isFolderCreating, setIsFolderCreating] = React.useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const [confirmDeleteName, setConfirmDeleteName] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Auto Sync States
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = React.useState<boolean>(() => {
    return localStorage.getItem("agid_drive_autosync") !== "false";
  });
  const [autoSyncStatus, setAutoSyncStatus] = React.useState<"idle" | "syncing" | "success" | "error">("idle");
  const [lastAutoSynced, setLastAutoSynced] = React.useState<Date | null>(null);

  const handleToggleAutoSync = () => {
    const nextState = !isAutoSyncEnabled;
    setIsAutoSyncEnabled(nextState);
    localStorage.setItem("agid_drive_autosync", String(nextState));
  };

  const fetchFiles = React.useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      let url = "https://www.googleapis.com/drive/v3/files?pageSize=15&fields=files(id,name,mimeType,size,webViewLink,webContentLink,createdTime,modifiedTime)&orderBy=modifiedTime desc";
      if (searchQuery.trim()) {
        const escapedQuery = searchQuery.replace(/'/g, "\\'");
        url = `https://www.googleapis.com/drive/v3/files?q=name+contains+'${encodeURIComponent(escapedQuery)}'&pageSize=15&fields=files(id,name,mimeType,size,webViewLink,webContentLink,createdTime,modifiedTime)&orderBy=modifiedTime desc`;
      }
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized: Your session may have expired. Please reconnect.");
        }
        throw new Error(`Failed to fetch files from Drive (${response.status})`);
      }
      
      const data = await response.json();
      setFiles(data.files || []);
    } catch (err: any) {
      console.error("Drive Fetch Error:", err);
      setError(err.message || "An unexpected error occurred while loading files.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, searchQuery]);

  React.useEffect(() => {
    if (accessToken) {
      fetchFiles();
    }
  }, [accessToken, fetchFiles]);

  // Debounced auto-sync to agid_tools_autosync.json
  React.useEffect(() => {
    if (!accessToken || !isAutoSyncEnabled || tools.length === 0) return;

    setAutoSyncStatus("syncing");
    const timer = setTimeout(async () => {
      try {
        const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name%3D%27agid_tools_autosync.json%27%20and%20trashed%3Dfalse`;
        const searchRes = await fetch(searchUrl, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!searchRes.ok) {
          throw new Error("Search request failed");
        }

        const searchData = await searchRes.json();
        const existingFile = searchData.files && searchData.files[0];
        const fileId = existingFile?.id;

        if (fileId) {
          const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
          const updateRes = await fetch(updateUrl, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(tools, null, 2),
          });

          if (!updateRes.ok) {
            throw new Error("Update request failed");
          }
        } else {
          const createMetaRes = await fetch("https://www.googleapis.com/drive/v3/files", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: "agid_tools_autosync.json",
              mimeType: "application/json",
            }),
          });

          if (!createMetaRes.ok) {
            throw new Error("Metadata creation failed");
          }

          const createMetaData = await createMetaRes.json();
          const newFileId = createMetaData.id;

          const uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${newFileId}?uploadType=media`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(tools, null, 2),
          });

          if (!uploadRes.ok) {
            throw new Error("Media upload failed");
          }
        }

        setAutoSyncStatus("success");
        setLastAutoSynced(new Date());
        fetchFiles();
      } catch (err) {
        console.error("Auto-sync failed:", err);
        setAutoSyncStatus("error");
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [tools, accessToken, isAutoSyncEnabled, fetchFiles]);

  const handleConnect = async () => {
    setError(null);
    try {
      await login();
    } catch (err: any) {
      console.error("Connection Flow Failed:", err);
      setError("Failed to connect to Google Account.");
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessToken || !newFolderName.trim() || isFolderCreating) return;
    
    setIsFolderCreating(true);
    try {
      const response = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          mimeType: "application/vnd.google-apps.folder"
        })
      });

      if (!response.ok) {
        throw new Error("Failed to create folder");
      }

      setNewFolderName("");
      setNewFolderModal(false);
      await fetchFiles();
    } catch (err: any) {
      setError(err.message || "Failed to create folder");
    } finally {
      setIsFolderCreating(false);
    }
  };

  const handleBackupTools = async () => {
    if (!accessToken || isBackupLoading) return;

    const confirmed = window.confirm(
      "Confirm Backup: Are you sure you want to export your AI Tools directory listing data to Google Drive? This will create a secure backup file inside your cloud storage."
    );
    if (!confirmed) return;

    setIsBackupLoading(true);
    setBackupSuccessMessage(null);
    setError(null);

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const metadata = {
        name: `agid_tools_backup_${timestamp}.json`,
        mimeType: "application/json"
      };

      const boundary = "agid_backup_boundary";
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const requestBody = 
        delimiter +
        "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
        JSON.stringify(metadata) +
        delimiter +
        "Content-Type: application/json\r\n\r\n" +
        JSON.stringify(tools, null, 2) +
        closeDelim;

      const response = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`
        },
        body: requestBody
      });

      if (!response.ok) {
        throw new Error(`Failed to upload backup json (${response.status})`);
      }

      setBackupSuccessMessage(`Successfully backed up ${tools.length} tools to Google Drive!`);
      setTimeout(() => setBackupSuccessMessage(null), 6000);
      await fetchFiles();
    } catch (err: any) {
      setError(err.message || "Failed to export backup to Google Drive.");
    } finally {
      setIsBackupLoading(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!accessToken || !confirmDeleteId || isDeleting) return;

    setIsDeleting(true);
    setError(null);
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${confirmDeleteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        throw new Error("Unable to delete this file. Please verify write permissions.");
      }

      setConfirmDeleteId(null);
      setConfirmDeleteName(null);
      await fetchFiles();
    } catch (err: any) {
      setError(err.message || "Failed to delete from space");
    } finally {
      setIsDeleting(false);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === "application/vnd.google-apps.folder") {
      return <Folder className="w-5 h-5 text-amber-500 fill-amber-500/10" />;
    }
    if (mimeType.includes("document") || mimeType.includes("pdf") || mimeType.includes("text")) {
      return <FileText className="w-5 h-5 text-blue-500" />;
    }
    if (mimeType.includes("spreadsheet") || mimeType.includes("sheet") || mimeType.includes("csv")) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    }
    if (mimeType.includes("image")) {
      return <FileImage className="w-5 h-5 text-indigo-500" />;
    }
    return <File className="w-5 h-5 text-slate-400" />;
  };

  const formatBytes = (bytes?: string) => {
    if (!bytes) return "—";
    const num = parseInt(bytes, 10);
    if (isNaN(num)) return "—";
    if (num === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(num) / Math.log(k));
    return parseFloat((num / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="bg-slate-950/90 border border-sky-500/30 rounded-3xl p-6 shadow-2xl w-full shadow-sky-500/5 relative overflow-hidden">
      {/* Decorative colored glow bar at the top */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-sky-400 via-blue-500 to-sky-400" />
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-500/10 rounded-2xl border border-sky-400/20">
            <Cloud className="w-6 h-6 text-sky-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-black text-white uppercase tracking-wider">Google Drive Cloud</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Workspace cloud storage & backups</p>
          </div>
        </div>

        {accessToken ? (
          <div className="flex flex-wrap items-center gap-3">
            {/* Auto-Sync Toggle & Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 rounded-xl border border-slate-800">
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAutoSyncEnabled}
                  onChange={handleToggleAutoSync}
                  className="sr-only peer"
                />
                <div className="w-7 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-3 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-sky-500 peer-checked:after:bg-white peer-checked:after:border-transparent"></div>
                <span className="ml-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Auto-Sync
                </span>
              </label>
              <div className="h-4 w-px bg-slate-800" />
              <div className="flex items-center gap-1.5">
                {autoSyncStatus === "syncing" && (
                  <Loader2 className="w-3 h-3 text-sky-400 animate-spin" />
                )}
                {autoSyncStatus === "success" && (
                  <Check className="w-3 h-3 text-emerald-400" />
                )}
                {autoSyncStatus === "error" && (
                  <AlertCircle className="w-3 h-3 text-red-400" />
                )}
                <span className="text-[9px] font-mono font-bold text-slate-500">
                  {autoSyncStatus === "syncing" && "SYNCING..."}
                  {autoSyncStatus === "success" && `SYNCED`}
                  {autoSyncStatus === "error" && "ERROR"}
                  {autoSyncStatus === "idle" && "IDLE"}
                </span>
              </div>
            </div>

            <button
              onClick={handleBackupTools}
              disabled={isBackupLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-500 hover:from-sky-500 hover:to-blue-400 disabled:opacity-40 text-white rounded-xl text-xs font-black uppercase tracking-wider border border-sky-500/20 shadow-lg transition-all"
            >
              {isBackupLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Cloud className="w-3.5 h-3.5" />
              )}
              Backup Directory Tools
            </button>

            <button
              onClick={() => setNewFolderModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 text-slate-200 hover:bg-slate-700 rounded-xl text-xs font-black uppercase tracking-wider border border-slate-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              New Folder
            </button>

            <button
              onClick={fetchFiles}
              disabled={loading}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl border border-slate-700 transition"
              title="Refresh files list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        ) : null}
      </div>

      {/* Connection Gate */}
      {!accessToken ? (
        <div className="flex flex-col items-center justify-center py-10 lg:py-16 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-950/20 px-4">
          <div className="p-4 bg-sky-500/5 rounded-full border border-sky-500/10 mb-4 text-sky-400/80">
            <Lock className="w-8 h-8" />
          </div>
          <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">Authorize Storage Channel</h4>
          <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
            Link your Google Drive storage to preview files, save real-time backups of directories, and manage folders instantly.
          </p>

          <button
            onClick={handleConnect}
            className="gsi-material-button focus:ring-2 focus:ring-sky-500/40 relative active:scale-98 transition transform hover:opacity-95"
            style={{ margin: "0 auto" }}
          >
            <div className="gsi-material-button-state"></div>
            <div className="gsi-material-button-content-wrapper">
              <div className="gsi-material-button-icon">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: "block" }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span className="gsi-material-button-contents">Sign in with Google</span>
            </div>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Notifications and Alerts */}
          {backupSuccessMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
            >
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{backupSuccessMessage}</span>
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Search Bar filter */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search files in your Google Drive..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all font-bold"
            />
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>

          {/* Google Drive Files List layout */}
          <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-950/20">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-sky-400 mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Querying Virtual Storage...</span>
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <FolderOpen className="w-8 h-8 text-slate-700 mb-2" />
                <span className="text-xs text-slate-400 font-bold block">No Drive Files Detected</span>
                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-1 block">Try creating a folder or building backups above</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/50 max-h-[360px] overflow-y-auto">
                {files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3.5 hover:bg-slate-800/20 transition group">
                    <div className="flex items-center gap-3 min-w-0 pr-4">
                      <div className="flex-shrink-0">
                        {getFileIcon(file.mimeType)}
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate group-hover:text-sky-400 transition-colors">
                          {file.name}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono block mt-0.5">
                          {formatBytes(file.size)} • {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : ""}
                        </span>
                      </div>
                    </div>

                    {/* Actions control panel */}
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-slate-850 hover:bg-sky-500/10 text-slate-400 hover:text-sky-400 rounded-lg transition border border-slate-800"
                          title="Open in Drive"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {/* Download option (Direct if non-google platform formats) */}
                      {file.webContentLink && !file.mimeType.includes("application/vnd.google-apps") && (
                        <a
                          href={file.webContentLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-slate-850 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 rounded-lg transition border border-slate-800"
                          title="Download file"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {/* Delete destructive button */}
                      <button
                        onClick={() => {
                          setConfirmDeleteId(file.id);
                          setConfirmDeleteName(file.name);
                        }}
                        className="p-1.5 bg-slate-850 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition border border-slate-800"
                        title="Delete file"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Folder Dialog Modal */}
      <AnimatePresence>
        {newFolderModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" role="dialog" aria-modal="true">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative"
            >
              <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">Create Custom Folder</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-4">Add folder to Root Directory</p>

              <form onSubmit={handleCreateFolder} className="space-y-4">
                <input
                  type="text"
                  required
                  placeholder="E.g. AGID Backups"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-xl px-4.5 py-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 transition-all font-bold"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewFolderModal(false);
                      setNewFolderName("");
                    }}
                    className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isFolderCreating || !newFolderName.trim()}
                    className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-xl font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5"
                  >
                    {isFolderCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Create"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Protective Delete Confirmation modal */}
      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" role="dialog" aria-modal="true">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-red-500/20 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative"
            >
              <div className="p-3 bg-red-500/10 rounded-full w-fit mb-4 text-red-400 border border-red-400/20">
                <Trash2 className="w-6 h-6 animate-pulse" />
              </div>

              <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">Confirm Destruction</h4>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-white">"{confirmDeleteName}"</strong> from your Google Drive? This action is absolutely irreversible.
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    setConfirmDeleteId(null);
                    setConfirmDeleteName(null);
                  }}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteFile}
                  disabled={isDeleting}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-xl font-black text-xs uppercase tracking-wider transition flex items-center justify-center gap-1.5"
                >
                  {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Confirm Delete"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
