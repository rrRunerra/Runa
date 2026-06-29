import { useState, useEffect } from "react";

export function useRrDevice() {
  const [deviceType, setDeviceType] = useState("Unknown Device");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const userAgent = navigator.userAgent;
    if (/Windows/i.test(userAgent)) setDeviceType("Windows Device");
    else if (/Macintosh|Mac OS/i.test(userAgent)) setDeviceType("Mac Device");
    else if (/Linux/i.test(userAgent)) setDeviceType("Linux Device");
    else if (/Android/i.test(userAgent)) setDeviceType("Android Device");
    else if (/iPhone|iPad|iPod/i.test(userAgent)) setDeviceType("iOS Device");
  }, []);

  return deviceType;
}
