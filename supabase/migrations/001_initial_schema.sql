-- Plume — Initial Schema v1.2
-- Run in Supabase SQL editor or via CLI: supabase db push

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Core Tables ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL,
  full_name   text,
  created_at  timestamp DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

CREATE TABLE IF NOT EXISTS workspaces (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  owner_id    uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id  uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role          text CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  created_at    timestamp DEFAULT now(),
  UNIQUE(workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS projects (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id   uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  name           text NOT NULL,
  description    text,
  content_type   text,
  status         text DEFAULT 'draft',
  global_score   numeric,
  created_at     timestamp DEFAULT now(),
  updated_at     timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brand_voices (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id          uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  name                  text NOT NULL,
  tone                  text,
  rhythm                text,
  language_level        text,
  preferred_expressions jsonb DEFAULT '[]',
  forbidden_expressions jsonb DEFAULT '[]',
  style_rules           text,
  good_examples         text,
  bad_examples          text,
  created_at            timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_briefs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      uuid REFERENCES projects(id) ON DELETE CASCADE,
  mission         text,
  objective       text,
  audience        text,
  reader_problem  text,
  promise         text,
  angle           text,
  channel         text,
  tone            text,
  cta             text,
  constraints     text,
  forbidden       text,
  sources         text,
  notes           text,
  structured_output jsonb,
  created_at      timestamp DEFAULT now(),
  updated_at      timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_versions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id       uuid REFERENCES projects(id) ON DELETE CASCADE,
  step             text NOT NULL,
  version_number   int DEFAULT 1,
  content          text,
  created_by_agent text,
  created_at       timestamp DEFAULT now()
);

-- ─── Operational Tables ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid REFERENCES projects(id) ON DELETE CASCADE,
  agent_name    text NOT NULL,
  input         jsonb,
  output        jsonb,
  status        text CHECK (status IN ('pending', 'running', 'success', 'failed', 'retrying', 'blocked')) DEFAULT 'pending',
  error_code    text,
  error_message text,
  retry_count   int DEFAULT 0,
  tokens_used   int,
  cost          numeric,
  started_at    timestamp,
  completed_at  timestamp,
  created_at    timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quality_scores (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_version_id  uuid REFERENCES content_versions(id) ON DELETE CASCADE,
  clarity             numeric,
  audience_fit        numeric,
  originality         numeric,
  credibility         numeric,
  utility             numeric,
  human_style         numeric,
  brand_voice         numeric,
  conversion          numeric,
  ai_risk             numeric,
  objective_alignment numeric,
  global_score        numeric,
  feedback            text,
  decision            text CHECK (decision IN ('ACCEPTÉ', 'À CORRIGER', 'BLOQUÉ')),
  created_at          timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_budgets (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid REFERENCES projects(id) ON DELETE CASCADE UNIQUE,
  max_cost_usd      numeric DEFAULT 1.00,
  current_cost_usd  numeric DEFAULT 0,
  max_llm_calls     int DEFAULT 35,
  current_llm_calls int DEFAULT 0,
  mode              text CHECK (mode IN ('fast', 'standard', 'premium')) DEFAULT 'standard',
  status            text DEFAULT 'active',
  created_at        timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS context_snapshots (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id         uuid REFERENCES projects(id) ON DELETE CASCADE,
  step               text NOT NULL,
  summary            text,
  key_decisions      jsonb DEFAULT '[]',
  active_constraints jsonb DEFAULT '[]',
  created_at         timestamp DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_content_briefs_project_id ON content_briefs(project_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_project_id ON content_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_project_id ON agent_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status);
CREATE INDEX IF NOT EXISTS idx_quality_scores_version_id ON quality_scores(content_version_id);
CREATE INDEX IF NOT EXISTS idx_context_snapshots_project_id ON context_snapshots(project_id);
CREATE INDEX IF NOT EXISTS idx_brand_voices_user_id ON brand_voices(user_id);

-- ─── Row Level Security ──────────────────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_voices ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_snapshots ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own
CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Projects: users can manage their own
CREATE POLICY "projects_own" ON projects
  FOR ALL USING (auth.uid() = user_id);

-- Brand voices: users can manage their own
CREATE POLICY "brand_voices_own" ON brand_voices
  FOR ALL USING (auth.uid() = user_id);

-- Content briefs: via project ownership
CREATE POLICY "briefs_via_project" ON content_briefs
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Content versions: via project ownership
CREATE POLICY "versions_via_project" ON content_versions
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Agent runs: via project ownership
CREATE POLICY "agent_runs_via_project" ON agent_runs
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Quality scores: via content version → project ownership
CREATE POLICY "quality_scores_via_version" ON quality_scores
  FOR ALL USING (
    content_version_id IN (
      SELECT cv.id FROM content_versions cv
      JOIN projects p ON cv.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

-- Project budgets: via project ownership
CREATE POLICY "budgets_via_project" ON project_budgets
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Context snapshots: via project ownership
CREATE POLICY "snapshots_via_project" ON context_snapshots
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

-- Workspaces: owner access
CREATE POLICY "workspaces_owner" ON workspaces
  FOR ALL USING (auth.uid() = owner_id);

-- Workspace members: member access
CREATE POLICY "workspace_members_own" ON workspace_members
  FOR ALL USING (auth.uid() = user_id);

-- ─── Updated At Trigger ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();

CREATE TRIGGER briefs_updated_at
  BEFORE UPDATE ON content_briefs
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
