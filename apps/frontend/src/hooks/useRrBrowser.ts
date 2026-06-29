import { useState, useEffect } from "react";

export function useRrBrowser() {
  const [browserName, setBrowserName] = useState("Browser");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const userAgent = navigator.userAgent;
    if (/Chrome/i.test(userAgent) && !/Edge|Edg/i.test(userAgent)) setBrowserName("Chrome");
    else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) setBrowserName("Safari");
    else if (/Firefox/i.test(userAgent)) setBrowserName("Firefox");
    else if (/Edge|Edg/i.test(userAgent)) setBrowserName("Edge");
  }, []);

  return browserName;
}
