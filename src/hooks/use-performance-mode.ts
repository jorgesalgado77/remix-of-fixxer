import { useState, useEffect } from "react";

/**
 * Hook to detect low-end devices or user preferences for reduced motion/transparency.
 * It checks for hardware memory and user preference for reduced motion.
 */
export function usePerformanceMode() {
  const [isLowEnd, setIsLowEnd] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      // 1. Check for hardware concurrency or memory if available (Chrome-only mostly)
      const memory = (navigator as any).deviceMemory;
      const isLowMemory = memory && memory < 4;

      // 2. Check for reduced motion preference
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // 3. Simple CPU check (coarse)
      const cores = navigator.hardwareConcurrency || 4;
      const isLowPower = cores <= 2;

      if (isLowMemory || prefersReducedMotion || isLowPower) {
        setIsLowEnd(true);
      }
    } catch (e) {
      console.warn("[FIXXER]: Erro ao detectar modo de performance", e);
    }
  }, []);

  return {
    isLowEnd,
    // Utility class for glassmorphism that respects performance mode
    glassClass: isLowEnd 
      ? "bg-card/95 border border-white/10 shadow-xl" 
      : "bg-card/40 backdrop-blur-md border border-white/10 shadow-2xl",
    // Primary button with glow vs simple
    primaryBtn: isLowEnd
      ? "bg-primary text-primary-foreground font-bold shadow-md hover:opacity-90 transition-all"
      : "bg-primary text-primary-foreground font-bold shadow-[0_0_20px_rgba(0,255,135,0.3)] hover:shadow-[0_0_30px_rgba(0,255,135,0.5)] transition-all"
  };
}
