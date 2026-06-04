import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, X, Sparkles, Search, Plus, Shield, BookOpen } from "lucide-react";

interface Step {
  title: string;
  desc: string;
  icon: React.ReactNode;
  selector?: string;
}

const STEPS: Step[] = [
  {
    title: "Welcome to AGID",
    desc: "The definitive directory for Artificial General Intelligence tools. Let's show you around.",
    icon: <Sparkles className="w-8 h-8 text-blue-400" />,
  },
  {
    title: "Powerful Search",
    desc: "Use fuzzy search to find any tool by name, description, or functionality. Try keyboard shortcuts like Tab to autocomplete.",
    icon: <Search className="w-8 h-8 text-blue-400" />,
    selector: "#search-input",
  },
  {
    title: "Deep Knowledge",
    desc: "Access our curated AGI Knowledge base or share your own insights via the blogging platform.",
    icon: <BookOpen className="w-8 h-8 text-red-500" />,
    selector: "[aria-label='Article menu']",
  },
  {
    title: "Contribute to AGID",
    desc: "Found a great tool? Submit it to help us build the most comprehensive AI index on the planet.",
    icon: <Plus className="w-8 h-8 text-blue-400" />,
    selector: "#submit-section",
  },
  {
    title: "Secure & Verified",
    desc: "Our community voting and verified badges ensure you only use the best AI tools available.",
    icon: <Shield className="w-8 h-8 text-blue-500" />,
  }
];

export default function Onboarding({ onClose }: { onClose: () => void }) {
  const [currentStep, setCurrentStep] = React.useState(0);
  const [targetRect, setTargetRect] = React.useState<DOMRect | null>(null);

  React.useEffect(() => {
    const selector = STEPS[currentStep].selector;
    if (selector) {
      const el = document.querySelector(selector);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Backdrop with hole */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] transition-all duration-500 overflow-hidden">
        {targetRect && (
          <motion.div
            layoutId="highlight"
            initial={false}
            animate={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
            className="absolute rounded-2xl shadow-[0_0_0_2000px_rgba(2,6,23,0.8)] border border-blue-500/50"
          />
        )}
      </div>

      <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
          >
            <div className="onboarding-galaxy" />
            {/* Background elements */}
            <div className="absolute top-0 right-0 p-8 opacity-5">
              {STEPS[currentStep].icon}
            </div>

            <div className="relative">
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                  {STEPS[currentStep].icon}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-500 hover:text-white rounded-xl transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">
                {STEPS[currentStep].title}
              </h3>
              <p className="text-slate-400 mb-8 text-lg leading-relaxed">
                {STEPS[currentStep].desc}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 rounded-full transition-all duration-300 ${
                        i === currentStep ? "w-8 bg-blue-500" : "w-1.5 bg-slate-800"
                      }`}
                    />
                  ))}
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNext}
                  className="px-6 py-2.5 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-blue-500 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 border border-blue-400/20"
                >
                  {currentStep === STEPS.length - 1 ? "Get Started" : "Next Step"}
                  <ChevronRight className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
