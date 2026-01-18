import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createServerClient } from "@/lib/db/client";

// GET /api/repos - List connected repositories
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("repositories")
      .select(`
        *,
        initiative_repositories (
          initiative_id,
          initiatives (id, name, slug)
        )
      `)
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching repositories:", error);
      return NextResponse.json({ error: "Failed to fetch repositories" }, { status: 500 });
    }

    return NextResponse.json({ repositories: data });
  } catch (error) {
    console.error("Error in GET /api/repos:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/repos - Connect a new repository
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      url,
      provider = "github",
      name,
      fullName,
      defaultBranch = "main",
      installationId,
      repoInstructions,
    } = body;

    if (!url || !name || !fullName) {
      return NextResponse.json(
        { error: "URL, name, and fullName are required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Check if repo already connected
    const { data: existingRepo } = await supabase
      .from("repositories")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("url", url)
      .single();

    if (existingRepo) {
      return NextResponse.json(
        { error: "Repository already connected" },
        { status: 400 }
      );
    }

    // Create repository
    const { data: repository, error: createError } = await supabase
      .from("repositories")
      .insert({
        user_id: session.user.id,
        url,
        provider,
        name,
        full_name: fullName,
        default_branch: defaultBranch,
        installation_id: installationId,
        repo_instructions: repoInstructions,
        webhooks_enabled: false,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating repository:", createError);
      return NextResponse.json({ error: "Failed to connect repository" }, { status: 500 });
    }

    return NextResponse.json({ repository }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/repos:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
