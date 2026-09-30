"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/utils/api";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  ExternalLink,
  Copy,
  Check,
  Ban,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  X,
  User as UserIcon,
  Users,
  Globe,
  Filter,
  Database,
  Activity,
  Play,
  Server,
  RefreshCw,
  BarChart2,
  LogOut,
  Clock,
} from "lucide-react";

interface AdminUrlItem {
  id: string;
  originalUrl: string;
  shortCode: string;
  customAlias?: string | null;
  title?: string | null;
  isFavorite: boolean;
  isActive: boolean;
  isBanned: boolean;
  banReason?: string | null;
  bannedAt?: string | null;
  deletedAt?: string | null;
  clickCount: number;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    role: string;
  } | null;
  bannedBy?: {
    id: string;
    email: string;
  } | null;
}

interface AdminUserItem {
  id: string;
  email: string;
  role: string;
  isBanned: boolean;
  banReason?: string | null;
  bannedAt?: string | null;
  createdAt: string;
  urlsCount: number;
  groupsCount: number;
}

interface SystemOverview {
  totalUsers: number;
  totalUrls: number;
  totalClicks: number;
  totalBanned: number;
}

export default function AdminModerationPage() {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<"urls" | "users" | "pipeline">("urls");

  // Overview stats
  const [overview, setOverview] = useState<SystemOverview>({
    totalUsers: 0,
    totalUrls: 0,
    totalClicks: 0,
    totalBanned: 0,
  });

  // URLs State
  const [urls, setUrls] = useState<AdminUrlItem[]>([]);
  const [isLoadingUrls, setIsLoadingUrls] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "BANNED" | "ACTIVE" | "DELETED">("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Users State
  const [usersList, setUsersList] = useState<AdminUserItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  // Pipeline State
  const [isTriggeringPipeline, setIsTriggeringPipeline] = useState(false);
  const [pipelineMessage, setPipelineMessage] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [pipelineQueue, setPipelineQueue] = useState<{ pending_raw_clicks: number; total_fact_clicks: number } | null>(null);
  const [lastSyncDetail, setLastSyncDetail] = useState<{
    processed_events: number;
    execution_time_ms: number;
    timestamp: string;
    message: string;
  } | null>(null);

  // Ban URL Modal State
  const [banningUrl, setBanningUrl] = useState<AdminUrlItem | null>(null);
  const [banReason, setBanReason] = useState("");
  const [banError, setBanError] = useState<string | null>(null);
  const [isSubmittingBan, setIsSubmittingBan] = useState(false);

  // Ban User Modal State
  const [banningUser, setBanningUser] = useState<AdminUserItem | null>(null);
  const [userBanReason, setUserBanReason] = useState("");
  const [userBanError, setUserBanError] = useState<string | null>(null);
  const [isSubmittingUserBan, setIsSubmittingUserBan] = useState(false);

  const [domainHost, setDomainHost] = useState("localhost:3000");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDomainHost(window.location.host);
    }
  }, []);

  // Fetch Overview Stats
  const fetchOverview = useCallback(async () => {
    try {
      const res = await api.get<{ success: boolean; data: { stats: SystemOverview } }>(
        "/api/v1/admin/overview"
      );
      if (res.success && res.data?.stats) {
        setOverview(res.data.stats);
      }
    } catch (err) {
      console.error("Overview error", err);
    }
  }, []);

  // Fetch URLs for Admin
  const fetchUrls = useCallback(async () => {
    try {
      setIsLoadingUrls(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const res = await api.get<{
        success: boolean;
        data: {
          urls: AdminUrlItem[];
          stats: { totalUrls: number; totalBanned: number };
          pagination: any;
        };
      }>(`/api/v1/admin/urls?${params.toString()}`);

      if (res.success && res.data) {
        setUrls(res.data.urls);
        setOverview((prev) => ({
          ...prev,
          totalUrls: res.data.stats.totalUrls,
          totalBanned: res.data.stats.totalBanned,
        }));
      }
    } catch (err) {
      console.error("Admin URLs fetch error", err);
    } finally {
      setIsLoadingUrls(false);
    }
  }, [search, statusFilter]);

  // Fetch Users
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoadingUsers(true);
      const res = await api.get<{
        success: boolean;
        data: { users: AdminUserItem[] };
      }>("/api/v1/admin/users");
      if (res.success && res.data) {
        setUsersList(res.data.users);
      }
    } catch (err) {
      console.error("Admin Users fetch error", err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "ADMIN") {
      fetchOverview();
      fetchUrls();
      fetchUsers();
    }
  }, [user, fetchOverview, fetchUrls, fetchUsers]);

  // Copy short URL
  const handleCopy = (shortCode: string, id: string) => {
    const full = `${window.location.origin}/s/${shortCode}`;
    navigator.clipboard.writeText(full);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open Ban URL Modal
  const handleOpenBan = (item: AdminUrlItem) => {
    setBanningUrl(item);
    setBanReason("");
    setBanError(null);
  };

  // Submit URL Ban
  const handleBanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banningUrl) return;

    if (!banReason.trim() || banReason.trim().length < 3) {
      setBanError("Please provide a suspension reason of at least 3 characters.");
      return;
    }

    try {
      setIsSubmittingBan(true);
      setBanError(null);

      const res = await api.patch<{ success: boolean; data: { url: AdminUrlItem } }>(
        `/api/v1/admin/urls/${banningUrl.id}/ban`,
        { reason: banReason.trim() }
      );

      if (res.success && res.data) {
        setUrls((prev) =>
          prev.map((item) => (item.id === banningUrl.id ? res.data.url : item))
        );
        setOverview((prev) => ({ ...prev, totalBanned: prev.totalBanned + 1 }));
        setBanningUrl(null);
      }
    } catch (err: any) {
      setBanError(err.message || "Failed to suspend URL");
    } finally {
      setIsSubmittingBan(false);
    }
  };

  // Unban URL
  const handleUnban = async (id: string) => {
    if (!window.confirm("Are you sure you want to lift the suspension for this URL?")) return;
    try {
      const res = await api.patch<{ success: boolean; data: { url: AdminUrlItem } }>(
        `/api/v1/admin/urls/${id}/unban`
      );
      if (res.success && res.data) {
        setUrls((prev) =>
          prev.map((item) => (item.id === id ? res.data.url : item))
        );
        setOverview((prev) => ({
          ...prev,
          totalBanned: Math.max(0, prev.totalBanned - 1),
        }));
      }
    } catch (err) {
      console.error("Unban error", err);
    }
  };

  // Delete URL permanently
  const handleDelete = async (id: string) => {
    if (!window.confirm("Permanently delete this URL from the database? This cannot be undone.")) {
      return;
    }
    try {
      await api.delete(`/api/v1/admin/urls/${id}`);
      setUrls((prev) => prev.filter((item) => item.id !== id));
      setOverview((prev) => ({
        ...prev,
        totalUrls: Math.max(0, prev.totalUrls - 1),
      }));
    } catch (err) {
      console.error("Delete error", err);
    }
  };

  // Open User Ban Modal
  const handleOpenUserBan = (targetUser: AdminUserItem) => {
    setBanningUser(targetUser);
    setUserBanReason("");
    setUserBanError(null);
  };

  // Submit User Ban
  const handleUserBanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banningUser) return;

    if (!userBanReason.trim() || userBanReason.trim().length < 3) {
      setUserBanError("Please provide a suspension reason of at least 3 characters.");
      return;
    }

    try {
      setIsSubmittingUserBan(true);
      setUserBanError(null);

      const res = await api.patch<{ success: boolean; data: { user: AdminUserItem } }>(
        `/api/v1/admin/users/${banningUser.id}/ban`,
        { reason: userBanReason.trim() }
      );

      if (res.success && res.data) {
        setUsersList((prev) =>
          prev.map((u) => (u.id === banningUser.id ? { ...u, isBanned: true, banReason: userBanReason.trim() } : u))
        );
        setBanningUser(null);
      }
    } catch (err: any) {
      setUserBanError(err.message || "Failed to suspend user");
    } finally {
      setIsSubmittingUserBan(false);
    }
  };

  // Unban User
  const handleUserUnban = async (userId: string) => {
    if (!window.confirm("Lift suspension for this user account?")) return;
    try {
      const res = await api.patch<{ success: boolean; data: { user: AdminUserItem } }>(
        `/api/v1/admin/users/${userId}/unban`
      );
      if (res.success) {
        setUsersList((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isBanned: false, banReason: null } : u))
        );
      }
    } catch (err) {
      console.error("User unban error", err);
    }
  };

  // Fetch Pipeline Status
  const fetchPipelineStatus = useCallback(async () => {
    try {
      const res = await api.get<{
        success: boolean;
        data: { pending_raw_clicks: number; total_fact_clicks: number };
      }>("/api/analytics/pipeline/status");
      if (res.success && res.data) {
        setPipelineQueue(res.data);
      }
    } catch (e) {
      console.warn("Pipeline status fetch failed", e);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "pipeline") {
      fetchPipelineStatus();
    }
  }, [activeTab, fetchPipelineStatus]);

  // Trigger ETL Pipeline
  const handleTriggerPipeline = async () => {
    try {
      setIsTriggeringPipeline(true);
      setPipelineMessage(null);
      setLastSyncDetail(null);
      const res = await api.post<{
        success: boolean;
        data?: {
          status: string;
          processed_events: number;
          execution_time_ms: number;
          timestamp: string;
          message: string;
        };
        message?: string;
      }>("/api/analytics/pipeline/trigger");
      if (res.success && res.data) {
        setLastSyncTime(new Date(res.data.timestamp).toLocaleTimeString());
        setLastSyncDetail(res.data);
        setPipelineMessage(res.data.message);
        await Promise.all([fetchOverview(), fetchPipelineStatus()]);
      } else {
        setPipelineMessage(res.message || "Failed to trigger pipeline");
      }
    } catch (err: any) {
      setPipelineMessage(err.message || "Pipeline request failed");
    } finally {
      setIsTriggeringPipeline(false);
    }
  };

  // Filtered Users
  const filteredUsers = usersList.filter((u) => {
    if (!userSearch.trim()) return true;
    return (
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearch.toLowerCase())
    );
  });

  // Access Guard
  if (user && user.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-semibold text-neutral-900 mb-1">
          Access Restricted
        </h1>
        <p className="text-xs text-neutral-500 max-w-sm mb-6">
          This section is exclusively reserved for system administrators.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#E30A27] rounded-md transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/50 flex flex-col">
      {/* Top Navbar */}
      <header className="h-14 border-b border-neutral-200 bg-white px-3 sm:px-8 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link href="/admin" className="flex items-center gap-2 shrink-0">
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
              href="/admin"
              onClick={() => setActiveTab("urls")}
              className={`transition-colors font-medium flex items-center gap-1 ${
                activeTab === "urls"
                  ? "text-[#E30A27] font-semibold"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#E30A27]" />
              <span>Admin Portal</span>
            </Link>
            {activeTab !== "urls" && (
              <>
                <span className="text-neutral-300">/</span>
                <span className="text-neutral-900 font-medium">
                  {activeTab === "users" ? "User Accounts" : "ETL Pipeline"}
                </span>
              </>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          {user && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-neutral-200 bg-neutral-50 text-neutral-700 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[#E30A27]" />
              <span className="font-medium text-neutral-800 hidden md:inline">{user.email}</span>
              <span className="text-[10px] px-1 py-0.5 rounded bg-white text-neutral-600 border border-neutral-200 font-semibold">
                ADMIN
              </span>
            </div>
          )}

          <Link
            href="/analytics"
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs text-neutral-700 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-300 rounded bg-white transition-colors cursor-pointer"
            title="Global Analytics"
          >
            <BarChart2 className="w-3.5 h-3.5 text-neutral-500" />
            <span className="hidden sm:inline">Global Analytics</span>
          </Link>

          <button
            onClick={() => logout()}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-300 rounded bg-white transition-colors cursor-pointer"
            title="Sign out of Admin Portal"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6">
        {/* Metric Overview Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="p-4 bg-white border border-neutral-200 rounded-lg shadow-2xs">
            <div className="text-xs text-neutral-500 font-medium">Total Registered Users</div>
            <div className="text-2xl font-semibold text-neutral-900 mt-1">
              {overview.totalUsers}
            </div>
          </div>

          <div className="p-4 bg-white border border-neutral-200 rounded-lg shadow-2xs">
            <div className="text-xs text-neutral-500 font-medium">Total Short Links</div>
            <div className="text-2xl font-semibold text-neutral-900 mt-1">
              {overview.totalUrls}
            </div>
          </div>

          <div className="p-4 bg-white border border-neutral-200 rounded-lg shadow-2xs">
            <div className="text-xs text-neutral-500 font-medium">Total System Clicks</div>
            <div className="text-2xl font-semibold text-neutral-900 mt-1">
              {overview.totalClicks.toLocaleString()}
            </div>
          </div>

          <div className="p-4 bg-white border border-neutral-200 rounded-lg shadow-2xs">
            <div className="text-xs text-neutral-500 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              <span>Suspended (Banned) Links</span>
            </div>
            <div className="text-2xl font-semibold text-red-600 mt-1">
              {overview.totalBanned}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-neutral-200 mb-6 pb-px overflow-x-auto scrollbar-none flex-nowrap">
          <button
            onClick={() => setActiveTab("urls")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === "urls"
                ? "border-[#E30A27] text-neutral-900 font-semibold"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>URL Moderation</span>
          </button>

          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === "users"
                ? "border-[#E30A27] text-neutral-900 font-semibold"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>User Accounts ({usersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("pipeline")}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer shrink-0 ${
              activeTab === "pipeline"
                ? "border-[#E30A27] text-neutral-900 font-semibold"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>ETL Data Pipeline</span>
          </button>
        </div>

        {/* TAB 1: URL Moderation */}
        {activeTab === "urls" && (
          <div>
            {/* Toolbar & Filter Bar */}
            <div className="bg-white border border-neutral-200 rounded-t-lg p-3 sm:px-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b-0">
              {/* Search Box */}
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search URL, short code, creator..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 text-neutral-900 placeholder:text-neutral-400"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer shrink-0 ${
                    statusFilter === "ALL"
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter("BANNED")}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer shrink-0 ${
                    statusFilter === "BANNED"
                      ? "bg-red-600 text-white"
                      : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
                  }`}
                >
                  Banned ({overview.totalBanned})
                </button>
                <button
                  onClick={() => setStatusFilter("ACTIVE")}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer shrink-0 ${
                    statusFilter === "ACTIVE"
                      ? "bg-emerald-600 text-white"
                      : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setStatusFilter("DELETED")}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer shrink-0 ${
                    statusFilter === "DELETED"
                      ? "bg-neutral-800 text-white"
                      : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
                  }`}
                >
                  Deleted by user
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-neutral-200 rounded-b-lg shadow-2xs overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/50 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Short Code / Title</th>
                    <th className="py-3 px-4">Destination Target</th>
                    <th className="py-3 px-4">Owner</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Clicks</th>
                    <th className="py-3 px-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs">
                  {isLoadingUrls ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-neutral-400">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#E30A27]" />
                        <span>Loading platform links...</span>
                      </td>
                    </tr>
                  ) : urls.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-neutral-400">
                        No links found matching filter criteria
                      </td>
                    </tr>
                  ) : (
                    urls.map((item) => {
                      const isBanned = item.isBanned;
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-neutral-50/80 transition-colors ${
                            isBanned ? "bg-red-50/20" : ""
                          }`}
                        >
                          {/* Short Code & Title */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs">
                                <span className="text-neutral-400">{domainHost}/s/</span>
                                <span className="font-semibold text-neutral-900">{item.shortCode}</span>
                              </span>
                              <button
                                onClick={() => handleCopy(item.shortCode, item.id)}
                                className="p-1 text-neutral-400 hover:text-neutral-700 rounded transition-colors cursor-pointer"
                                title="Copy short link"
                              >
                                {copiedId === item.id ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            <div className="text-[11px] text-neutral-400 truncate max-w-xs mt-0.5">
                              {item.title || "Untitled Link"}
                            </div>
                          </td>

                          {/* Original URL */}
                          <td className="py-3 px-4 max-w-sm">
                            <div className="flex items-center gap-1.5">
                              <span
                                className="text-neutral-700 font-mono text-[11px] truncate block max-w-xs"
                                title={item.originalUrl}
                              >
                                {item.originalUrl}
                              </span>
                              <a
                                href={item.originalUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-neutral-400 hover:text-neutral-700 shrink-0"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          </td>

                          {/* Creator / Owner */}
                          <td className="py-3 px-4">
                            {item.user ? (
                              <div>
                                <span className="font-medium text-neutral-800">
                                  {item.user.email}
                                </span>
                                <span className="ml-1.5 text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600">
                                  {item.user.role}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-neutral-400 italic">
                                Guest visitor
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center">
                            {isBanned ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 border border-red-200"
                                title={item.banReason ? `Reason: ${item.banReason}` : "Suspended"}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                                <span>Banned</span>
                              </span>
                            ) : item.deletedAt ? (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-300"
                                title={`Deleted at ${new Date(item.deletedAt).toLocaleString()}`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
                                <span>Deleted by User</span>
                              </span>
                            ) : item.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                <span>Active</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400"></span>
                                <span>Disabled</span>
                              </span>
                            )}
                          </td>

                          {/* Clicks */}
                          <td className="py-3 px-4 text-center font-mono font-medium text-neutral-700">
                            {item.clickCount.toLocaleString()}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Inspect Analytics Button */}
                              <Link
                                href={`/analytics?code=${item.shortCode}`}
                                className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 border border-neutral-200 rounded transition-colors cursor-pointer"
                                title="Inspect Link Analytics"
                              >
                                <BarChart2 className="w-3.5 h-3.5" />
                              </Link>

                              {isBanned ? (
                                <button
                                  onClick={() => handleUnban(item.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors cursor-pointer"
                                  title="Lift Suspension"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Lift Ban</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleOpenBan(item)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors cursor-pointer"
                                  title="Suspend link with reason"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>Suspend</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 border border-neutral-200 rounded transition-colors cursor-pointer"
                                title="Delete link permanently"
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
        )}

        {/* TAB 2: User Accounts */}
        {activeTab === "users" && (
          <div>
            <div className="bg-white border border-neutral-200 rounded-t-lg p-3 sm:px-4 flex items-center justify-between gap-3 border-b-0">
              <div className="relative w-full sm:w-80">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Filter users by email..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-900 text-neutral-900 placeholder:text-neutral-400"
                />
              </div>

              <div className="text-xs text-neutral-500">
                Showing {filteredUsers.length} registered accounts
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-b-lg shadow-2xs overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50/50 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                    <th className="py-3 px-4">User Email</th>
                    <th className="py-3 px-4">System Role</th>
                    <th className="py-3 px-4 text-center">Account Status</th>
                    <th className="py-3 px-4 text-center">Short Links</th>
                    <th className="py-3 px-4 text-center">Folders</th>
                    <th className="py-3 px-4 text-right">Registered</th>
                    <th className="py-3 px-4 text-right">User Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs">
                  {isLoadingUsers ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-neutral-400">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#E30A27]" />
                        <span>Loading user accounts...</span>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-neutral-400">
                        No user accounts found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-neutral-50/80 transition-colors">
                        <td className="py-3 px-4 font-medium text-neutral-900 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 text-xs">
                            <UserIcon className="w-3.5 h-3.5" />
                          </div>
                          <span>{u.email}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold uppercase ${
                              u.role === "ADMIN"
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-neutral-100 text-neutral-700 border border-neutral-200"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {u.isBanned ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-700 border border-red-200"
                              title={u.banReason ? `Reason: ${u.banReason}` : "Suspended"}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                              <span>Suspended</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                              <span>Active</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-medium text-neutral-800">
                          {u.urlsCount}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-neutral-600">
                          {u.groupsCount}
                        </td>
                        <td className="py-3 px-4 text-right text-neutral-500 font-mono text-[11px]">
                          {new Date(u.createdAt).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {u.role !== "ADMIN" && (
                            u.isBanned ? (
                              <button
                                onClick={() => handleUserUnban(u.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Lift Ban</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenUserBan(u)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded transition-colors cursor-pointer"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>Suspend User</span>
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ETL Pipeline & Star Schema */}
        {activeTab === "pipeline" && (
          <div className="space-y-6">
            <div className="bg-white border border-neutral-200 rounded-lg p-6 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700">
                    <Database className="w-5 h-5 text-neutral-800" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900">
                      OLAP Star Schema Data Pipeline
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      FastAPI microservice executing User-Agent parsing & Star Schema dimensional loads
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Real-time queue indicator */}
                  <div className="px-3 py-1.5 rounded bg-neutral-50 border border-neutral-200 text-xs flex items-center gap-1.5">
                    <span className="text-neutral-500">Pending Queue:</span>
                    <span className={`font-semibold ${pipelineQueue?.pending_raw_clicks ? "text-amber-600 font-mono" : "text-emerald-700 font-mono"}`}>
                      {pipelineQueue?.pending_raw_clicks ?? 0} clicks
                    </span>
                  </div>

                  <button
                    onClick={handleTriggerPipeline}
                    disabled={isTriggeringPipeline}
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#E30A27] hover:bg-[#C80820] rounded-md shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
                  >
                    {isTriggeringPipeline ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Syncing into Data Warehouse...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" />
                        <span>Trigger Sync Now</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Progress while syncing */}
              {isTriggeringPipeline && (
                <div className="mt-4 p-3.5 rounded-md bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center gap-3">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
                  <div>
                    <div className="font-semibold">ETL Ingestion in Progress</div>
                    <div className="text-[11px] text-blue-700 mt-0.5">
                      Extracting unprocessed raw clicks from Core Backend, parsing User-Agents, and loading into PostgreSQL Star Schema...
                    </div>
                  </div>
                </div>
              )}

              {/* Completion Detail Card */}
              {lastSyncDetail && !isTriggeringPipeline && (
                <div className="mt-4 p-4 rounded-md bg-emerald-50/80 border border-emerald-200 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2 font-semibold text-emerald-900">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{lastSyncDetail.message}</span>
                    </div>
                    <span className="text-[11px] font-mono text-emerald-700">
                      Execution time: {lastSyncDetail.execution_time_ms} ms
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] text-emerald-800 flex items-center gap-4">
                    <span>Processed events: <strong>{lastSyncDetail.processed_events}</strong></span>
                    <span>Completed at: <strong>{new Date(lastSyncDetail.timestamp).toLocaleTimeString()}</strong></span>
                  </div>
                </div>
              )}

              {pipelineMessage && !lastSyncDetail && (
                <div className="mt-4 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{pipelineMessage}</span>
                </div>
              )}

              {/* Status Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                <div className="p-4 rounded-md border border-neutral-200 bg-neutral-50">
                  <div className="text-[11px] text-neutral-500 font-medium uppercase tracking-wider">
                    Pipeline Execution
                  </div>
                  <div className="text-sm font-semibold text-neutral-900 mt-1 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Automated Scheduled</span>
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1">
                    Runs daily at 22:00 UTC + on-demand triggers
                  </div>
                </div>

                <div className="p-4 rounded-md border border-neutral-200 bg-neutral-50">
                  <div className="text-[11px] text-neutral-500 font-medium uppercase tracking-wider">
                    Source OLTP Database
                  </div>
                  <div className="text-sm font-semibold text-neutral-900 mt-1">
                    PostgreSQL (synerry_shortener)
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1">
                    High-throughput raw click event ingestion
                  </div>
                </div>

                <div className="p-4 rounded-md border border-neutral-200 bg-neutral-50">
                  <div className="text-[11px] text-neutral-500 font-medium uppercase tracking-wider">
                    Target OLAP Warehouse
                  </div>
                  <div className="text-sm font-semibold text-neutral-900 mt-1">
                    PostgreSQL (synerry_shortener_analytic)
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-1">
                    Star Schema: fact_clicks with 5 dimension tables
                  </div>
                </div>
              </div>

              {lastSyncTime && (
                <div className="mt-4 text-[11px] text-neutral-400 text-right">
                  Last manual sync triggered at {lastSyncTime}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Ban Link Modal */}
      {banningUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/30 backdrop-blur-2xs">
          <div className="bg-white border border-neutral-200 rounded-lg shadow-lg w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                  <Ban className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">
                    Suspend Short Link
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono truncate max-w-[280px]" title={`${domainHost}/s/${banningUrl.shortCode}`}>
                    {domainHost}/s/{banningUrl.shortCode}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBanningUrl(null)}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBanSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              {banError && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{banError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs text-neutral-500 mb-1">Destination Target</label>
                <div className="p-2.5 rounded bg-neutral-50 border border-neutral-200 text-xs text-neutral-700 font-mono truncate">
                  {banningUrl.originalUrl}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Suspension Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Specify clear rationale why this link is being suspended..."
                  className="w-full p-2.5 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-red-600 text-neutral-900"
                />
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBanningUrl(null)}
                  className="px-3 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-800 border border-neutral-200 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBan || !banReason.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isSubmittingBan ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Confirm Suspension</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ban User Modal */}
      {banningUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/30 backdrop-blur-2xs">
          <div className="bg-white border border-neutral-200 rounded-lg shadow-lg w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95">
            <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">
                    Suspend User Account
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono">
                    {banningUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setBanningUser(null)}
                className="text-neutral-400 hover:text-neutral-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUserBanSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              {userBanError && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{userBanError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Account Suspension Reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={userBanReason}
                  onChange={(e) => setUserBanReason(e.target.value)}
                  placeholder="Specify violation rationale (e.g. Mass phishing generation, TOS abuse)..."
                  className="w-full p-2.5 text-xs border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-red-600 text-neutral-900"
                />
                <p className="text-[11px] text-neutral-400 mt-1">
                  This user will be immediately logged out and forbidden from creating or accessing links.
                </p>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBanningUser(null)}
                  className="px-3 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-800 border border-neutral-200 rounded-md transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUserBan || !userBanReason.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isSubmittingUserBan ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Suspend Account</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
