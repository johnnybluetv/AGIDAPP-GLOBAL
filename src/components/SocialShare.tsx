import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Share2, Twitter, Linkedin, Facebook, Copy, Check, MessageSquare, Globe, Image as ImageIcon, ExternalLink, Sparkles } from "lucide-react";

interface SocialShareProps {
  url: string;
  title: string;
  text?: string;
  image?: string;
  variant?: "compact" | "full" | "minimal";
}

export default function SocialShare({ url, title, text, image, variant = "full" }: SocialShareProps) {
  const [copied, setCopied] = React.useState(false);
  const [showTooltip, setShowTooltip] = React.useState<string | null>(null);
  const [socialPreviewPlatform, setSocialPreviewPlatform] = React.useState<'twitter' | 'linkedin'>('twitter');

  const shareText = text || `Discover ${title} on Agidapp Global!`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url,
        });
      } catch (err) {
        console.warn("[SocialShare] Native share dismissed or failed:", err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[SocialShare] Failed to copy link:", err);
    }
  };

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + " " + url)}`,
    reddit: `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`
  };

  const triggerLink = (platformUrl: string) => {
    window.open(platformUrl, "_blank", "noopener,noreferrer");
  };

  // If minimal variant is chosen (e.g. modal header)
  if (variant === "minimal") {
    return (
      <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800/80 px-2 py-1 rounded-xl">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={navigator.share ? handleNativeShare : handleCopyLink}
          className={`p-1.5 rounded-lg transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer ${
            copied 
              ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" 
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
          title={navigator.share ? "Share" : "Copy Link"}
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5 text-blue-400" />}
          <span className="text-[9px] font-black tracking-widest uppercase hidden xs:inline">
            {copied ? "Copied" : "Share"}
          </span>
        </motion.button>
      </div>
    );
  }

  // If compact variant is chosen (e.g. ToolCard footer)
  if (variant === "compact") {
    return (
      <div className="flex items-center gap-1 bg-slate-950 border border-slate-800/80 p-0.5 rounded-xl">
        {/* Native Share / Copy */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={navigator.share ? handleNativeShare : handleCopyLink}
          className={`p-1.5 sm:p-2 rounded-lg transition-all cursor-pointer ${
            copied ? 'text-emerald-400 bg-emerald-500/10' : 'text-blue-400 hover:text-white hover:bg-blue-500/10'
          }`}
          title={copied ? "Copied!" : "Copy/Share Link"}
        >
          {copied ? <Check className="w-3.5 h-3.5 sm:w-4 h-4" /> : <Share2 className="w-3.5 h-3.5 sm:w-4 h-4" />}
        </motion.button>
        <div className="w-px h-4 bg-slate-800 mx-0.5" />
        
        {/* Twitter */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => triggerLink(shareLinks.twitter)}
          className="p-1.5 sm:p-2 text-slate-400 hover:text-sky-400 hover:bg-sky-500/10 rounded-lg transition-all cursor-pointer"
          title="Share on Twitter"
        >
          <Twitter className="w-3.5 h-3.5 sm:w-4 h-4" />
        </motion.button>

        {/* LinkedIn */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => triggerLink(shareLinks.linkedin)}
          className="p-1.5 sm:p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-600/10 rounded-lg transition-all cursor-pointer"
          title="Share on LinkedIn"
        >
          <Linkedin className="w-3.5 h-3.5 sm:w-4 h-4" />
        </motion.button>

        {/* Facebook */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => triggerLink(shareLinks.facebook)}
          className="p-1.5 sm:p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all cursor-pointer"
          title="Share on Facebook"
        >
          <Facebook className="w-3.5 h-3.5 sm:w-4 h-4" />
        </motion.button>
      </div>
    );
  }

  // Full variant with social feed preview card
  return (
    <div className="w-full bg-slate-900/40 rounded-2xl border border-slate-800 p-5 space-y-6">
      {/* Share Section Header */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-4">
        <div>
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5 text-blue-400" /> Share & Distribute
          </h4>
          <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1">Connect with tech & global communities</p>
        </div>

        {/* Platform Toggle */}
        <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setSocialPreviewPlatform('twitter')}
            className={`px-2.5 py-1 text-[8px] font-black uppercase rounded-md transition-all cursor-pointer ${
              socialPreviewPlatform === 'twitter' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-white'
            }`}
          >
            Twitter/X
          </button>
          <button
            type="button"
            onClick={() => setSocialPreviewPlatform('linkedin')}
            className={`px-2.5 py-1 text-[8px] font-black uppercase rounded-md transition-all cursor-pointer ${
              socialPreviewPlatform === 'linkedin' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-white'
            }`}
          >
            LinkedIn
          </button>
        </div>
      </div>

      {/* Sharing controls row */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Main native share or copy link button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={navigator.share ? handleNativeShare : handleCopyLink}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
            copied
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-lg shadow-emerald-500/10"
              : "bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white"
          }`}
        >
          {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4 text-blue-400" />}
          <span>{copied ? "Link Copied" : navigator.share ? "Open Device Share" : "Copy Share Link"}</span>
        </motion.button>

        {/* Quick social share link buttons */}
        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 p-1 rounded-xl">
          {/* Twitter / X */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onMouseEnter={() => setShowTooltip("twitter")}
            onMouseLeave={() => setShowTooltip(null)}
            onClick={() => triggerLink(shareLinks.twitter)}
            className="p-2 hover:bg-sky-500/10 text-slate-400 hover:text-sky-400 rounded-lg transition-all relative cursor-pointer"
          >
            <Twitter className="w-4 h-4" />
          </motion.button>

          {/* LinkedIn */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onMouseEnter={() => setShowTooltip("linkedin")}
            onMouseLeave={() => setShowTooltip(null)}
            onClick={() => triggerLink(shareLinks.linkedin)}
            className="p-2 hover:bg-blue-600/10 text-slate-400 hover:text-blue-400 rounded-lg transition-all relative cursor-pointer"
          >
            <Linkedin className="w-4 h-4" />
          </motion.button>

          {/* Facebook */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onMouseEnter={() => setShowTooltip("facebook")}
            onMouseLeave={() => setShowTooltip(null)}
            onClick={() => triggerLink(shareLinks.facebook)}
            className="p-2 hover:bg-blue-500/10 text-slate-400 hover:text-blue-500 rounded-lg transition-all relative cursor-pointer"
          >
            <Facebook className="w-4 h-4" />
          </motion.button>

          {/* WhatsApp */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onMouseEnter={() => setShowTooltip("whatsapp")}
            onMouseLeave={() => setShowTooltip(null)}
            onClick={() => triggerLink(shareLinks.whatsapp)}
            className="p-2 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 rounded-lg transition-all relative cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 text-emerald-500" />
          </motion.button>
        </div>
      </div>

      {/* Social share feed mock preview card */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">Live Feed Card Preview Mockup</span>
          <span className="text-[9px] font-mono text-slate-600">Dynamic Card Renderer</span>
        </div>

        {socialPreviewPlatform === 'twitter' ? (
          /* Twitter Card Simulation */
          <div className="border border-slate-800 bg-slate-950 rounded-2xl overflow-hidden shadow-2xl transition-all">
            <div className="aspect-[1.91/1] w-full bg-slate-900/60 flex items-center justify-center relative border-b border-slate-800">
              {image ? (
                <img src={image} className="w-full h-full object-cover" alt="Twitter Preview" />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-700">
                  <ImageIcon className="w-8 h-8 mb-2 text-slate-600" />
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Agidapp Cover Image</span>
                </div>
              )}
              <span className="absolute bottom-2 left-2 bg-slate-950/90 text-white text-[8px] px-2 py-0.5 rounded font-mono uppercase border border-slate-800">agidappglobal.com</span>
            </div>
            <div className="p-4 space-y-1 bg-slate-950">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">AGIDAPP GLOBAL</span>
              <h4 className="text-xs font-black text-white line-clamp-1">
                {title || "The Unnamed Cosmic AGI Article"}
              </h4>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {shareText}
              </p>
            </div>
          </div>
        ) : (
          /* LinkedIn Card Simulation */
          <div className="border border-slate-800 bg-slate-950 rounded-2xl overflow-hidden shadow-2xl transition-all">
            {/* Post Author info */}
            <div className="p-4 flex items-center gap-3 bg-slate-950">
              <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700">
                <div className="w-full h-full bg-blue-600/15 text-blue-400 flex items-center justify-center text-[10px] font-black uppercase">
                  AG
                </div>
              </div>
              <div>
                <h5 className="text-[11px] font-black text-white leading-none mb-1">Agidapp Curator</h5>
                <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest leading-none">Global AI Catalog Directory</p>
              </div>
            </div>
            <div className="px-4 pb-3 bg-slate-950">
              <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                {shareText}
              </p>
            </div>
            <div className="bg-slate-900/40 border-t border-slate-800">
              <div className="aspect-[1.91/1] w-full bg-slate-900/60 flex items-center justify-center relative">
                {image ? (
                  <img src={image} className="w-full h-full object-cover" alt="LinkedIn Preview" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-700">
                    <ImageIcon className="w-8 h-8 mb-2 text-slate-600" />
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">Agidapp Cover Image</span>
                  </div>
                )}
              </div>
              <div className="p-3 bg-slate-950 border-t border-slate-800 flex justify-between items-center">
                <div className="space-y-0.5 max-w-[85%]">
                  <h4 className="text-[11px] font-black text-white line-clamp-1">{title || "The Unnamed Cosmic AGI Article"}</h4>
                  <span className="text-[8px] text-slate-500 uppercase tracking-widest font-mono font-bold">agidappglobal.com</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
