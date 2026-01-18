import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createServerClient } from "@/lib/db/client";

// GET /api/repos/[id] - Get repository details
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
    const supabase = createServerClient();

    const { data: repository, error } = await supabase
      .from("repositories")
      .select(`
        *,
        initiative_repositories (
          initiative_id,
          initiatives (id, name, slug)
        )
      `)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (error || !repository) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    // Get task stats for this repository
    const { data: taskStats } = await supabase
      .from("tasks")
      .select("status")
      .eq("repository_id", id);

    const stats = {
      tasksCompleted: taskStats?.filter((t) => t.status === "completed").length || 0,
      tasksFailed: taskStats?.filter((t) => t.status === "failed").length || 0,
      tasksTotal: taskStats?.length || 0,
    };

    return NextResponse.json({ repository: { ...repository, stats } });
  } catch (error) {
    console.error("Error in GET /api/repos/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/repos/[id] - Update repository settings
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
    const { data: existing } = await supabase
      .from("repositories")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    // Build update object
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    const allowedFields = [
      "default_branch",
      "repo_instructions",
      "webhooks_enabled",
    ];

    const fieldMapping: Record<string, string> = {
      defaultBranch: "default_branch",
      repoInstructions: "repo_instructions",
      webhooksEnabled: "webhooks_enabled",
    };

    for (const [key, value] of Object.entries(body)) {
      const dbField = fieldMapping[key] || key;
      if (allowedFields.includes(dbField) && value !== undefined) {
        updates[dbField] = value;
      }
    }

    const { data: repository, error } = await supabase
      .from("repositories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating repository:", error);
      return NextResponse.json({ error: "Failed to update repository" }, { status: 500 });
    }

    return NextResponse.json({ repository });
  } catch (error) {
    console.error("Error in PUT /api/repos/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/repos/[id] - Disconnect repository
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
    const { data: existing } = await supabase
      .from("repositories")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Repository not found" }, { status: 404 });
    }

    // Remove from all initiatives first
    await supabase
      .from("initiative_repositories")
      .delete()
      .eq("repository_id", id);

    // Delete repository
    const { error } = await supabase
      .from("repositories")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting repository:", error);
      return NextResponse.json({ error: "Failed to disconnect repository" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/repos/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
