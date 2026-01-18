/**
 * Blackbox AI Remote Agents API Client
 */

import {
  AgentConfig,
  AgentModel,
  AgentType,
  BlackboxTask,
  CreateTaskRequest,
  DEFAULT_MODELS,
  ErrorResponse,
  TaskResponse,
} from './types';

export interface BlackboxClientOptions {
  baseUrl?: string;
  timeout?: number;
}

export class BlackboxClient {
  private apiKey: string;
  private baseUrl: string;
  private timeout: number;

  constructor(apiKey: string, options: BlackboxClientOptions = {}) {
    if (!apiKey) {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl || 'https://cloud.blackbox.ai';
    this.timeout = options.timeout || 30000;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        const error = data as ErrorResponse;
        throw new BlackboxAPIError(
          error.message || error.error || 'Unknown error',
          response.status,
          error
        );
      }

      return data as T;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Create a single-agent task
   */
  async createTask(request: CreateTaskRequest): Promise<BlackboxTask> {
    const { githubToken, ...taskParams } = request;

    const payload = {
      ...taskParams,
      selectedAgent: request.selectedAgent || 'blackbox',
      selectedModel: request.selectedModel || DEFAULT_MODELS[request.selectedAgent || 'blackbox'],
      // Pass GitHub token as environment variable for repo access
      environmentVariables: {
        ...request.environmentVariables,
        ...(githubToken && { GITHUB_TOKEN: githubToken }),
      },
    };

    const response = await this.request<TaskResponse>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response.task;
  }

  /**
   * Create a multi-agent task
   */
  async createMultiAgentTask(request: {
    prompt: string;
    repoUrl?: string;
    selectedBranch?: string;
    selectedAgents: AgentConfig[];
    installDependencies?: boolean;
    maxDuration?: number;
    repoInstructions?: string;
    environmentVariables?: Record<string, string>;
  }): Promise<BlackboxTask> {
    if (request.selectedAgents.length < 2) {
      throw new Error('Multi-agent tasks require at least 2 agents');
    }
    if (request.selectedAgents.length > 5) {
      throw new Error('Multi-agent tasks support maximum 5 agents');
    }

    const response = await this.request<TaskResponse>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    return response.task;
  }

  /**
   * Get task details by ID
   */
  async getTask(taskId: string): Promise<BlackboxTask> {
    const response = await this.request<TaskResponse>(`/api/tasks/${taskId}`);
    return response.task;
  }

  /**
   * Poll task until completion
   */
  async waitForCompletion(
    taskId: string,
    options: {
      pollInterval?: number;
      timeout?: number;
      onProgress?: (task: BlackboxTask) => void;
    } = {}
  ): Promise<BlackboxTask> {
    const pollInterval = options.pollInterval || 5000;
    const timeout = options.timeout || 600000;
    const startTime = Date.now();

    while (true) {
      const task = await this.getTask(taskId);

      if (options.onProgress) {
        options.onProgress(task);
      }

      if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
        return task;
      }

      if (Date.now() - startTime > timeout) {
        throw new Error(`Task ${taskId} timed out after ${timeout}ms`);
      }

      await this.sleep(pollInterval);
    }
  }

  /**
   * Create a code review task
   */
  async createReviewTask(
    repoUrl: string,
    options: {
      branch?: string;
      agent?: AgentType;
      model?: AgentModel;
      focus?: string;
    } = {}
  ): Promise<BlackboxTask> {
    const focus = options.focus || 'code quality, security, and best practices';
    const prompt = `Review the codebase focusing on ${focus}. Provide detailed feedback on:
1. Code quality and maintainability
2. Security vulnerabilities
3. Performance issues
4. Best practices violations
5. Suggestions for improvement

Create a comprehensive review report.`;

    return this.createTask({
      prompt,
      repoUrl,
      selectedBranch: options.branch || 'main',
      selectedAgent: options.agent || 'claude',
      selectedModel: options.model || 'blackboxai/anthropic/claude-sonnet-4.5',
    });
  }

  /**
   * Create a documentation task
   */
  async createDocumentationTask(
    repoUrl: string,
    options: {
      branch?: string;
      agent?: AgentType;
      model?: AgentModel;
      type?: 'readme' | 'api' | 'full';
    } = {}
  ): Promise<BlackboxTask> {
    const type = options.type || 'readme';
    const prompts: Record<string, string> = {
      readme: 'Create a comprehensive README.md file with installation instructions, usage examples, and API documentation.',
      api: 'Generate API documentation for all public endpoints and functions in the codebase.',
      full: 'Generate comprehensive documentation including README, API docs, and inline code comments.',
    };

    return this.createTask({
      prompt: prompts[type],
      repoUrl,
      selectedBranch: options.branch || 'main',
      selectedAgent: options.agent || 'claude',
      selectedModel: options.model || 'blackboxai/anthropic/claude-sonnet-4.5',
    });
  }

  /**
   * Create a test generation task
   */
  async createTestTask(
    repoUrl: string,
    options: {
      branch?: string;
      agent?: AgentType;
      model?: AgentModel;
      testType?: 'unit' | 'integration' | 'e2e';
      target?: string;
    } = {}
  ): Promise<BlackboxTask> {
    const testType = options.testType || 'unit';
    const target = options.target ? ` for ${options.target}` : '';
    const prompt = `Add comprehensive ${testType} tests${target}. Ensure good coverage of:
1. Happy path scenarios
2. Edge cases
3. Error handling
4. Boundary conditions

Use appropriate testing frameworks and follow best practices.`;

    return this.createTask({
      prompt,
      repoUrl,
      selectedBranch: options.branch || 'main',
      selectedAgent: options.agent || 'codex',
      selectedModel: options.model || 'gpt-5-codex',
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class BlackboxAPIError extends Error {
  public statusCode: number;
  public response: ErrorResponse;

  constructor(message: string, statusCode: number, response: ErrorResponse) {
    super(message);
    this.name = 'BlackboxAPIError';
    this.statusCode = statusCode;
    this.response = response;
  }
}

export function createBlackboxClient(): BlackboxClient {
  const apiKey = process.env.BLACKBOX_API_KEY;
  if (!apiKey) {
    throw new Error('BLACKBOX_API_KEY environment variable is not set');
  }
  return new BlackboxClient(apiKey);
}
