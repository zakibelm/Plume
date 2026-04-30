-- Plume — Workflow runs tracking

CREATE TABLE IF NOT EXISTS workflow_runs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid REFERENCES projects(id) ON DELETE CASCADE,
  status         text CHECK (status IN ('running', 'completed', 'failed', 'budget_stopped', 'validation_failed', 'error')) DEFAULT 'running',
  result_summary jsonb,
  started_at     timestamp DEFAULT now(),
  completed_at   timestamp,
  created_at     timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_runs_project_id ON workflow_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_status ON workflow_runs(status);

ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workflow_runs_via_project" ON workflow_runs
  FOR ALL USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );
