import React, { useEffect, useState } from "react";

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
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    try {
      // @ts-ignore
      const adsbygoogle = window.adsbygoogle || [];
      adsbygoogle.push({});
    } catch (err) {
      console.error("AdSense initialization warning:", err);
      // Fail gracefully without crashing the app
      setHasError(true);
    }
  }, [slot]);

  if (hasError) {
    return (
      <div className="w-full py-4 text-center text-slate-500 text-xs border border-slate-900 bg-slate-950/40 rounded-xl">
        Advertisement slot is ready for activation
      </div>
    );
  }

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
