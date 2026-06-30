"use client";

import { Bot, User, ExternalLink } from "lucide-react";

interface Citation {
  page?: number;
  text?: string;
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  timestamp?: string;
  isStreaming?: boolean;
}

export default function ChatMessage({
  role,
  content,
  citations = [],
  timestamp,
  isStreaming = false,
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`
          flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full
          ${isUser
            ? "bg-blue-500/20 text-blue-400"
            : "bg-gradient-to-br from-cyan-500/20 to-blue-500/20 text-cyan-400"
          }
        `}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      {/* Message bubble */}
      <div className={`max-w-[80%] space-y-2 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`
            rounded-2xl px-4 py-3 text-sm leading-relaxed
            ${isUser
              ? "rounded-tr-sm bg-blue-600/30 text-gray-100"
              : "rounded-tl-sm bg-white/[0.04] border border-white/5 text-gray-200"
            }
          `}
        >
          {/* Streaming cursor */}
          {isStreaming ? (
            <span>
              {content}
              <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-cyan-400" />
            </span>
          ) : (
            <div className="whitespace-pre-wrap">{content}</div>
          )}
        </div>

        {/* Citations */}
        {citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {citations.map((c, i) => (
              <span
                key={i}
                className="flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400 transition hover:bg-blue-500/20"
              >
                <ExternalLink className="h-2.5 w-2.5" />
                {c.page ? `Page ${c.page}` : c.text || `Ref ${i + 1}`}
              </span>
            ))}
          </div>
        )}

        {/* Timestamp */}
        {timestamp && (
          <p className={`text-[10px] text-gray-600 ${isUser ? "text-right" : "text-left"}`}>
            {timestamp}
          </p>
        )}
      </div>
    </div>
  );
}
