import * as React from "react";
import { CATEGORIES, PLATFORM_TYPES, Category, PlatformType } from "../types";
import { Plus, Send, CheckCircle2, AlertCircle, Tag, X as XIcon, ChevronDown, ChevronUp, Info, HelpCircle, Image as ImageIcon, Video, FileText, UploadCloud, Trash2, Paperclip, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage, handleFirestoreError, OperationType } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function SubmitForm() {
  const { user } = useAuth();
  const [showGuidelines, setShowGuidelines] = React.useState(false);
  const [formData, setFormData] = React.useState({
    name: "",
    category: "LLM & Chat" as Category,
    type: "Web App" as PlatformType,
    url: "",
    apk: "",
    desc: ""
  });
  const [tags, setTags] = React.useState<string[]>([]);
  const [tagInput, setTagInput] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [status, setStatus] = React.useState<"idle" | "submitting" | "success" | "error">("idle");
  const [lastSubmittedId, setLastSubmittedId] = React.useState<string | null>(null);
  const descLength = formData.desc.length;

  // Media files uploading states
  const [uploadedFiles, setUploadedFiles] = React.useState<{ url: string; type: 'image' | 'video' | 'document'; name: string }[]>([]);
  const [mediaErrors, setMediaErrors] = React.useState<string | null>(null);
  const [uploadingFilesCount, setUploadingFilesCount] = React.useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setMediaErrors(null);
    setUploadingFilesCount(prev => prev + files.length);

    for (const file of files) {
      // Determine file category
      let type: 'image' | 'video' | 'document' = 'document';
      if (file.type.startsWith('image/')) {
        type = 'image';
      } else if (file.type.startsWith('video/')) {
        type = 'video';
      }

      // Check max size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setMediaErrors(`File "${file.name}" is too large. Max allowed size is 10MB.`);
        setUploadingFilesCount(prev => Math.max(0, prev - 1));
        continue;
      }

      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const storageRef = ref(storage, `ai_products_media/${fileName}`);
        const uploadTask = uploadBytesResumable(storageRef, file);

        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed',
            null,
            (error) => {
              console.error("Upload error:", error);
              reject(error);
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                setUploadedFiles(prev => [...prev, {
                  url: downloadURL,
                  type,
                  name: file.name
                }]);
                resolve();
              } catch (err) {
                reject(err);
              }
            }
          );
        });
      } catch (err) {
        console.error("Failed to upload:", err);
        setMediaErrors(`Failed to upload "${file.name}". Please try again.`);
      } finally {
        setUploadingFilesCount(prev => Math.max(0, prev - 1));
      }
    }
  };

  const removeUploadedFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim().toLowerCase()]);
      }
      setTagInput("");
    }
  };

  const removeTag = (t: string) => {
    setTags(tags.filter(tag => tag !== t));
  };

  const validateUrl = (url: string) => {
    try {
      const parsedUrl = new URL(url);
      const hasValidProtocol = ["http:", "https:"].includes(parsedUrl.protocol);
      const hasValidHostname = parsedUrl.hostname.includes('.');
      return hasValidProtocol && hasValidHostname && url.length > 8;
    } catch {
      return false;
    }
  };

  const validateApk = (url: string) => {
    if (!url) return true; // Optional field
    if (!validateUrl(url)) return false;
    const path = new URL(url).pathname.toLowerCase();
    return path.endsWith('.apk') || url.includes('/download/') || url.includes('drive.google.com') || url.includes('dropbox');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const newErrors: Record<string, string> = {};
    if (!validateUrl(formData.url)) {
      newErrors.url = "Please enter a valid, secure website URL (e.g., https://example.com)";
    }
    if (formData.apk && !validateApk(formData.apk)) {
      newErrors.apk = "Invalid APK link. Must be a direct .apk file or a known download host (Drive/Dropbox)";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setStatus("submitting");

    try {
      const docRef = await addDoc(collection(db, "ai_tools"), {
        ...formData,
        tags,
        mediaFiles: uploadedFiles,
        authorId: user?.uid || "anonymous",
        upvotes: 0,
        createdAt: serverTimestamp()
      });

      setLastSubmittedId(docRef.id);

      if (user) {
        // Track activity
        const activityRef = doc(collection(db, "users", user.uid, "activity"));
        await setDoc(activityRef, {
          type: "submission",
          targetId: docRef.id,
          targetName: formData.name,
          timestamp: serverTimestamp()
        });
      }
      
      setFormData({
        name: "",
        category: "LLM & Chat",
        type: "Web App",
        url: "",
        apk: "",
        desc: ""
      });
      setTags([]);
      setUploadedFiles([]);
      setErrors({}); // Clear any residual errors
      setStatus("success");
    } catch (error) {
      console.error(error);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 5000);
      handleFirestoreError(error, OperationType.CREATE, "ai_tools");
    }
  };

  return (
    <section id="submit-section" className="py-20 border-t border-slate-800 bg-slate-950/50">
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Contribute to the Directory</h2>
          <p className="text-slate-400 mb-8">Knowledge shared is intelligence multiplied. Add a new AI tool to Agidapp Global.</p>

          <div className="max-w-2xl mx-auto mb-10 overflow-hidden">
            <button 
              onClick={() => setShowGuidelines(!showGuidelines)}
              className="w-full flex items-center justify-between p-4 bg-slate-900/50 border border-slate-800 rounded-2xl hover:bg-slate-900 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <HelpCircle className="w-5 h-5 text-blue-400" />
                </div>
                <span className="text-sm font-black text-slate-300 uppercase tracking-widest">Submission Guidelines</span>
              </div>
              {showGuidelines ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
            </button>
            <AnimatePresence>
              {showGuidelines && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-6 bg-slate-950 border-x border-b border-slate-800 rounded-b-2xl grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
                        <Info className="w-3 h-3" />
                        Quality Content
                      </h4>
                      <ul className="space-y-2 text-xs text-slate-400 font-medium">
                        <li className="flex gap-2">
                          <span className="text-blue-500">•</span>
                          Descriptions should be concise (150-300 chars) and functional.
                        </li>
                        <li className="flex gap-2">
                          <span className="text-blue-500">•</span>
                          Avoid marketing jargon or buzzwords.
                        </li>
                        <li className="flex gap-2">
                          <span className="text-blue-500">•</span>
                          Ensure the tool is functional and provides real value.
                        </li>
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-green-400 uppercase tracking-widest flex items-center gap-2">
                        <Tag className="w-3 h-3" />
                        Smart Tagging
                      </h4>
                      <ul className="space-y-2 text-xs text-slate-400 font-medium">
                        <li className="flex gap-2">
                          <span className="text-green-500">•</span>
                          Use 3-5 specific tags (e.g., "generative-audio", "open-source").
                        </li>
                        <li className="flex gap-2">
                          <span className="text-green-500">•</span>
                          Check for similar existing tags to maintain consistency.
                        </li>
                        <li className="flex gap-2">
                          <span className="text-green-500">•</span>
                          Ensure the Website URL starts with https://.
                        </li>
                      </ul>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
          <AnimatePresence>
            {status === "success" && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                role="alert"
                aria-live="assertive"
                className="absolute inset-0 z-10 bg-slate-900 shadow-2xl flex flex-col items-center justify-center text-center p-10"
              >
                <div className="relative mb-6">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1.2, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="absolute inset-0 bg-green-500 rounded-full"
                  />
                  <CheckCircle2 className="w-20 h-20 text-green-500 relative z-10" aria-hidden="true" />
                </div>
                
                <h3 className="text-3xl font-black text-white mb-4">Submission Successful!</h3>
                <p className="text-slate-400 max-w-md mx-auto mb-8">
                  Your tool has been indexed and is now live in the global directory. Thank you for contributing to the community.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <button 
                    type="button"
                    onClick={() => {
                        const url = `${window.location.origin}/?tool=${lastSubmittedId}`;
                        navigator.clipboard.writeText(url);
                    }}
                    className="px-8 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-750 transition-all font-black border border-slate-700"
                  >
                    Copy Direct Link
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setStatus("idle");
                      setLastSubmittedId(null);
                    }}
                    className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition-all font-black shadow-lg shadow-blue-500/20"
                  >
                    Add Another Tool
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-bold text-slate-300 ml-1">Tool Name <span className="text-red-500" aria-hidden="true">*</span></label>
              <input
                id="name"
                required
                aria-required="true"
                type="text"
                placeholder="e.g. ChatGraph AI"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-700"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-bold text-slate-300 ml-1">Category <span className="text-red-500" aria-hidden="true">*</span></label>
              <select
                id="category"
                required
                aria-required="true"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                value={formData.category}
                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value as Category }))}
              >
                {CATEGORIES.map(cat => <option key={cat} value={cat} className="bg-slate-900">{cat}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="type" className="text-sm font-bold text-slate-300 ml-1">Platform Type <span className="text-red-500" aria-hidden="true">*</span></label>
              <select
                id="type"
                required
                aria-required="true"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                value={formData.type}
                onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as PlatformType }))}
              >
                {PLATFORM_TYPES.map(type => <option key={type} value={type} className="bg-slate-900">{type}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="url" className="text-sm font-bold text-slate-300 ml-1 flex justify-between">
                <span>Website URL <span className="text-red-500" aria-hidden="true">*</span></span>
                {validateUrl(formData.url) && (
                  <span className="flex items-center gap-1.5 text-[10px] text-blue-400 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20" role="status">
                    <img 
                      src={`https://www.google.com/s2/favicons?domain=${new URL(formData.url).hostname}&sz=32`} 
                      className="w-3 h-3 rounded" 
                      alt="" 
                      referrerPolicy="no-referrer"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                    Favicon Verified
                  </span>
                )}
              </label>
              <input
                id="url"
                required
                aria-required="true"
                aria-invalid={!!errors.url}
                aria-describedby={errors.url ? "url-error" : undefined}
                type="url"
                placeholder="https://example.com"
                className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors placeholder:text-slate-700 ${errors.url ? 'border-red-500 focus:border-red-500' : 'border-slate-800 focus:border-blue-500'}`}
                value={formData.url}
                onChange={e => {
                  setFormData(prev => ({ ...prev, url: e.target.value }));
                  if (errors.url) setErrors(prev => ({ ...prev, url: "" }));
                }}
              />
              {errors.url && <p id="url-error" className="text-[10px] text-red-500 ml-1 font-bold italic" role="alert">{errors.url}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="apk" className="text-sm font-bold text-slate-300 ml-1">APK Link <span className="text-slate-500 font-normal">(Optional)</span></label>
              <input
                id="apk"
                aria-invalid={!!errors.apk}
                aria-describedby={errors.apk ? "apk-error" : undefined}
                type="url"
                placeholder="Direct download link (Drive, Dropbox, or .apk)"
                className={`w-full bg-slate-950 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors placeholder:text-slate-700 ${errors.apk ? 'border-red-500 focus:border-red-500' : 'border-slate-800 focus:border-blue-500'}`}
                value={formData.apk}
                onChange={e => {
                  setFormData(prev => ({ ...prev, apk: e.target.value }));
                  if (errors.apk) setErrors(prev => ({ ...prev, apk: "" }));
                }}
              />
              {errors.apk && <p id="apk-error" className="text-[10px] text-red-500 ml-1 font-bold italic" role="alert">{errors.apk}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <label htmlFor="tags-input" className="text-sm font-bold text-slate-300 ml-1">Tags <span className="text-slate-500 font-normal">(Press Enter to add)</span></label>
              <div className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 flex flex-wrap gap-2 items-center focus-within:border-blue-500 transition-colors shadow-inner">
                {tags.map(t => (
                  <span key={t} className="bg-slate-800 text-slate-200 px-3 py-1 rounded-lg text-xs flex items-center gap-2 border border-slate-700 font-bold">
                    #{t}
                    <button 
                      type="button" 
                      onClick={() => removeTag(t)} 
                      className="text-slate-500 hover:text-red-400 transition-colors"
                      aria-label={`Remove tag ${t}`}
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <input 
                  id="tags-input"
                  type="text" 
                  autoComplete="off"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={handleAddTag}
                  placeholder={tags.length === 0 ? "e.g. generative, helper, free" : "Add more..."}
                  className="bg-transparent border-none focus:outline-none text-white text-sm flex-1 min-w-[120px] py-1 placeholder:text-slate-700"
                />
              </div>
            </div>

            {/* Product & Service Media Files Section */}
            <div className="space-y-3 md:col-span-2 p-5 bg-slate-950/40 border border-slate-800/80 rounded-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-300">Product & Service Media</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Attach high-fidelity screenshots, videos, or documents</p>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 bg-blue-600/15 border border-blue-500/20 hover:bg-blue-600/20 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Paperclip className="w-3 h-3" />
                  Select Files
                </button>
              </div>

              {/* Hidden file input */}
              <input 
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/*,application/pdf,.doc,.docx"
                onChange={handleMediaUpload}
                className="hidden"
              />

              {/* Drag and Drop Zone */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-800/80 hover:border-blue-500/40 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors bg-slate-950/30 group"
              >
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:scale-110 group-hover:text-sky-400 transition-all duration-300">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider text-center">
                  Drag & Drop media here, or <span className="text-blue-400 group-hover:underline">browse files</span>
                </p>
                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">
                  Images, Videos, and PDFs supported (Max 10MB per file)
                </p>
              </div>

              {/* Media upload error */}
              {mediaErrors && (
                <div className="text-[10px] font-bold text-red-400 flex items-center gap-1.5 bg-red-500/5 p-2 rounded-lg border border-red-500/10">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{mediaErrors}</span>
                </div>
              )}

              {/* List of uploaded files / uploading states */}
              {(uploadedFiles.length > 0 || uploadingFilesCount > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                  {uploadedFiles.map((file, idx) => (
                    <div 
                      key={`uploaded-${idx}`}
                      className="bg-slate-900 border border-slate-800/80 p-3 rounded-xl flex items-center justify-between gap-3 relative group overflow-hidden"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-center text-slate-400 shrink-0 overflow-hidden">
                          {file.type === 'image' ? (
                            <img src={file.url} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" />
                          ) : file.type === 'video' ? (
                            <Video className="w-5 h-5 text-purple-400" />
                          ) : (
                            <FileText className="w-5 h-5 text-emerald-400" />
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-xs font-black text-white truncate max-w-[160px] uppercase tracking-tight">{file.name}</p>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{file.type}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeUploadedFile(idx)}
                        className="p-1.5 rounded-lg bg-slate-950 hover:bg-red-500/10 border border-slate-800 hover:border-red-500/20 text-slate-500 hover:text-red-400 transition-all cursor-pointer"
                        title="Remove attachment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Uploading loading cards placeholders */}
                  {Array.from({ length: uploadingFilesCount }).map((_, i) => (
                    <div 
                      key={`uploading-${i}`}
                      className="bg-slate-900/50 border border-dashed border-slate-800 p-3 rounded-xl flex items-center gap-3 shrink-0"
                    >
                      <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-center text-slate-600">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">UPLOADING_FILE...</p>
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Processing to core storage</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 md:col-span-2">
              <div className="flex justify-between items-center">
                <label htmlFor="desc" className="text-sm font-bold text-slate-300 ml-1">Description <span className="text-red-500" aria-hidden="true">*</span></label>
              </div>
              <div className="relative group/desc">
                <textarea
                  id="desc"
                  required
                  aria-required="true"
                  rows={4}
                  maxLength={1000}
                  placeholder="Explain the tool's core functionality and utility..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 pb-10 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none placeholder:text-slate-700 shadow-inner"
                  value={formData.desc}
                  onChange={e => setFormData(prev => ({ ...prev, desc: e.target.value }))}
                />
                
                <div className="absolute bottom-3 right-3 flex items-center gap-2 pointer-events-none">
                  <span 
                    role="status"
                    aria-label={`${descLength} of 1000 characters used`}
                    className={`text-[9px] font-mono font-black tracking-tighter px-2 py-1 rounded-lg border transition-colors ${
                      descLength >= 1000 
                      ? 'text-red-500 border-red-500/20 bg-red-500/10' 
                      : descLength > 900 
                      ? 'text-orange-400 border-orange-400/20 bg-orange-400/10' 
                      : 'text-slate-500 border-slate-800 bg-slate-900/80 backdrop-blur-sm'
                    }`}
                  >
                    {descLength.toLocaleString()} / 1,000
                  </span>
                </div>

                <div 
                  className="absolute bottom-0 left-0 h-1 bg-slate-800/50 w-full rounded-b-xl overflow-hidden"
                  aria-hidden="true"
                >
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(descLength / 1000) * 100}%` }}
                    className={`h-full transition-colors ${descLength >= 1000 ? 'bg-red-500' : descLength > 900 ? 'bg-orange-400' : 'bg-blue-600'}`}
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            id="submit-button"
            type="submit"
            disabled={status === "submitting"}
            aria-busy={status === "submitting"}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all group shadow-lg shadow-blue-600/20 border border-blue-400/20"
          >
            {status === "submitting" ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-slate-400 border-t-white rounded-full animate-spin" />
                INDEXING_TOOL...
              </span>
            ) : (
              <>
                <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" aria-hidden="true" />
                Submit to Directory
              </>
            )}
          </button>

          {status === "error" && (
            <div 
              role="alert" 
              className="mt-4 flex items-center gap-2 text-red-400 text-sm font-black justify-center animate-pulse uppercase tracking-tighter"
            >
              <AlertCircle className="w-4 h-4" />
              CRITICAL: SUBMISSION_FAILED
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
