-- Billing Plans
CREATE TABLE plans (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price_monthly DECIMAL(10, 2) NOT NULL,
  price_yearly DECIMAL(10, 2),
  tasks_limit INT NOT NULL,
  initiatives_limit INT NOT NULL,
  repos_limit INT NOT NULL,
  overage_rate DECIMAL(10, 4),
  features JSONB DEFAULT '[]',
  stripe_price_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default plans
INSERT INTO plans (id, name, price_monthly, tasks_limit, initiatives_limit, repos_limit, overage_rate, stripe_price_id) VALUES
  ('free', 'Free', 0, 50, 1, 2, NULL, NULL),
  ('starter', 'Starter', 29.00, 500, 5, 10, 0.10, NULL),
  ('pro', 'Pro', 99.00, 2500, 20, 50, 0.08, NULL),
  ('enterprise', 'Enterprise', 0, -1, -1, -1, NULL, NULL);

-- User Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  plan_id VARCHAR(50) REFERENCES plans(id) DEFAULT 'free',

  -- Stripe
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),

  -- Billing Cycle
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,

  -- Status
  status VARCHAR(50) DEFAULT 'active',
  cancel_at_period_end BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Usage Tracking
CREATE TABLE usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Period
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Counts
  tasks_used INT DEFAULT 0,
  tasks_limit INT NOT NULL,

  -- Costs
  total_cost DECIMAL(10, 4) DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, period_start)
);

-- Credit Balance
CREATE TABLE credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  balance DECIMAL(10, 4) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions (audit trail)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  type VARCHAR(50) NOT NULL,
  amount DECIMAL(10, 4) NOT NULL,
  description TEXT,

  -- References
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  stripe_payment_intent_id VARCHAR(255),
  stripe_invoice_id VARCHAR(255),

  -- Balance after transaction
  balance_after DECIMAL(10, 4),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Cost Breakdown
CREATE TABLE task_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE UNIQUE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,

  -- Agent costs
  agent_costs JSONB NOT NULL,

  -- Compute
  compute_minutes DECIMAL(10, 2) DEFAULT 0,
  compute_cost DECIMAL(10, 4) DEFAULT 0,

  -- Totals
  base_cost DECIMAL(10, 4) NOT NULL,
  margin_percent DECIMAL(5, 2) DEFAULT 30.00,
  final_cost DECIMAL(10, 4) NOT NULL,

  -- Charged
  charged BOOLEAN DEFAULT false,
  charged_at TIMESTAMP WITH TIME ZONE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_costs ENABLE ROW LEVEL SECURITY;

-- Subscription policies
CREATE POLICY "Users can read own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription" ON subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Usage policies
CREATE POLICY "Users can read own usage" ON usage
  FOR SELECT USING (auth.uid() = user_id);

-- Credits policies
CREATE POLICY "Users can read own credits" ON credits
  FOR SELECT USING (auth.uid() = user_id);

-- Transaction policies
CREATE POLICY "Users can read own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Task costs policies
CREATE POLICY "Users can read own task_costs" ON task_costs
  FOR SELECT USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_customer_id);
CREATE INDEX idx_usage_user_period ON usage(user_id, period_start);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_created ON transactions(created_at);
CREATE INDEX idx_task_costs_user ON task_costs(user_id);
CREATE INDEX idx_task_costs_task ON task_costs(task_id);

-- Function to create subscription on user creation
CREATE OR REPLACE FUNCTION create_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO subscriptions (user_id, plan_id)
  VALUES (NEW.id, 'free');

  INSERT INTO credits (user_id, balance)
  VALUES (NEW.id, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create subscription
CREATE TRIGGER on_user_created
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_subscription();
