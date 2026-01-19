"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TASK_TYPES, DEFAULT_MODELS, type Agent } from "@/lib/blackbox";

type TaskType = "custom" | "review" | "docs" | "tests";

export default function NewTaskPage() {
  const router = useRouter();
  const [taskType, setTaskType] = useState<TaskType>("custom");
  const [prompt, setPrompt] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [agent, setAgent] = useState<Agent>("claude");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review options
  const [reviewFocus, setReviewFocus] = useState<"all" | "security" | "performance" | "quality">("all");

  // Docs options
  const [docsType, setDocsType] = useState<"readme" | "api" | "full" | "changelog">("readme");

  // Tests options
  const [testType, setTestType] = useState<"unit" | "integration" | "e2e">("unit");
  const [testTarget, setTestTarget] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl) {
      setError("Repository URL is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let endpoint = "/api/tasks";
      let body: Record<string, unknown> = {
        repoUrl,
        branch,
        agent,
        model: DEFAULT_MODELS[agent],
      };

      if (taskType === "custom") {
        if (!prompt) {
          setError("Prompt is required");
          setIsLoading(false);
          return;
        }
        body.prompt = prompt;
        body.type = "custom";
      } else if (taskType === "review") {
        body.type = "review";
        body.focus = reviewFocus;
      } else if (taskType === "docs") {
        body.type = "docs";
        body.docsType = docsType;
      } else if (taskType === "tests") {
        body.type = "tests";
        body.testType = testType;
        if (testTarget) body.target = testTarget;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create task");
      }

      router.push(`/dashboard/tasks/${data.task.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <Link href="/dashboard" className="text-sm text-muted hover:text-foreground">
          ← Back to Dashboard
        </Link>
        <h1 className="text-2xl font-normal text-foreground mt-4">Create Task</h1>
        <p className="text-muted mt-1">Run an AI agent on your repository</p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-error/10 border border-error/20 text-sm text-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Task Type */}
        <div className="bg-card p-6">
          <label className="block text-xs uppercase tracking-wider text-muted mb-3">
            Task Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            {TASK_TYPES.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => setTaskType(type.id as TaskType)}
                className={`p-4 text-left border transition-colors ${
                  taskType === type.id
                    ? "border-foreground bg-card-elevated"
                    : "border-border hover:border-muted"
                }`}
              >
                <div className="font-medium text-foreground">{type.name}</div>
                <div className="text-sm text-muted mt-1">{type.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Repository */}
        <div className="bg-card p-6">
          <label className="block text-xs uppercase tracking-wider text-muted mb-1.5">
            Repository URL
          </label>
          <input
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            className="w-full px-3 py-2.5 bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
            placeholder="https://github.com/user/repo.git"
            required
          />

          <label className="block text-xs uppercase tracking-wider text-muted mb-1.5 mt-4">
            Branch
          </label>
          <input
            type="text"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            className="w-full px-3 py-2.5 bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
            placeholder="main"
          />
        </div>

        {/* Task-specific options */}
        {taskType === "custom" && (
          <div className="bg-card p-6">
            <label className="block text-xs uppercase tracking-wider text-muted mb-1.5">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground resize-none"
              placeholder="Add unit tests for the auth module..."
              required
            />
          </div>
        )}

        {taskType === "review" && (
          <div className="bg-card p-6">
            <label className="block text-xs uppercase tracking-wider text-muted mb-3">
              Review Focus
            </label>
            <div className="flex gap-3">
              {(["all", "security", "performance", "quality"] as const).map((focus) => (
                <button
                  key={focus}
                  type="button"
                  onClick={() => setReviewFocus(focus)}
                  className={`px-4 py-2 border transition-colors capitalize ${
                    reviewFocus === focus
                      ? "border-foreground bg-card-elevated"
                      : "border-border hover:border-muted"
                  }`}
                >
                  {focus}
                </button>
              ))}
            </div>
          </div>
        )}

        {taskType === "docs" && (
          <div className="bg-card p-6">
            <label className="block text-xs uppercase tracking-wider text-muted mb-3">
              Documentation Type
            </label>
            <div className="flex gap-3">
              {(["readme", "api", "full", "changelog"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setDocsType(type)}
                  className={`px-4 py-2 border transition-colors uppercase text-sm ${
                    docsType === type
                      ? "border-foreground bg-card-elevated"
                      : "border-border hover:border-muted"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        {taskType === "tests" && (
          <div className="bg-card p-6">
            <label className="block text-xs uppercase tracking-wider text-muted mb-3">
              Test Type
            </label>
            <div className="flex gap-3 mb-4">
              {(["unit", "integration", "e2e"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTestType(type)}
                  className={`px-4 py-2 border transition-colors capitalize ${
                    testType === type
                      ? "border-foreground bg-card-elevated"
                      : "border-border hover:border-muted"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <label className="block text-xs uppercase tracking-wider text-muted mb-1.5">
              Target (optional)
            </label>
            <input
              type="text"
              value={testTarget}
              onChange={(e) => setTestTarget(e.target.value)}
              className="w-full px-3 py-2.5 bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground"
              placeholder="auth module, src/utils, etc."
            />
          </div>
        )}

        {/* Agent Selection */}
        <div className="bg-card p-6">
          <label className="block text-xs uppercase tracking-wider text-muted mb-3">
            AI Agent
          </label>
          <div className="flex gap-3">
            {(["claude", "blackbox", "codex", "gemini"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAgent(a)}
                className={`px-4 py-2 border transition-colors capitalize ${
                  agent === a
                    ? "border-foreground bg-card-elevated"
                    : "border-border hover:border-muted"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Model: {DEFAULT_MODELS[agent]}
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 bg-foreground text-white font-normal hover:opacity-85 transition-opacity disabled:opacity-50"
        >
          {isLoading ? "Creating..." : "Create Task"}
        </button>
      </form>
    </div>
  );
}
