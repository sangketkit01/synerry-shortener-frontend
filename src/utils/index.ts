import { useState, useEffect } from "react";

export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function getDomainHost(): string {
  if (typeof window !== "undefined" && window.location.host) {
    return window.location.host;
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    return new URL(appUrl).host;
  } catch {
    return "localhost:3000";
  }
}

export function useDomainHost(): string {
  const [host, setHost] = useState<string>("localhost:3000");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setHost(window.location.host);
    }
  }, []);
  return host;
}

export function getFullShortUrl(shortCode: string): string {
  if (typeof window !== "undefined" && window.location.origin) {
    return `${window.location.origin}/s/${shortCode}`;
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  try {
    return `${new URL(appUrl).origin}/s/${shortCode}`;
  } catch {
    return `http://localhost:3000/s/${shortCode}`;
  }
}
