import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const scrollPositions = new Map();

export default function ScrollToTop() {
  const location = useLocation();
  const navType = useNavigationType();
  const currentKeyRef = useRef(location.key);
  const isRestoringRef = useRef(false);

  useEffect(() => {
    currentKeyRef.current = location.key;
  }, [location.key]);

  // Save scroll position on every scroll
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onScroll = () => {
      if (isRestoringRef.current) return;
      scrollPositions.set(currentKeyRef.current, window.scrollY);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Also save on page hide (important for mobile Safari)
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        scrollPositions.set(currentKeyRef.current, window.scrollY);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    isRestoringRef.current = true;

    if (navType === "POP") {
      const target = scrollPositions.get(location.key) ?? 0;

      const canReach = () =>
        document.documentElement.scrollHeight - window.innerHeight >= target - 2;

      const finish = () => {
        window.scrollTo({ top: target, behavior: "instant" });
        isRestoringRef.current = false;
      };

      // If the page is already tall enough, restore immediately
      if (canReach()) {
        finish();
        return;
      }

      // Otherwise poll until content loads and page grows tall enough.
      // This handles Home page product grids that re-fetch on back navigation.
      let attempts = 0;
      const maxAttempts = 25; // 25 * 120ms = 3 seconds max
      const interval = setInterval(() => {
        attempts++;
        if (canReach()) {
          clearInterval(interval);
          finish();
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          // Fallback: scroll as far as we can
          const maxScroll =
            document.documentElement.scrollHeight - window.innerHeight;
          window.scrollTo({ top: Math.max(0, maxScroll), behavior: "instant" });
          isRestoringRef.current = false;
        }
      }, 120);

      return () => {
        clearInterval(interval);
        isRestoringRef.current = false;
      };
    } else {
      // PUSH / REPLACE — scroll to top instantly
      window.scrollTo({ top: 0, behavior: "instant" });
      const timer = setTimeout(() => {
        isRestoringRef.current = false;
      }, 60);
      return () => {
        clearTimeout(timer);
        isRestoringRef.current = false;
      };
    }
  }, [location.key, navType]);

  return null;
}

