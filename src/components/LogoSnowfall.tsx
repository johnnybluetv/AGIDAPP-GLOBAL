import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import { AiTool } from "../types";

interface LogoSnowfallProps {
  tools: AiTool[];
}

export default function LogoSnowfall({ tools }: LogoSnowfallProps) {
  const [items, setItems] = React.useState<{ id: number; logo: string; x: number; duration: number; delay: number; size: number }[]>([]);
  
  // Use a subset of high-quality tools that have logos (URLs) or just the first few
  const logos = React.useMemo(() => {
    return tools
      .filter(t => t.url.includes("placeholder") === false) // Try to get real-ish logos if possible
      .map(t => `https://www.google.com/s2/favicons?domain=${new URL(t.url).hostname}&sz=64`)
      .slice(0, 15);
  }, [tools]);

  React.useEffect(() => {
    if (logos.length === 0) return;

    const generateItem = () => ({
      id: Math.random(),
      logo: logos[Math.floor(Math.random() * logos.length)],
      x: Math.random() * 100, // percentage
      duration: 10 + Math.random() * 20,
      delay: Math.random() * 5,
      size: 16 + Math.random() * 24,
    });

    // Initial batch
    setItems(Array.from({ length: 20 }, generateItem));

    // Cleanup and cycle
    const interval = setInterval(() => {
      setItems(prev => {
        // Keep only some items, add new ones
        const filtered = prev.filter(item => item.id > 0.05); // pseudo cleanup
        if (filtered.length < 30) {
          return [...filtered, generateItem()];
        }
        return filtered;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [logos]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-10">
      <AnimatePresence>
        {items.map((item) => (
          <motion.img
            key={item.id}
            src={item.logo}
            initial={{ y: -50, x: `${item.x}vw`, opacity: 0, rotate: 0 }}
            animate={{ 
              y: "110vh", 
              opacity: [0, 1, 1, 0],
              rotate: 360,
              x: `${item.x + (Math.random() * 10 - 5)}vw` // Slight drift
            }}
            transition={{ 
              duration: item.duration, 
              delay: item.delay,
              ease: "linear",
              repeat: Infinity
            }}
            style={{ 
              position: "absolute",
              width: item.size,
              height: item.size,
              filter: "grayscale(100%) brightness(2)"
            }}
            alt=""
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
