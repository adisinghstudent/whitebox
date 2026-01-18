-- Agent Messages
CREATE TABLE agent_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  from_initiative_id UUID REFERENCES initiatives(id) ON DELETE CASCADE,
  to_initiative_id UUID REFERENCES initiatives(id) ON DELETE CASCADE,
  from_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  to_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,

  type VARCHAR(50) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  body TEXT,
  metadata JSONB,
  suggested_actions JSONB,

  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Metrics & Analytics
CREATE TABLE metrics_hourly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  hour TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Counts
  tasks_created INT DEFAULT 0,
  tasks_completed INT DEFAULT 0,
  tasks_failed INT DEFAULT 0,
  agents_spawned INT DEFAULT 0,
  prs_created INT DEFAULT 0,

  -- Code Stats
  lines_added INT DEFAULT 0,
  lines_removed INT DEFAULT 0,
  files_changed INT DEFAULT 0,

  -- Cost
  estimated_cost DECIMAL(10, 2) DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Unique per user per hour
  UNIQUE(user_id, hour)
);

-- Enable RLS
ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE metrics_hourly ENABLE ROW LEVEL SECURITY;

-- Message policies (through initiative ownership)
CREATE POLICY "Users can read own messages" ON agent_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM initiatives
      WHERE (initiatives.id = agent_messages.from_initiative_id
          OR initiatives.id = agent_messages.to_initiative_id)
      AND initiatives.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own messages" ON agent_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM initiatives
      WHERE initiatives.id = agent_messages.from_initiative_id
      AND initiatives.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own messages" ON agent_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM initiatives
      WHERE initiatives.id = agent_messages.to_initiative_id
      AND initiatives.user_id = auth.uid()
    )
  );

-- Metrics policies
CREATE POLICY "Users can read own metrics" ON metrics_hourly
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metrics" ON metrics_hourly
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own metrics" ON metrics_hourly
  FOR UPDATE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_messages_from_initiative ON agent_messages(from_initiative_id);
CREATE INDEX idx_messages_to_initiative ON agent_messages(to_initiative_id);
CREATE INDEX idx_messages_created ON agent_messages(created_at);
CREATE INDEX idx_messages_read ON agent_messages(read);
CREATE INDEX idx_metrics_user ON metrics_hourly(user_id);
CREATE INDEX idx_metrics_hour ON metrics_hourly(hour);
