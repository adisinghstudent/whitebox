import { cookies } from "next/headers";
import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";

// Create Supabase client for server components
export async function createAuthClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Component - ignore
          }
        },
      },
    }
  );
}

// Get current session
export async function getSession() {
  const supabase = await createAuthClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// Get current user with profile data
export async function getCurrentUser() {
  const session = await getSession();
  if (!session?.user) return null;

  const supabase = await createAuthClient();

  // Get user profile from our users table
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", session.user.id)
    .single();

  return {
    ...session.user,
    profile,
  };
}

// Require authentication - throws if not authenticated
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

// Session type for components
export interface AuthUser {
  id: string;
  email?: string;
  name?: string | null;
  avatarUrl?: string | null;
  profile?: {
    id: string;
    email: string;
    name: string | null;
    avatar_url: string | null;
    github_token: string | null;
    github_username: string | null;
    created_at: string;
    updated_at: string;
  } | null;
}
