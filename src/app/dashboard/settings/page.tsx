"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Github, Key, Check, AlertCircle, Loader2 } from "lucide-react";

interface UserProfile {
  github_token: string | null;
  github_username: string | null;
  github_connected_at: string | null;
}

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [githubToken, setGithubToken] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("users")
        .select("github_token, github_username, github_connected_at")
        .eq("id", user.id)
        .single();

      setProfile(data);
    } catch (err) {
      console.error("Error loading profile:", err);
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyAndSaveToken() {
    if (!githubToken.trim()) {
      setError("Please enter a GitHub token");
      return;
    }

    setIsVerifying(true);
    setError(null);
    setSuccess(null);

    try {
      // Verify the token with GitHub API
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        throw new Error("Invalid GitHub token. Please check and try again.");
      }

      const githubUser = await response.json();

      setIsSaving(true);

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: updateError } = await supabase
        .from("users")
        .update({
          github_token: githubToken,
          github_username: githubUser.login,
          github_connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile({
        github_token: githubToken,
        github_username: githubUser.login,
        github_connected_at: new Date().toISOString(),
      });
      setGithubToken("");
      setSuccess(`Successfully connected GitHub account: ${githubUser.login}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect GitHub");
    } finally {
      setIsVerifying(false);
      setIsSaving(false);
    }
  }

  async function disconnectGitHub() {
    setIsSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: updateError } = await supabase
        .from("users")
        .update({
          github_token: null,
          github_username: null,
          github_connected_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile({
        github_token: null,
        github_username: null,
        github_connected_at: null,
      });
      setSuccess("GitHub account disconnected");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground mb-2">Settings</h1>
      <p className="text-muted mb-8">
        Manage your account and integrations
      </p>

      {/* GitHub Integration */}
      <div className="bg-card p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-card-elevated rounded-lg flex items-center justify-center">
            <Github className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-medium text-foreground">GitHub Integration</h2>
            <p className="text-sm text-muted">
              Connect your GitHub account to enable agents to work on your repositories
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg flex items-center gap-2 text-sm text-error">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-success/10 border border-success/20 rounded-lg flex items-center gap-2 text-sm text-success">
            <Check className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}

        {profile?.github_username ? (
          // Connected state
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-success/5 border border-success/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-success/20 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Connected as @{profile.github_username}
                  </p>
                  <p className="text-xs text-muted">
                    Connected {profile.github_connected_at
                      ? new Date(profile.github_connected_at).toLocaleDateString()
                      : "recently"}
                  </p>
                </div>
              </div>
              <button
                onClick={disconnectGitHub}
                disabled={isSaving}
                className="px-4 py-2 text-sm text-error hover:bg-error/10 rounded-lg transition-colors disabled:opacity-50"
              >
                {isSaving ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>

            <div className="p-4 bg-card-elevated rounded-lg">
              <h3 className="text-sm font-medium text-foreground mb-2">What agents can do:</h3>
              <ul className="text-sm text-muted space-y-1">
                <li>• Read and clone your repositories</li>
                <li>• Create branches and commits</li>
                <li>• Open pull requests</li>
                <li>• Add comments to issues and PRs</li>
              </ul>
            </div>
          </div>
        ) : (
          // Not connected state
          <div className="space-y-4">
            <div className="p-4 bg-card-elevated rounded-lg">
              <h3 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Key className="w-4 h-4" />
                Personal Access Token
              </h3>
              <p className="text-sm text-muted mb-4">
                Create a{" "}
                <a
                  href="https://github.com/settings/tokens/new?description=Agent%20Command&scopes=repo,read:user"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline"
                >
                  Personal Access Token
                </a>{" "}
                with <code className="px-1 py-0.5 bg-background rounded text-xs">repo</code> and{" "}
                <code className="px-1 py-0.5 bg-background rounded text-xs">read:user</code> scopes.
              </p>

              <div className="flex gap-3">
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="flex-1 px-3 py-2.5 bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground font-mono text-sm"
                />
                <button
                  onClick={verifyAndSaveToken}
                  disabled={isVerifying || isSaving || !githubToken}
                  className="px-5 py-2.5 bg-foreground text-white font-normal hover:opacity-85 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Connect"
                  )}
                </button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>Your token is stored securely and only used to execute agent tasks on your behalf.</p>
            </div>
          </div>
        )}
      </div>

      {/* Account Section */}
      <div className="mt-6 bg-card p-8">
        <h2 className="text-lg font-medium text-foreground mb-4">Account</h2>
        <div className="space-y-3">
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="w-full py-2 text-sm text-error hover:bg-error/10 rounded-lg transition-colors text-left px-4"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
