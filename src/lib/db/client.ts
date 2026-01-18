import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client with service role key
export function createServerClient() {
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Database types for Supabase
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      repositories: {
        Row: {
          id: string;
          user_id: string;
          url: string;
          provider: string;
          name: string;
          full_name: string;
          default_branch: string;
          installation_id: string | null;
          repo_instructions: string | null;
          webhooks_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          url: string;
          provider: string;
          name: string;
          full_name: string;
          default_branch?: string;
          installation_id?: string | null;
          repo_instructions?: string | null;
          webhooks_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          url?: string;
          provider?: string;
          name?: string;
          full_name?: string;
          default_branch?: string;
          installation_id?: string | null;
          repo_instructions?: string | null;
          webhooks_enabled?: boolean;
          updated_at?: string;
        };
      };
      initiatives: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          slug: string;
          description: string | null;
          max_agents: number;
          min_agents: number;
          scaling_policy: string;
          default_agent: string;
          default_model: string;
          allowed_agents: unknown;
          triggers: unknown;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          slug: string;
          description?: string | null;
          max_agents?: number;
          min_agents?: number;
          scaling_policy?: string;
          default_agent?: string;
          default_model?: string;
          allowed_agents?: unknown;
          triggers?: unknown;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          max_agents?: number;
          min_agents?: number;
          scaling_policy?: string;
          default_agent?: string;
          default_model?: string;
          allowed_agents?: unknown;
          triggers?: unknown;
          status?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          initiative_id: string;
          repository_id: string | null;
          prompt: string;
          type: string;
          priority: string;
          status: string;
          assigned_agents: number;
          progress: number;
          eta: string | null;
          blackbox_task_id: string | null;
          external_ref_type: string | null;
          external_ref_id: string | null;
          external_ref_url: string | null;
          result: unknown | null;
          artifacts: unknown;
          error: string | null;
          depends_on: string[] | null;
          triggers: string[] | null;
          queued_at: string;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          initiative_id: string;
          repository_id?: string | null;
          prompt: string;
          type: string;
          priority?: string;
          status?: string;
          assigned_agents?: number;
          progress?: number;
          eta?: string | null;
          blackbox_task_id?: string | null;
          external_ref_type?: string | null;
          external_ref_id?: string | null;
          external_ref_url?: string | null;
          result?: unknown | null;
          artifacts?: unknown;
          error?: string | null;
          depends_on?: string[] | null;
          triggers?: string[] | null;
          queued_at?: string;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          initiative_id?: string;
          repository_id?: string | null;
          prompt?: string;
          type?: string;
          priority?: string;
          status?: string;
          assigned_agents?: number;
          progress?: number;
          eta?: string | null;
          blackbox_task_id?: string | null;
          external_ref_type?: string | null;
          external_ref_id?: string | null;
          external_ref_url?: string | null;
          result?: unknown | null;
          artifacts?: unknown;
          error?: string | null;
          depends_on?: string[] | null;
          triggers?: string[] | null;
          started_at?: string | null;
          completed_at?: string | null;
          updated_at?: string;
        };
      };
      agent_messages: {
        Row: {
          id: string;
          from_initiative_id: string;
          to_initiative_id: string;
          from_task_id: string | null;
          to_task_id: string | null;
          type: string;
          subject: string;
          body: string | null;
          metadata: unknown | null;
          suggested_actions: unknown | null;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_initiative_id: string;
          to_initiative_id: string;
          from_task_id?: string | null;
          to_task_id?: string | null;
          type: string;
          subject: string;
          body?: string | null;
          metadata?: unknown | null;
          suggested_actions?: unknown | null;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          read?: boolean;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          status: string;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_id?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          status?: string;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          plan_id?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          status?: string;
          cancel_at_period_end?: boolean;
          updated_at?: string;
        };
      };
    };
  };
};
