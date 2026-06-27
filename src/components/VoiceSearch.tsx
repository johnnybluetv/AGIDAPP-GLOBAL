import * as React from "react";
import { Mic, MicOff, Sparkles, AlertCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface VoiceSearchProps {
  onResult: (text: string) => void;
}

export default function VoiceSearch({ onResult }: VoiceSearchProps) {
  const [isListening, setIsListening] = React.useState(false);
  const [interimTranscript, setInterimTranscript] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const recognitionRef = React.useRef<any>(null);

  React.useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        setError(null);
        setInterimTranscript("");
      };

      rec.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (interim) {
          setInterimTranscript(interim);
        }

        if (final) {
          onResult(final);
          setInterimTranscript("");
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          setError("Microphone access denied. Please enable mic permissions.");
        } else if (event.error === "no-speech") {
          setError("No speech detected. Try speaking again.");
        } else {
          setError(`Voice search error: ${event.error}`);
        }
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    } else {
      setError("Not supported");
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onResult]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setError(null);
      setInterimTranscript("");
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error("Failed to start recognition", e);
        setError("Could not start microphone. Try refreshing.");
      }
    }
  };

  if (error === "Not supported") return null;

  return (
    <div className="relative flex items-center">
      <button
        type="button"
        onClick={toggleListening}
        className={`relative p-2.5 rounded-xl transition-all duration-300 border flex items-center justify-center cursor-pointer ${
          isListening 
            ? "bg-gradient-to-r from-red-500 to-orange-500 border-red-400 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] scale-110" 
            : "bg-slate-900/80 border-slate-700/80 text-slate-400 hover:text-orange-400 hover:border-orange-500/30 hover:shadow-[0_0_15px_rgba(249,115,22,0.15)]"
        }`}
        title={isListening ? "Stop listening" : "Voice search (Speak your queries)"}
      >
        {isListening ? (
          <div className="flex items-center gap-1.5 h-4 px-0.5">
            {/* Real-time moving equalizer waves when listening */}
            <motion.span 
              animate={{ scaleY: [0.3, 1.3, 0.4, 1, 0.3] }}
              transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0 }}
              className="w-0.5 h-3.5 bg-white rounded-full origin-bottom" 
            />
            <motion.span 
              animate={{ scaleY: [0.4, 1.5, 0.3, 1.2, 0.4] }}
              transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
              className="w-0.5 h-3.5 bg-white rounded-full origin-bottom" 
            />
            <motion.span 
              animate={{ scaleY: [0.3, 1.1, 0.5, 1.4, 0.3] }}
              transition={{ duration: 0.7, repeat: Infinity, ease: "easeInOut", delay: 0.05 }}
              className="w-0.5 h-3.5 bg-white rounded-full origin-bottom" 
            />
            <motion.span 
              animate={{ scaleY: [0.5, 1.3, 0.3, 1, 0.5] }}
              transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
              className="w-0.5 h-3.5 bg-white rounded-full origin-bottom" 
            />
          </div>
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>
      
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="absolute right-0 top-full mt-3 p-4 bg-slate-950/95 border border-red-500/30 rounded-2xl shadow-2xl z-[70] min-w-[280px] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-red-400">Speech Recognition Live</span>
              </div>
              <button 
                onClick={() => setIsListening(false)} 
                className="text-slate-500 hover:text-slate-300 p-0.5 hover:bg-white/5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            
            <p className="text-xs text-slate-300 font-medium leading-relaxed italic">
              {interimTranscript || "Listening... Speak now!"}
            </p>

            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center gap-1.5 text-[9px] text-slate-400">
              <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
              <span>Say "ChatGPT", "Logo Maker", or "Dev Tools"</span>
            </div>
          </motion.div>
        )}

        {error && error !== "not-allowed" && error !== "no-speech" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute right-0 top-full mt-3 p-3 bg-red-950/90 border border-red-800/40 text-red-200 text-xs rounded-xl shadow-xl z-50 flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="font-medium">{error}</span>
            <button onClick={() => setError(null)} className="ml-1 text-red-400 hover:text-white font-bold">×</button>
          </motion.div>
        )}

        {error && (error === "not-allowed" || error === "no-speech") && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute right-0 top-full mt-3 p-3 bg-slate-900 border border-amber-500/30 text-slate-200 text-xs rounded-xl shadow-xl z-50 flex items-center gap-2 min-w-[240px]"
          >
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-amber-400">Voice Info</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-slate-500 hover:text-white font-bold p-1">×</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
