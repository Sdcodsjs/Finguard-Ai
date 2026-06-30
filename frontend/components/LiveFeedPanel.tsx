"use client";

import React, { useEffect, useState } from "react";
import { news, insider, NewsFeedItem, InsiderActivity } from "@/lib/api";
import { Newspaper, Activity, ExternalLink, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface LiveFeedPanelProps {
  companyId: string;
}

export default function LiveFeedPanel({ companyId }: LiveFeedPanelProps) {
  const [newsItems, setNewsItems] = useState<NewsFeedItem[]>([]);
  const [insiderItems, setInsiderItems] = useState<InsiderActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeed() {
      try {
        const [nData, iData] = await Promise.all([
          news.getCompanyNews(companyId),
          insider.getCompanyInsiderActivity(companyId)
        ]);
        setNewsItems(nData);
        setInsiderItems(iData);
      } catch (err) {
        console.error("Failed to load feed", err);
      } finally {
        setLoading(false);
      }
    }
    loadFeed();
  }, [companyId]);

  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 h-64 flex items-center justify-center animate-pulse">
        <span className="text-slate-500">Loading Live Feed...</span>
      </div>
    );
  }

  if (newsItems.length === 0 && insiderItems.length === 0) {
    return null;
  }

  const getSentimentColor = (sentiment: string) => {
    if (sentiment === "positive") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    if (sentiment === "negative") return "bg-red-500/10 text-red-400 border-red-500/20";
    return "bg-slate-700/50 text-slate-300 border-slate-600";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* News Feed */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col h-96">
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-blue-400" />
          <h3 className="font-bold text-white">Live Regulatory & News Feed</h3>
        </div>
        <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-4">
          {newsItems.map((item) => (
            <a
              key={item.news_id}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="block bg-slate-900/50 p-4 rounded-lg border border-slate-700/50 hover:border-blue-500/50 transition group"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-semibold px-2 py-1 bg-blue-500/10 text-blue-400 rounded">
                  {item.source}
                </span>
                <span className={`text-xs px-2 py-1 border rounded capitalize ${getSentimentColor(item.sentiment)}`}>
                  {item.sentiment}
                </span>
              </div>
              <h4 className="font-semibold text-slate-200 group-hover:text-blue-400 transition flex items-center gap-2 mb-1">
                {item.headline}
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition" />
              </h4>
              <p className="text-sm text-slate-400 line-clamp-2">{item.summary}</p>
              <span className="text-xs text-slate-500 mt-3 block">
                {new Date(item.published_at).toLocaleDateString()}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* Insider Tracking */}
      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col h-96">
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-400" />
          <h3 className="font-bold text-white">Insider Trading & Block Deals</h3>
        </div>
        <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-4">
          {insiderItems.map((item) => {
            const isBuy = item.activity_type === "buy";
            const Icon = isBuy ? ArrowUpRight : ArrowDownRight;
            const colorClass = isBuy ? "text-emerald-400" : "text-red-400";
            const bgClass = isBuy ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20";

            return (
              <div
                key={item.activity_id}
                className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50 flex flex-col gap-3"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-full ${bgClass}`}>
                      <Icon className={`w-4 h-4 ${colorClass}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-200">{item.holder_name}</h4>
                      <span className="text-xs text-slate-400">{item.holder_category}</span>
                    </div>
                  </div>
                  <span className={`font-bold capitalize ${colorClass}`}>
                    {item.activity_type.replace("_", " ")}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 border-t border-slate-800 pt-3 mt-1">
                  <div>
                    <span className="text-xs text-slate-500 block">Shares</span>
                    <span className="text-sm font-semibold text-slate-300">
                      {item.shares_traded.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Value</span>
                    <span className="text-sm font-semibold text-slate-300">
                      ₹{item.value_inr_cr.toFixed(2)} Cr
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Date</span>
                    <span className="text-sm font-semibold text-slate-300">
                      {new Date(item.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
