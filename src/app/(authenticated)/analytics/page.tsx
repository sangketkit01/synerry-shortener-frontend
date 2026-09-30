"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { api } from "@/utils/api";
import {
  ArrowLeft,
  BarChart3,
  Download,
  ExternalLink,
  Laptop,
  Smartphone,
  Tablet,
  Bot,
  Compass,
  Globe2,
  Calendar,
  Users,
  MousePointerClick,
  Share2,
  RefreshCw,
  Loader2,
  AlertCircle,
  Copy,
  Check,
  Activity,
  Shield,
  Clock,
} from "lucide-react";

interface AnalyticsSummary {
  total_clicks: number;
  unique_visitors: number;
  clicks_today: number;
  timeseries: { date: string; clicks: number }[];
}

interface BreakdownItem {
  name: string;
  count: number;
  percentage: number;
}

interface AnalyticsBreakdown {
  total_clicks: number;
  devices: BreakdownItem[];
  browsers: BreakdownItem[];
  platforms: BreakdownItem[];
  referrers: BreakdownItem[];
  countries: BreakdownItem[];
}

interface RecentClickItem {
  id: string;
  clicked_at: string;
  short_code: string;
  original_url: string;
  device: string;
  browser: string;
  platform: string;
  referrer: string;
  country: string;
  ip_masked: string;
}

function AnalyticsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const urlId = searchParams.get("id") || "";
  const shortCode = searchParams.get("code") || "";

  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [breakdown, setBreakdown] = useState<AnalyticsBreakdown | null>(null);
  const [recentClicks, setRecentClicks] = useState<RecentClickItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [domainHost, setDomainHost] = useState("localhost:3000");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDomainHost(window.location.host);
    }
  }, []);

  // Fetch Analytics data
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (urlId) params.append("url_id", urlId);
      if (shortCode) params.append("short_code", shortCode);

      const [sumRes, breakRes, recentRes] = await Promise.all([
        api.get<{ success: boolean; data: AnalyticsSummary }>(`/api/analytics/summary?${params.toString()}`),
        api.get<{ success: boolean; data: AnalyticsBreakdown }>(`/api/analytics/breakdown?${params.toString()}`),
        api.get<{ success: boolean; data: { clicks: RecentClickItem[] } }>(`/api/analytics/recent-clicks?${params.toString()}&limit=25`),
      ]);

      if (sumRes.success && sumRes.data) {
        setSummary(sumRes.data);
      }
      if (breakRes.success && breakRes.data) {
        setBreakdown(breakRes.data);
      }
      if (recentRes.success && recentRes.data) {
        setRecentClicks(recentRes.data.clicks || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load metrics");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [urlId, shortCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle manual refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  // Export CSV with Authorization
  const handleExportCsv = async () => {
    try {
      const params = new URLSearchParams();
      if (urlId) params.append("url_id", urlId);
      if (shortCode) params.append("short_code", shortCode);

      const token = api.getToken();
      const res = await fetch(`/api/analytics/export?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) throw new Error("Failed to export analytics data");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `synerry_analytics_${shortCode || "export"}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      alert("Export failed: " + err.message);
    }
  };

  // Copy short URL
  const handleCopy = () => {
    if (!shortCode) return;
    const full = `${window.location.origin}/s/${shortCode}`;
    navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Find max in timeseries for visual chart scaling
  const maxClicks = Math.max(1, ...(summary?.timeseries.map((t) => t.clicks) || [1]));

  return (
    <div className="min-h-screen bg-neutral-50/50 flex flex-col">
      {/* Top Header */}
      <header className="h-14 border-b border-neutral-200 bg-white px-4 sm:px-8 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {/* Back button on LEFT side */}
          <Link
            href={user?.role === "ADMIN" ? "/admin" : "/dashboard"}
            className="flex items-center justify-center p-1.5 rounded-md border border-neutral-200 hover:border-neutral-300 text-neutral-600 hover:text-neutral-900 bg-white transition-colors cursor-pointer"
            title={user?.role === "ADMIN" ? "Back to Admin Portal" : "Back to Dashboard"}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="w-7 h-7 rounded bg-[#E30A27] flex items-center justify-center text-white font-bold text-xs tracking-wider">
            S
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm tracking-tight text-neutral-900">
              Synerry
            </span>
            <span className="text-neutral-300">/</span>
            <span className="text-xs text-neutral-500 font-medium">Analytics</span>
            {shortCode && (
              <>
                <span className="text-neutral-300">/</span>
                <span className="font-mono text-xs font-semibold text-neutral-900">
                  <span className="text-neutral-400">{domainHost}/s/</span>{shortCode}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right side has ONLY action buttons: Refresh and Export CSV */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 border border-neutral-200 hover:border-neutral-300 rounded bg-white transition-colors cursor-pointer"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#E30A27]" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={!summary || summary.total_clicks === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded shadow-2xs transition-colors ${
              !summary || summary.total_clicks === 0
                ? "bg-neutral-100 text-neutral-400 border border-neutral-200 cursor-not-allowed"
                : "text-white bg-[#E30A27] hover:bg-[#C80820] cursor-pointer"
            }`}
            title={
              !summary || summary.total_clicks === 0
                ? "No click records available to export"
                : "Export CSV"
            }
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6">
        {/* URL Banner if filtered by specific link */}
        {shortCode && (
          <div className="bg-white border border-neutral-200 rounded-lg p-4 mb-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-semibold text-neutral-900">
                  <span className="text-neutral-400">{domainHost}/s/</span>{shortCode}
                </span>
                <button
                  onClick={handleCopy}
                  className="p-1 text-neutral-400 hover:text-neutral-800 rounded hover:bg-neutral-100 transition-colors cursor-pointer"
                  title="Copy short link"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Showing dedicated Star Schema metrics and dimensional analysis for this link
              </p>
            </div>

            <Link
              href="/analytics"
              className="text-xs font-medium text-[#E30A27] hover:underline self-start sm:self-auto"
            >
              View System Global Analytics &rarr;
            </Link>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-neutral-200 rounded-lg shadow-2xs">
            <Loader2 className="w-6 h-6 animate-spin text-[#E30A27] mb-2" />
            <p className="text-xs text-neutral-500">
              Querying Star Schema Data Warehouse...
            </p>
          </div>
        ) : error ? (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        ) : (
          <>
            {/* Top KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {/* Total Clicks */}
              <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-2xs">
                <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
                  <span>Total Clicks Recorded</span>
                  <MousePointerClick className="w-4 h-4 text-neutral-400" />
                </div>
                <div className="text-3xl font-semibold text-neutral-900 mt-2">
                  {summary?.total_clicks.toLocaleString() || 0}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">
                  Aggregated from OLAP fact_clicks
                </div>
              </div>

              {/* Unique Visitors */}
              <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-2xs">
                <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
                  <span>Unique Visitors (Masked IP)</span>
                  <Users className="w-4 h-4 text-neutral-400" />
                </div>
                <div className="text-3xl font-semibold text-neutral-900 mt-2">
                  {summary?.unique_visitors.toLocaleString() || 0}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">
                  Distinct client IPs with privacy mask
                </div>
              </div>

              {/* Clicks Today */}
              <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-2xs">
                <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
                  <span>Clicks Today (UTC)</span>
                  <Calendar className="w-4 h-4 text-neutral-400" />
                </div>
                <div className="text-3xl font-semibold text-neutral-900 mt-2">
                  {summary?.clicks_today.toLocaleString() || 0}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1">
                  Past 24-hour real-time window
                </div>
              </div>
            </div>

            {/* Clicks Timeline Chart */}
            <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-2xs mb-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
                    7-Day Click Activity Trend
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Daily engagement progression
                  </p>
                </div>
                <span className="text-xs font-medium text-neutral-500">
                  Max: {maxClicks} clicks/day
                </span>
              </div>

              {summary?.timeseries && summary.timeseries.length > 0 ? (
                <div className="h-48 flex items-end gap-2 sm:gap-4 pt-6 px-2">
                  {summary.timeseries.map((day, idx) => {
                    const heightPercent = Math.max(
                      6,
                      Math.round((day.clicks / maxClicks) * 100)
                    );
                    const formattedDate = new Date(day.date).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "numeric",
                      day: "numeric",
                    });

                    return (
                      <div
                        key={idx}
                        className="flex-1 flex flex-col items-center gap-2 group h-full justify-end"
                      >
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono font-medium text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded border border-neutral-200 mb-1">
                          {day.clicks}
                        </div>
                        <div
                          className="w-full bg-[#E30A27] hover:bg-[#C80820] rounded-t transition-all group-hover:brightness-95"
                          style={{ height: `${heightPercent}%` }}
                        ></div>
                        <span className="text-[10px] text-neutral-500 font-mono whitespace-nowrap mt-1">
                          {formattedDate}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center text-xs text-neutral-400">
                  No historical click data recorded for this period
                </div>
              )}
            </div>

            {/* Dimensional Breakdown Grid (Star Schema) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Device Types */}
              <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Laptop className="w-4 h-4 text-neutral-500" />
                    <h3 className="text-xs font-semibold text-neutral-900">
                      Device Types
                    </h3>
                  </div>
                  <span className="text-[11px] text-neutral-400 font-medium">
                    {breakdown?.devices.length || 0} types
                  </span>
                </div>

                <div className="space-y-3">
                  {breakdown?.devices.length === 0 ? (
                    <p className="text-xs text-neutral-400 text-center py-6">
                      No device data recorded yet
                    </p>
                  ) : (
                    breakdown?.devices.map((d, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-neutral-800">{d.name}</span>
                          <span className="text-neutral-500 font-mono">
                            {d.count} ({d.percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-neutral-900 rounded-full"
                            style={{ width: `${d.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Top Browsers */}
              <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-neutral-500" />
                    <h3 className="text-xs font-semibold text-neutral-900">
                      Top Browsers
                    </h3>
                  </div>
                  <span className="text-[11px] text-neutral-400 font-medium">
                    {breakdown?.browsers.length || 0} browsers
                  </span>
                </div>

                <div className="space-y-3">
                  {breakdown?.browsers.length === 0 ? (
                    <p className="text-xs text-neutral-400 text-center py-6">
                      No browser data recorded yet
                    </p>
                  ) : (
                    breakdown?.browsers.map((b, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-neutral-800">{b.name}</span>
                          <span className="text-neutral-500 font-mono">
                            {b.count} ({b.percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#E30A27] rounded-full"
                            style={{ width: `${b.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Operating Systems / Platforms */}
              <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-neutral-500" />
                    <h3 className="text-xs font-semibold text-neutral-900">
                      Operating Systems
                    </h3>
                  </div>
                  <span className="text-[11px] text-neutral-400 font-medium">
                    {breakdown?.platforms.length || 0} platforms
                  </span>
                </div>

                <div className="space-y-3">
                  {breakdown?.platforms.length === 0 ? (
                    <p className="text-xs text-neutral-400 text-center py-6">
                      No operating system data recorded yet
                    </p>
                  ) : (
                    breakdown?.platforms.map((p, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-neutral-800">{p.name}</span>
                          <span className="text-neutral-500 font-mono">
                            {p.count} ({p.percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-neutral-800 rounded-full"
                            style={{ width: `${p.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Referrers */}
              <div className="bg-white border border-neutral-200 rounded-lg p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-neutral-500" />
                    <h3 className="text-xs font-semibold text-neutral-900">
                      Referrer Sources
                    </h3>
                  </div>
                  <span className="text-[11px] text-neutral-400 font-medium">
                    {breakdown?.referrers.length || 0} sources
                  </span>
                </div>

                <div className="space-y-3">
                  {breakdown?.referrers.length === 0 ? (
                    <p className="text-xs text-neutral-400 text-center py-6">
                      No referrer source data recorded yet
                    </p>
                  ) : (
                    breakdown?.referrers.map((r, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-neutral-800">{r.name}</span>
                          <span className="text-neutral-500 font-mono">
                            {r.count} ({r.percentage}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-neutral-700 rounded-full"
                            style={{ width: `${r.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Recent Clicks Stream Feed (Live Log Table) */}
            <div className="bg-white border border-neutral-200 rounded-lg shadow-2xs overflow-hidden">
              <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#E30A27]" />
                  <h3 className="text-xs font-semibold text-neutral-900 uppercase tracking-wider">
                    Recent Click Activity Feed
                  </h3>
                </div>
                <span className="text-[11px] text-neutral-400 font-medium">
                  Showing last {recentClicks.length} events
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-200 bg-neutral-50/50 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                      <th className="py-2.5 px-4">Timestamp (UTC)</th>
                      <th className="py-2.5 px-4">Short Code</th>
                      <th className="py-2.5 px-4">Device</th>
                      <th className="py-2.5 px-4">Browser</th>
                      <th className="py-2.5 px-4">Platform</th>
                      <th className="py-2.5 px-4">Referrer Source</th>
                      <th className="py-2.5 px-4 text-right">Masked IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 text-xs">
                    {recentClicks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-neutral-400">
                          No click events recorded yet in the Star Schema fact table
                        </td>
                      </tr>
                    ) : (
                      recentClicks.map((click) => {
                        const deviceLower = click.device.toLowerCase();
                        return (
                          <tr key={click.id} className="hover:bg-neutral-50/80 transition-colors">
                            {/* Timestamp */}
                            <td className="py-2.5 px-4 font-mono text-[11px] text-neutral-500 whitespace-nowrap">
                              {new Date(click.clicked_at).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                                hour12: false,
                              })}
                            </td>

                            {/* Short Code */}
                            <td className="py-2.5 px-4 font-mono font-medium text-neutral-900">
                              <span className="text-neutral-400">{domainHost}/s/</span>{click.short_code}
                            </td>

                            {/* Device */}
                            <td className="py-2.5 px-4">
                              <span className="inline-flex items-center gap-1.5 text-neutral-700">
                                {deviceLower.includes("mobile") ? (
                                  <Smartphone className="w-3.5 h-3.5 text-neutral-400" />
                                ) : deviceLower.includes("tablet") ? (
                                  <Tablet className="w-3.5 h-3.5 text-neutral-400" />
                                ) : deviceLower.includes("bot") ? (
                                  <Bot className="w-3.5 h-3.5 text-amber-500" />
                                ) : (
                                  <Laptop className="w-3.5 h-3.5 text-neutral-400" />
                                )}
                                <span>{click.device}</span>
                              </span>
                            </td>

                            {/* Browser */}
                            <td className="py-2.5 px-4 text-neutral-800">
                              {click.browser}
                            </td>

                            {/* Platform */}
                            <td className="py-2.5 px-4 text-neutral-800">
                              {click.platform}
                            </td>

                            {/* Referrer */}
                            <td className="py-2.5 px-4 font-mono text-[11px] text-neutral-600 truncate max-w-xs">
                              {click.referrer}
                            </td>

                            {/* Masked IP */}
                            <td className="py-2.5 px-4 text-right font-mono text-[11px] text-neutral-400">
                              {click.ip_masked}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-xs text-neutral-400">
          Loading Analytics...
        </div>
      }
    >
      <AnalyticsContent />
    </Suspense>
  );
}
