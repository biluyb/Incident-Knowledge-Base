"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SearchBox } from "@/components/ui/SearchBox";
import { StatCard } from "@/components/ui/StatCard";
import type { DashboardStats } from "@/lib/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* Hero + Search */}
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Incident Knowledge Base</h1>
        <p className="text-gray-500 text-lg">
          T24/Temenos incident search, troubleshooting &amp; knowledge management
        </p>
        <div className="max-w-2xl mx-auto">
          <SearchBox size="lg" />
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Total Tickets" value={stats.total_tickets} icon="🎫" />
            <StatCard label="Groups" value={stats.total_groups} icon="📁" />
            <StatCard label="Knowledge Articles" value={stats.total_articles} icon="📝" />
            <StatCard label="Keywords" value={stats.total_keywords} icon="🔑" />
            <StatCard label="Sub-Types" value={stats.total_subtypes} icon="📂" />
          </div>

          {/* Priority breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Critical" value={stats.critical_count} icon="🔴" />
            <StatCard label="High" value={stats.high_count} icon="🟠" />
            <StatCard label="Medium" value={stats.medium_count} icon="🟡" />
            <StatCard label="Low" value={stats.low_count} icon="🟢" />
          </div>

          {/* Group Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tickets by Group</h2>
            <div className="space-y-3">
              {stats.group_distribution.map((g) => {
                const maxCount = Math.max(...stats.group_distribution.map((x) => x.count), 1);
                const pct = (g.count / maxCount) * 100;
                return (
                  <Link
                    key={g.code}
                    href={`/groups/${g.code}`}
                    className="flex items-center gap-4 group"
                  >
                    <span className="w-8 font-mono text-sm font-bold text-gray-600">{g.code}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all duration-500 group-hover:bg-blue-600"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-sm font-medium text-gray-600">{g.count}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Root Cause Distribution */}
          {stats.root_cause_distribution.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Root Causes</h2>
              <div className="space-y-2">
                {stats.root_cause_distribution.slice(0, 8).map((rc) => (
                  <div key={rc.category} className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 flex-1 truncate">{rc.category}</span>
                    <span className="text-sm font-medium text-gray-500">{rc.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/groups" className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 transition-colors text-center">
              <div className="text-2xl mb-2">📁</div>
              <div className="text-sm font-medium text-gray-700">Browse Groups</div>
            </Link>
            <Link href="/knowledge" className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 transition-colors text-center">
              <div className="text-2xl mb-2">📝</div>
              <div className="text-sm font-medium text-gray-700">Knowledge Articles</div>
            </Link>
            <Link href="/tickets" className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 transition-colors text-center">
              <div className="text-2xl mb-2">🎫</div>
              <div className="text-sm font-medium text-gray-700">View Tickets</div>
            </Link>
            <Link href="/keywords" className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 transition-colors text-center">
              <div className="text-2xl mb-2">🔑</div>
              <div className="text-sm font-medium text-gray-700">Quick Lookup</div>
            </Link>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-2">No data found</p>
          <p className="text-sm">Import the Excel workbook to populate the knowledge base.</p>
        </div>
      )}
    </div>
  );
}
