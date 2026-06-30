"use client";
import { useEffect, useState } from "react";
import { watchlist as watchlistApi, reports, WatchlistItem, Company } from "@/lib/api";
import { Eye, Plus, Trash2, Search, Loader2, Building2 } from "lucide-react";

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      watchlistApi.get(),
      reports.companies(),
    ]).then(([wl, co]) => {
      setItems(wl);
      setCompanies(co);
      setLoading(false);
    });
  }, []);

  const add = async (companyId: string) => {
    await watchlistApi.add(companyId);
    const wl = await watchlistApi.get();
    setItems(wl);
  };

  const remove = async (companyId: string) => {
    await watchlistApi.remove(companyId);
    setItems((prev) => prev.filter((i) => i.company_id !== companyId));
  };

  const watched = new Set(items.map((i) => i.company_id));
  const filtered = companies.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) && !watched.has(c.company_id)
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <Eye className="w-6 h-6 text-purple-400" />
        <div>
          <h1 className="text-2xl font-bold text-fg-text">Watchlist</h1>
          <p className="text-fg-muted text-sm">Track companies for new filings and score changes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current watchlist */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-fg-text mb-4">
            Watching ({items.length})
          </h2>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-fg-muted animate-spin" /></div>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <Eye className="w-8 h-8 text-fg-muted mx-auto mb-2" />
              <p className="text-sm text-fg-muted">No companies added yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((item) => (
                <div key={item.company_id} className="flex items-center gap-3 p-3 rounded-lg bg-fg-surface-2 border border-fg">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center font-bold text-purple-400 text-sm shrink-0">
                    {item.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-fg-text truncate">{item.name}</div>
                    <div className="text-xs text-fg-muted">{item.sector || "—"}</div>
                  </div>
                  <button
                    onClick={() => remove(item.company_id)}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-fg-muted hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add companies */}
        <div className="glass-card p-5">
          <h2 className="text-sm font-semibold text-fg-text mb-4">Add Companies</h2>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted" />
            <input
              className="fg-input pl-9"
              placeholder="Search companies…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
            {filtered.map((c) => (
              <div key={c.company_id} className="flex items-center gap-3 p-3 rounded-lg bg-fg-surface-2 border border-fg">
                <Building2 className="w-4 h-4 text-fg-muted shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-fg-text truncate">{c.name}</div>
                  <div className="text-xs text-fg-muted">{c.sector || "—"}</div>
                </div>
                <button
                  onClick={() => add(c.company_id)}
                  className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-fg-muted text-center py-4">
                {search ? "No matches found" : "Upload reports to add companies"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
