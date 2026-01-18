import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/db/client";
import crypto from "crypto";

// Verify webhook signature
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) return false;

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// POST /api/webhooks/blackbox - Handle Blackbox task completion webhooks
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const signature = request.headers.get("x-blackbox-signature");
    const webhookSecret = process.env.BLACKBOX_WEBHOOK_SECRET;

    // Verify signature if secret is configured
    if (webhookSecret && !verifyWebhookSignature(payload, signature, webhookSecret)) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(payload);
    const { event, task: blackboxTask } = body;

    console.log(`Received Blackbox webhook: ${event}`, blackboxTask?.id);

    if (!blackboxTask?.id) {
      return NextResponse.json({ error: "Missing task ID" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Find our task by Blackbox task ID
    const { data: task } = await supabase
      .from("tasks")
      .select("id, status, initiative_id")
      .eq("blackbox_task_id", blackboxTask.id)
      .single();

    if (!task) {
      console.log(`Task not found for Blackbox ID: ${blackboxTask.id}`);
      return NextResponse.json({ received: true, message: "Task not found" });
    }

    // Build update based on event type
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    switch (event) {
      case "task.started":
        updates.status = "running";
        updates.started_at = new Date().toISOString();
        break;

      case "task.progress":
        updates.progress = blackboxTask.progress || 0;
        if (blackboxTask.eta) {
          updates.eta = blackboxTask.eta;
        }
        break;

      case "task.completed":
        updates.status = "completed";
        updates.progress = 100;
        updates.completed_at = new Date().toISOString();
        updates.result = {
          success: true,
          prUrl: blackboxTask.prUrl,
          branchName: blackboxTask.branchName,
          diffStats: blackboxTask.diffStats,
          summary: blackboxTask.summary,
        };

        // Create agent message for completion
        await createCompletionMessage(supabase, task, blackboxTask);

        // Update metrics
        await updateMetrics(supabase, "completed", blackboxTask);
        break;

      case "task.failed":
        updates.status = "failed";
        updates.completed_at = new Date().toISOString();
        updates.error = blackboxTask.error || "Task failed";
        updates.result = {
          success: false,
          error: blackboxTask.error,
        };

        // Update metrics
        await updateMetrics(supabase, "failed", blackboxTask);
        break;

      case "task.cancelled":
        updates.status = "cancelled";
        updates.completed_at = new Date().toISOString();
        break;

      default:
        console.log(`Unknown event type: ${event}`);
    }

    // Update task
    await supabase.from("tasks").update(updates).eq("id", task.id);

    // Check for dependent tasks to trigger
    if (updates.status === "completed") {
      await triggerDependentTasks(supabase, task.id);
    }

    return NextResponse.json({ received: true, taskId: task.id });
  } catch (error) {
    console.error("Error in Blackbox webhook:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}

// Create completion message for agent messages feed
async function createCompletionMessage(
  supabase: ReturnType<typeof createServerClient>,
  task: { id: string; initiative_id: string },
  blackboxTask: { prUrl?: string; summary?: string; diffStats?: { added?: number; removed?: number } }
) {
  try {
    // Get initiative for message routing
    const { data: initiative } = await supabase
      .from("initiatives")
      .select("id, slug, name")
      .eq("id", task.initiative_id)
      .single();

    if (!initiative) return;

    const diffText = blackboxTask.diffStats
      ? `+${blackboxTask.diffStats.added || 0}/-${blackboxTask.diffStats.removed || 0} lines`
      : "";

    await supabase.from("agent_messages").insert({
      from_initiative_id: initiative.id,
      to_initiative_id: initiative.id, // Self-message for now
      from_task_id: task.id,
      type: "STATUS",
      subject: `Task completed: ${blackboxTask.summary?.substring(0, 50) || "Task finished"}`,
      body: blackboxTask.prUrl
        ? `PR created: ${blackboxTask.prUrl}. ${diffText}`
        : `Task completed successfully. ${diffText}`,
      metadata: {
        prUrl: blackboxTask.prUrl,
        diffStats: blackboxTask.diffStats,
      },
      suggested_actions: blackboxTask.prUrl
        ? [
            { label: "View PR", action: "open_url", params: { url: blackboxTask.prUrl } },
            { label: "Merge PR", action: "merge_pr", params: { url: blackboxTask.prUrl } },
          ]
        : null,
    });
  } catch (error) {
    console.error("Error creating completion message:", error);
  }
}

// Update hourly metrics
async function updateMetrics(
  supabase: ReturnType<typeof createServerClient>,
  status: "completed" | "failed",
  blackboxTask: { diffStats?: { added?: number; removed?: number; filesChanged?: number }; prUrl?: string }
) {
  try {
    const hour = new Date();
    hour.setMinutes(0, 0, 0);

    // Upsert metrics
    const { data: existing } = await supabase
      .from("metrics_hourly")
      .select("*")
      .eq("hour", hour.toISOString())
      .single();

    if (existing) {
      const updates: Record<string, number> = {};

      if (status === "completed") {
        updates.tasks_completed = (existing.tasks_completed || 0) + 1;
        if (blackboxTask.prUrl) {
          updates.prs_created = (existing.prs_created || 0) + 1;
        }
        if (blackboxTask.diffStats) {
          updates.lines_added = (existing.lines_added || 0) + (blackboxTask.diffStats.added || 0);
          updates.lines_removed = (existing.lines_removed || 0) + (blackboxTask.diffStats.removed || 0);
          updates.files_changed = (existing.files_changed || 0) + (blackboxTask.diffStats.filesChanged || 0);
        }
      } else {
        updates.tasks_failed = (existing.tasks_failed || 0) + 1;
      }

      await supabase.from("metrics_hourly").update(updates).eq("id", existing.id);
    } else {
      await supabase.from("metrics_hourly").insert({
        hour: hour.toISOString(),
        tasks_completed: status === "completed" ? 1 : 0,
        tasks_failed: status === "failed" ? 1 : 0,
        prs_created: blackboxTask.prUrl ? 1 : 0,
        lines_added: blackboxTask.diffStats?.added || 0,
        lines_removed: blackboxTask.diffStats?.removed || 0,
        files_changed: blackboxTask.diffStats?.filesChanged || 0,
      });
    }
  } catch (error) {
    console.error("Error updating metrics:", error);
  }
}

// Trigger dependent tasks
async function triggerDependentTasks(
  supabase: ReturnType<typeof createServerClient>,
  completedTaskId: string
) {
  try {
    // Find tasks that depend on this one
    const { data: dependentTasks } = await supabase
      .from("tasks")
      .select("id, depends_on, status")
      .contains("depends_on", [completedTaskId])
      .eq("status", "queued");

    if (!dependentTasks?.length) return;

    for (const depTask of dependentTasks) {
      // Check if all dependencies are completed
      const deps = depTask.depends_on || [];
      const { data: completedDeps } = await supabase
        .from("tasks")
        .select("id")
        .in("id", deps)
        .eq("status", "completed");

      if (completedDeps?.length === deps.length) {
        // All dependencies completed, mark as assigned (ready to run)
        await supabase
          .from("tasks")
          .update({ status: "assigned", updated_at: new Date().toISOString() })
          .eq("id", depTask.id);

        console.log(`Triggered dependent task: ${depTask.id}`);
      }
    }
  } catch (error) {
    console.error("Error triggering dependent tasks:", error);
  }
}
