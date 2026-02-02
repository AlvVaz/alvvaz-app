"use client";

import { useEffect } from "react";

const LOGOUT_ENDPOINT = "/api/auth/logout";

export function LogoutOnClose() {
  useEffect(() => {
    let didSend = false;

    const sendLogout = () => {
      if (didSend) return;
      didSend = true;

      if (navigator.sendBeacon) {
        const blob = new Blob([], { type: "application/json" });
        navigator.sendBeacon(LOGOUT_ENDPOINT, blob);
        return;
      }

      fetch(LOGOUT_ENDPOINT, {
        method: "POST",
        credentials: "include",
        keepalive: true,
      }).catch(() => undefined);
    };

    const handlePageHide = () => sendLogout();
    const handleBeforeUnload = () => sendLogout();

    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return null;
}
