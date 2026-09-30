"use client";

import React, { useState, useEffect, useCallback, useId } from "react";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/utils/api";
import QRCode from "qrcode";
import {
  Plus,
  Search,
  Star,
  Copy,
  Check,
  QrCode,
  Power,
  Trash2,
  ExternalLink,
  LogOut,
  ShieldCheck,
  User as UserIcon,
  X,
  Download,
  AlertCircle,
  Loader2,
  Calendar,
  Layers,
} from "lucide-react";

interface UrlItem {
  id: string;
  originalUrl: string;
  shortCode: string;
  customAlias?: string | null;
  title?: string | null;
  isFavorite: boolean;
  isActive: boolean;
  isBanned: boolean;
  banReason?: string | null;
  expiresAt?: string | null;
  clickCount: number;
  qrColorDark: string;
  qrColorLight: string;
  createdAt: string;
  group?: { id: string; name: string; color: string } | null;
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const searchInputId = useId();

  const [urls, setUrls] = useState<UrlItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [favoriteOnly, setFavoriteOnly] = useState(false);

  // Copied feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedQrUrl, setSelectedQrUrl] = useState<UrlItem | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Create form state
  const [newOriginalUrl, setNewOriginalUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCustomAlias, setNewCustomAlias] = useState("");
  const [newExpiresAt, setNewExpiresAt] = useState("");
  const [newQrColorDark, setNewQrColorDark] = useState("#000000");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch URLs
  const fetchUrls = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (statusFilter === "ACTIVE") params.append("isActive", "true");
      if (statusFilter === "INACTIVE") params.append("isActive", "false");
      if (favoriteOnly) params.append("isFavorite", "true");

      const res = await api.get<{
        success: boolean;
        data: { urls: UrlItem[]; pagination: any };
      }>(`/api/v1/user/urls?${params.toString()}`);

      if (res.success && res.data) {
        setUrls(res.data.urls);
      }
    } catch (err: any) {
      console.error("Failed to load URLs", err);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, favoriteOnly]);

  useEffect(() => {
    fetchUrls();
  }, [fetchUrls]);

  // Copy to clipboard
  const handleCopy = (shortCode: string, id: string) => {
    const fullUrl = `${window.location.origin}/s/${shortCode}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Toggle favorite
  const handleToggleFavorite = async (id: string) => {
    try {
      const res = await api.patch<{ success: boolean; data: { url: UrlItem } }>(
        `/api/v1/user/urls/${id}/favorite`
      );
      if (res.success && res.data) {
        setUrls((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, isFavorite: res.data.url.isFavorite } : item
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Toggle active/inactive
  const handleToggleActive = async (id: string) => {
    try {
      const res = await api.patch<{ success: boolean; data: { url: UrlItem } }>(
        `/api/v1/user/urls/${id}/toggle-active`
      );
      if (res.success && res.data) {
        setUrls((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, isActive: res.data.url.isActive } : item
          )
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete URL
  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this short link?")) return;
    try {
      await api.delete(`/api/v1/user/urls/${id}`);
      setUrls((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Open QR modal and generate image
  const handleOpenQr = async (item: UrlItem) => {
    setSelectedQrUrl(item);
    const fullUrl = `${window.location.origin}/s/${item.shortCode}`;
    try {
      const dataUrl = await QRCode.toDataURL(fullUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: item.qrColorDark || "#000000",
          light: item.qrColorLight || "#ffffff",
        },
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error("QR Code generation error", err);
    }
  };

  // Download QR Code PNG
  const handleDownloadQrPng = () => {
    if (!qrDataUrl || !selectedQrUrl) return;
    const link = document.createElement("a");
    link.download = `qrcode-${selectedQrUrl.shortCode}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  // Download QR Code SVG
  const handleDownloadQrSvg = async () => {
    if (!selectedQrUrl) return;
    const fullUrl = `${window.location.origin}/s/${selectedQrUrl.shortCode}`;
    try {
      const svgString = await QRCode.toString(fullUrl, {
        type: "svg",
        margin: 2,
        color: {
          dark: selectedQrUrl.qrColorDark || "#000000",
          light: selectedQrUrl.qrColorLight || "#ffffff",
        },
      });
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `qrcode-${selectedQrUrl.shortCode}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("SVG export error", err);
    }
  };

  // Handle Create Link
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setIsSubmitting(true);

    try {
      const payload: any = {
        originalUrl: newOriginalUrl.trim(),
        title: newTitle.trim() || undefined,
        customAlias: newCustomAlias.trim() || undefined,
        expiresAt: newExpiresAt ? new Date(newExpiresAt).toISOString() : undefined,
        qrColorDark: newQrColorDark,
      };

      const res = await api.post<{
        success: boolean;
        message?: string;
        data: { url: UrlItem; shortUrl: string; isUpdated: boolean };
      }>("/api/v1/user/urls", payload);

      if (res.success && res.data) {
        setIsCreateOpen(false);
        setNewOriginalUrl("");
        setNewTitle("");
        setNewCustomAlias("");
        setNewExpiresAt("");
        setNewQrColorDark("#000000");
        fetchUrls();
      }
    } catch (err: any) {
      setCreateError(err.message || "Failed to create short link");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metric aggregates
  const totalClicks = urls.reduce((sum, u) => sum + (u.clickCount || 0), 0);
  const activeCount = urls.filter((u) => u.isActive && !u.isBanned).length;
  const favoriteCount = urls.filter((u) => u.isFavorite).length;

  return (
    <div className="min-h-screen bg-neutral-50/50 flex flex-col">
      {/* Cloudflare-style Clean Header */}
      <header className="h-14 border-b border-neutral-200 bg-white px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded bg-[#E30A27] flex items-center justify-center text-white font-bold text-xs tracking-wider">
            S
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm tracking-tight text-neutral-900">
              Synerry
            </span>
            <span className="text-neutral-300">/</span>
            <span className="text-xs text-neutral-500 font-medium">Shortener</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded border border-neutral-200 bg-neutral-50 text-neutral-700 text-xs">
              {user.role === "ADMIN" ? (
                <ShieldCheck className="w-3.5 h-3.5 text-[#E30A27]" />
              ) : (
                <UserIcon className="w-3.5 h-3.5 text-neutral-500" />
              )}
              <span className="font-medium text-neutral-800">{user.email}</span>
              <span className="text-[10px] px-1 py-0.5 rounded bg-white text-neutral-600 border border-neutral-200 font-semibold">
                {user.role}
              </span>
            </div>
          )}

          <button
            onClick={() => logout()}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-300 rounded bg-white transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6">
        {/* Metric Summary Cards (Cloudflare Minimalist Style) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-4 bg-white border border-neutral-200 rounded-lg shadow-2xs">
            <div className="text-xs text-neutral-500 font-medium">Total Links</div>
            <div className="text-2xl font-semibold text-neutral-900 mt-1">
              {urls.length}
            </div>
          </div>
          <div className="p-4 bg-white border border-neutral-200 rounded-lg shadow-2xs">
            <div className="text-xs text-neutral-500 font-medium">Total Clicks</div>
            <div className="text-2xl font-semibold text-neutral-900 mt-1">
              {totalClicks}
            </div>
          </div>
          <div className="p-4 bg-white border border-neutral-200 rounded-lg shadow-2xs">
            <div className="text-xs text-neutral-500 font-medium">Active Links</div>
            <div className="text-2xl font-semibold text-neutral-900 mt-1">
              {activeCount}
            </div>
          </div>
          <div className="p-4 bg-white border border-neutral-200 rounded-lg shadow-2xs">
            <div className="text-xs text-neutral-500 font-medium">Favorites</div>
            <div className="text-2xl font-semibold text-neutral-900 mt-1">
              {favoriteCount}
            </div>
          </div>
        </div>

        {/* Toolbar & Action Header */}
        <div className="bg-white border border-neutral-200 rounded-lg shadow-2xs mb-4 p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-base font-semibold text-neutral-900">
                Short Links
              </h1>
              <p className="text-xs text-neutral-500">
                Manage, customize, and view performance metrics for your links
              </p>
            </div>

            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-medium text-white bg-[#E30A27] hover:bg-[#C80820] shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create link</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id={searchInputId}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, original URL, short code..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 focus:border-neutral-900"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs border border-neutral-200 rounded-md px-2.5 py-1.5 bg-white text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-900"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active only</option>
                <option value="INACTIVE">Inactive only</option>
              </select>

              <button
                type="button"
                onClick={() => setFavoriteOnly(!favoriteOnly)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border transition-colors cursor-pointer ${
                  favoriteOnly
                    ? "bg-amber-50 text-amber-800 border-amber-300"
                    : "bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300"
                }`}
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    favoriteOnly
                      ? "fill-[#EAB308] text-[#EAB308]"
                      : "text-neutral-400"
                  }`}
                />
                <span>Favorites</span>
              </button>
            </div>
          </div>
        </div>

        {/* Links Data Table (Cloudflare Minimalist Style) */}
        <div className="bg-white border border-neutral-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/60 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-10 text-center">⭐</th>
                  <th className="py-2.5 px-4">Original URL & Title</th>
                  <th className="py-2.5 px-4">Short URL</th>
                  <th className="py-2.5 px-4 text-center">Clicks</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-neutral-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-neutral-400" />
                      <span>Loading links...</span>
                    </td>
                  </tr>
                ) : urls.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-neutral-400">
                      <Layers className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
                      <p className="text-xs font-medium text-neutral-600">No links found</p>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        Create your first short URL using the button above
                      </p>
                    </td>
                  </tr>
                ) : (
                  urls.map((item) => {
                    const shortUrl = `${window.location.origin}/s/${item.shortCode}`;
                    const isCopied = copiedId === item.id;
                    const isExpired = item.expiresAt && new Date(item.expiresAt) < new Date();

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-neutral-50/50 transition-colors"
                      >
                        {/* Favorite Toggle */}
                        <td className="py-3 px-3 text-center">
                          <button
                            onClick={() => handleToggleFavorite(item.id)}
                            className="p-1 rounded hover:bg-neutral-100 transition-colors cursor-pointer text-neutral-300 hover:text-amber-500"
                            title={item.isFavorite ? "Unfavorite" : "Favorite"}
                          >
                            <Star
                              className={`w-4 h-4 ${
                                item.isFavorite
                                  ? "fill-[#EAB308] text-[#EAB308]"
                                  : "text-neutral-300"
                              }`}
                            />
                          </button>
                        </td>

                        {/* Title & Original URL */}
                        <td className="py-3 px-4 max-w-xs sm:max-w-sm">
                          <div className="font-medium text-neutral-900 truncate">
                            {item.title || item.originalUrl}
                          </div>
                          <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] truncate mt-0.5">
                            <span className="truncate max-w-[280px]">
                              {item.originalUrl}
                            </span>
                            <a
                              href={item.originalUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-neutral-400 hover:text-neutral-600 shrink-0"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        </td>

                        {/* Short URL & Copy */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <a
                              href={shortUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="font-mono text-xs text-neutral-800 hover:text-[#E30A27] hover:underline"
                            >
                              /s/{item.shortCode}
                            </a>
                            <button
                              onClick={() => handleCopy(item.shortCode, item.id)}
                              className="p-1 text-neutral-400 hover:text-neutral-800 rounded hover:bg-neutral-100 transition-colors cursor-pointer"
                              title="Copy Short URL"
                            >
                              {isCopied ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          {item.customAlias && (
                            <span className="text-[10px] text-neutral-400 font-mono">
                              alias: {item.customAlias}
                            </span>
                          )}
                        </td>

                        {/* Clicks */}
                        <td className="py-3 px-4 text-center font-medium text-neutral-800">
                          {item.clickCount}
                        </td>

                        {/* Status Badge (Strict Minimalist Pill) */}
                        <td className="py-3 px-4 text-center">
                          {item.isBanned ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                              <span>Banned</span>
                            </span>
                          ) : isExpired ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                              <span>Expired</span>
                            </span>
                          ) : !item.isActive ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
                              <span>Inactive</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>Active</span>
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* QR Code Modal Button */}
                            <button
                              onClick={() => handleOpenQr(item)}
                              className="p-1.5 text-neutral-500 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-300 rounded bg-white transition-colors cursor-pointer"
                              title="View & Download QR Code"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>

                            {/* Toggle Active Button */}
                            <button
                              onClick={() => handleToggleActive(item.id)}
                              className={`p-1.5 rounded border transition-colors cursor-pointer ${
                                item.isActive
                                  ? "text-neutral-500 hover:text-neutral-800 border-neutral-200 hover:border-neutral-300 bg-white"
                                  : "text-amber-700 border-amber-200 bg-amber-50"
                              }`}
                              title={item.isActive ? "Pause link" : "Activate link"}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 text-neutral-400 hover:text-red-600 border border-neutral-200 hover:border-red-200 rounded bg-white hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete link"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* ======================================================== */}
      {/* Create Short URL Modal (Minimalist Cloudflare Style)      */}
      {/* ======================================================== */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-2xs">
          <div className="bg-white border border-neutral-200 rounded-lg shadow-lg w-full max-w-lg overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  Create new short link
                </h3>
                <p className="text-xs text-neutral-500">
                  Generate a compact, shareable URL with analytics tracking
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Destination URL */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Destination URL <span className="text-[#E30A27]">*</span>
                </label>
                <input
                  type="url"
                  required
                  value={newOriginalUrl}
                  onChange={(e) => setNewOriginalUrl(e.target.value)}
                  placeholder="https://example.com/very-long-url-path"
                  className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              {/* Title (Optional) */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Marketing Campaign 2026"
                  className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              {/* Custom Alias & Expiration Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Custom Alias */}
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Custom Slug (Optional)
                  </label>
                  <div className="flex items-center">
                    <span className="px-2 py-2 border border-r-0 border-neutral-200 bg-neutral-50 text-neutral-400 text-xs rounded-l-md">
                      /s/
                    </span>
                    <input
                      type="text"
                      value={newCustomAlias}
                      onChange={(e) => setNewCustomAlias(e.target.value)}
                      placeholder="custom-name"
                      className="w-full px-2 py-2 text-xs border border-neutral-200 rounded-r-md focus:outline-none focus:ring-1 focus:ring-neutral-900"
                    />
                  </div>
                </div>

                {/* Expiration Date */}
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Expiration (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={newExpiresAt}
                    onChange={(e) => setNewExpiresAt(e.target.value)}
                    className="w-full px-2 py-2 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-800 border border-neutral-200 hover:border-neutral-300 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#E30A27] hover:bg-[#C80820] rounded-md shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Create link</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* QR Code Modal (Instant Preview + PNG & SVG Download)     */}
      {/* ======================================================== */}
      {selectedQrUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-2xs">
          <div className="bg-white border border-neutral-200 rounded-lg shadow-lg w-full max-w-sm overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  QR Code
                </h3>
                <p className="text-xs text-neutral-500 font-mono">
                  /s/{selectedQrUrl.shortCode}
                </p>
              </div>
              <button
                onClick={() => setSelectedQrUrl(null)}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center">
              {/* QR Image Display */}
              <div className="p-4 border border-neutral-200 rounded-lg bg-white shadow-2xs mb-4">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for ${selectedQrUrl.shortCode}`}
                    className="w-48 h-48 block"
                  />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-neutral-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                )}
              </div>

              <p className="text-xs text-neutral-500 text-center mb-5 max-w-xs truncate">
                {selectedQrUrl.originalUrl}
              </p>

              {/* Download Buttons */}
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
    </div>
  );
}
