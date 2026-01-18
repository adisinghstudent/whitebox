import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createServerClient } from "@/lib/db/client";

// GET /api/initiatives - List all initiatives
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let query = supabase
      .from("initiatives")
      .select(`
        *,
        initiative_repositories (
          repository_id,
          repositories (id, name, full_name, url)
        )
      `)
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching initiatives:", error);
      return NextResponse.json({ error: "Failed to fetch initiatives" }, { status: 500 });
    }

    return NextResponse.json({ initiatives: data });
  } catch (error) {
    console.error("Error in GET /api/initiatives:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/initiatives - Create a new initiative
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      slug,
      description,
      maxAgents = 100,
      minAgents = 1,
      scalingPolicy = "auto",
      defaultAgent = "claude",
      defaultModel = "blackboxai/anthropic/claude-sonnet-4.5",
      allowedAgents = [],
      triggers = [],
      repositoryIds = [],
    } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    // Validate slug format
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: "Slug must contain only lowercase letters, numbers, and hyphens" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check slug uniqueness
    const { data: existingSlug } = await supabase
      .from("initiatives")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existingSlug) {
      return NextResponse.json(
        { error: "An initiative with this slug already exists" },
        { status: 400 }
      );
    }

    // Create initiative
    const { data: initiative, error: createError } = await supabase
      .from("initiatives")
      .insert({
        user_id: session.user.id,
        name,
        slug,
        description,
        max_agents: maxAgents,
        min_agents: minAgents,
        scaling_policy: scalingPolicy,
        default_agent: defaultAgent,
        default_model: defaultModel,
        allowed_agents: allowedAgents,
        triggers,
        status: "active",
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating initiative:", createError);
      return NextResponse.json(
        { error: "Failed to create initiative" },
        { status: 500 }
      );
    }

    // Link repositories if provided
    if (repositoryIds.length > 0) {
      const repoLinks = repositoryIds.map((repoId: string) => ({
        initiative_id: initiative.id,
        repository_id: repoId,
      }));

      await supabase.from("initiative_repositories").insert(repoLinks);
    }

    return NextResponse.json({ initiative }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/initiatives:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
