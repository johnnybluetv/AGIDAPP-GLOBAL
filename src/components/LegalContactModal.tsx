import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  Shield, 
  FileText, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  ExternalLink, 
  Check, 
  Copy, 
  Info, 
  Building
} from "lucide-react";

interface LegalContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab: "terms" | "privacy" | "contact";
}

export default function LegalContactModal({ isOpen, onClose, initialTab }: LegalContactModalProps) {
  const [activeTab, setActiveTab] = React.useState<"terms" | "privacy" | "contact">(initialTab);
  const [copiedType, setCopiedType] = React.useState<"phone" | "email" | "address" | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const handleCopy = (text: string, type: "phone" | "email" | "address") => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-6">
          {/* Backdrop overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/90 backdrop-blur-md"
          />

        {/* Modal body */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl h-[85vh] md:h-[70vh] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row z-10"
        >
          {/* Left Sidebar Menu (Large screens) */}
          <div className="w-full md:w-64 bg-slate-950/50 border-r border-slate-800 p-6 flex flex-col justify-between shrink-0">
            <div>
              <div className="flex items-center gap-2.5 mb-8">
                <div className="px-2.5 py-1 bg-blue-600 text-white font-black tracking-tighter text-xs rounded-lg uppercase">
                  AGIDAPP
                </div>
                <span className="text-[10px] font-mono font-bold text-slate-500 tracking-wider">LEGAL CENTER</span>
              </div>

              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab("terms")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === "terms" 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/10" 
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>Terms & Conditions</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("privacy")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === "privacy" 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/10" 
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>Privacy Policy</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("contact")}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    activeTab === "contact" 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-600/10" 
                      : "text-slate-400 hover:text-white hover:bg-slate-900"
                  }`}
                >
                  <Building className="w-4 h-4 shrink-0" />
                  <span>Contact & Address</span>
                </button>
              </div>
            </div>

            <div className="hidden md:block">
              <p className="text-[9px] font-black uppercase text-slate-600 tracking-widest mb-1">CRAFTED BY</p>
              <a 
                href="https://www.johnnybluetv.com" 
                target="_blank" 
                rel="noreferrer" 
                className="text-[11px] font-bold text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                Johnny Blue Agency
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>

          {/* Top Selector (Small screens only) */}
          <div className="md:hidden border-b border-slate-800 p-3 bg-slate-950 flex gap-1 overflow-x-auto scrollbar-none shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("terms")}
              className={`flex-1 shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center ${
                activeTab === "terms" ? "bg-blue-600 text-white" : "text-slate-400 bg-slate-900"
              }`}
            >
              Terms
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("privacy")}
              className={`flex-1 shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center ${
                activeTab === "privacy" ? "bg-blue-600 text-white" : "text-slate-400 bg-slate-900"
              }`}
            >
              Privacy
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("contact")}
              className={`flex-1 shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all text-center ${
                activeTab === "contact" ? "bg-blue-600 text-white" : "text-slate-400 bg-slate-900"
              }`}
            >
              Contact & Address
            </button>
          </div>

          {/* Right Area - Scrollable Content */}
          <div className="flex-1 flex flex-col min-w-0 bg-slate-900">
            {/* Header / Dismiss */}
            <div className="px-8 py-5 border-b border-slate-800/60 flex items-center justify-between sticky top-0 bg-slate-900/80 backdrop-blur-md z-10 shrink-0">
              <h3 className="text-sm font-black text-white uppercase tracking-widest">
                {activeTab === "terms" && "Terms & Conditions"}
                {activeTab === "privacy" && "Privacy Policy"}
                {activeTab === "contact" && "Contact Information"}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar text-left">
              <AnimatePresence mode="wait">
                {activeTab === "terms" && (
                  <motion.div
                    key="terms-content"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6 text-slate-300 text-xs leading-relaxed"
                  >
                    <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex gap-3">
                      <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                      <p className="text-slate-400 font-medium leading-relaxed">
                        Welcome to Agidapp Global. These terms and conditions outline the rules and regulations for the use of our AI tools directory. Last modified on July 13, 2026.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-black text-white uppercase tracking-tight">1. Acceptance of Terms</h4>
                      <p className="text-slate-400">
                        By accessing this website, we assume you accept these terms and conditions in full. Do not continue to use Agidapp Global's platform if you do not agree to all of the terms and conditions stated on this page.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-black text-white uppercase tracking-tight">2. Directory & Contribution Scope</h4>
                      <p className="text-slate-400">
                        Agidapp Global provides a curated registry of AI models, utilities, and software. Users may contribute tool recommendations and articles, and review listed utilities. Users guarantee that any submitted URLs and details are correct, authorized, and non-infringing on existing copyrights.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-black text-white uppercase tracking-tight">3. User Conduct & Accounts</h4>
                      <p className="text-slate-400">
                        Accounts created via Firebase (Google Sign-In or Email Verification) are personal and non-transferable. You are responsible for keeping your credentials safe and for any reviews or comments submitted under your identity. Spam, abusive wording, and fake tool submissions are strictly prohibited and subject to immediate account termination.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-black text-white uppercase tracking-tight">4. Intellectual Property Rights</h4>
                      <p className="text-slate-400">
                        All brand logos, favicons, brand names, and third-party references displayed on this site remain the exclusive intellectual property of their respective creators and entities. Agidapp Global links to these services as an indexing utility and does not claim ownership or official endorsement unless specified.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-black text-white uppercase tracking-tight">5. Disclaimer of Warranties</h4>
                      <p className="text-slate-400">
                        The registry is provided "as is," with all faults, and Agidapp Global expresses no representations or warranties of any kind related to this website or the third-party materials or websites curated here.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-black text-white uppercase tracking-tight">6. Limitation of Liability</h4>
                      <p className="text-slate-400">
                        In no event shall Johnny Blue Agency, Agidapp Global, or its developers be held liable for anything arising out of or in any way connected with your use of this platform, whether such liability is under contract or tort.
                      </p>
                    </div>
                  </motion.div>
                )}

                {activeTab === "privacy" && (
                  <motion.div
                    key="privacy-content"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-6 text-slate-300 text-xs leading-relaxed"
                  >
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex gap-3">
                      <Shield className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <p className="text-slate-400 font-medium leading-relaxed">
                        Your privacy is critically important to us. Our policy governs how we collect, store, and utilize data across our secure Firebase architecture.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-black text-white uppercase tracking-tight">1. Information We Collect</h4>
                      <p className="text-slate-400">
                        When you authenticate on our platform, we capture standard public profile metadata (username, display name, photo URL, and email) to build your digital avatar. We store user-authored bookmarks, upvotes, and review threads safely inside our secure Cloud Firestore database.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-black text-white uppercase tracking-tight">2. Security Safeguards</h4>
                      <p className="text-slate-400">
                        All user accounts are handled through Firebase Authentication, meaning your password credentials never reside on our custom servers. Database access is strictly governed by authenticated Firebase security rules, preventing unauthorized reading or writing of other users' data.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-black text-white uppercase tracking-tight">3. Cookies and Local State</h4>
                      <p className="text-slate-400">
                        We use standard client-side storage technologies (such as local storage) to keep track of user preferences, including dark/light display settings and sound effects configuration. These run entirely locally on your device.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-black text-white uppercase tracking-tight">4. Third-Party Services</h4>
                      <p className="text-slate-400">
                        We use Google APIs and secure OAuth endpoints for social authentication. For favicons and listing verification, we fetch metadata via secure, clean channels. We do not sell, rent, or lease your private personal details to third-party ad networks.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-black text-white uppercase tracking-tight">5. User Control & Deletion</h4>
                      <p className="text-slate-400">
                        You have full control over your submitted content. You can remove bookmarks, delete contributed tools from your personal dashboard, or request complete account erasure by contacting our administrators.
                      </p>
                    </div>
                  </motion.div>
                )}

                {activeTab === "contact" && (
                  <motion.div
                    key="contact-content"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-8 text-slate-300"
                  >
                    {/* Welcome card */}
                    <div className="p-5 bg-gradient-to-r from-blue-950/40 to-slate-900 border border-slate-800 rounded-3xl flex flex-col sm:flex-row gap-5 items-start sm:items-center">
                      <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 shrink-0 shadow-lg">
                        <Building className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="text-md font-black text-white uppercase tracking-tight">Johnny Blue Agency</h4>
                        <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                          Agidapp Global is managed and engineered by Johnny Blue Agency. Get in touch for partnerships, custom business directory solutions, or tech integrations.
                        </p>
                      </div>
                    </div>

                    {/* Interactive contact details list */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Phone contact */}
                      <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex items-center justify-between gap-4 group hover:border-blue-500/20 transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 shrink-0">
                            <Phone className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Phone Line</p>
                            <a href="tel:+233555414967" className="text-xs font-mono font-bold text-white hover:text-blue-400 transition-colors block truncate">
                              +233555414967
                            </a>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <a 
                            href="tel:+233555414967"
                            className="p-2 bg-slate-900 hover:bg-blue-600 text-slate-400 hover:text-white rounded-lg transition-all"
                            title="Call Now"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopy("+233555414967", "phone")}
                            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                            title="Copy Phone"
                          >
                            {copiedType === "phone" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Email contact */}
                      <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex items-center justify-between gap-4 group hover:border-blue-500/20 transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 shrink-0">
                            <Mail className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Official Email</p>
                            <a href="mailto:johnnyblueagency@gmail.com" className="text-xs font-mono font-bold text-white hover:text-blue-400 transition-colors block truncate">
                              johnnyblueagency@gmail.com
                            </a>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <a 
                            href="mailto:johnnyblueagency@gmail.com"
                            className="p-2 bg-slate-900 hover:bg-blue-600 text-slate-400 hover:text-white rounded-lg transition-all"
                            title="Compose Email"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleCopy("johnnyblueagency@gmail.com", "email")}
                            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                            title="Copy Email"
                          >
                            {copiedType === "email" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Web domain */}
                      <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex items-center justify-between gap-4 group hover:border-blue-500/20 transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 shrink-0">
                            <Globe className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 text-left">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Official Website</p>
                            <a href="https://www.johnnybluetv.com" target="_blank" rel="noreferrer" className="text-xs font-mono font-bold text-white hover:text-blue-400 transition-colors block truncate">
                              www.johnnybluetv.com
                            </a>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <a 
                            href="https://www.johnnybluetv.com"
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 bg-slate-900 hover:bg-blue-600 text-slate-400 hover:text-white rounded-lg transition-all"
                            title="Visit Website"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>

                      {/* Physical Address */}
                      <div className="p-4 bg-slate-950 border border-slate-850 rounded-2xl flex items-center justify-between gap-4 group hover:border-blue-500/20 transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 shrink-0">
                            <MapPin className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 text-left font-mono font-bold">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest font-sans">Physical Address</p>
                            <span className="text-xs text-white block truncate">
                              Accra, Ghana
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy("Accra, Ghana", "address")}
                            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
                            title="Copy Address"
                          >
                            {copiedType === "address" ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Address Detail Box */}
                    <div className="p-6 bg-slate-950 border border-slate-850 rounded-2xl space-y-4">
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-black text-white uppercase tracking-wider">Corporate Headquarters</span>
                      </div>
                      <div className="space-y-1.5 text-xs text-slate-400 font-medium">
                        <p className="font-extrabold text-white">Johnny Blue Agency Ltd.</p>
                        <p>Silicon Square Building, Block D, Room 12</p>
                        <p>Spintex Road, Accra</p>
                        <p>Greater Accra Region, Ghana</p>
                        <p className="text-[10px] font-mono text-slate-600 mt-2">Digital Address: GA-183-4921</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
