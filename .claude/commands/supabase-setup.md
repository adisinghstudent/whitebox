# Supabase CLI Setup (macOS)

Fully terminal-driven Supabase workflow for macOS with Docker Desktop.

---

## 0. macOS Requirements

* **macOS 12+**
* **Homebrew**
* **Docker Desktop for Mac** (mandatory)

> "Local development uses Docker to run the Supabase stack." — Supabase Docs

---

## 1. Install Supabase CLI (macOS)

```bash
brew install supabase/tap/supabase
```

Verify:

```bash
supabase --version
```

> "The Supabase CLI is distributed via Homebrew on macOS." — Supabase Docs

---

## 2. Authenticate

```bash
supabase login
```

Browser opens → token stored in:

```
~/.supabase/access-token
```

---

## 3. Initialize Project

```bash
mkdir my-app && cd my-app
supabase init
```

Creates:

```
supabase/
  config.toml
  migrations/
```

---

## 4. Start Local Supabase (Docker Desktop)

```bash
supabase start
```

macOS runs:

* Postgres
* Auth
* Storage
* Realtime
* API Gateway

> "supabase start spins up the full local stack using Docker." — Supabase Docs

---

## 5. Create Cloud Project (From macOS CLI)

```bash
supabase projects create my-app
```

Then link:

```bash
supabase link --project-ref <PROJECT_REF>
```

---

## 6. Create & Apply Migrations

```bash
supabase migration new init_schema
```

Edit SQL:

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null
);
```

Apply locally:

```bash
supabase db reset
```

---

## 7. Push Migrations to Cloud

```bash
supabase db push
```

> "db push applies local migrations to the hosted database." — Supabase Docs

---

## 8. Get API Keys (macOS Terminal, No Dashboard)

### 8.1 Create Personal Access Token (one-time)

Supabase → Account Settings → PAT

---

### 8.2 Fetch Keys via Management API

```bash
curl -s \
  -H "Authorization: Bearer $SUPABASE_PAT" \
  https://api.supabase.com/v1/projects/<PROJECT_REF>/api-keys
```

Returns:

* **publishable key**
* **secret key (service_role equivalent)**

> "API keys are accessible via the Management API." — Supabase Docs

---

## 9. Export for macOS Shell

```bash
export SUPABASE_URL=https://<PROJECT_REF>.supabase.co
export SUPABASE_ANON_KEY=sb_publishable_...
export SUPABASE_SERVICE_KEY=sb_secret_...
```

---

## macOS Reality Check (Important)

* Docker Desktop runs **Linux containers under the hood**
* You operate entirely from **macOS Terminal**
* This is **exactly how Cursor, Blackbox, Vercel agents work locally**

> "macOS developers interact with Linux containers transparently via Docker." — Docker Docs

---

## Bottom Line

* ✅ macOS-native
* ✅ Homebrew + Docker Desktop
* ✅ Fully CLI-driven
* ✅ Agent-automatable
* ✅ No Linux machine required
