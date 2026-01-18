import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createServerClient } from "@/lib/db/client";

// GET /api/messages - List agent messages
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    const initiativeId = searchParams.get("initiativeId");
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get user's initiatives
    const { data: userInitiatives } = await supabase
      .from("initiatives")
      .select("id")
      .eq("user_id", session.user.id);

    const initiativeIds = userInitiatives?.map((i) => i.id) || [];

    if (initiativeIds.length === 0) {
      return NextResponse.json({ messages: [], total: 0 });
    }

    let query = supabase
      .from("agent_messages")
      .select(`
        *,
        from_initiative:initiatives!agent_messages_from_initiative_id_fkey (id, name, slug),
        to_initiative:initiatives!agent_messages_to_initiative_id_fkey (id, name, slug)
      `, { count: "exact" })
      .or(`from_initiative_id.in.(${initiativeIds.join(",")}),to_initiative_id.in.(${initiativeIds.join(",")})`)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (initiativeId) {
      query = query.or(`from_initiative_id.eq.${initiativeId},to_initiative_id.eq.${initiativeId}`);
    }

    if (unreadOnly) {
      query = query.eq("read", false);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching messages:", error);
      return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
    }

    return NextResponse.json({ messages: data, total: count });
  } catch (error) {
    console.error("Error in GET /api/messages:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/messages - Create a new message (internal use)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      fromInitiativeId,
      toInitiativeId,
      fromTaskId,
      toTaskId,
      type,
      subject,
      body: messageBody,
      metadata,
      suggestedActions,
    } = body;

    if (!type || !subject) {
      return NextResponse.json(
        { error: "Type and subject are required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Verify initiative ownership
    const initiativeIds = [fromInitiativeId, toInitiativeId].filter(Boolean);
    if (initiativeIds.length > 0) {
      const { data: initiatives } = await supabase
        .from("initiatives")
        .select("id")
        .eq("user_id", session.user.id)
        .in("id", initiativeIds);

      if (initiatives?.length !== initiativeIds.length) {
        return NextResponse.json({ error: "Initiative not found" }, { status: 404 });
      }
    }

    const { data: message, error: createError } = await supabase
      .from("agent_messages")
      .insert({
        from_initiative_id: fromInitiativeId,
        to_initiative_id: toInitiativeId,
        from_task_id: fromTaskId,
        to_task_id: toTaskId,
        type,
        subject,
        body: messageBody,
        metadata,
        suggested_actions: suggestedActions,
        read: false,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating message:", createError);
      return NextResponse.json({ error: "Failed to create message" }, { status: 500 });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Error in POST /api/messages:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
