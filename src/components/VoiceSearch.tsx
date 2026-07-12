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

  // Audio analysis states for the expanding waveform
  const [audioLevel, setAudioLevel] = React.useState(0);
  const audioContextRef = React.useRef<AudioContext | null>(null);
  const analyserRef = React.useRef<AnalyserNode | null>(null);
  const dataArrayRef = React.useRef<Uint8Array | null>(null);
  const sourceRef = React.useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const animationFrameRef = React.useRef<number | null>(null);

  // Set up Speech Recognition
  React.useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
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

        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + " ";
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const fullQuery = (final + interim).trim();
        if (fullQuery) {
          onResult(fullQuery);
        }

        setInterimTranscript(fullQuery || "Listening... Speak now!");
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

  // Set up Audio Context and Analyzer Node for Real-time Waveform Animation
  React.useEffect(() => {
    if (isListening) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          streamRef.current = stream;
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContextClass) return;

          const audioContext = new AudioContextClass();
          audioContextRef.current = audioContext;

          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 64; // Low fftSize for responsive, light visualization
          analyserRef.current = analyser;

          const source = audioContext.createMediaStreamSource(stream);
          sourceRef.current = source;
          source.connect(analyser);

          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          dataArrayRef.current = dataArray;

          const updateVolume = () => {
            if (!analyserRef.current || !dataArrayRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArrayRef.current);

            let sum = 0;
            for (let i = 0; i < dataArrayRef.current.length; i++) {
              sum += dataArrayRef.current[i];
            }
            const average = sum / dataArrayRef.current.length;
            // Normalize level to roughly 0-1, capping at 1.5 for extra visual flair
            setAudioLevel(Math.min(1.5, average / 110));

            animationFrameRef.current = requestAnimationFrame(updateVolume);
          };

          updateVolume();
        })
        .catch((err) => {
          console.warn("Failed to capture mic for canvas visualizer, falling back to simulated physics:", err);
          // High quality procedural random-walk simulation so visuals stay active even if dual mic capture is restricted
          let lastLevel = 0.1;
          const simulateVolume = () => {
            const target = 0.05 + Math.random() * 0.4;
            lastLevel = lastLevel * 0.85 + target * 0.15;
            setAudioLevel(lastLevel);
            animationFrameRef.current = requestAnimationFrame(simulateVolume);
          };
          simulateVolume();
        });
    } else {
      cleanupAudio();
    }

    return () => {
      cleanupAudio();
    };
  }, [isListening]);

  const cleanupAudio = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    setAudioLevel(0);
  };

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
      <div className="relative flex items-center justify-center">
        {isListening && (
          <>
            {/* Real-time expanding reactive voice aura */}
            <motion.div
              animate={{ scale: 1 + audioLevel * 0.7 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-500/30 via-orange-500/30 to-yellow-500/30 filter blur-md -z-10 pointer-events-none"
            />
            
            <motion.span
              initial={{ scale: 0.9, opacity: 0.6 }}
              animate={{ scale: 2.0 + audioLevel, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.6, ease: "easeOut" }}
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-red-500 to-orange-500 -z-10 pointer-events-none"
            />
            <motion.span
              initial={{ scale: 0.9, opacity: 0.4 }}
              animate={{ scale: 2.5 + audioLevel * 1.5, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 2.0, ease: "easeOut", delay: 0.5 }}
              className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500 to-yellow-500 -z-10 pointer-events-none"
            />
          </>
        )}
        
        <button
          type="button"
          onClick={toggleListening}
          className={`relative p-2.5 rounded-xl transition-all duration-300 border flex items-center justify-center cursor-pointer ${
            isListening 
              ? "bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 border-red-400 text-white shadow-[0_0_25px_rgba(239,68,68,0.5)] scale-110" 
              : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-orange-500/40 hover:bg-gradient-to-r hover:from-slate-900 hover:to-orange-950/20 hover:shadow-[0_0_20px_rgba(249,115,22,0.25)] hover:scale-105"
          }`}
          title={isListening ? "Stop listening" : "Voice search (Speak your queries)"}
        >
          {isListening ? (
            <div className="flex items-center gap-1.5 h-4 px-0.5">
              {/* Real-time moving equalizer waves when listening */}
              <motion.span 
                animate={{ scaleY: [0.3, 1.3, 0.4, 1.1, 0.3] }}
                transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: 0 }}
                className="w-0.5 h-3.5 bg-white rounded-full origin-bottom" 
              />
              <motion.span 
                animate={{ scaleY: [0.4, 1.5, 0.3, 1.3, 0.4] }}
                transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
                className="w-0.5 h-3.5 bg-white rounded-full origin-bottom" 
              />
              <motion.span 
                animate={{ scaleY: [0.3, 1.2, 0.5, 1.4, 0.3] }}
                transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.05 }}
                className="w-0.5 h-3.5 bg-white rounded-full origin-bottom" 
              />
              <motion.span 
                animate={{ scaleY: [0.5, 1.4, 0.3, 1.1, 0.5] }}
                transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
                className="w-0.5 h-3.5 bg-white rounded-full origin-bottom" 
              />
            </div>
          ) : (
            <Mic className="w-4 h-4 transition-transform group-hover:scale-110" />
          )}
        </button>
      </div>
      
      <AnimatePresence>
        {isListening && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            className="absolute right-0 top-full mt-3 p-4 bg-slate-950/95 border border-red-500/30 rounded-2xl shadow-2xl z-[70] min-w-[300px] backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-red-400">Continuous Dictation</span>
              </div>
              <button 
                onClick={() => {
                  recognitionRef.current?.stop();
                  setIsListening(false);
                }} 
                className="text-slate-500 hover:text-slate-300 p-0.5 hover:bg-white/5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Symmetrical High-Fidelity Waveform Visualizer */}
            <div className="flex items-center justify-center h-16 my-3 bg-slate-900/60 border border-white/5 rounded-xl gap-1 overflow-hidden px-4">
              {Array.from({ length: 19 }).map((_, i) => {
                const distFromCenter = Math.abs(i - 9);
                const factor = Math.max(0.15, 1 - distFromCenter / 10);
                // Compute height dynamically using normalized real-time audioLevel
                const height = Math.min(48, 6 + audioLevel * 40 * factor * (0.6 + Math.random() * 0.8));
                return (
                  <motion.div
                    key={i}
                    animate={{ height }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="w-1 rounded-full bg-gradient-to-t from-red-500 via-orange-500 to-yellow-400"
                    style={{
                      boxShadow: "0 0 8px rgba(249, 115, 22, 0.4)",
                    }}
                  />
                );
              })}
            </div>
            
            <p className="text-xs text-slate-300 font-medium leading-relaxed italic min-h-[36px] max-h-[100px] overflow-y-auto custom-scrollbar pt-1">
              {interimTranscript || "Listening continuously... Speak your query!"}
            </p>

            <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center gap-1.5 text-[9px] text-slate-450 font-medium">
              <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
              <span>Sustained speech logs queries automatically</span>
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
