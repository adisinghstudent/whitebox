-- Tasks
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id UUID REFERENCES initiatives(id) ON DELETE CASCADE,
  repository_id UUID REFERENCES repositories(id) ON DELETE SET NULL,

  -- Definition
  prompt TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium',

  -- Execution
  status VARCHAR(50) DEFAULT 'queued',
  assigned_agents INT DEFAULT 0,
  progress INT DEFAULT 0,
  eta TIMESTAMP WITH TIME ZONE,

  -- Blackbox Integration
  blackbox_task_id VARCHAR(255),

  -- External Reference
  external_ref_type VARCHAR(50),
  external_ref_id VARCHAR(255),
  external_ref_url VARCHAR(500),

  -- Results
  result JSONB,
  artifacts JSONB DEFAULT '[]',
  error TEXT,

  -- Chaining
  depends_on UUID[],
  triggers UUID[],

  -- Timestamps
  queued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Task policies (through initiative ownership)
CREATE POLICY "Users can read own tasks" ON tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM initiatives
      WHERE initiatives.id = tasks.initiative_id
      AND initiatives.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM initiatives
      WHERE initiatives.id = tasks.initiative_id
      AND initiatives.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM initiatives
      WHERE initiatives.id = tasks.initiative_id
      AND initiatives.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM initiatives
      WHERE initiatives.id = tasks.initiative_id
      AND initiatives.user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_tasks_initiative ON tasks(initiative_id);
CREATE INDEX idx_tasks_repository ON tasks(repository_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_queued_at ON tasks(queued_at);
CREATE INDEX idx_tasks_blackbox ON tasks(blackbox_task_id);
