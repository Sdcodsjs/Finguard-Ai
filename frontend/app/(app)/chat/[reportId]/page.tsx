"use client";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { chat as chatApi, ChatMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Send, Loader2, MessageSquare, FileText, Shield, Mic, MicOff } from "lucide-react";
import Link from "next/link";

function CitationChip({ page }: { page: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full px-2 py-0.5">
      <FileText className="w-2.5 h-2.5" />
      p.{page}
    </span>
  );
}

export default function ChatPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  
  // Voice Query State (Module 24)
  const [recognizing, setRecognizing] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "en-US";

        rec.onstart = () => setRecognizing(true);
        rec.onend = () => setRecognizing(false);
        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setInput((prev) => (prev ? prev + " " + transcript : transcript));
          }
        };
        rec.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setRecognizing(false);
        };
        recognitionRef.current = rec;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Web Speech API is not supported in this browser. Please use Google Chrome or Safari.");
      return;
    }
    if (recognizing) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  useEffect(() => {
    chatApi.history(reportId)
      .then(setMessages)
      .catch(() => {});
  }, [reportId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const sendMessage = async () => {
    if (!input.trim() || streaming) return;

    const userMsg: ChatMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    const question = input;
    setInput("");
    setStreaming(true);
    setStreamingContent("");

    try {
      const res = await chatApi.stream(reportId, question, messages);
      if (!res.body) throw new Error("No stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let citations: { page: number }[] = [];

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
            } else if (json.type === "citations") {
              citations = json.citations;
            }
          } catch {}
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: fullContent, citations },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." },
      ]);
    } finally {
      setStreaming(false);
      setStreamingContent("");
    }
  };

  const SUGGESTED = [
    "What are the key financial risks?",
    "Explain the fraud flags in simple terms",
    "What is the company's cash flow situation?",
    "Should I be concerned about the debt levels?",
    "Summarize the ESG performance",
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 h-[calc(100vh-64px)] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h1 className="font-semibold text-fg-text text-sm">AI Investor Assistant</h1>
            <p className="text-xs text-fg-muted">Powered by Nebius Chat Model · RAG-grounded responses</p>
          </div>
        </div>
        <Link href={`/analysis/${reportId}`} className="btn-ghost text-xs py-1.5 px-3">
          ← Back to Analysis
        </Link>
      </div>

      {/* Disclaimer */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-amber-400 mb-4 shrink-0">
        <Shield className="w-3.5 h-3.5 shrink-0" />
        AI responses are not certified financial advice. Always consult a qualified advisor before making investment decisions.
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-4 min-h-0 py-2">
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <MessageSquare className="w-12 h-12 text-fg-muted mb-4" />
            <p className="text-fg-muted mb-6">Ask any question about this financial report</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs px-3 py-1.5 rounded-full border border-fg hover:border-blue-500/50 hover:bg-blue-500/5 text-fg-muted hover:text-blue-400 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
              msg.role === "user" ? "chat-bubble-user text-fg-text" : "chat-bubble-ai text-fg-text"
            }`}>
              {msg.role === "assistant" && (
                <div className="text-xs text-blue-400 mb-2 font-semibold">FinGuard AI</div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.citations && msg.citations.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {msg.citations.map((c, ci) => (
                    <CitationChip key={ci} page={c.page} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming response */}
        {streaming && streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[80%] chat-bubble-ai px-4 py-3 text-sm text-fg-text leading-relaxed">
              <div className="text-xs text-blue-400 mb-2 font-semibold">FinGuard AI</div>
              <div className="whitespace-pre-wrap">{streamingContent}</div>
              <span className="inline-block w-1 h-4 bg-blue-400 ml-0.5 animate-pulse" />
            </div>
          </div>
        )}

        {streaming && !streamingContent && (
          <div className="flex justify-start">
            <div className="chat-bubble-ai px-4 py-3">
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 pt-4 border-t border-fg">
        <div className="flex gap-3">
          <input
            id="chat-input"
            className="fg-input flex-1"
            placeholder="Ask about revenue, fraud flags, debt profile, ESG…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            disabled={streaming}
          />
          <button
            onClick={toggleListening}
            className={`px-3.5 flex items-center justify-center rounded-lg border transition-all ${
              recognizing
                ? "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse"
                : "border-fg text-fg-muted hover:text-fg-text hover:border-slate-700 bg-fg-surface-2"
            }`}
            title={recognizing ? "Stop listening" : "Start voice query"}
            type="button"
            disabled={streaming}
          >
            {recognizing ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button
            id="chat-send"
            onClick={sendMessage}
            disabled={!input.trim() || streaming}
            className="btn-primary px-4 flex items-center justify-center disabled:opacity-40"
          >
            {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-fg-muted mt-2 text-center">
          Responses are RAG-grounded in the uploaded report via Nebius Token Factory
        </p>
      </div>
    </div>
  );
}
