"use client";

import { cn } from "@/lib/utils";

interface MetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  progress?: number;
  trend?: "up" | "down" | "neutral";
}

function MetricCard({ label, value, subtext, progress, trend }: MetricCardProps) {
  return (
    <div className="bg-black/30 border border-border rounded-lg p-4 min-w-[140px]">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </div>
      <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {subtext && (
        <div
          className={cn(
            "text-sm mt-1",
            trend === "up" && "text-success",
            trend === "down" && "text-error",
            !trend && "text-muted"
          )}
        >
          {subtext}
        </div>
      )}
      {progress !== undefined && (
        <div className="mt-2">
          <div className="h-1 bg-card-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-1 font-mono">
            {progress}%
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricsBarProps {
  metrics: {
    liveAgents: number;
    agentCapacity: number;
    revenueToday: number;
    deploysToday: number;
    linesChanged: { added: number; removed: number };
    tasksTotal: number;
    tasksQueued: number;
  };
}

export function MetricsBar({ metrics }: MetricsBarProps) {
  const agentUtilization = Math.round(
    (metrics.liveAgents / metrics.agentCapacity) * 100
  );

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      <MetricCard
        label="Live Agents"
        value={metrics.liveAgents}
        subtext={`${metrics.agentCapacity - metrics.liveAgents} capacity`}
        progress={agentUtilization}
      />
      <MetricCard
        label="Revenue Today"
        value={`$${metrics.revenueToday.toLocaleString()}`}
        subtext="Live tracking"
        trend="up"
      />
      <MetricCard
        label="Deploys Today"
        value={metrics.deploysToday}
        subtext="Automated"
      />
      <MetricCard
        label="Lines Changed"
        value={`${(metrics.linesChanged.added / 1000).toFixed(1)}K`}
        subtext={`+${metrics.linesChanged.added.toLocaleString()}/-${metrics.linesChanged.removed.toLocaleString()}`}
        trend="up"
      />
      <MetricCard
        label="Tasks"
        value={metrics.tasksTotal}
        subtext={`${metrics.tasksQueued} queued`}
      />
    </div>
  );
}
