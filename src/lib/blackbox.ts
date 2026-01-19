// Blackbox AI Remote Agents Client

const BLACKBOX_API_URL = process.env.BLACKBOX_API_URL || "https://blackbox-nine-rho.vercel.app";

export type Agent = "claude" | "blackbox" | "codex" | "gemini";

export interface TaskRequest {
  prompt: string;
  repoUrl?: string;
  selectedBranch?: string;
  selectedAgent?: Agent;
  selectedModel?: string;
  installDependencies?: boolean;
  environmentVariables?: Record<string, string>;
}

export interface ReviewRequest {
  repoUrl: string;
  branch?: string;
  focus?: "security" | "performance" | "quality" | "all";
  multiAgent?: boolean;
}

export interface DocsRequest {
  repoUrl: string;
  branch?: string;
  type?: "readme" | "api" | "full" | "changelog";
}

export interface TestsRequest {
  repoUrl: string;
  branch?: string;
  testType?: "unit" | "integration" | "e2e";
  target?: string;
}

export interface Task {
  id: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  progress: number;
  logs?: string[];
  branchName?: string;
  prUrl?: string;
  prNumber?: number;
  error?: string;
  diffStats?: {
    totalLinesAdded: number;
    totalLinesRemoved: number;
    totalFilesChanged: number;
  };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export class BlackboxClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl?: string) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || BLACKBOX_API_URL;
  }

  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" = "GET",
    body?: object
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || "API request failed");
    }

    return data;
  }

  // Create a new task
  async createTask(request: TaskRequest): Promise<{ taskId: string; task: Task }> {
    return this.request("/api/tasks/create", "POST", request);
  }

  // Get task status
  async getTask(taskId: string, options?: { includeLogs?: boolean; includeDiff?: boolean }): Promise<{ task: Task }> {
    const params = new URLSearchParams();
    if (options?.includeLogs) params.append("includeLogs", "true");
    if (options?.includeDiff) params.append("includeDiff", "true");

    const query = params.toString();
    return this.request(`/api/tasks/${taskId}${query ? `?${query}` : ""}`);
  }

  // Poll task until completion
  async waitForCompletion(
    taskId: string,
    options?: {
      onProgress?: (task: Task) => void;
      timeoutMs?: number;
      pollIntervalMs?: number;
    }
  ): Promise<Task> {
    const timeout = options?.timeoutMs || 300000; // 5 minutes
    const interval = options?.pollIntervalMs || 5000; // 5 seconds
    const startTime = Date.now();

    while (true) {
      const { task } = await this.getTask(taskId);

      if (options?.onProgress) {
        options.onProgress(task);
      }

      if (task.status === "completed" || task.status === "failed" || task.status === "cancelled") {
        return task;
      }

      if (Date.now() - startTime > timeout) {
        throw new Error("Task timed out");
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  // Code review
  async createReview(request: ReviewRequest): Promise<{ taskId: string; task: Task }> {
    return this.request("/api/review", "POST", request);
  }

  // Generate documentation
  async createDocs(request: DocsRequest): Promise<{ taskId: string; task: Task }> {
    return this.request("/api/docs/generate", "POST", request);
  }

  // Generate tests
  async createTests(request: TestsRequest): Promise<{ taskId: string; task: Task }> {
    return this.request("/api/tests/generate", "POST", request);
  }
}

// Default models for each agent
export const DEFAULT_MODELS: Record<Agent, string> = {
  claude: "blackboxai/anthropic/claude-sonnet-4.5",
  blackbox: "blackboxai/blackbox-pro",
  codex: "gpt-5-codex",
  gemini: "gemini-2.0-flash-exp",
};

// Task types for UI
export const TASK_TYPES = [
  { id: "custom", name: "Custom Task", description: "Run any prompt on your repo" },
  { id: "review", name: "Code Review", description: "Security, performance, quality analysis" },
  { id: "docs", name: "Documentation", description: "Generate README, API docs, changelog" },
  { id: "tests", name: "Tests", description: "Unit, integration, or E2E tests" },
] as const;

// Create a client instance (server-side)
export function createBlackboxClient(): BlackboxClient {
  const apiKey = process.env.BLACKBOX_API_KEY;
  if (!apiKey) {
    throw new Error("BLACKBOX_API_KEY is not configured");
  }
  return new BlackboxClient(apiKey);
}
