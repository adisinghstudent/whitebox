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
      // Direct task creation (simple mode)
      repoUrl,
      branch = "main",
      prompt,
      type = "custom",
      agent = "claude",
      model,
      // Review options
      focus,
      // Docs options
      docsType,
      // Tests options
      testType,
      target,
      // Advanced mode
      initiativeId,
      repositoryId,
      priority = "medium",
    } = body;

    const supabase = createServerClient();

    // Get user profile including GitHub token
    const { data: userProfile } = await supabase
      .from("users")
      .select("github_token, github_username")
      .eq("id", session.user.id)
      .single();

    if (!userProfile?.github_token) {
      return NextResponse.json(
        { error: "GitHub connection required. Please connect your GitHub account." },
        { status: 400 }
      );
    }

    // Build prompt based on task type
    let finalPrompt = prompt || "";
    if (type === "review") {
      const focusMap: Record<string, string> = {
        security: "Focus on security vulnerabilities, auth issues, injection attacks, hardcoded secrets.",
        performance: "Focus on algorithm efficiency, N+1 queries, memory leaks, caching opportunities.",
        quality: "Focus on code organization, SOLID principles, DRY violations, naming conventions.",
        all: "Comprehensive review covering security, performance, and code quality.",
      };
      finalPrompt = `Code Review: ${focusMap[focus || "all"]}`;
    } else if (type === "docs") {
      const docsMap: Record<string, string> = {
        readme: "Generate a comprehensive README with installation, usage, configuration, and examples.",
        api: "Generate API documentation with all endpoints, request/response schemas, and auth details.",
        full: "Generate full documentation including README, API docs, and architecture guide.",
        changelog: "Generate a CHANGELOG following Keep a Changelog format.",
      };
      finalPrompt = `Documentation: ${docsMap[docsType || "readme"]}`;
    } else if (type === "tests") {
      const testMap: Record<string, string> = {
        unit: "Generate unit tests with happy path, edge cases, and error handling coverage.",
        integration: "Generate integration tests for component interactions and API testing.",
        e2e: "Generate end-to-end tests for critical user journeys.",
      };
      finalPrompt = `Test Generation: ${testMap[testType || "unit"]}${target ? ` Target: ${target}` : ""}`;
    }

    if (!finalPrompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    // Get or create default initiative for the user
    let taskInitiativeId = initiativeId;
    if (!taskInitiativeId) {
      // Check for existing default initiative
      const { data: existingInitiative } = await supabase
        .from("initiatives")
        .select("id")
        .eq("user_id", session.user.id)
        .eq("slug", "default")
        .single();

      if (existingInitiative) {
        taskInitiativeId = existingInitiative.id;
      } else {
        // Create default initiative
        const { data: newInitiative, error: initError } = await supabase
          .from("initiatives")
          .insert({
            user_id: session.user.id,
            name: "Default",
            slug: "default",
            description: "Default initiative for quick tasks",
            default_agent: agent,
            default_model: model || "blackboxai/anthropic/claude-sonnet-4.5",
          })
          .select()
          .single();

        if (initError) {
          console.error("Error creating default initiative:", initError);
          return NextResponse.json({ error: "Failed to create initiative" }, { status: 500 });
        }
        taskInitiativeId = newInitiative.id;
      }
    }

    // Create task record
    const { data: task, error: createError } = await supabase
      .from("tasks")
      .insert({
        initiative_id: taskInitiativeId,
        repository_id: repositoryId || null,
        prompt: finalPrompt,
        type,
        priority,
        status: "running",
        assigned_agents: 1,
        progress: 0,
        queued_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating task:", createError);
      return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
    }

    // Execute task through Blackbox API
    try {
      const blackbox = createBlackboxClient();

      const blackboxResult = await blackbox.createTask({
        prompt: finalPrompt,
        repoUrl,
        selectedBranch: branch,
        selectedAgent: agent as "claude" | "codex" | "gemini" | "blackbox",
        selectedModel: model,
        environmentVariables: {
          GITHUB_TOKEN: userProfile.github_token,
        },
      });

      // Update task with Blackbox task ID
      await supabase
        .from("tasks")
        .update({
          blackbox_task_id: blackboxResult.taskId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.id);

      task.blackbox_task_id = blackboxResult.taskId;

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

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/tasks:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
