import { useEffect, useRef, useState } from "react";

/**
 * Returns `true` when the user has stopped scrolling for `delay` ms.
 * Used to gate scroll-driven animations so they don't run while the
 * user is actively scrolling — per the site's motion spec ("nothing
 * on the page animates while the user is scrolling").
 */
export function useScrollIdle(delay = 150): boolean {
  const [idle, setIdle] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onScroll = () => {
      setIdle(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setIdle(true), delay);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [delay]);

  return idle;
}
