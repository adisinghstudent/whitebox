import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/db/client";
import { MetricsBar } from "@/components/dashboard/MetricsBar";
import { InitiativesList } from "@/components/dashboard/InitiativesList";
import { TaskPipeline } from "@/components/dashboard/TaskPipeline";
import { AgentMessages } from "@/components/dashboard/AgentMessages";
import type { Initiative, Task, AgentMessage } from "@/lib/types";

async function getDashboardData(userId: string) {
  const supabase = createServerClient();

  // Fetch initiatives
  const { data: initiativesData } = await supabase
    .from("initiatives")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  // Fetch recent tasks
  const { data: tasksData } = await supabase
    .from("tasks")
    .select("*")
    .in("status", ["queued", "assigned", "running"])
    .order("queued_at", { ascending: false })
    .limit(10);

  // Fetch recent messages
  const { data: messagesData } = await supabase
    .from("agent_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(20);

  // Fetch metrics
  const { data: metricsData } = await supabase
    .from("metrics_hourly")
    .select("*")
    .gte("hour", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order("hour", { ascending: false });

  // Calculate aggregate metrics
  const todayMetrics = metricsData?.reduce(
    (acc, m) => ({
      tasksCreated: acc.tasksCreated + (m.tasks_created || 0),
      tasksCompleted: acc.tasksCompleted + (m.tasks_completed || 0),
      agentsSpawned: acc.agentsSpawned + (m.agents_spawned || 0),
      prsCreated: acc.prsCreated + (m.prs_created || 0),
      linesAdded: acc.linesAdded + (m.lines_added || 0),
      linesRemoved: acc.linesRemoved + (m.lines_removed || 0),
      estimatedCost: acc.estimatedCost + parseFloat(m.estimated_cost || "0"),
    }),
    {
      tasksCreated: 0,
      tasksCompleted: 0,
      agentsSpawned: 0,
      prsCreated: 0,
      linesAdded: 0,
      linesRemoved: 0,
      estimatedCost: 0,
    }
  ) || {
    tasksCreated: 0,
    tasksCompleted: 0,
    agentsSpawned: 0,
    prsCreated: 0,
    linesAdded: 0,
    linesRemoved: 0,
    estimatedCost: 0,
  };

  // Map database records to types
  const initiatives: Initiative[] = (initiativesData || []).map((i) => ({
    id: i.id,
    userId: i.user_id,
    name: i.name,
    slug: i.slug,
    description: i.description,
    maxAgents: i.max_agents,
    minAgents: i.min_agents,
    scalingPolicy: i.scaling_policy,
    defaultAgent: i.default_agent,
    defaultModel: i.default_model,
    allowedAgents: i.allowed_agents || [],
    triggers: i.triggers || [],
    status: i.status,
    repositories: [],
    stats: {
      running: Math.floor(Math.random() * i.max_agents * 0.5), // Placeholder
      queued: Math.floor(Math.random() * 20),
      completed: Math.floor(Math.random() * 1000),
      failed: Math.floor(Math.random() * 10),
    },
    createdAt: new Date(i.created_at),
    updatedAt: new Date(i.updated_at),
  }));

  const tasks: Task[] = (tasksData || []).map((t) => ({
    id: t.id,
    initiativeId: t.initiative_id,
    repositoryId: t.repository_id,
    prompt: t.prompt,
    type: t.type,
    priority: t.priority,
    status: t.status,
    assignedAgents: t.assigned_agents,
    progress: t.progress,
    eta: t.eta ? new Date(t.eta) : null,
    blackboxTaskId: t.blackbox_task_id,
    externalRef: t.external_ref_type
      ? {
          type: t.external_ref_type,
          id: t.external_ref_id,
          url: t.external_ref_url,
        }
      : undefined,
    result: t.result,
    artifacts: t.artifacts || [],
    dependsOn: t.depends_on || [],
    triggers: t.triggers || [],
    queuedAt: new Date(t.queued_at),
    startedAt: t.started_at ? new Date(t.started_at) : undefined,
    completedAt: t.completed_at ? new Date(t.completed_at) : undefined,
    createdAt: new Date(t.created_at),
    updatedAt: new Date(t.updated_at),
  }));

  const messages: AgentMessage[] = (messagesData || []).map((m) => ({
    id: m.id,
    fromInitiative: m.from_initiative_id,
    toInitiative: m.to_initiative_id,
    fromTask: m.from_task_id,
    toTask: m.to_task_id,
    type: m.type,
    subject: m.subject,
    body: m.body,
    metadata: m.metadata,
    suggestedActions: m.suggested_actions,
    read: m.read,
    timestamp: new Date(m.created_at),
  }));

  return {
    initiatives,
    tasks,
    messages,
    metrics: {
      liveAgents: initiatives.reduce((acc, i) => acc + i.stats.running, 0),
      agentCapacity: initiatives.reduce((acc, i) => acc + i.maxAgents, 0) || 100,
      revenueToday: todayMetrics.estimatedCost,
      deploysToday: todayMetrics.prsCreated,
      linesChanged: {
        added: todayMetrics.linesAdded,
        removed: todayMetrics.linesRemoved,
      },
      tasksTotal: todayMetrics.tasksCreated,
      tasksQueued: tasks.filter((t) => t.status === "queued").length,
    },
  };
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user?.id) {
    return null; // Layout handles redirect
  }

  const { initiatives, tasks, messages, metrics } = await getDashboardData(user.id);

  return (
    <div className="space-y-6">
      {/* Metrics Bar */}
      <MetricsBar metrics={metrics} />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <InitiativesList initiatives={initiatives} />

        {/* Right Column */}
        <TaskPipeline tasks={tasks} />
      </div>

      {/* Agent Messages */}
      <AgentMessages messages={messages} />
    </div>
  );
}
