// Agent Types
export type AgentType = "claude" | "codex" | "gemini" | "grok" | "blackbox";
export type AgentModel =
  | "blackboxai/anthropic/claude-sonnet-4.5"
  | "blackboxai/anthropic/claude-opus-4"
  | "blackboxai/blackbox-pro"
  | "blackboxai/x-ai/grok-code-fast-1:free"
  | "gemini-2.5-pro";

// Initiative Types
export interface Initiative {
  id: string;
  userId: string;
  name: string;
  slug: string;
  description: string | null;

  // Capacity & Scaling
  maxAgents: number;
  minAgents: number;
  scalingPolicy: "auto" | "manual";

  // Agent Configuration
  defaultAgent: AgentType;
  defaultModel: AgentModel;
  allowedAgents: AgentConfig[];

  // Trigger Configuration
  triggers: InitiativeTrigger[];

  // Status
  status: "active" | "paused" | "archived";

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Computed stats (from tasks)
  stats: InitiativeStats;
}

export interface InitiativeStats {
  running: number;
  queued: number;
  completed: number;
  failed: number;
}

export interface AgentConfig {
  agent: AgentType;
  model: AgentModel;
  enabled: boolean;
}

export interface InitiativeTrigger {
  type:
    | "github_pr"
    | "github_issue"
    | "linear_ticket"
    | "schedule"
    | "webhook"
    | "manual";
  config: Record<string, unknown>;
  enabled: boolean;
}

// Task Types
export type TaskType = "code" | "review" | "docs" | "research" | "test" | "custom";
export type TaskPriority = "critical" | "high" | "medium" | "low";
export type TaskStatus =
  | "queued"
  | "assigned"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface Task {
  id: string;
  initiativeId: string;
  repositoryId: string | null;

  // Task Definition
  prompt: string;
  type: TaskType;
  priority: TaskPriority;

  // Execution
  status: TaskStatus;
  assignedAgents: number;
  progress: number;
  eta: Date | null;

  // Blackbox Integration
  blackboxTaskId: string | null;

  // External Reference
  externalRef?: ExternalRef;

  // Results
  result: TaskResult | null;
  artifacts: TaskArtifact[];
  error: string | null;

  // Chaining
  dependsOn: string[];
  triggers: string[];

  // Timestamps
  queuedAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExternalRef {
  type: "github_pr" | "linear_issue" | "slack_thread";
  id: string;
  url: string;
}

export interface TaskResult {
  success: boolean;
  prUrl?: string;
  branchName?: string;
  diffStats?: DiffStats;
  summary?: string;
  error?: string;
}

export interface DiffStats {
  added: number;
  removed: number;
  filesChanged: number;
}

export interface TaskArtifact {
  type: "file" | "pr" | "commit" | "log";
  name: string;
  url?: string;
  content?: string;
}

// Repository Types
export interface Repository {
  id: string;
  userId: string;
  url: string;
  provider: "github" | "gitlab" | "bitbucket";
  name: string;
  fullName: string;
  defaultBranch: string;
  installationId: string | null;
  repoInstructions: string | null;
  webhooksEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Computed stats
  stats: RepositoryStats;
}

export interface RepositoryStats {
  tasksCompleted: number;
  prsCreated: number;
  linesChanged: { added: number; removed: number };
}

// Agent Message Types
export type MessageType = "HANDOFF" | "RESPONSE" | "ALERT" | "REQUEST" | "STATUS";

export interface AgentMessage {
  id: string;
  fromInitiativeId: string;
  toInitiativeId: string;
  fromTaskId: string | null;
  toTaskId: string | null;

  type: MessageType;
  subject: string;
  body: string | null;
  metadata: Record<string, unknown> | null;
  suggestedActions: SuggestedAction[] | null;

  read: boolean;
  createdAt: Date;
}

export interface SuggestedAction {
  label: string;
  action: string;
  params: Record<string, unknown>;
}

// User Types
export interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Billing Types
export type PlanId = "free" | "starter" | "pro" | "enterprise";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number;
  priceYearly: number | null;
  tasksLimit: number;
  initiativesLimit: number;
  reposLimit: number;
  overageRate: number | null;
  features: string[];
  stripePriceId: string | null;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: PlanId;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  status: "active" | "past_due" | "cancelled";
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Usage {
  id: string;
  userId: string;
  periodStart: Date;
  periodEnd: Date;
  tasksUsed: number;
  tasksLimit: number;
  totalCost: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Credits {
  id: string;
  userId: string;
  balance: number;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  type: "subscription" | "credit_purchase" | "task_charge" | "refund";
  amount: number;
  description: string | null;
  taskId: string | null;
  stripePaymentIntentId: string | null;
  stripeInvoiceId: string | null;
  balanceAfter: number | null;
  createdAt: Date;
}

export interface TaskCost {
  id: string;
  taskId: string;
  userId: string;
  agentCosts: AgentCostItem[];
  computeMinutes: number;
  computeCost: number;
  baseCost: number;
  marginPercent: number;
  finalCost: number;
  charged: boolean;
  chargedAt: Date | null;
  transactionId: string | null;
  createdAt: Date;
}

export interface AgentCostItem {
  agent: AgentType;
  model: AgentModel;
  tokensUsed: number;
  cost: number;
}

// Metrics Types
export interface MetricsHourly {
  id: string;
  hour: Date;
  tasksCreated: number;
  tasksCompleted: number;
  tasksFailed: number;
  agentsSpawned: number;
  prsCreated: number;
  linesAdded: number;
  linesRemoved: number;
  filesChanged: number;
  estimatedCost: number;
  createdAt: Date;
}

// Dashboard Metrics
export interface DashboardMetrics {
  liveAgents: number;
  agentCapacity: number;
  revenueToday: number;
  deploysToday: number;
  linesChanged: { added: number; removed: number };
  totalTasks: number;
  queuedTasks: number;
}

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
