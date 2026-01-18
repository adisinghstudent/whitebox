import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createServerClient } from "@/lib/db/client";

// GET /api/initiatives/[id] - Get initiative details
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

    const { data: initiative, error } = await supabase
      .from("initiatives")
      .select(`
        *,
        initiative_repositories (
          repository_id,
          repositories (id, name, full_name, url, default_branch)
        )
      `)
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (error || !initiative) {
      return NextResponse.json({ error: "Initiative not found" }, { status: 404 });
    }

    // Get task stats for this initiative
    const { data: taskStats } = await supabase
      .from("tasks")
      .select("status")
      .eq("initiative_id", id);

    const stats = {
      running: taskStats?.filter((t) => t.status === "running").length || 0,
      queued: taskStats?.filter((t) => t.status === "queued").length || 0,
      completed: taskStats?.filter((t) => t.status === "completed").length || 0,
      failed: taskStats?.filter((t) => t.status === "failed").length || 0,
    };

    return NextResponse.json({ initiative: { ...initiative, stats } });
  } catch (error) {
    console.error("Error in GET /api/initiatives/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/initiatives/[id] - Update initiative
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
      .from("initiatives")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Initiative not found" }, { status: 404 });
    }

    // Build update object
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    const allowedFields = [
      "name",
      "description",
      "max_agents",
      "min_agents",
      "scaling_policy",
      "default_agent",
      "default_model",
      "allowed_agents",
      "triggers",
      "status",
    ];

    const fieldMapping: Record<string, string> = {
      maxAgents: "max_agents",
      minAgents: "min_agents",
      scalingPolicy: "scaling_policy",
      defaultAgent: "default_agent",
      defaultModel: "default_model",
      allowedAgents: "allowed_agents",
    };

    for (const [key, value] of Object.entries(body)) {
      const dbField = fieldMapping[key] || key;
      if (allowedFields.includes(dbField) && value !== undefined) {
        updates[dbField] = value;
      }
    }

    const { data: initiative, error } = await supabase
      .from("initiatives")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating initiative:", error);
      return NextResponse.json({ error: "Failed to update initiative" }, { status: 500 });
    }

    // Update repository links if provided
    if (body.repositoryIds !== undefined) {
      // Remove existing links
      await supabase
        .from("initiative_repositories")
        .delete()
        .eq("initiative_id", id);

      // Add new links
      if (body.repositoryIds.length > 0) {
        const repoLinks = body.repositoryIds.map((repoId: string) => ({
          initiative_id: id,
          repository_id: repoId,
        }));
        await supabase.from("initiative_repositories").insert(repoLinks);
      }
    }

    return NextResponse.json({ initiative });
  } catch (error) {
    console.error("Error in PUT /api/initiatives/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/initiatives/[id] - Delete initiative
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
      .from("initiatives")
      .select("id")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Initiative not found" }, { status: 404 });
    }

    // Delete initiative (cascades to related tables)
    const { error } = await supabase
      .from("initiatives")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting initiative:", error);
      return NextResponse.json({ error: "Failed to delete initiative" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in DELETE /api/initiatives/[id]:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
