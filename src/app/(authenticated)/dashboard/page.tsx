"use client";

import React, { useState, useEffect, useCallback, useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/utils/api";
import QRCode from "qrcode";
import {
  Plus,
  Pencil,
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
  BarChart3,
  Folder,
  FolderPlus,
  Tag,
  Palette,
} from "lucide-react";

interface GroupItem {
  id: string;
  name: string;
  color: string;
  urlCount: number;
}

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
  const router = useRouter();
  const searchInputId = useId();

  useEffect(() => {
    if (user && user.role === "ADMIN") {
      router.replace("/admin");
    }
  }, [user, router]);

  const [urls, setUrls] = useState<UrlItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [favoriteOnly, setFavoriteOnly] = useState(false);

  // Copied feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [domainHost, setDomainHost] = useState("localhost:3000");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDomainHost(window.location.host);
    }
  }, []);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedQrUrl, setSelectedQrUrl] = useState<UrlItem | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Groups state
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#3B82F6");
  const [groupError, setGroupError] = useState<string | null>(null);

  // Create form state
  const [newOriginalUrl, setNewOriginalUrl] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newCustomAlias, setNewCustomAlias] = useState("");
  const [newExpiresAt, setNewExpiresAt] = useState("");
  const [newGroupId, setNewGroupId] = useState("");
  const [newQrColorDark, setNewQrColorDark] = useState("#000000");
  const [newQrColorLight, setNewQrColorLight] = useState("#ffffff");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit form state
  const [editingUrl, setEditingUrl] = useState<UrlItem | null>(null);
  const [editOriginalUrl, setEditOriginalUrl] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editGroupId, setEditGroupId] = useState("");
  const [editQrColorDark, setEditQrColorDark] = useState("#000000");
  const [editQrColorLight, setEditQrColorLight] = useState("#ffffff");
  const [editError, setEditError] = useState<string | null>(null);
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);

  // Fetch groups
  const fetchGroups = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: { groups: GroupItem[] } }>("/api/v1/user/groups");
      if (res.success && res.data) {
        setGroups(res.data.groups);
      }
    } catch (e) {
      console.error("Failed to load groups", e);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setGroupError(null);
    try {
      const res = await api.post<{ success: boolean; data: { group: GroupItem } }>("/api/v1/user/groups", {
        name: newGroupName.trim(),
        color: newGroupColor,
      });
      if (res.success && res.data) {
        setGroups((prev) => [...prev, res.data.group]);
        setNewGroupName("");
      }
    } catch (err: any) {
      setGroupError(err.message || "Failed to create group");
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!window.confirm("Delete this group? Links inside it will become unassigned.")) return;
    try {
      await api.delete(`/api/v1/user/groups/${id}`);
      setGroups((prev) => prev.filter((g) => g.id !== id));
      if (selectedGroupId === id) setSelectedGroupId(null);
      fetchUrls();
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenEdit = (item: UrlItem) => {
    setEditingUrl(item);
    setEditOriginalUrl(item.originalUrl);
    setEditTitle(item.title || "");
    setEditExpiresAt(item.expiresAt ? new Date(item.expiresAt).toISOString().substring(0, 16) : "");
    setEditIsActive(item.isActive);
    setEditGroupId(item.group?.id || "");
    setEditQrColorDark(item.qrColorDark || "#000000");
    setEditQrColorLight(item.qrColorLight || "#ffffff");
    setEditError(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUrl) return;
    setEditError(null);
    setIsEditSubmitting(true);
    try {
      const res = await api.patch<{ success: boolean; data: { url: UrlItem } }>(
        `/api/v1/user/urls/${editingUrl.id}`,
        {
          title: editTitle.trim() || null,
          expiresAt: editExpiresAt ? new Date(editExpiresAt).toISOString() : null,
          isActive: editIsActive,
          groupId: editGroupId || null,
          qrColorDark: editQrColorDark,
          qrColorLight: editQrColorLight,
        }
      );
      if (res.success && res.data) {
        setUrls((prev) =>
          prev.map((item) => (item.id === editingUrl.id ? { ...item, ...res.data.url } : item))
        );
        setEditingUrl(null);
        await Promise.all([fetchUrls(), fetchGroups()]);
      }
    } catch (err: any) {
      setEditError(err.message || "Failed to update link");
    } finally {
      setIsEditSubmitting(false);
    }
  };

  // Fetch URLs
  const fetchUrls = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (statusFilter === "ACTIVE") params.append("isActive", "true");
      if (statusFilter === "INACTIVE") params.append("isActive", "false");
      if (favoriteOnly) params.append("isFavorite", "true");
      if (selectedGroupId) params.append("groupId", selectedGroupId);

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
  }, [search, statusFilter, favoriteOnly, selectedGroupId]);

  useEffect(() => {
    fetchUrls();
  }, [fetchUrls]);

  // Auto-sync guest URLs created in localStorage into this user account
  useEffect(() => {
    const syncGuestLinks = async () => {
      try {
        const stored = localStorage.getItem("synerry_guest_urls");
        if (!stored) return;
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed) || parsed.length === 0) return;

        const claims = parsed
          .filter((item: any) => item.shortCode)
          .map((item: any) => ({
            shortCode: item.shortCode,
            claimToken: item.claimToken,
          }));

        if (claims.length === 0) return;

        const res = await api.post<{ success: boolean; data: { syncedCount: number } }>(
          "/api/v1/user/urls/sync-guest",
          { claims }
        );

        if (res.success && res.data && res.data.syncedCount > 0) {
          localStorage.removeItem("synerry_guest_urls");
          fetchUrls();
        }
      } catch (err) {
        console.error("Failed to auto-sync guest URLs", err);
      }
    };

    syncGuestLinks();
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
        groupId: newGroupId || undefined,
        qrColorDark: newQrColorDark,
        qrColorLight: newQrColorLight,
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
        setNewGroupId("");
        setNewQrColorDark("#000000");
        setNewQrColorLight("#ffffff");
        fetchUrls();
        fetchGroups();
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
      <header className="h-14 border-b border-neutral-200 bg-white px-3 sm:px-8 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <img
              src="/synerry-logo.png"
              alt="Synerry"
              className="h-6 sm:h-7 w-auto object-contain"
            />
            <span className="font-semibold text-sm text-neutral-900 hover:text-[#E30A27] transition-colors">
              Shortener
            </span>
          </Link>

          <nav className="flex items-center gap-1 sm:gap-1.5 text-xs text-neutral-500 overflow-x-auto">
            <span className="text-neutral-300">/</span>
            <Link
              href="/dashboard"
              onClick={() => {
                setSelectedGroupId(null);
                setStatusFilter("ALL");
                setFavoriteOnly(false);
                setSearch("");
              }}
              className={`transition-colors font-medium ${
                !selectedGroupId && statusFilter === "ALL" && !favoriteOnly && !search
                  ? "text-neutral-900 font-semibold"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              Dashboard
            </Link>
            {selectedGroupId && (
              <>
                <span className="text-neutral-300">/</span>
                <span className="text-neutral-900 font-medium flex items-center gap-1 truncate max-w-[100px] sm:max-w-[160px]">
                  <Folder
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: groups.find((g) => g.id === selectedGroupId)?.color || "#3B82F6" }}
                  />
                  <span className="truncate">{groups.find((g) => g.id === selectedGroupId)?.name}</span>
                </span>
              </>
            )}
            {favoriteOnly && (
              <>
                <span className="text-neutral-300">/</span>
                <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[11px] font-medium flex items-center gap-1">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  <span className="hidden sm:inline">Favorites</span>
                </span>
              </>
            )}
            {statusFilter !== "ALL" && (
              <>
                <span className="text-neutral-300">/</span>
                <span className="text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded text-[11px] font-medium">
                  {statusFilter === "ACTIVE" ? "Active" : "Inactive"}
                </span>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {user && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-neutral-200 bg-neutral-50 text-neutral-700 text-xs">
              {user.role === "ADMIN" ? (
                <ShieldCheck className="w-3.5 h-3.5 text-[#E30A27]" />
              ) : (
                <UserIcon className="w-3.5 h-3.5 text-neutral-500" />
              )}
              <span className="font-medium text-neutral-800 hidden md:inline">{user.email}</span>
              <span className="text-[10px] px-1 py-0.5 rounded bg-white text-neutral-600 border border-neutral-200 font-semibold">
                {user.role}
              </span>
            </div>
          )}

          <Link
            href="/analytics"
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs text-neutral-700 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-300 rounded bg-white transition-colors cursor-pointer"
            title="Analytics"
          >
            <BarChart3 className="w-3.5 h-3.5 text-neutral-500" />
            <span className="hidden sm:inline">Analytics</span>
          </Link>

          {user && user.role === "ADMIN" && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-red-700 hover:text-red-800 border border-red-200 hover:border-red-300 rounded bg-red-50/60 transition-colors cursor-pointer"
              title="Admin Moderation"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Admin Moderation</span>
            </Link>
          )}

          <button
            onClick={() => logout()}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-300 rounded bg-white transition-colors cursor-pointer"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign out</span>
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

          {/* Group / Folder Tab Bar (Dedicated Horizontal Bar) */}
          <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2 overflow-x-auto pb-1">
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => setSelectedGroupId(null)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  selectedGroupId === null
                    ? "bg-neutral-900 text-white shadow-2xs"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900"
                }`}
              >
                <span>All Links</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    selectedGroupId === null
                      ? "bg-neutral-700 text-white"
                      : "bg-neutral-200 text-neutral-600"
                  }`}
                >
                  {urls.length}
                </span>
              </button>

              {groups.map((g) => {
                const isSelected = selectedGroupId === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGroupId(isSelected ? null : g.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
                      isSelected
                        ? "bg-neutral-900 text-white border-neutral-900 shadow-2xs"
                        : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: g.color }}
                    />
                    <span>{g.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isSelected
                          ? "bg-neutral-700 text-white"
                          : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {g.urlCount}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsGroupModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs border border-dashed border-neutral-300 hover:border-neutral-400 text-neutral-600 hover:text-neutral-900 bg-white transition-colors cursor-pointer shrink-0"
              title="Manage Groups and Folders"
            >
              <FolderPlus className="w-3.5 h-3.5 text-neutral-500" />
              <span>New Group</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
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
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50/60 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-10 text-center">
                    <Star className="w-3.5 h-3.5 text-neutral-400 mx-auto" />
                  </th>
                  <th className="py-2.5 px-4">Original URL & Title</th>
                  <th className="py-2.5 px-4">Short URL</th>
                  <th className="py-2.5 px-4">Group</th>
                  <th className="py-2.5 px-4 text-center">Clicks</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-neutral-400" />
                      <span>Loading links...</span>
                    </td>
                  </tr>
                ) : urls.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-400">
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
                          <div className="flex items-center gap-1.5 font-medium text-neutral-900 truncate">
                            <span className="truncate">{item.title || item.originalUrl}</span>
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
                              className="font-mono text-xs text-neutral-800 hover:text-[#E30A27] hover:underline inline-flex items-center"
                            >
                              <span className="text-neutral-400">{domainHost}/s/</span>
                              <span className="font-semibold text-neutral-900">{item.shortCode}</span>
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

                        {/* Group / Folder */}
                        <td className="py-3 px-4">
                          {item.group ? (
                            <span
                              style={{
                                backgroundColor: item.group.color + "18",
                                borderColor: item.group.color + "40",
                                color: item.group.color,
                              }}
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium border"
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: item.group.color }}
                              />
                              <span className="truncate max-w-[120px]">{item.group.name}</span>
                            </span>
                          ) : (
                            <span className="text-neutral-300 text-xs">-</span>
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
                            {/* Analytics Link */}
                            <Link
                              href={`/analytics?id=${item.id}&code=${item.shortCode}`}
                              className="p-1.5 text-neutral-500 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-300 rounded bg-white transition-colors cursor-pointer"
                              title="View Analytics"
                            >
                              <BarChart3 className="w-3.5 h-3.5" />
                            </Link>

                            {/* Edit Button */}
                            {item.isBanned ? (
                              <span
                                className="p-1.5 text-neutral-300 border border-neutral-100 rounded bg-neutral-50 cursor-not-allowed"
                                title="Locked: Suspended by Administrator"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <button
                                onClick={() => handleOpenEdit(item)}
                                className="p-1.5 text-neutral-500 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-300 rounded bg-white transition-colors cursor-pointer"
                                title="Edit link"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* QR Code Modal Button */}
                            <button
                              onClick={() => handleOpenQr(item)}
                              className="p-1.5 text-neutral-500 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-300 rounded bg-white transition-colors cursor-pointer"
                              title="View & Download QR Code"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>

                            {/* Toggle Active Button */}
                            {item.isBanned ? (
                              <span
                                className="p-1.5 text-neutral-300 border border-neutral-100 rounded bg-neutral-50 cursor-not-allowed"
                                title="Locked: Suspended by Administrator"
                              >
                                <Power className="w-3.5 h-3.5" />
                              </span>
                            ) : (
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
                            )}

                            {/* Delete Button */}
                            {item.isBanned ? (
                              <span
                                className="p-1.5 text-neutral-300 border border-neutral-100 rounded bg-neutral-50 cursor-not-allowed"
                                title="Locked: Suspended by Administrator"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-1.5 text-neutral-400 hover:text-red-600 border border-neutral-200 hover:border-red-200 rounded bg-white hover:bg-red-50 transition-colors cursor-pointer"
                                title="Delete link"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/30 backdrop-blur-2xs">
          <div className="bg-white border border-neutral-200 rounded-lg shadow-lg w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="px-5 sm:px-6 py-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
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

            <form onSubmit={handleCreateSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
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
                    <span className="px-2 py-2 border border-r-0 border-neutral-200 bg-neutral-50 text-neutral-400 text-xs rounded-l-md font-mono">
                      {domainHost}/s/
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

              {/* Group / Folder Assignment */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Group / Category (Optional)
                </label>
                <select
                  value={newGroupId}
                  onChange={(e) => setNewGroupId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white text-neutral-800"
                >
                  <option value="">No Group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* QR Code Colors Customization */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                    QR Foreground Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newQrColorDark}
                      onChange={(e) => setNewQrColorDark(e.target.value)}
                      className="w-7 h-7 rounded border border-neutral-200 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={newQrColorDark}
                      onChange={(e) => setNewQrColorDark(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs font-mono border border-neutral-200 rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                    QR Background Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newQrColorLight}
                      onChange={(e) => setNewQrColorLight(e.target.value)}
                      className="w-7 h-7 rounded border border-neutral-200 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={newQrColorLight}
                      onChange={(e) => setNewQrColorLight(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs font-mono border border-neutral-200 rounded"
                    />
                  </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/30 backdrop-blur-2xs">
          <div className="bg-white border border-neutral-200 rounded-lg shadow-lg w-full max-w-sm max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  QR Code
                </h3>
                <p className="text-xs text-neutral-500 font-mono">
                  {domainHost}/s/{selectedQrUrl.shortCode}
                </p>
              </div>
              <button
                onClick={() => setSelectedQrUrl(null)}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 flex flex-col items-center overflow-y-auto">
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

      {/* ======================================================== */}
      {/* Edit Short URL Modal (Minimalist Cloudflare Style)        */}
      {/* ======================================================== */}
      {editingUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/30 backdrop-blur-2xs">
          <div className="bg-white border border-neutral-200 rounded-lg shadow-lg w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="px-5 sm:px-6 py-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  Edit short link
                </h3>
                <p className="text-xs text-neutral-500 font-mono">
                  {domainHost}/s/{editingUrl.shortCode}
                </p>
              </div>
              <button
                onClick={() => setEditingUrl(null)}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              {editError && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Destination URL (Immutable) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-neutral-700">
                    Destination URL
                  </label>
                  <span className="text-[10px] text-neutral-400">
                    Target URL is permanent to preserve link integrity
                  </span>
                </div>
                <input
                  type="url"
                  disabled
                  value={editOriginalUrl}
                  className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-md bg-neutral-50 text-neutral-500 font-mono cursor-not-allowed select-all"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Title (Optional)
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Marketing Campaign 2026"
                  className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              {/* Expiration Date & Active Toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 mb-1">
                    Expiration Date
                  </label>
                  <input
                    type="datetime-local"
                    value={editExpiresAt}
                    onChange={(e) => setEditExpiresAt(e.target.value)}
                    className="w-full px-2 py-2 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                </div>

                <div className="flex items-center gap-2 h-9 px-3 border border-neutral-200 rounded-md bg-neutral-50/50">
                  <input
                    type="checkbox"
                    id="edit-is-active"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="rounded border-neutral-300 text-[#E30A27] focus:ring-[#E30A27]"
                  />
                  <label htmlFor="edit-is-active" className="text-xs text-neutral-700 font-medium cursor-pointer select-none">
                    Link Active (Enabled)
                  </label>
                </div>
              </div>

              {/* Group / Folder Assignment */}
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Group / Category
                </label>
                <select
                  value={editGroupId}
                  onChange={(e) => setEditGroupId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white text-neutral-800"
                >
                  <option value="">No Group (Unassigned)</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* QR Code Colors Customization */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                    QR Foreground Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editQrColorDark}
                      onChange={(e) => setEditQrColorDark(e.target.value)}
                      className="w-7 h-7 rounded border border-neutral-200 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={editQrColorDark}
                      onChange={(e) => setEditQrColorDark(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs font-mono border border-neutral-200 rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                    QR Background Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={editQrColorLight}
                      onChange={(e) => setEditQrColorLight(e.target.value)}
                      className="w-7 h-7 rounded border border-neutral-200 cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={editQrColorLight}
                      onChange={(e) => setEditQrColorLight(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs font-mono border border-neutral-200 rounded"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUrl(null)}
                  className="px-3 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-800 border border-neutral-200 hover:border-neutral-300 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEditSubmitting}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#E30A27] hover:bg-[#C80820] rounded-md shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isEditSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Save changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Group / Folder Management Modal                          */}
      {/* ======================================================== */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/30 backdrop-blur-2xs">
          <div className="bg-white border border-neutral-200 rounded-lg shadow-lg w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                  <Folder className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">
                    Manage Groups & Categories
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Organize your short links into folders
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGroupModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              {/* Existing Groups List */}
              <div>
                <h4 className="text-xs font-semibold text-neutral-700 mb-2">
                  Existing Groups ({groups.length})
                </h4>
                {groups.length === 0 ? (
                  <p className="text-xs text-neutral-400 py-3 text-center border border-dashed border-neutral-200 rounded-md">
                    No groups created yet. Create one below!
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {groups.map((g) => (
                      <div
                        key={g.id}
                        className="flex items-center justify-between p-2 rounded-md border border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: g.color }}
                          ></span>
                          <span className="font-medium text-neutral-800">{g.name}</span>
                          <span className="text-[10px] text-neutral-400">
                            ({g.urlCount} links)
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteGroup(g.id)}
                          className="p-1 text-neutral-400 hover:text-red-600 transition-colors"
                          title="Delete group"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Create Group Form */}
              <form onSubmit={handleCreateGroup} className="pt-3 border-t border-neutral-100 space-y-3">
                <h4 className="text-xs font-semibold text-neutral-700">
                  Create New Group
                </h4>

                {groupError && (
                  <div className="p-2 rounded bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                    <span>{groupError}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newGroupColor}
                    onChange={(e) => setNewGroupColor(e.target.value)}
                    className="w-8 h-8 rounded border border-neutral-200 cursor-pointer p-0.5 bg-white shrink-0"
                    title="Choose group color"
                  />
                  <input
                    type="text"
                    required
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g. Marketing, Social, Personal..."
                    className="flex-1 px-3 py-1.5 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 rounded-md transition-colors shrink-0"
                  >
                    Add
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
