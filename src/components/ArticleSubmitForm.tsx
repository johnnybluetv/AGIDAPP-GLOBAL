import * as React from "react";
import { Send, CheckCircle2, AlertCircle, X, Type, FileText, Image as ImageIcon, Video, Youtube, Link as LinkIcon, Loader2, Sparkles, Wand2, FilePlus, RefreshCcw, Download } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage, handleFirestoreError, OperationType } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { UserRole } from "../types";

interface ArticleSubmitFormProps {
  onClose: () => void;
  userRole: UserRole;
}

export default function ArticleSubmitForm({ onClose, userRole }: ArticleSubmitFormProps) {
  const { user } = useAuth();
  const [formData, setFormData] = React.useState({
    title: "",
    content: "",
    videoEmbedUrl: "",
  });
  const [mediaFile, setMediaFile] = React.useState<File | null>(null);
  const [mediaType, setMediaType] = React.useState<'image' | 'video' | 'document' | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState<number>(0);
  const [status, setStatus] = React.useState<"idle" | "submitting" | "success" | "error">("idle");
  const [isAiSuggestingTitle, setIsAiSuggestingTitle] = React.useState(false);
  const [titleSuggestions, setTitleSuggestions] = React.useState<string[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = React.useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = React.useState(false);
  const [isWritingWithAi, setIsWritingWithAi] = React.useState(false);
  const [videoOpName, setVideoOpName] = React.useState<string | null>(null);
  const [videoStatus, setVideoStatus] = React.useState<string>("");
  
  const contentLen = formData.content.length;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'document') => {
    if (e.target.files && e.target.files[0]) {
      setMediaFile(e.target.files[0]);
      setMediaType(type);
    }
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? `https://www.youtube.com/embed/${match[2]}` : url;
  };

  const handleSuggestTitles = async () => {
    if (!formData.title.trim() && !formData.content.trim()) return;
    setIsAiSuggestingTitle(true);
    try {
      const response = await fetch("/api/ai/suggest-titles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: formData.title || formData.content.slice(0, 100) }),
      });
      const data = await response.json();
      setTitleSuggestions(data.titles || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiSuggestingTitle(false);
    }
  };

  const handleGenerateImage = async () => {
    const prompt = window.prompt("Describe the image you want to generate:");
    if (!prompt) return;
    setIsGeneratingImage(true);
    try {
      const response = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (data.image) {
        // Convert base64 to File
        const res = await fetch(data.image);
        const blob = await res.blob();
        const file = new File([blob], "ai_generated_image.png", { type: "image/png" });
        setMediaFile(file);
        setMediaType("image");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to generate image. Please ensure you have a paid Gemini key configured.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleGenerateVideo = async () => {
    const prompt = window.prompt("Describe the short AI video you want to generate:");
    if (!prompt) return;
    setIsGeneratingVideo(true);
    setVideoStatus("Starting generation...");
    try {
      const response = await fetch("/api/ai/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await response.json();
      if (data.operationName) {
        setVideoOpName(data.operationName);
        pollVideoStatus(data.operationName);
      }
    } catch (err) {
      console.error(err);
      setIsGeneratingVideo(false);
    }
  };

  const pollVideoStatus = async (opName: string) => {
    const check = async () => {
      try {
        const response = await fetch("/api/ai/video-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operationName: opName }),
        });
        const data = await response.json();
        if (data.done) {
          downloadVideo(opName);
        } else {
          setVideoStatus("Generating video (this may take a few minutes)...");
          setTimeout(check, 5000);
        }
      } catch (err) {
        console.error(err);
        setIsGeneratingVideo(false);
      }
    };
    check();
  };

  const downloadVideo = async (opName: string) => {
    setVideoStatus("Downloading video...");
    try {
      const response = await fetch("/api/ai/video-download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operationName: opName }),
      });
      const blob = await response.blob();
      const file = new File([blob], "ai_generated_video.mp4", { type: "video/mp4" });
      setMediaFile(file);
      setMediaType("video");
      setIsGeneratingVideo(false);
      setVideoOpName(null);
    } catch (err) {
      console.error(err);
      setIsGeneratingVideo(false);
    }
  };

  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (prefix: string, suffix: string = "") => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const currentText = formData.content;
    const selectedText = currentText.substring(start, end);
    const newText = currentText.substring(0, start) + prefix + selectedText + suffix + currentText.substring(end);
    
    setFormData(prev => ({ ...prev, content: newText }));
    
    // Resume focus
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length);
      }
    }, 10);
  };

  const handleWriteWithAi = async () => {
    const prompt = window.prompt("What should the AI write or improve?");
    if (!prompt) return;
    setIsWritingWithAi(true);
    try {
      const response = await fetch("/api/ai/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt, 
          currentContent: formData.content,
          title: formData.title 
        }),
      });
      const data = await response.json();
      if (data.content) {
        setFormData(prev => ({ ...prev, content: data.content }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsWritingWithAi(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    setStatus("submitting");

    try {
      let mediaUrl = "";
      let finalEmbedUrl = formData.videoEmbedUrl;
      
      if (finalEmbedUrl && finalEmbedUrl.includes("youtube.com") || finalEmbedUrl.includes("youtu.be")) {
        finalEmbedUrl = getYouTubeEmbedUrl(finalEmbedUrl);
      }

      if (mediaFile) {
        const fileExt = mediaFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const storageRef = ref(storage, `article_media/${fileName}`);
        
        const uploadTask = uploadBytesResumable(storageRef, mediaFile);
        
        mediaUrl = await new Promise((resolve, reject) => {
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            }, 
            (error) => reject(error), 
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resolve(downloadURL);
            }
          );
        });
      }

      await addDoc(collection(db, "articles"), {
        title: formData.title,
        content: formData.content,
        authorId: user?.uid || "anonymous",
        authorName: user?.displayName || "Anonymous User",
        authorEmail: user?.email || "No Email",
        authorPhoto: user?.photoURL || "",
        authorRole: userRole,
        status: "published",
        views: 0,
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || null,
        videoEmbedUrl: finalEmbedUrl || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setStatus("success");
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error(error);
      setStatus("error");
      handleFirestoreError(error, OperationType.CREATE, "articles");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative"
      >
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Submit Article</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Share knowledge about AGI Tools</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          <AnimatePresence>
            {status === "success" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center text-center p-8 transition-all"
              >
                <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                <h3 className="text-2xl font-black text-white mb-2">Article Published!</h3>
                <p className="text-slate-400">Your insights have been shared with the community.</p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Article Title</label>
              <button
                type="button"
                onClick={handleSuggestTitles}
                disabled={isAiSuggestingTitle}
                className="flex items-center gap-1.5 text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors disabled:opacity-50"
              >
                {isAiSuggestingTitle ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                AI Suggestions
              </button>
            </div>
            <div className="relative">
              <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                required
                type="text"
                placeholder="e.g. The Impact of Sparse Autoencoders on LLM Interpretability"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-700 font-medium"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <AnimatePresence>
              {titleSuggestions.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-1 pt-1"
                >
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-1">Suggested Titles:</p>
                  <div className="flex flex-wrap gap-2">
                    {titleSuggestions.map((suggestion, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setFormData(prev => ({ ...prev, title: suggestion })); setTitleSuggestions([]); }}
                        className="px-2 py-1 bg-slate-800 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 text-[10px] rounded-lg border border-slate-700 hover:border-blue-500/30 transition-all font-medium text-left"
                      >
                        {suggestion}
                      </button>
                    ))}
                    <button onClick={() => setTitleSuggestions([])} className="text-[9px] font-black text-slate-500 hover:text-white uppercase tracking-widest px-2">Dismiss</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Attach Media</label>
              <div className="flex gap-2">
                <label className={`flex-1 flex flex-col items-center justify-center gap-1.5 p-3 border-2 border-dashed rounded-xl cursor-pointer transition-all ${mediaType === 'image' ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}>
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-[9px] font-bold uppercase tracking-tighter">Image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'image')} />
                </label>
                <label className={`flex-1 flex flex-col items-center justify-center gap-1.5 p-3 border-2 border-dashed rounded-xl cursor-pointer transition-all ${mediaType === 'video' ? 'bg-purple-500/10 border-purple-500/50 text-purple-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}>
                  <Video className="w-4 h-4" />
                  <span className="text-[9px] font-bold uppercase tracking-tighter">Video</span>
                  <input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileChange(e, 'video')} />
                </label>
                <label className={`flex-1 flex flex-col items-center justify-center gap-1.5 p-3 border-2 border-dashed rounded-xl cursor-pointer transition-all ${mediaType === 'document' ? 'bg-orange-500/10 border-orange-500/50 text-orange-400' : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700'}`}>
                  <FilePlus className="w-4 h-4" />
                  <span className="text-[9px] font-bold uppercase tracking-tighter">Doc</span>
                  <input type="file" accept=".pdf,.doc,.docx,.txt,.zip" className="hidden" onChange={(e) => handleFileChange(e, 'document')} />
                </label>
              </div>
              
              <button
                type="button"
                onClick={handleGenerateImage}
                disabled={isGeneratingImage}
                className="w-full mt-2 py-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest hover:bg-blue-600/10 hover:border-blue-500/30 transition-all disabled:opacity-50"
              >
                {isGeneratingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                AI Image Generator
              </button>

              {mediaFile && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-lg border border-slate-700">
                    <span className="text-[10px] text-slate-300 truncate max-w-[150px]">{mediaFile.name}</span>
                    <button type="button" onClick={() => { setMediaFile(null); setMediaType(null); }} className="text-red-400 p-1 hover:bg-red-500/10 rounded-md">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 max-h-32 flex items-center justify-center">
                    {mediaType === 'image' ? (
                      <img src={URL.createObjectURL(mediaFile)} alt="Preview" className="max-h-32 object-contain" />
                    ) : (
                      <video src={URL.createObjectURL(mediaFile)} className="max-h-32 w-full" muted />
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Embed Video URL</label>
              <div className="relative">
                <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Paste YouTube/Vimeo URL"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-700 font-medium text-xs"
                  value={formData.videoEmbedUrl}
                  onChange={(e) => setFormData((prev) => ({ ...prev, videoEmbedUrl: e.target.value }))}
                />
              </div>
              <button
                type="button"
                onClick={handleGenerateVideo}
                disabled={isGeneratingVideo}
                className="w-full py-2.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black text-purple-400 uppercase tracking-widest hover:bg-purple-600/10 hover:border-purple-500/30 transition-all disabled:opacity-50"
              >
                {isGeneratingVideo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Create short AI Video
              </button>
              {isGeneratingVideo && (
                <div className="text-[8px] font-black text-purple-500 uppercase tracking-widest text-center animate-pulse">
                  {videoStatus}
                </div>
              )}
              {formData.videoEmbedUrl && !isGeneratingVideo && (
                <div className="p-2 bg-slate-800/50 rounded-lg border border-slate-700 flex items-center gap-2">
                  <LinkIcon className="w-3 h-3 text-blue-400" />
                  <span className="text-[9px] text-slate-400 truncate">Preview available after publish</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center px-1">
              <div className="flex items-center gap-4">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Content</label>
                <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-lg">
                  <button type="button" onClick={() => insertMarkdown("**", "**")} className="p-1 px-1.5 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] font-black rounded border border-transparent hover:border-slate-700" title="Bold">B</button>
                  <button type="button" onClick={() => insertMarkdown("*", "*")} className="p-1 px-1.5 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] italic rounded border border-transparent hover:border-slate-700" title="Italic">I</button>
                  <button type="button" onClick={() => insertMarkdown("- ")} className="p-1 px-1.5 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] rounded border border-transparent hover:border-slate-700" title="List">List</button>
                  <button type="button" onClick={() => insertMarkdown("`", "`")} className="p-1 px-1.5 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] font-mono rounded border border-transparent hover:border-slate-700" title="Code">Code</button>
                  <button type="button" onClick={() => insertMarkdown("[text](", ")")} className="p-1 px-1.5 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] rounded border border-transparent hover:border-slate-700" title="Link">Link</button>
                  <button type="button" onClick={() => insertMarkdown("![alt](", ")")} className="p-1 px-1.5 hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] rounded border border-transparent hover:border-slate-700" title="Image">Img</button>
                </div>
                <div className="w-px h-3 bg-slate-800" />
                <button
                  type="button"
                  onClick={handleWriteWithAi}
                  disabled={isWritingWithAi}
                  className="flex items-center gap-1.5 text-[10px] font-black text-blue-400 uppercase tracking-widest hover:text-blue-300 transition-colors disabled:opacity-50"
                >
                  {isWritingWithAi ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                  Write with AI
                </button>
                <div className="w-px h-3 bg-slate-800" />
                <label className="flex items-center gap-1.5 text-[10px] font-black text-orange-400 uppercase tracking-widest hover:text-orange-300 transition-colors cursor-pointer">
                  <FilePlus className="w-3 h-3" />
                  Insert Document
                  <input type="file" accept=".pdf,.doc,.docx,.txt,.zip,.xlsx" className="hidden" onChange={(e) => handleFileChange(e, 'document')} />
                </label>
              </div>
              <span className={`text-[10px] font-mono ${contentLen > 4000 ? 'text-red-500' : 'text-slate-500'}`}>
                {contentLen.toLocaleString()} chars
              </span>
            </div>
            <textarea
              ref={textareaRef}
              required
              rows={12}
              placeholder="Start writing your article here... Support markdown for better formatting."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none placeholder:text-slate-700 text-sm leading-relaxed"
              value={formData.content}
              onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
            />
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-800 text-slate-300 font-black rounded-xl hover:bg-slate-700 transition-all uppercase tracking-widest text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={status === "submitting"}
              className="flex-[2] py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-500 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 border border-blue-400/20 relative overflow-hidden"
            >
              {status === "submitting" && uploadProgress > 0 && uploadProgress < 100 && (
                <div 
                  className="absolute inset-0 bg-blue-400/30 transition-all duration-300 pointer-events-none" 
                  style={{ width: `${uploadProgress}%` }}
                />
              )}
              {status === "submitting" ? (
                <div className="flex items-center gap-2">
                  {uploadProgress > 0 && uploadProgress < 100 ? (
                    <span className="text-[10px] font-mono">{Math.round(uploadProgress)}%</span>
                  ) : (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  <span>Publishing...</span>
                </div>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Publish Article
                </>
              )}
            </button>
          </div>

          {status === "error" && (
            <div className="flex items-center gap-2 text-red-500 text-[10px] font-black justify-center uppercase tracking-tighter animate-pulse">
              <AlertCircle className="w-3 h-3" />
              Error: Failed to publish article
            </div>
          )}
        </form>
      </motion.div>
    </div>
  );
}
