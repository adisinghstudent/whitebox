# Agent Command - Supabase Project

## Project Details

| Field | Value |
|-------|-------|
| **Project Name** | agent-command |
| **Project Ref** | `vvrltvqhighozvtpitmi` |
| **Organization** | Adi's Companies |
| **Org ID** | `vercel_icfg_2LTiQCYNRFnx7DPZ3rE7RBqH` |
| **Region** | us-east-1 |
| **URL** | https://vvrltvqhighozvtpitmi.supabase.co |
| **Dashboard** | https://supabase.com/dashboard/project/vvrltvqhighozvtpitmi |

## Environment Variables

```bash
# Add to .env.local
NEXT_PUBLIC_SUPABASE_URL=https://vvrltvqhighozvtpitmi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2cmx0dnFoaWdob3p2dHBpdG1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NzQwMTEsImV4cCI6MjA4NDM1MDAxMX0.ipiOwRg4FDQQilviDUT23th7rvS6cCwq50vathsG1Cw
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2cmx0dnFoaWdob3p2dHBpdG1pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODc3NDAxMSwiZXhwIjoyMDg0MzUwMDExfQ.u7Beqeb1c0znKiUegJTg2Z2dP_BIVnhnbLMQriaUido
```

## Auth Configuration

- **Site URL**: http://localhost:3001
- **Redirect URLs**: http://localhost:3001/**
- **GitHub OAuth**: Enabled
- **GitHub Callback URL**: https://vvrltvqhighozvtpitmi.supabase.co/auth/v1/callback

### GitHub OAuth App

- **GitHub App Settings**: https://github.com/settings/applications
- **Client ID**: `Ov23liCsbhY6AeCW0evV`
- **Client Secret**: `373c94248d528631251c9fe7f68265056b67ad88`

### GitHub OAuth App Setup Instructions

1. Go to: https://github.com/settings/applications/new
2. Fill in the form:
   - **Application name**: `Agent Command`
   - **Homepage URL**: `http://localhost:3001`
   - **Authorization callback URL**: `https://vvrltvqhighozvtpitmi.supabase.co/auth/v1/callback`
3. Click **Register application**
4. On the next page:
   - Copy the **Client ID** (shown at top)
   - Click **Generate a new client secret**
   - Copy the **Client Secret** (only shown once)
5. Configure in Supabase Dashboard > Authentication > Providers > GitHub
   - Or use Management API:
   ```bash
   curl -X PATCH "https://api.supabase.com/v1/projects/vvrltvqhighozvtpitmi/config/auth" \
     -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"external_github_enabled": true, "external_github_client_id": "YOUR_CLIENT_ID", "external_github_secret": "YOUR_SECRET"}'
   ```

## Database Schema

Migrations applied:
1. `001_users.sql` - Users table with GitHub integration fields
2. `002_repositories.sql` - Repository management
3. `003_initiatives.sql` - Agent pools/initiatives
4. `004_tasks.sql` - Task queue and execution
5. `005_messages.sql` - Agent messages and metrics
6. `006_billing.sql` - Plans, subscriptions, usage tracking
7. `007_fix_user_trigger.sql` - Fixed user creation trigger

## CLI Commands

```bash
# Link project
supabase link --project-ref vvrltvqhighozvtpitmi

# Push migrations
supabase db push

# Check migration status
supabase migration list

# Generate TypeScript types
supabase gen types typescript --project-id vvrltvqhighozvtpitmi > src/lib/db/types.ts
```

## Management API

Access token: Set `SUPABASE_ACCESS_TOKEN` environment variable

```bash
# Get project info
curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/vvrltvqhighozvtpitmi" | jq '.'

# Get API keys
curl -s -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  "https://api.supabase.com/v1/projects/vvrltvqhighozvtpitmi/api-keys" | jq '.'

# Update auth config
curl -s -X PATCH \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.supabase.com/v1/projects/vvrltvqhighozvtpitmi/config/auth" \
  -d '{"site_url":"http://localhost:3001"}'
```

## Production Checklist

Before deploying to production:

1. Update Site URL to production domain
2. Add production domain to redirect URLs
3. Disable email auto-confirm
4. Set up SMTP for email sending
5. Configure RLS policies for all tables
6. Set up database backups
7. Add monitoring and alerts
