"use client";

import React from "react";
import { AnalysisResult } from "@/lib/api";
import { Leaf, Users, Building, ShieldCheck } from "lucide-react";

interface ESGPanelProps {
  analysis: AnalysisResult;
}

export default function ESGPanel({ analysis }: ESGPanelProps) {
  if (!analysis.esg_score) return null;

  const esgScore = analysis.esg_score;
  const env = analysis.esg_environmental || 0;
  const soc = analysis.esg_social || 0;
  const gov = analysis.esg_governance || 0;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const getBgColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10">
        <ShieldCheck className="w-32 h-32 text-emerald-400" />
      </div>

      <div className="flex items-center justify-between mb-6 relative z-10">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          ESG & Governance Scorecard
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">Overall</span>
          <span className={`text-2xl font-black ${getScoreColor(esgScore)}`}>
            {esgScore.toFixed(1)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 relative z-10">
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-300">
            <Leaf className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold text-sm">Environmental</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${getBgColor(env)}`}
                style={{ width: `${env}%` }}
              />
            </div>
            <span className="text-sm font-bold text-white">{env.toFixed(1)}</span>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-300">
            <Users className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-sm">Social</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${getBgColor(soc)}`}
                style={{ width: `${soc}%` }}
              />
            </div>
            <span className="text-sm font-bold text-white">{soc.toFixed(1)}</span>
          </div>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700/50 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-300">
            <Building className="w-5 h-5 text-purple-400" />
            <span className="font-semibold text-sm">Governance</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${getBgColor(gov)}`}
                style={{ width: `${gov}%` }}
              />
            </div>
            <span className="text-sm font-bold text-white">{gov.toFixed(1)}</span>
          </div>
        </div>
      </div>

      {analysis.esg_narrative && (
        <div className="relative z-10 bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-sm text-emerald-100 leading-relaxed">
          <p className="font-medium mb-1 text-emerald-400">AI Assessment</p>
          {analysis.esg_narrative}
        </div>
      )}
    </div>
  );
}
