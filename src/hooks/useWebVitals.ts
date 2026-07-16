import { useEffect } from "react";
import { onCLS, onLCP, onINP, onFCP, onTTFB, Metric } from "web-vitals";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

/**
 * Sends a web vitals metric to Google Analytics via GTM dataLayer or directly via gtag.
 */
function sendToGoogleAnalytics(metric: Metric) {
  const { name, delta, value, id } = metric;

  // CLS values are small decimals (e.g. 0.1). 
  // It is common to multiply by 1000 to convert to integers for GA4 / Universal Analytics value fields.
  const gaValue = name === "CLS" ? Math.round(value * 1000) : Math.round(value);

  // 1. Log to console for local debugging
  if (import.meta.env.DEV) {
    console.log(`📊 [Web Vitals] ${name}:`, {
      value,
      delta,
      id,
      gaValue,
      rating: getRating(name, value),
    });
  }

  // 2. Push to Google Tag Manager dataLayer
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "core_web_vitals",
    event_category: "Core Web Vitals",
    event_action: name,
    event_label: id,
    event_value: gaValue,
    metric_name: name,
    metric_value: value,
    metric_delta: delta,
    metric_id: id,
    metric_rating: getRating(name, value),
  });

  // 3. Send directly to gtag if it exists
  if (typeof window.gtag === "function") {
    window.gtag("event", name, {
      event_category: "Core Web Vitals",
      value: gaValue,
      event_label: id,
      non_interaction: true,
      metric_id: id,
      metric_value: value,
      metric_delta: delta,
      metric_rating: getRating(name, value),
    });
  }
}

/**
 * Helper to rate metric values based on Google's guidelines
 */
function getRating(name: string, value: number): "good" | "needs-improvement" | "poor" {
  switch (name) {
    case "LCP":
      return value <= 2500 ? "good" : value <= 4000 ? "needs-improvement" : "poor";
    case "FID":
      return value <= 100 ? "good" : value <= 300 ? "needs-improvement" : "poor";
    case "CLS":
      return value <= 0.1 ? "good" : value <= 0.25 ? "needs-improvement" : "poor";
    case "INP":
      return value <= 200 ? "good" : value <= 500 ? "needs-improvement" : "poor";
    case "FCP":
      return value <= 1800 ? "good" : value <= 3000 ? "needs-improvement" : "poor";
    case "TTFB":
      return value <= 800 ? "good" : value <= 1800 ? "needs-improvement" : "poor";
    default:
      return "good";
  }
}

export function useWebVitals() {
  useEffect(() => {
    // Register observers for each of the Core Web Vitals and supplementary metrics
    onLCP(sendToGoogleAnalytics);
    onCLS(sendToGoogleAnalytics);
    onINP(sendToGoogleAnalytics);
    onFCP(sendToGoogleAnalytics);
    onTTFB(sendToGoogleAnalytics);
  }, []);
}
