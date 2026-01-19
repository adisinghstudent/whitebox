import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";

type CookieToSet = {
  name: string;
  value: string;
  options?: Partial<ResponseCookie>;
};

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth error
  if (errorParam) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(errorDescription || errorParam)}`
    );
  }

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: CookieToSet[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // Exchange the code for a session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Error exchanging code for session:", error);
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }

    if (data.session) {
      // Get provider token (GitHub access token)
      const providerToken = data.session.provider_token;
      const providerRefreshToken = data.session.provider_refresh_token;

      if (providerToken) {
        // Fetch GitHub user info
        const githubResponse = await fetch("https://api.github.com/user", {
          headers: {
            Authorization: `Bearer ${providerToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        });

        if (githubResponse.ok) {
          const githubUser = await githubResponse.json();

          // Update user record with GitHub token and info using service role
          const supabaseAdmin = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
              cookies: {
                getAll() {
                  return cookieStore.getAll();
                },
                setAll(cookiesToSet: CookieToSet[]) {
                  cookiesToSet.forEach(({ name, value, options }) => {
                    cookieStore.set(name, value, options);
                  });
                },
              },
            }
          );

          const { error: updateError } = await supabaseAdmin
            .from("users")
            .update({
              github_token: providerToken,
              github_refresh_token: providerRefreshToken,
              github_username: githubUser.login,
              github_id: githubUser.id,
              name: githubUser.name || githubUser.login,
              avatar_url: githubUser.avatar_url,
              updated_at: new Date().toISOString(),
            })
            .eq("id", data.session.user.id);

          if (updateError) {
            console.error("Error updating user with GitHub info:", updateError);
          }
        }
      }

      // Redirect to dashboard
      const isLocalEnv = process.env.NODE_ENV === "development";
      const forwardedHost = request.headers.get("x-forwarded-host");

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${redirectTo}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${redirectTo}`);
      } else {
        return NextResponse.redirect(`${origin}${redirectTo}`);
      }
    }
  }

  // No code, redirect to login
  return NextResponse.redirect(`${origin}/login?error=No%20authentication%20code%20provided`);
}
