import { useEffect, useState } from "react";

const SCROLL_THRESHOLD = 80;
const MIN_DELTA = 8;

// True after scrolling down past the top bar, false as soon as the page scrolls back up.
// Shared by the site navbar and the admin sidebar so both move together on admin pages.
export function useHideOnScroll(enabled = true) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      // Small moves (trackpad jitter, iOS bounce) don't flip it.
      if (Math.abs(delta) < MIN_DELTA) return;
      setHidden(delta > 0 && y > SCROLL_THRESHOLD);
      lastY = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [enabled]);

  return enabled && hidden;
}
