"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Initiative } from "@/lib/types";

interface InitiativeCardProps {
  initiative: Initiative;
}

function InitiativeCard({ initiative }: InitiativeCardProps) {
  const progressPercent = Math.round(
    (initiative.stats.running / initiative.maxAgents) * 100
  );
  const isScaling = initiative.scalingPolicy === "auto" && progressPercent > 70;

  return (
    <Link
      href={`/initiatives/${initiative.id}`}
      className={cn(
        "block bg-card p-4 rounded border border-border transition-all duration-150",
        "hover:bg-card-elevated hover:border-accent/30",
        initiative.status === "active" && "border-l-[3px] border-l-accent"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 bg-card-elevated text-xs font-mono tracking-wide rounded">
            {initiative.slug.substring(0, 2).toUpperCase()}
          </span>
          <span className="font-medium text-foreground">{initiative.name}</span>
        </div>
        {isScaling && <span className="text-accent animate-pulse">⚡</span>}
        {!isScaling && initiative.status === "active" && (
          <span className="text-success">●</span>
        )}
      </div>

      {/* Stats */}
      <div className="font-mono text-sm text-muted mb-2">
        {initiative.stats.running} agents | {initiative.stats.queued} queued
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1 bg-card-elevated rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isScaling ? "bg-warning" : "bg-accent"
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {progressPercent}%
        </span>
      </div>

      {/* Completed count */}
      <div className="text-right mt-2">
        <span className="text-xs text-muted-foreground font-mono">
          {initiative.stats.completed.toLocaleString()} completed
        </span>
      </div>
    </Link>
  );
}

interface InitiativesListProps {
  initiatives: Initiative[];
}

export function InitiativesList({ initiatives }: InitiativesListProps) {
  const activeCount = initiatives.filter((i) => i.status === "active").length;

  return (
    <div className="bg-black/30 border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-foreground">Active Initiatives</h2>
        <span className="text-sm text-muted font-mono">
          {activeCount} running
        </span>
      </div>

      <div className="space-y-3">
        {initiatives.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted mb-3">No initiatives yet</p>
            <Link
              href="/initiatives/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-black font-medium rounded hover:bg-accent-dim transition-colors"
            >
              <span>+</span>
              <span>Create Initiative</span>
            </Link>
          </div>
        ) : (
          initiatives.map((initiative) => (
            <InitiativeCard key={initiative.id} initiative={initiative} />
          ))
        )}
      </div>

      {initiatives.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <Link
            href="/initiatives/new"
            className="text-sm text-accent hover:text-accent-dim transition-colors"
          >
            + New Initiative
          </Link>
        </div>
      )}
    </div>
  );
}
