"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Task } from "@/lib/types";

interface TaskCardProps {
  task: Task;
}

function TaskCard({ task }: TaskCardProps) {
  const isRunning = task.status === "running";
  const isQueued = task.status === "queued";

  const statusColors = {
    queued: "bg-card-elevated",
    assigned: "bg-warning",
    running: "bg-success",
    completed: "bg-accent",
    failed: "bg-error",
    cancelled: "bg-muted-foreground",
  };

  const statusLabels = {
    queued: "Queued",
    assigned: "Assigned",
    running: "Running",
    completed: "Completed",
    failed: "Failed",
    cancelled: "Cancelled",
  };

  return (
    <Link
      href={`/tasks/${task.id}`}
      className="block bg-card p-4 rounded border border-border hover:bg-card-elevated hover:border-accent/30 transition-all duration-150"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "w-2 h-2 rounded-full flex-shrink-0",
              statusColors[task.status],
              isRunning && "animate-pulse"
            )}
          />
          <span className="px-1.5 py-0.5 bg-card-elevated text-xs font-mono tracking-wide rounded flex-shrink-0">
            {task.type.substring(0, 2).toUpperCase()}
          </span>
          <span className="text-sm text-foreground truncate">
            {task.prompt.length > 40
              ? task.prompt.substring(0, 40) + "..."
              : task.prompt}
          </span>
        </div>
        <span
          className={cn(
            "text-xs px-2 py-0.5 rounded font-medium flex-shrink-0",
            isRunning && "bg-accent text-black",
            isQueued && "bg-card-elevated text-muted",
            task.status === "completed" && "bg-success/20 text-success",
            task.status === "failed" && "bg-error/20 text-error"
          )}
        >
          {statusLabels[task.status]}
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-muted font-mono">
        <span>{task.assignedAgents} agents assigned</span>
        {task.eta && (
          <span className="text-muted-foreground">
            ETA {new Date(task.eta).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Progress */}
      {(isRunning || task.status === "assigned") && (
        <div className="mt-3">
          <div className="h-1 bg-card-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}
    </Link>
  );
}

interface TaskPipelineProps {
  tasks: Task[];
}

export function TaskPipeline({ tasks }: TaskPipelineProps) {
  const queuedCount = tasks.filter((t) => t.status === "queued").length;
  const runningCount = tasks.filter((t) => t.status === "running").length;

  // Sort: running first, then queued, then by priority
  const sortedTasks = [...tasks].sort((a, b) => {
    const statusOrder = { running: 0, assigned: 1, queued: 2 };
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    const statusDiff =
      (statusOrder[a.status as keyof typeof statusOrder] ?? 99) -
      (statusOrder[b.status as keyof typeof statusOrder] ?? 99);

    if (statusDiff !== 0) return statusDiff;

    return (
      (priorityOrder[a.priority] ?? 99) - (priorityOrder[b.priority] ?? 99)
    );
  });

  return (
    <div className="bg-black/30 border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-medium text-foreground">Task Pipeline</h2>
        <span className="text-sm text-muted font-mono">
          {queuedCount} queued | {runningCount} running
        </span>
      </div>

      <div className="space-y-2">
        {sortedTasks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted mb-3">No tasks in pipeline</p>
            <Link
              href="/tasks/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-black font-medium rounded hover:bg-accent-dim transition-colors"
            >
              <span>+</span>
              <span>Create Task</span>
            </Link>
          </div>
        ) : (
          sortedTasks.slice(0, 5).map((task) => (
            <TaskCard key={task.id} task={task} />
          ))
        )}
      </div>

      {tasks.length > 5 && (
        <div className="mt-4 pt-4 border-t border-border">
          <Link
            href="/tasks"
            className="text-sm text-accent hover:text-accent-dim transition-colors"
          >
            View all {tasks.length} tasks →
          </Link>
        </div>
      )}
    </div>
  );
}
