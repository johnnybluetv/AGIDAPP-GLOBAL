import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  LogIn, 
  Plus, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  ShieldCheck, 
  ArrowLeft, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ConfirmationResult, RecaptchaVerifier } from "firebase/auth";
import { auth } from "../firebase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
  onSuccess?: (user: any, isNew: boolean) => void;
}

type AuthMethod = 'menu' | 'email' | 'phone';

export default function AuthModal({ isOpen, onClose, initialMode = 'signin', onSuccess }: AuthModalProps) {
  const { 
    loginWithGoogle, 
    loginWithEmail, 
    loginWithPhone, 
    loginWithOAuthProvider 
  } = useAuth();

  const [mode, setMode] = React.useState<'signin' | 'signup'>(initialMode);
  const [method, setMethod] = React.useState<AuthMethod>('menu');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  // Email form fields
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");

  // Phone form fields
  const [phoneNumber, setPhoneNumber] = React.useState("");
  const [countryCode, setCountryCode] = React.useState("+1");
  const [verificationCode, setVerificationCode] = React.useState("");
  const [confirmationResult, setConfirmationResult] = React.useState<ConfirmationResult | null>(null);

  // Recaptcha verifier ref/state
  const [recaptchaVerifier, setRecaptchaVerifier] = React.useState<RecaptchaVerifier | null>(null);

  // Custom visual enhancement states
  const [unauthorizedDomain, setUnauthorizedDomain] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const handleCopyDomain = () => {
    navigator.clipboard.writeText(window.location.host);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Sync mode with prop
  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setMethod('menu');
      setError(null);
      setSuccess(false);
      setLoading(false);
      setEmail("");
      setPassword("");
      setDisplayName("");
      setPhoneNumber("");
      setVerificationCode("");
      setConfirmationResult(null);
      setUnauthorizedDomain(null);
      setShowPassword(false);
      setCopied(false);
    }
  }, [isOpen, initialMode]);

  // Set up Recaptcha Verifier for Phone Auth
  React.useEffect(() => {
    if (isOpen && method === 'phone' && !recaptchaVerifier) {
      // Small timeout to allow recaptcha-container element to mount in the DOM
      const timer = setTimeout(() => {
        try {
          const container = document.getElementById('recaptcha-container');
          if (container) {
            const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
              size: 'invisible',
              callback: () => {
                // recaptcha solved
              }
            });
            setRecaptchaVerifier(verifier);
          }
        } catch (err) {
          console.error("Recaptcha initialization failed:", err);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, method, recaptchaVerifier]);

  // Clear recaptcha on close/unmount
  React.useEffect(() => {
    return () => {
      if (recaptchaVerifier) {
        recaptchaVerifier.clear();
        setRecaptchaVerifier(null);
      }
    };
  }, [recaptchaVerifier]);

  if (!isOpen) return null;

  const handleOAuthLogin = async (provider: 'google' | 'apple' | 'meta' | 'amazon') => {
    setLoading(true);
    setError(null);
    try {
      let result;
      if (provider === 'google') {
        result = await loginWithGoogle();
      } else if (provider === 'meta') {
        result = await loginWithOAuthProvider('facebook.com');
      } else if (provider === 'apple') {
        result = await loginWithOAuthProvider('apple.com');
      } else if (provider === 'amazon') {
        result = await loginWithOAuthProvider('amazon.com');
      }

      if (result) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.(result.user, mode === 'signup');
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      console.error(`${provider} Login failed:`, err);
      // Fallback description for standard OAuth providers if not configured in Firebase console
      if (err.code === 'auth/unauthorized-domain') {
        setUnauthorizedDomain(window.location.host);
        setError("Firebase Domain Blocked: This preview/custom domain is not authorized in your Firebase console. See step-by-step instructions below.");
      } else if (err.code === 'auth/operation-not-allowed') {
        setError(`This sign-in provider (${provider}) is not yet enabled in your Firebase console. Go to Auth -> Sign-in method to enable it.`);
      } else {
        setError(err.message || `An error occurred while logging in with ${provider}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (mode === 'signup' && !displayName) {
      setError("Please provide a name for your profile.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await loginWithEmail(email, password, mode === 'signup', displayName);
      if (result) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.(result.user, mode === 'signup');
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      console.error("Email auth failed:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError("This email address is already in use.");
      } else if (err.code === 'auth/weak-password') {
        setError("Password should be at least 6 characters.");
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError("Incorrect email or password.");
      } else {
        setError(err.message || "An error occurred during authentication.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      setError("Please enter your phone number.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fullPhone = `${countryCode}${phoneNumber.trim().replace(/^\+/, '')}`;
      
      let verifierToUse = recaptchaVerifier;
      if (!verifierToUse) {
        // Fallback check
        const container = document.getElementById('recaptcha-container');
        if (!container) {
          throw new Error("reCAPTCHA container not found in DOM.");
        }
        verifierToUse = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible'
        });
        setRecaptchaVerifier(verifierToUse);
      }

      const result = await loginWithPhone(fullPhone, verifierToUse);
      setConfirmationResult(result);
      setError(null);
    } catch (err: any) {
      console.error("Failed to send verification code:", err);
      setError(err.message || "Could not send verification code. Please check the number format.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode) {
      setError("Please enter the 6-digit verification code.");
      return;
    }
    if (!confirmationResult) {
      setError("No active verification session. Please request a new code.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await confirmationResult.confirm(verificationCode);
      if (result) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.(result.user, mode === 'signup');
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      console.error("Code verification failed:", err);
      setError("Invalid verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={loading ? undefined : onClose}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 20 }}
          className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center overflow-hidden shadow-2xl"
        >
          {/* Top Decorative bar */}
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600" />
          
          {/* Close button */}
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Invisible ReCaptcha Container */}
          <div id="recaptcha-container" className="hidden"></div>

          {/* SUCCESS STATE ANIMATION */}
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="py-12 flex flex-col items-center justify-center"
              >
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mb-6 animate-pulse">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">
                  Success!
                </h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                  {mode === 'signup' ? "Welcome to your new account!" : "Welcome back!"}
                </p>
              </motion.div>
            ) : (
              <motion.div key="form" className="outline-none">
                {/* Back button when inside email or phone workflows */}
                {method !== 'menu' && (
                  <button
                    onClick={() => {
                      setMethod('menu');
                      setError(null);
                      setConfirmationResult(null);
                    }}
                    disabled={loading}
                    className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800 rounded-lg transition-all"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    Back
                  </button>
                )}

                {/* Header Icon */}
                <div className="mb-4 inline-flex p-4 bg-blue-600/10 rounded-2xl text-blue-500">
                  {mode === 'signup' ? <Plus className="w-7 h-7" /> : <LogIn className="w-7 h-7" />}
                </div>

                {/* Header text */}
                <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-1">
                  {mode === 'signup' ? 'Create Account' : 'Welcome Back'}
                </h3>
                
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-6">
                  {mode === 'signup' 
                    ? 'Register using any secure protocol below' 
                    : 'Sign in to access your custom AI directory'}
                </p>

                {/* ERROR PANEL */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-left flex flex-col gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
                      <p className="text-xs font-semibold leading-relaxed">{error}</p>
                    </div>

                    {unauthorizedDomain && (
                      <div className="mt-2 p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                        <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Unresolved Environment Domain</span>
                          <span className="text-[9px] font-mono font-bold text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">BLOCKED</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                          Firebase requires whitelisting your app's temporary or custom domain so that secure popups function safely.
                        </p>
                        
                        <div className="space-y-1">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Your Current Domain:</label>
                          <div className="flex gap-1">
                            <code className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[10px] text-slate-300 font-mono select-all break-all leading-tight">
                              {unauthorizedDomain}
                            </code>
                            <button
                              type="button"
                              onClick={handleCopyDomain}
                              className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0"
                            >
                              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copied ? "Copied" : "Copy"}</span>
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1 border-t border-white/5 pt-2">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Required Configurations:</label>
                          <div className="text-[10px] text-slate-400 space-y-1.5">
                            <div className="flex items-start gap-1.5">
                              <span className="text-blue-400 font-black">1.</span>
                              <span>Open your <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline font-bold inline-flex items-center gap-0.5">Firebase Console <ExternalLink className="w-2.5 h-2.5" /></a></span>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <span className="text-blue-400 font-black">2.</span>
                              <span>Navigate to your project <strong className="text-white">gen-lang-client-0399786822</strong></span>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <span className="text-blue-400 font-black">3.</span>
                              <span>Go to <strong className="text-white">Authentication &rarr; Settings &rarr; Authorized domains</strong></span>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <span className="text-blue-400 font-black">4.</span>
                              <span>Add <strong className="text-white">{unauthorizedDomain}</strong> and <strong className="text-white">agidappglobal.com</strong> to the list!</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* RENDER METHOD SECTIONS */}
                <AnimatePresence mode="wait">
                  {/* METHOD MENU SCREEN */}
                  {method === 'menu' && (
                    <motion.div
                      key="menu"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="space-y-3"
                    >
                      {/* Social OAuth Methods */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Google */}
                        <button
                          onClick={() => handleOAuthLogin('google')}
                          disabled={loading}
                          className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800/50 hover:bg-slate-800 text-white rounded-xl text-xs font-bold border border-slate-700/50 transition-all hover:scale-[1.02]"
                        >
                          <img src="https://www.google.com/s2/favicons?domain=google.com&sz=64" alt="Google" className="w-4 h-4" />
                          Google
                        </button>

                        {/* Apple */}
                        <button
                          onClick={() => handleOAuthLogin('apple')}
                          disabled={loading}
                          className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800/50 hover:bg-slate-800 text-white rounded-xl text-xs font-bold border border-slate-700/50 transition-all hover:scale-[1.02]"
                        >
                          <img src="https://www.google.com/s2/favicons?domain=apple.com&sz=64" alt="Apple" className="w-4 h-4" />
                          Apple
                        </button>

                        {/* Meta */}
                        <button
                          onClick={() => handleOAuthLogin('meta')}
                          disabled={loading}
                          className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800/50 hover:bg-slate-800 text-white rounded-xl text-xs font-bold border border-slate-700/50 transition-all hover:scale-[1.02]"
                        >
                          <img src="https://www.google.com/s2/favicons?domain=facebook.com&sz=64" alt="Meta" className="w-4 h-4" />
                          Meta
                        </button>

                        {/* Amazon */}
                        <button
                          onClick={() => handleOAuthLogin('amazon')}
                          disabled={loading}
                          className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800/50 hover:bg-slate-800 text-white rounded-xl text-xs font-bold border border-slate-700/50 transition-all hover:scale-[1.02]"
                        >
                          <img src="https://www.google.com/s2/favicons?domain=amazon.com&sz=64" alt="Amazon" className="w-4 h-4" />
                          Amazon
                        </button>
                      </div>

                      <div className="relative py-3 flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800" /></div>
                        <span className="relative px-3 bg-slate-900 text-[9px] text-slate-500 font-bold uppercase tracking-widest">Or login directly</span>
                      </div>

                      {/* Native Sign-in buttons */}
                      <button
                        onClick={() => setMethod('email')}
                        className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/10 hover:scale-[1.01]"
                      >
                        <Mail className="w-4 h-4" />
                        Continue with Email
                      </button>

                      <button
                        onClick={() => setMethod('phone')}
                        className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-slate-700 hover:scale-[1.01]"
                      >
                        <Phone className="w-4 h-4" />
                        Continue with Phone Number
                      </button>
                    </motion.div>
                  )}

                  {/* EMAIL/PASSWORD AUTH SCREEN */}
                  {method === 'email' && (
                    <motion.form
                      key="email-form"
                      onSubmit={handleEmailAuth}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-4 text-left outline-none"
                    >
                      {mode === 'signup' && (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                              type="text"
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              placeholder="John Doe"
                              disabled={loading}
                              className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                            />
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@domain.com"
                            disabled={loading}
                            className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            disabled={loading}
                            className="w-full pl-10 pr-10 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none"
                            title={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-2 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Authenticating...
                          </>
                        ) : (
                          <>
                            {mode === 'signup' ? 'Create Account' : 'Sign In'}
                            <ChevronRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </motion.form>
                  )}

                  {/* PHONE NUMBER AUTH SCREEN */}
                  {method === 'phone' && (
                    <motion.div
                      key="phone-form"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-4 text-left outline-none"
                    >
                      {!confirmationResult ? (
                        <form onSubmit={handleSendPhoneCode} className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone Number</label>
                            <div className="flex gap-2">
                              <select
                                value={countryCode}
                                onChange={(e) => setCountryCode(e.target.value)}
                                disabled={loading}
                                className="px-2 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none"
                              >
                                <option value="+1">🇺🇸 +1</option>
                                <option value="+44">🇬🇧 +44</option>
                                <option value="+33">🇫🇷 +33</option>
                                <option value="+49">🇩🇪 +49</option>
                                <option value="+91">🇮🇳 +91</option>
                                <option value="+81">🇯🇵 +81</option>
                                <option value="+61">🇦🇺 +61</option>
                                <option value="+55">🇧🇷 +55</option>
                              </select>
                              <div className="relative flex-1">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input
                                  type="tel"
                                  value={phoneNumber}
                                  onChange={(e) => setPhoneNumber(e.target.value)}
                                  placeholder="555-123-4567"
                                  disabled={loading}
                                  className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
                                />
                              </div>
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Sending Code...
                              </>
                            ) : (
                              <>
                                Send SMS Code
                                <ChevronRight className="w-4 h-4" />
                              </>
                            )}
                          </button>
                        </form>
                      ) : (
                        <form onSubmit={handleVerifyPhoneCode} className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verification Code</label>
                            <div className="relative">
                              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                              <input
                                type="text"
                                maxLength={6}
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value)}
                                placeholder="123456"
                                disabled={loading}
                                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all tracking-widest text-center text-lg font-bold"
                              />
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Verifying Code...
                              </>
                            ) : (
                              <>
                                Complete Verification
                                <ShieldCheck className="w-4 h-4" />
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setConfirmationResult(null);
                              setVerificationCode("");
                            }}
                            disabled={loading}
                            className="w-full text-center text-[10px] font-bold text-slate-500 uppercase tracking-wider hover:text-slate-400 mt-2"
                          >
                            Change Phone Number
                          </button>
                        </form>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Switch Signin / Signup triggers */}
                {(method === 'menu' || method === 'email') && (
                  <div className="mt-6 text-xs text-slate-500 font-bold uppercase tracking-wider">
                    {mode === 'signup' ? (
                      <>
                        Already have an account?{" "}
                        <button
                          type="button"
                          onClick={() => setMode('signin')}
                          className="text-blue-400 hover:text-blue-300 hover:underline transition-all"
                        >
                          Sign In
                        </button>
                      </>
                    ) : (
                      <>
                        First time visiting?{" "}
                        <button
                          type="button"
                          onClick={() => setMode('signup')}
                          className="text-blue-400 hover:text-blue-300 hover:underline transition-all"
                        >
                          Sign Up
                        </button>
                      </>
                    )}
                  </div>
                )}

                <p className="mt-6 text-[9px] text-slate-600 font-medium uppercase tracking-widest">
                  By continuing, you agree to our <span className="text-slate-500 cursor-pointer">Terms of Service</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
