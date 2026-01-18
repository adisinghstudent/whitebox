-- Repositories
CREATE TABLE repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  full_name VARCHAR(500) NOT NULL,
  default_branch VARCHAR(100) DEFAULT 'main',
  installation_id VARCHAR(255),
  repo_instructions TEXT,
  webhooks_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can read own repositories" ON repositories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own repositories" ON repositories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own repositories" ON repositories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own repositories" ON repositories
  FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_repositories_user ON repositories(user_id);
CREATE INDEX idx_repositories_provider ON repositories(provider);
CREATE UNIQUE INDEX idx_repositories_url ON repositories(user_id, url);
