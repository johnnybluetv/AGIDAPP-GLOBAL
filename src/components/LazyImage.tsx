import * as React from "react";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

export default function LazyImage({ src, alt, className, ...props }: LazyImageProps) {
  const [shouldLoad, setShouldLoad] = React.useState(false);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.unobserve(el);
        }
      },
      {
        rootMargin: "150px", // Load 150px before entering viewport for a seamless feel
        threshold: 0.01,
      }
    );

    observer.observe(el);

    return () => {
      if (el) {
        observer.unobserve(el);
      }
    };
  }, []);

  const isContain = className?.includes("object-contain");
  const objectFitClass = isContain ? "object-contain" : "object-cover";

  return (
    <div 
      ref={containerRef} 
      className={`relative overflow-hidden ${className || ""}`}
    >
      {shouldLoad && (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full ${objectFitClass} transition-opacity duration-350 ease-out ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setIsLoaded(true)}
          {...props}
        />
      )}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-800/30 animate-pulse" />
      )}
    </div>
  );
}
