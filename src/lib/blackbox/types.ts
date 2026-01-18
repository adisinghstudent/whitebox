/**
 * Blackbox AI Remote Agents API Types
 * Documentation: https://docs.blackbox.ai/api-reference/multi-agent-task
 */

// Agent & Model Types
export type AgentType = 'claude' | 'blackbox' | 'codex' | 'gemini';

export type ClaudeModel =
  | 'blackboxai/anthropic/claude-sonnet-4.5'
  | 'blackboxai/anthropic/claude-sonnet-4'
  | 'blackboxai/anthropic/claude-opus-4';

export type BlackboxModel =
  | 'blackboxai/blackbox-pro'
  | 'blackboxai/anthropic/claude-sonnet-4.5'
  | 'blackboxai/openai/gpt-5-codex'
  | 'blackboxai/anthropic/claude-opus-4'
  | 'blackboxai/x-ai/grok-code-fast-1:free'
  | 'blackboxai/google/gemini-2.5-pro';

export type CodexModel =
  | 'openai/gpt-5'
  | 'gpt-5-codex'
  | 'openai/gpt-5-mini'
  | 'openai/gpt-5-nano'
  | 'openai/gpt-4.1';

export type GeminiModel =
  | 'gemini-2.0-flash-exp'
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash';

export type AgentModel = ClaudeModel | BlackboxModel | CodexModel | GeminiModel;

export interface AgentConfig {
  agent: AgentType;
  model: AgentModel;
}

// Task Request Types
export interface CreateTaskRequest {
  prompt: string;
  repoUrl?: string;
  selectedBranch?: string;
  selectedAgent?: AgentType;
  selectedModel?: AgentModel;
  selectedAgents?: AgentConfig[];
  installDependencies?: boolean;
  maxDuration?: number;
  keepAlive?: boolean;
  repoInstructions?: string;
  environmentVariables?: Record<string, string>;
  autoDeployEnabled?: boolean;
  deploymentProvider?: 'vercel' | 'gcloud';

  // GitHub authentication (user-provided token)
  githubToken?: string;
}

// Task Response Types
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface AgentExecution {
  agent: AgentType;
  model?: AgentModel;
  status: TaskStatus;
  gitDiff?: string;
  branchName?: string;
  executedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface DiffAnalysis {
  analysis: string;
  bestAgent: AgentType;
  analyzedAt: string;
}

export interface DiffStats {
  totalLinesAdded: number;
  totalLinesRemoved: number;
  totalFilesChanged: number;
  initialCommitSha?: string;
}

export interface BlackboxTask {
  id: string;
  userId: string;
  teamId: string | null;
  prompt: string;
  repoUrl: string | null;
  selectedAgent: AgentType;
  selectedModel: AgentModel;
  installDependencies: boolean;
  maxDuration: number;
  keepAlive: boolean;
  status: TaskStatus;
  progress: number;
  logs: string[];
  followupMessages: string[] | null;
  error: string | null;
  selectedBranch: string;
  branchName: string | null;
  sandboxUrl: string | null;
  sandboxId: string | null;
  merged: boolean;
  prNumber: number | null;
  prUrl: string | null;
  multiLaunch: boolean;
  selectedAgents: AgentConfig[] | null;
  agentExecutions: AgentExecution[] | null;
  diffAnalysis: DiffAnalysis | null;
  diffStats: DiffStats | null;
  taskSource: 'manual' | 'api' | 'slack' | 'sms' | 'voice';
  autoDeployEnabled: boolean;
  deploymentProvider: 'vercel' | 'gcloud';
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface TaskResponse {
  task: BlackboxTask;
}

export interface ErrorResponse {
  error: string;
  message: string;
  status: number;
}

// Default Model Configurations
export const DEFAULT_MODELS: Record<AgentType, AgentModel> = {
  claude: 'blackboxai/anthropic/claude-sonnet-4.5',
  blackbox: 'blackboxai/blackbox-pro',
  codex: 'gpt-5-codex',
  gemini: 'gemini-2.0-flash-exp',
};

export const AGENT_MODELS: Record<AgentType, AgentModel[]> = {
  claude: [
    'blackboxai/anthropic/claude-sonnet-4.5',
    'blackboxai/anthropic/claude-sonnet-4',
    'blackboxai/anthropic/claude-opus-4',
  ],
  blackbox: [
    'blackboxai/blackbox-pro',
    'blackboxai/anthropic/claude-sonnet-4.5',
    'blackboxai/openai/gpt-5-codex',
    'blackboxai/anthropic/claude-opus-4',
    'blackboxai/x-ai/grok-code-fast-1:free',
    'blackboxai/google/gemini-2.5-pro',
  ],
  codex: [
    'openai/gpt-5',
    'gpt-5-codex',
    'openai/gpt-5-mini',
    'openai/gpt-5-nano',
    'openai/gpt-4.1',
  ],
  gemini: [
    'gemini-2.0-flash-exp',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
  ],
};

// Cost rates per 1M tokens
export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'blackboxai/anthropic/claude-sonnet-4.5': { input: 3.00, output: 15.00 },
  'blackboxai/anthropic/claude-sonnet-4': { input: 3.00, output: 15.00 },
  'blackboxai/anthropic/claude-opus-4': { input: 15.00, output: 75.00 },
  'blackboxai/blackbox-pro': { input: 1.00, output: 3.00 },
  'gpt-5-codex': { input: 5.00, output: 15.00 },
  'gemini-2.5-pro': { input: 1.25, output: 5.00 },
  'blackboxai/x-ai/grok-code-fast-1:free': { input: 0, output: 0 },
};

export const COMPUTE_COST_PER_MINUTE = 0.01;
