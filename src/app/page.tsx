"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/utils/api";
import QRCode from "qrcode";
import {
  ArrowRight,
  Link2,
  Copy,
  Check,
  QrCode,
  Download,
  ExternalLink,
  AlertCircle,
  Loader2,
  Clock,
  Trash2,
  SlidersHorizontal,
  BarChart3,
  Shield,
  Layers,
  X,
} from "lucide-react";

interface GuestUrlItem {
  id: string;
  originalUrl: string;
  shortCode: string;
  customAlias?: string | null;
  claimToken?: string | null;
  createdAt: string;
}

export default function HomePage() {
  const { user, isLoading } = useAuth();

  // Guest Shortener Form
  const [urlInput, setUrlInput] = useState("");
  const [customAlias, setCustomAlias] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Result state
  const [latestUrl, setLatestUrl] = useState<GuestUrlItem | null>(null);
  const [copiedLatest, setCopiedLatest] = useState(false);

  // QR Modal
  const [selectedQrItem, setSelectedQrItem] = useState<GuestUrlItem | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Guest history state (persisted in localStorage)
  const [guestUrls, setGuestUrls] = useState<GuestUrlItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [domainHost, setDomainHost] = useState("localhost:3000");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDomainHost(window.location.host);
    }
  }, []);

  // Load guest URLs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("synerry_guest_urls");
      if (stored) {
        setGuestUrls(JSON.parse(stored));
      }
    } catch {
      // ignore JSON errors
    }
  }, []);

  // Save guest URLs to localStorage
  const saveGuestUrls = (newList: GuestUrlItem[]) => {
    setGuestUrls(newList);
    localStorage.setItem("synerry_guest_urls", JSON.stringify(newList));
  };

  // Submit shortener
  const handleShorten = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    let formattedUrl = urlInput.trim();
    if (!formattedUrl) return;

    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    setIsSubmitting(true);
    try {
      let createdUrl: any;

      if (user) {
        // Authenticated user: create directly under user account
        const res = await api.post<{ success: boolean; data: { url: any } }>("/api/v1/user/urls", {
          originalUrl: formattedUrl,
          customAlias: customAlias.trim() || undefined,
        });
        createdUrl = res.data.url;
      } else {
        // Guest visitor: create public guest link with claimToken
        const res = await fetch("/api/v1/public/shorten", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            originalUrl: formattedUrl,
            customAlias: customAlias.trim() || undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to shorten URL");
        }
        createdUrl = data.data.url;
      }

      const newGuestItem: GuestUrlItem = {
        id: createdUrl.id,
        originalUrl: createdUrl.originalUrl,
        shortCode: createdUrl.shortCode,
        customAlias: createdUrl.customAlias,
        claimToken: createdUrl.claimToken,
        createdAt: createdUrl.createdAt,
      };

      setLatestUrl(newGuestItem);
      setUrlInput("");
      setCustomAlias("");
      setShowOptions(false);

      if (!user) {
        // Only persist in guest localStorage if not logged in
        const updatedList = [
          newGuestItem,
          ...guestUrls.filter((item) => item.shortCode !== newGuestItem.shortCode),
        ].slice(0, 10);
        saveGuestUrls(updatedList);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Copy URL
  const handleCopy = (shortCode: string, id?: string) => {
    const full = `${window.location.origin}/s/${shortCode}`;
    navigator.clipboard.writeText(full);
    if (id) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      setCopiedLatest(true);
      setTimeout(() => setCopiedLatest(false), 2000);
    }
  };

  // Open QR modal
  const handleOpenQr = async (item: GuestUrlItem) => {
    setSelectedQrItem(item);
    const full = `${window.location.origin}/s/${item.shortCode}`;
    try {
      const dataUrl = await QRCode.toDataURL(full, {
        width: 280,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
      setQrDataUrl(dataUrl);
    } catch (e) {
      console.error(e);
    }
  };

  // Download QR PNG
  const handleDownloadQrPng = () => {
    if (!qrDataUrl || !selectedQrItem) return;
    const a = document.createElement("a");
    a.download = `qrcode-${selectedQrItem.shortCode}.png`;
    a.href = qrDataUrl;
    a.click();
  };

  // Download QR SVG
  const handleDownloadQrSvg = async () => {
    if (!selectedQrItem) return;
    const full = `${window.location.origin}/s/${selectedQrItem.shortCode}`;
    try {
      const svg = await QRCode.toString(full, { type: "svg", margin: 2 });
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.download = `qrcode-${selectedQrItem.shortCode}.svg`;
      a.href = url;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  // Clear guest history
  const handleClearHistory = () => {
    setGuestUrls([]);
    localStorage.removeItem("synerry_guest_urls");
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Top Navbar (Cloudflare Minimalist Style) */}
      <header className="h-14 border-b border-neutral-200 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20 bg-white">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/synerry-logo.png"
            alt="Synerry"
            className="h-7 w-auto object-contain"
          />
          <span className="font-medium text-xs tracking-tight text-neutral-500 border-l border-neutral-300 pl-2">
            Shortener
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {isLoading ? null : user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#E30A27] hover:bg-[#C80820] rounded shadow-2xs transition-colors"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#E30A27] hover:bg-[#C80820] rounded shadow-2xs transition-colors"
              >
                <span>Get Started</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex flex-col items-center px-4 py-12 sm:py-16 max-w-4xl mx-auto w-full">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-neutral-200 bg-neutral-50 text-[11px] font-medium text-neutral-600 mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E30A27]"></span>
          <span>Fast, Minimalist & Enterprise Grade URL Shortener</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-semibold tracking-tight text-neutral-900 text-center max-w-2xl leading-tight">
          Shorten links instantly. Share with confidence.
        </h1>

        <p className="mt-2 text-xs sm:text-sm text-neutral-500 text-center max-w-lg">
          Paste any long destination URL below for an instant short link and vector QR code. No account required.
        </p>

        {/* Shortener Box (Cloudflare Style Input Card) */}
        <div className="w-full max-w-2xl mt-8 bg-white border border-neutral-200 rounded-lg p-3 sm:p-4 shadow-sm">
          <form onSubmit={handleShorten} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  required
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="Paste a link: https://example.com/long-address..."
                  className="w-full pl-3 pr-8 py-2.5 text-xs text-neutral-900 bg-white border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 placeholder:text-neutral-400"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !urlInput.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 text-xs font-medium text-white bg-[#E30A27] hover:bg-[#C80820] rounded-md shadow-2xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shrink-0"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Shorten URL</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

            {/* Expandable Options Toggle */}
            <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
              <button
                type="button"
                onClick={() => setShowOptions(!showOptions)}
                className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>{showOptions ? "Hide options" : "Custom slug alias"}</span>
              </button>

              <span className="text-[11px] text-neutral-400">
                Free & unlimited redirects
              </span>
            </div>

            {/* Custom Slug Input */}
            {showOptions && (
              <div className="pt-2 border-t border-neutral-100 animate-in fade-in-0 duration-150">
                <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                  Custom Slug (Optional)
                </label>
                <div className="flex items-center">
                  <span className="px-2.5 py-1.5 border border-r-0 border-neutral-200 bg-neutral-50 text-neutral-400 text-xs rounded-l-md font-mono">
                    {domainHost}/s/
                  </span>
                  <input
                    type="text"
                    value={customAlias}
                    onChange={(e) => setCustomAlias(e.target.value)}
                    placeholder="my-custom-name"
                    className="w-full px-2.5 py-1.5 text-xs border border-neutral-200 rounded-r-md focus:outline-none focus:ring-1 focus:ring-neutral-900 font-mono"
                  />
                </div>
              </div>
            )}
          </form>

          {/* Error Notice */}
          {errorMessage && (
            <div className="mt-3 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Latest Shortened Link Card */}
        {latestUrl && (
          <div className="w-full max-w-2xl mt-4 bg-white border border-emerald-200 rounded-lg p-4 shadow-sm animate-in fade-in-50">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-semibold text-neutral-900">
                  Short link ready
                </span>
              </div>
              <span className="text-[11px] text-neutral-500 font-mono">
                {domainHost}/s/{latestUrl.shortCode}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50 p-3 rounded border border-neutral-200/80">
              <div className="min-w-0 flex-1">
                <a
                  href={`/s/${latestUrl.shortCode}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-sm font-medium text-[#E30A27] hover:underline flex items-center gap-1"
                >
                  <span>{typeof window !== "undefined" ? window.location.origin : ""}/s/{latestUrl.shortCode}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                </a>
                <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                  {latestUrl.originalUrl}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleCopy(latestUrl.shortCode)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-neutral-200 hover:border-neutral-300 rounded text-xs font-medium text-neutral-700 transition-colors cursor-pointer"
                >
                  {copiedLatest ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-neutral-500" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleOpenQr(latestUrl)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-neutral-200 hover:border-neutral-300 rounded text-xs font-medium text-neutral-700 transition-colors cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5 text-neutral-500" />
                  <span>QR Code</span>
                </button>
              </div>
            </div>

            {!user && (
              <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                <span>Want to view analytics and edit this link later?</span>
                <Link
                  href="/register"
                  className="text-xs font-medium text-[#E30A27] hover:underline inline-flex items-center gap-1"
                >
                  <span>Create free account to save</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Guest Recent Links on This Device */}
        {guestUrls.length > 0 && (
          <div className="w-full max-w-2xl mt-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                <span>Recent links on this device</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200 font-medium">
                  {guestUrls.length}
                </span>
              </div>

              <button
                onClick={handleClearHistory}
                className="text-[11px] text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
              >
                Clear history
              </button>
            </div>

            <div className="border border-neutral-200 rounded-lg bg-white overflow-hidden divide-y divide-neutral-100 shadow-2xs">
              {guestUrls.map((item) => {
                const isCopied = copiedId === item.id;
                return (
                  <div
                    key={item.id}
                    className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-neutral-50/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <a
                          href={`/s/${item.shortCode}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-xs font-medium text-neutral-800 hover:text-[#E30A27] hover:underline"
                        >
                          <span className="text-neutral-400">{domainHost}/s/</span>
                          <span className="font-semibold text-neutral-900">{item.shortCode}</span>
                        </a>
                        {item.customAlias && (
                          <span className="text-[10px] text-neutral-400 font-mono">
                            alias: {item.customAlias}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 truncate mt-0.5 max-w-md">
                        {item.originalUrl}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleCopy(item.shortCode, item.id)}
                        className="p-1.5 text-neutral-400 hover:text-neutral-800 rounded hover:bg-neutral-100 transition-colors cursor-pointer"
                        title="Copy link"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={() => handleOpenQr(item)}
                        className="p-1.5 text-neutral-400 hover:text-neutral-800 rounded hover:bg-neutral-100 transition-colors cursor-pointer"
                        title="QR Code"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {!user && (
              <p className="text-[11px] text-neutral-400 text-center mt-2">
                Sign in or register to automatically sync these links to your account.
              </p>
            )}
          </div>
        )}

        {/* Feature Highlights Grid (Cloudflare Style) */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl text-left">
          <div className="p-4 border border-neutral-200 rounded-lg bg-neutral-50/50">
            <Link2 className="w-4 h-4 text-[#E30A27] mb-2" />
            <h3 className="text-xs font-semibold text-neutral-900">
              Sub-20ms 302 Redirection
            </h3>
            <p className="mt-1 text-[11px] text-neutral-500 leading-normal">
              Direct high-throughput redirection with async click stream tracking.
            </p>
          </div>

          <div className="p-4 border border-neutral-200 rounded-lg bg-neutral-50/50">
            <QrCode className="w-4 h-4 text-[#E30A27] mb-2" />
            <h3 className="text-xs font-semibold text-neutral-900">
              Vector QR Codes
            </h3>
            <p className="mt-1 text-[11px] text-neutral-500 leading-normal">
              Instant generation with vector SVG and high-res PNG download support.
            </p>
          </div>

          <div className="p-4 border border-neutral-200 rounded-lg bg-neutral-50/50">
            <BarChart3 className="w-4 h-4 text-[#E30A27] mb-2" />
            <h3 className="text-xs font-semibold text-neutral-900">
              OLAP Star Analytics
            </h3>
            <p className="mt-1 text-[11px] text-neutral-500 leading-normal">
              Python ETL pipeline aggregation across devices, browsers, and countries.
            </p>
          </div>
        </div>
      </main>

      {/* QR Code Modal */}
      {selectedQrItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-2xs">
          <div className="bg-white border border-neutral-200 rounded-lg shadow-lg w-full max-w-sm overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  QR Code
                </h3>
                <p className="text-xs text-neutral-500 font-mono">
                  {domainHost}/s/{selectedQrItem.shortCode}
                </p>
              </div>
              <button
                onClick={() => setSelectedQrItem(null)}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center">
              <div className="p-4 border border-neutral-200 rounded-lg bg-white shadow-2xs mb-4">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt={`QR for ${selectedQrItem.shortCode}`}
                    className="w-44 h-44 block"
                  />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center text-neutral-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                )}
              </div>

              <p className="text-xs text-neutral-500 text-center mb-5 max-w-xs truncate">
                {selectedQrItem.originalUrl}
              </p>

              <div className="grid grid-cols-2 gap-2 w-full">
                <button
                  onClick={handleDownloadQrPng}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 border border-neutral-200 hover:border-neutral-300 rounded text-xs font-medium text-neutral-700 bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Download PNG</span>
                </button>
                <button
                  onClick={handleDownloadQrSvg}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 border border-neutral-200 hover:border-neutral-300 rounded text-xs font-medium text-neutral-700 bg-neutral-50 hover:bg-neutral-100 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Download SVG</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clean Minimalist Footer */}
      <footer className="border-t border-neutral-200 py-6 text-center text-xs text-neutral-400 bg-white">
        Synerry Corporation Assessment Short URL Platform
      </footer>
    </div>
  );
}
