import React, { useEffect, useRef } from "react";

interface AdSenseUnitProps {
  slot: string;
  className?: string;
  style?: React.CSSProperties;
  format?: "auto" | "fluid" | "rectangle" | "vertical" | "horizontal";
  responsive?: "true" | "false";
}

export default function AdSenseUnit({
  slot,
  className = "",
  style,
  format = "auto",
  responsive = "true",
}: AdSenseUnitProps) {
  const adRef = useRef<HTMLModElement>(null);
  const pushCalledRef = useRef(false);

  useEffect(() => {
    // If the element doesn't exist yet, do nothing
    if (!adRef.current) return;

    // Check if AdSense has already processed this specific element
    const isAlreadyProcessed = 
      adRef.current.getAttribute("data-adsbygoogle-status") === "done" || 
      adRef.current.hasAttribute("data-ad-status") ||
      adRef.current.children.length > 0 ||
      adRef.current.dataset.pushCalled === "true";

    if (isAlreadyProcessed || pushCalledRef.current) {
      return;
    }

    // Mark as processed BEFORE pushing to prevent concurrent race conditions
    adRef.current.dataset.pushCalled = "true";
    pushCalledRef.current = true;

    try {
      // @ts-ignore
      const adsbygoogle = window.adsbygoogle || [];
      adsbygoogle.push({});
    } catch (err: any) {
      // Silently catch and log as warning to prevent crashing or hiding the slot.
      // Standard AdSense warnings like "All 'ins' elements... already have ads in them"
      // are completely normal in single-page applications and should not break rendering.
      console.warn("AdSense initialization note:", err?.message || err);
    }
  }, [slot]);

  return (
    <div className={`adsense-wrapper w-full flex flex-col items-center justify-center py-4 my-6 bg-slate-900/10 border border-slate-800/30 rounded-2xl relative overflow-hidden group hover:border-slate-800 transition-all ${className}`}>
      {/* Decorative indicator showing a premium ad placement zone */}
      <div className="absolute top-2 left-3 flex items-center gap-1.5 opacity-40 group-hover:opacity-75 transition-opacity">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-[7px] font-black uppercase tracking-widest text-slate-400 font-mono">
          Sponsored Placement
        </span>
      </div>

      <div className="w-full flex justify-center items-center overflow-hidden min-h-[90px] pt-4 px-4 pb-2">
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={style || { display: "block", width: "100%", height: "100%", minWidth: "250px", minHeight: "90px" }}
          data-ad-client="ca-pub-7039003478830210"
          data-ad-slot={slot}
          data-ad-format={format}
          data-full-width-responsive={responsive}
        />
      </div>

      <div className="text-[7.5px] text-slate-500/60 font-medium font-mono pb-2">
        Ads by Google • Support AGIDAPP Global by allowing ads
      </div>
    </div>
  );
}
