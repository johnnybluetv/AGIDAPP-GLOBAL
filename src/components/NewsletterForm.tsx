import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, CheckCircle, Loader2, Send } from "lucide-react";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("submitting");

    try {
      // Check if email already subscribed
      const subsRef = collection(db, "newsletter_subscribers");
      const q = query(subsRef, where("email", "==", email.toLowerCase().trim()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setStatus("success");
        setMessage("You are already subscribed to our newsletter! Thank you.");
        setEmail("");
        return;
      }

      // Add to Firestore
      await addDoc(subsRef, {
        email: email.toLowerCase().trim(),
        subscribedAt: new Date(),
        status: "active"
      });

      setStatus("success");
      setMessage("Thank you! You have successfully subscribed to the AGID Newsletter.");
      setEmail("");
    } catch (err) {
      console.error("Newsletter Subscription Error:", err);
      setStatus("error");
      setMessage("An error occurred. Please try again later.");
    }
  };

  return (
    <section className="py-12 px-6" id="newsletter-section">
      <div className="max-w-4xl mx-auto bg-slate-900/60 backdrop-blur-md border border-slate-800/80 rounded-3xl p-8 md:p-12 relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <div className="inline-flex p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl mb-4">
            <Mail className="w-6 h-6 animate-pulse" />
          </div>
          
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">
            Stay Ahead in the AGI & AI Era
          </h2>
          <p className="text-slate-400 text-sm md:text-base mb-8">
            Get curated weekly updates on newly compiled AI tools, open-source LLM releases, exclusive mobile APKs, and cutting-edge general intelligence advancements. No spam, ever.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="email"
                required
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === "error") setStatus("idle");
                }}
                disabled={status === "submitting"}
                className="w-full pl-12 pr-4 py-4 bg-slate-950/80 border border-slate-800 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-sm"
              />
            </div>
            
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={status === "submitting"}
              type="submit"
              className="px-6 py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold rounded-2xl text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              {status === "submitting" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Subscribing...
                </>
              ) : (
                <>
                  Subscribe Now
                  <Send className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          <AnimatePresence mode="wait">
            {status === "success" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 flex items-center justify-center gap-2 text-green-400 bg-green-500/10 border border-green-500/20 py-3 px-4 rounded-xl text-xs font-semibold"
              >
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{message}</span>
              </motion.div>
            )}

            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-4 text-red-400 bg-red-500/10 border border-red-500/20 py-3 px-4 rounded-xl text-xs font-semibold"
              >
                {message}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
