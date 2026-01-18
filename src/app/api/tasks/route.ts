import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createServerClient } from "@/lib/db/client";
import { createBlackboxClient } from "@/lib/blackbox";

// GET /api/tasks - List tasks
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const initiativeId = searchParams.get("initiativeId");
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get user's initiatives to filter tasks
    const { data: userInitiatives } = await supabase
      .from("initiatives")
      .select("id")
      .eq("user_id", session.user.id);

    const initiativeIds = userInitiatives?.map((i) => i.id) || [];

    if (initiativeIds.length === 0) {
      return NextResponse.json({ tasks: [], total: 0 });
    }

    let query = supabase
      .from("tasks")
      .select(`
        *,
        initiatives (id, name, slug)
      `, { count: "exact" })
      .in("initiative_id", initiativeIds)
      .order("queued_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (initiativeId) {
      query = query.eq("initiative_id", initiativeId);
    }

    if (status) {
      const statuses = status.split(",");
      query = query.in("status", statuses);
    }

    if (priority) {
      query = query.eq("priority", priority);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching tasks:", error);
      return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
    }

    return NextResponse.json({ tasks: data, total: count });
  } catch (error) {
    console.error("Error in GET /api/tasks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      initiativeId,
      repositoryId,
      prompt,
      type = "custom",
      priority = "medium",
      externalRef,
      dependsOn = [],
      triggers = [],
      executeNow = true, // Default to executing immediately
    } = body;

    if (!initiativeId || !prompt) {
      return NextResponse.json(
        { error: "Initiative ID and prompt are required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Get user profile including GitHub token
    const { data: userProfile } = await supabase
      .from("users")
      .select("github_token, github_username")
      .eq("id", session.user.id)
      .single();

    // Verify initiative ownership and get agent config
    const { data: initiative } = await supabase
      .from("initiatives")
      .select("id, user_id, default_agent, default_model")
      .eq("id", initiativeId)
      .eq("user_id", session.user.id)
      .single();

    if (!initiative) {
      return NextResponse.json({ error: "Initiative not found" }, { status: 404 });
    }

    // Get repository URL if specified
    let repoUrl: string | undefined;
    let repoBranch = "main";
    let repoInstructions: string | undefined;

    if (repositoryId) {
      const { data: repo } = await supabase
        .from("repositories")
        .select("url, default_branch, repo_instructions")
        .eq("id", repositoryId)
        .single();

      if (repo) {
        repoUrl = repo.url;
        repoBranch = repo.default_branch || "main";
        repoInstructions = repo.repo_instructions || undefined;

        // Require GitHub token for repo-based tasks
        if (!userProfile?.github_token) {
          return NextResponse.json(
            { error: "GitHub connection required. Please connect your GitHub account in Settings." },
            { status: 400 }
          );
        }
      }
    }

    // Create task record first
    const taskData: Record<string, unknown> = {
      initiative_id: initiativeId,
      prompt,
      type,
      priority,
      status: executeNow ? "assigned" : "queued",
      assigned_agents: executeNow ? 1 : 0,
      progress: 0,
      depends_on: dependsOn,
      triggers,
      queued_at: new Date().toISOString(),
    };

    if (repositoryId) {
      taskData.repository_id = repositoryId;
    }

    if (externalRef) {
      taskData.external_ref_type = externalRef.type;
      taskData.external_ref_id = externalRef.id;
      taskData.external_ref_url = externalRef.url;
    }

    const { data: task, error: createError } = await supabase
      .from("tasks")
      .insert(taskData)
      .select()
      .single();

    if (createError) {
      console.error("Error creating task:", createError);
      return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
    }

    // Execute task through Blackbox API if executeNow is true
    if (executeNow) {
      try {
        const blackbox = createBlackboxClient();

        const blackboxTask = await blackbox.createTask({
          prompt,
          repoUrl,
          selectedBranch: repoBranch,
          selectedAgent: initiative.default_agent as "claude" | "codex" | "gemini" | "blackbox",
          selectedModel: initiative.default_model,
          repoInstructions,
          // Pass user's GitHub token for repo access
          githubToken: userProfile?.github_token || undefined,
        });

        // Update task with Blackbox task ID and mark as running
        await supabase
          .from("tasks")
          .update({
            blackbox_task_id: blackboxTask.id,
            status: "running",
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", task.id);

        task.blackbox_task_id = blackboxTask.id;
        task.status = "running";
        task.started_at = new Date().toISOString();

      } catch (blackboxError) {
        console.error("Error executing task via Blackbox:", blackboxError);

        // Update task to failed status
        await supabase
          .from("tasks")
          .update({
            status: "failed",
            error: blackboxError instanceof Error ? blackboxError.message : "Failed to execute task",
            updated_at: new Date().toISOString(),
          })
          .eq("id", task.id);

        task.status = "failed";
        task.error = blackboxError instanceof Error ? blackboxError.message : "Failed to execute task";
      }
    }

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/tasks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
