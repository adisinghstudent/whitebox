import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createServerClient } from "@/lib/db/client";
import { createBlackboxClient } from "@/lib/blackbox";

// GET /api/tasks/[id] - Get task details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const sync = searchParams.get("sync") === "true";

    const supabase = createServerClient();

    // Get task with initiative info
    const { data: task, error } = await supabase
      .from("tasks")
      .select(`
        *,
        initiatives (id, name, slug, user_id),
        repositories (id, name, full_name, url)
      `)
      .eq("id", id)
      .single();

    if (error || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Verify ownership through initiative
    if (task.initiatives?.user_id !== session.user.id) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Sync with Blackbox if task is running and sync is requested
    if (sync && task.blackbox_task_id && ["running", "assigned"].includes(task.status)) {
      try {
        const blackbox = createBlackboxClient();
        const blackboxTask = await blackbox.getTask(task.blackbox_task_id);

        // Map Blackbox status to our status
        const statusMap: Record<string, string> = {
          pending: "assigned",
          running: "running",
          completed: "completed",
          failed: "failed",
          cancelled: "cancelled",
        };

        const newStatus = statusMap[blackboxTask.status] || task.status;
        const updates: Record<string, unknown> = {
          status: newStatus,
          progress: blackboxTask.progress || 0,
          updated_at: new Date().toISOString(),
        };

        // Handle completion
        if (["completed", "failed", "cancelled"].includes(newStatus)) {
          updates.completed_at = new Date().toISOString();

          if (blackboxTask.status === "completed") {
            updates.result = {
              success: true,
              prUrl: blackboxTask.prUrl,
              branchName: blackboxTask.branchName,
              diffStats: blackboxTask.diffStats,
              summary: blackboxTask.logs?.[blackboxTask.logs.length - 1],
            };
          } else if (blackboxTask.status === "failed") {
            updates.error = blackboxTask.error || "Task failed";
            updates.result = { success: false, error: blackboxTask.error };
          }
        }

        // Update task in database
        await supabase.from("tasks").update(updates).eq("id", id);

        // Merge updates into response
        Object.assign(task, updates);
      } catch (syncError) {
        console.error("Error syncing with Blackbox:", syncError);
        // Don't fail the request, just return cached data
      }
    }

    // Get task cost if exists
    const { data: taskCost } = await supabase
      .from("task_costs")
      .select("*")
      .eq("task_id", id)
      .single();

    return NextResponse.json({ task: { ...task, cost: taskCost } });
  } catch (error) {
    console.error("Error in GET /api/tasks/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/tasks/[id] - Update task
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const supabase = createServerClient();

    // Verify ownership
    const { data: existingTask } = await supabase
      .from("tasks")
      .select(`
        id,
        initiatives (user_id)
      `)
      .eq("id", id)
      .single();

    if (!existingTask || existingTask.initiatives?.user_id !== session.user.id) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Build update object
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    const allowedFields = [
      "priority",
      "status",
      "assigned_agents",
      "progress",
      "eta",
      "result",
      "artifacts",
      "error",
    ];

    const fieldMapping: Record<string, string> = {
      assignedAgents: "assigned_agents",
    };

    for (const [key, value] of Object.entries(body)) {
      const dbField = fieldMapping[key] || key;
      if (allowedFields.includes(dbField) && value !== undefined) {
        updates[dbField] = value;
      }
    }

    // Handle status transitions
    if (body.status === "running" && !updates.started_at) {
      updates.started_at = new Date().toISOString();
    }
    if (["completed", "failed", "cancelled"].includes(body.status) && !updates.completed_at) {
      updates.completed_at = new Date().toISOString();
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating task:", error);
      return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
    }

    return NextResponse.json({ task });
  } catch (error) {
    console.error("Error in PUT /api/tasks/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/tasks/[id] - Cancel/delete task
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createServerClient();

    // Verify ownership
    const { data: existingTask } = await supabase
      .from("tasks")
      .select(`
        id,
        status,
        initiatives (user_id)
      `)
      .eq("id", id)
      .single();

    if (!existingTask || existingTask.initiatives?.user_id !== session.user.id) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // If task is running, cancel it instead of deleting
    if (existingTask.status === "running") {
      const { error } = await supabase
        .from("tasks")
        .update({
          status: "cancelled",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        console.error("Error cancelling task:", error);
        return NextResponse.json({ error: "Failed to cancel task" }, { status: 500 });
      }

      return NextResponse.json({ success: true, action: "cancelled" });
    }

    // Delete task if not running
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting task:", error);
      return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
    }

    return NextResponse.json({ success: true, action: "deleted" });
  } catch (error) {
    console.error("Error in DELETE /api/tasks/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
