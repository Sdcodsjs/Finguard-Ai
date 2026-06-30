"use client";
import { useEffect, useRef, useState } from "react";
import { reports as reportsApi, chat as chatApi, ChatMessage, RecentReport } from "@/lib/api";
import { Send, Loader2, MessageSquare, Shield, CheckSquare, Square, ChevronDown, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function PortfolioChatPage() {
  const [reports, setReports] = useState<RecentReport[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Fetch analyzed reports on mount
  useEffect(() => {
    reportsApi.list()
      .then((res) => {
        const analyzed = res.filter((r) => r.status === "analyzed");
        setReports(analyzed);
        if (analyzed.length > 0) {
          setSelectedIds([analyzed[0].report_id]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoadingReports(false));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const toggleSelectReport = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (!input.trim() || streaming || selectedIds.length === 0) return;

    const userMsg: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    const question = input;
    setInput("");
    setStreaming(true);
    setStreamingContent("");

    try {
      const res = await chatApi.portfolioStream(selectedIds, question, messages);
      if (!res.body) throw new Error("No stream body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n").filter((l) => l.startsWith("data: "));

        for (const line of lines) {
          try {
            const json = JSON.parse(line.slice(6));
            if (json.type === "text") {
              fullContent += json.content;
              setStreamingContent(fullContent);
            }
          } catch {}
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: fullContent },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I encountered an error querying the portfolio. Please try again." },
      ]);
    } finally {
      setStreaming(false);
      setStreamingContent("");
    }
  };

  const selectedReportsLabels = reports
    .filter((r) => selectedIds.includes(r.report_id))
    .map((r) => `${r.company_name} (FY${r.year})`)
    .join(", ");

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 h-[calc(100vh-64px)] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h1 className="font-semibold text-fg-text text-sm">Portfolio-wide AI Assistant</h1>
            <p className="text-xs text-fg-muted">Query and compare data across multiple selected reports simultaneously</p>
          </div>
        </div>
        <Link href="/portfolio" className="btn-ghost text-xs py-1.5 px-3">
          ← Back to Portfolio
        </Link>
      </div>

      {/* Report Selection Dropdown */}
      <div className="relative mb-4 shrink-0 z-20">
        <label className="text-xs font-bold text-fg-muted uppercase tracking-wider block mb-1.5">Scope Companies</label>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full fg-input flex items-center justify-between py-2 px-3 bg-slate-900/40 text-sm text-fg-text hover:border-slate-700 transition-colors"
        >
          <span className="truncate">
            {selectedIds.length === 0 ? "Select companies to query..." : selectedReportsLabels}
          </span>
          <ChevronDown className={`w-4 h-4 text-fg-muted transition-transform ${showDropdown ? "rotate-180" : ""}`} />
        </button>

        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 glass-card border border-white/10 p-2 max-h-60 overflow-y-auto shadow-2xl flex flex-col gap-1">
            {loadingReports ? (
              <div className="p-3 text-center text-xs text-fg-muted">Loading available reports...</div>
            ) : reports.length === 0 ? (
              <div className="p-3 text-center text-xs text-fg-muted">No analyzed reports found. Upload reports first!</div>
            ) : (
              reports.map((report) => {
                const isSelected = selectedIds.includes(report.report_id);
                return (
                  <button
                    key={report.report_id}
                    onClick={() => toggleSelectReport(report.report_id)}
                    className={`flex items-center gap-3 w-full text-left p-2 rounded-lg text-xs hover:bg-white/5 transition-colors ${
                      isSelected ? "text-emerald-400 font-bold" : "text-fg-muted"
                    }`}
                  >
                    {isSelected ? <CheckSquare className="w-4 h-4 text-emerald-400" /> : <Square className="w-4 h-4" />}
                    <span>{report.company_name} — Fiscal Year {report.year}</span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-amber-400 mb-4 shrink-0">
        <Shield className="w-3.5 h-3.5 shrink-0" />
        Scope is limited to selected reports. All responses are RAG-grounded and not certified financial advice.
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 min-h-0 py-2">
        {selectedIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <AlertTriangle className="w-12 h-12 text-amber-500/55 mb-4" />
            <p className="text-fg-muted">Please select at least one company above to start querying.</p>
          </div>
        ) : messages.length === 0 && !streaming ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <MessageSquare className="w-12 h-12 text-fg-muted mb-4" />
            <p className="text-fg-muted">Ask any question comparing or summarizing the selected reports.</p>
            <div className="text-xs text-fg-muted max-w-md mt-2 italic">
              Example: "Which company has better liquidity?" or "Compare the total debt and ROE of these companies."
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
                msg.role === "user" ? "chat-bubble-user text-fg-text" : "chat-bubble-ai text-fg-text"
              }`}>
                {msg.role === "assistant" && (
                  <div className="text-xs text-emerald-400 mb-2 font-semibold">FinGuard Portfolio AI</div>
                )}
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
            </div>
          ))
        )}

        {streaming && streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[80%] chat-bubble-ai px-4 py-3 text-sm text-fg-text leading-relaxed">
              <div className="text-xs text-emerald-400 mb-2 font-semibold">FinGuard Portfolio AI</div>
              <div className="whitespace-pre-wrap">{streamingContent}</div>
              <span className="inline-block w-1 h-4 bg-emerald-400 ml-0.5 animate-pulse" />
            </div>
          </div>
        )}

        {streaming && !streamingContent && (
          <div className="flex justify-start">
            <div className="chat-bubble-ai px-4 py-3">
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input controls */}
      <div className="shrink-0 pt-4 border-t border-fg">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-3"
        >
          <input
            id="chat-input"
            className="fg-input flex-1"
            placeholder="Ask a question about the selected companies..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={streaming || selectedIds.length === 0}
          />
          <button
            type="submit"
            disabled={streaming || !input.trim() || selectedIds.length === 0}
            className="btn-primary px-4 flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
