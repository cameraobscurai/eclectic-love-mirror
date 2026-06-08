
-- =============================================================
-- ADMIN co-pilot — Phase 1 schema (additive, admin-gated)
-- =============================================================

-- 1. admin_threads --------------------------------------------------
CREATE TABLE public.admin_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_threads_user_updated_idx
  ON public.admin_threads (user_id, updated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_threads TO authenticated;
GRANT ALL ON public.admin_threads TO service_role;
ALTER TABLE public.admin_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_threads admin all"
  ON public.admin_threads FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND user_id = auth.uid());

CREATE TRIGGER admin_threads_updated_at
  BEFORE UPDATE ON public.admin_threads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 2. admin_messages -------------------------------------------------
CREATE TABLE public.admin_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.admin_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_sdk_message_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_messages_thread_created_idx
  ON public.admin_messages (thread_id, created_at ASC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_messages TO authenticated;
GRANT ALL ON public.admin_messages TO service_role;
ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_messages admin all"
  ON public.admin_messages FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1 FROM public.admin_threads t
      WHERE t.id = admin_messages.thread_id AND t.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND EXISTS (
      SELECT 1 FROM public.admin_threads t
      WHERE t.id = admin_messages.thread_id AND t.user_id = auth.uid()
    )
  );


-- 3. admin_memory ---------------------------------------------------
CREATE TABLE public.admin_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_memory TO authenticated;
GRANT ALL ON public.admin_memory TO service_role;
ALTER TABLE public.admin_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_memory admin all"
  ON public.admin_memory FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER admin_memory_updated_at
  BEFORE UPDATE ON public.admin_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 4. admin_tasks ----------------------------------------------------
-- ADMIN proposes work here (manifests, audits). Status starts at
-- 'awaiting_approval' and you (or ADMIN with your approval) move it
-- forward. No writes to production data happen from this table directly.
CREATE TABLE public.admin_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES public.admin_threads(id) ON DELETE SET NULL,
  kind text NOT NULL,
  title text NOT NULL,
  summary text,
  status text NOT NULL DEFAULT 'awaiting_approval'
    CHECK (status IN ('draft','awaiting_approval','approved','applied','rejected','failed','deferred')),
  manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_tasks_status_idx ON public.admin_tasks (status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_tasks TO authenticated;
GRANT ALL ON public.admin_tasks TO service_role;
ALTER TABLE public.admin_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_tasks admin all"
  ON public.admin_tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER admin_tasks_updated_at
  BEFORE UPDATE ON public.admin_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- 5. admin_audit_log — additive reference columns -------------------
ALTER TABLE public.admin_audit_log
  ADD COLUMN IF NOT EXISTS thread_id uuid REFERENCES public.admin_threads(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS task_id   uuid REFERENCES public.admin_tasks(id)   ON DELETE SET NULL;
