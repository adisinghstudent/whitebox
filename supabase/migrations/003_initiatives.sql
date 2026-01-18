-- Initiatives (Agent Pools)
CREATE TABLE initiatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) NOT NULL,
  description TEXT,

  -- Capacity
  max_agents INT DEFAULT 100,
  min_agents INT DEFAULT 1,
  scaling_policy VARCHAR(50) DEFAULT 'auto',

  -- Agent Config
  default_agent VARCHAR(50) DEFAULT 'claude',
  default_model VARCHAR(100) DEFAULT 'blackboxai/anthropic/claude-sonnet-4.5',
  allowed_agents JSONB DEFAULT '[]',

  -- Triggers
  triggers JSONB DEFAULT '[]',

  -- Status
  status VARCHAR(50) DEFAULT 'active',

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique slug per user
  UNIQUE(user_id, slug)
);

-- Junction table for initiative-repository relationships
CREATE TABLE initiative_repositories (
  initiative_id UUID REFERENCES initiatives(id) ON DELETE CASCADE,
  repository_id UUID REFERENCES repositories(id) ON DELETE CASCADE,
  PRIMARY KEY (initiative_id, repository_id)
);

-- Enable RLS
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiative_repositories ENABLE ROW LEVEL SECURITY;

-- Initiative policies
CREATE POLICY "Users can read own initiatives" ON initiatives
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own initiatives" ON initiatives
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own initiatives" ON initiatives
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own initiatives" ON initiatives
  FOR DELETE USING (auth.uid() = user_id);

-- Initiative repositories policies
CREATE POLICY "Users can manage initiative_repositories" ON initiative_repositories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM initiatives
      WHERE initiatives.id = initiative_repositories.initiative_id
      AND initiatives.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_initiatives_user ON initiatives(user_id);
CREATE INDEX idx_initiatives_status ON initiatives(status);
CREATE INDEX idx_initiatives_slug ON initiatives(slug);
CREATE INDEX idx_initiative_repos_initiative ON initiative_repositories(initiative_id);
CREATE INDEX idx_initiative_repos_repository ON initiative_repositories(repository_id);
