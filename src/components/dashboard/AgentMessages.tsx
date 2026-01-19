"use client";

import { cn } from "@/lib/utils";
import type { AgentMessage } from "@/lib/types";

interface MessageCardProps {
  message: AgentMessage;
}

function MessageCard({ message }: MessageCardProps) {
  const typeColors = {
    HANDOFF: "bg-accent text-black",
    RESPONSE: "bg-info text-white",
    ALERT: "bg-error text-white",
    REQUEST: "bg-warning text-black",
    STATUS: "bg-card-elevated text-muted",
  };

  return (
    <div className="p-3 border-b border-border last:border-b-0 hover:bg-card-elevated/50 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-foreground">
            {message.fromInitiativeId?.substring(0, 2).toUpperCase() || "SYS"} →{" "}
            {message.toInitiativeId?.substring(0, 2).toUpperCase() || "ALL"}
          </span>
          <span
            className={cn(
              "text-xs px-1.5 py-0.5 rounded font-medium",
              typeColors[message.type]
            )}
          >
            {message.type}
          </span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {message.createdAt.toLocaleTimeString()}
        </span>
      </div>

      {/* Content */}
      <div className="text-sm text-muted">
        <span className="font-medium text-foreground">{message.subject}</span>
        {message.body && (
          <span className="ml-1">
            {message.body.length > 60
              ? message.body.substring(0, 60) + "..."
              : message.body}
          </span>
        )}
      </div>

      {/* Actions */}
      {message.suggestedActions && message.suggestedActions.length > 0 && (
        <div className="flex gap-2 mt-2">
          {message.suggestedActions.slice(0, 2).map((action, idx) => (
            <button
              key={idx}
              className="text-xs px-2 py-1 bg-card-elevated hover:bg-accent hover:text-black rounded transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface AgentMessagesProps {
  messages: AgentMessage[];
}

export function AgentMessages({ messages }: AgentMessagesProps) {
  const unreadCount = messages.filter((m) => !m.read).length;

  return (
    <div className="bg-black/30 border border-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <h2 className="font-medium text-foreground">Agent Messages</h2>
        </div>
        <span className="text-sm text-muted font-mono">
          {unreadCount > 0 ? `${unreadCount} new` : `${messages.length} recent`}
        </span>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted">No messages yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Messages will appear here as agents communicate
            </p>
          </div>
        ) : (
          messages.slice(0, 10).map((message) => (
            <MessageCard key={message.id} message={message} />
          ))
        )}
      </div>

      {messages.length > 10 && (
        <div className="p-3 border-t border-border">
          <button className="text-sm text-accent hover:text-accent-dim transition-colors">
            View all messages →
          </button>
        </div>
      )}
    </div>
  );
}
