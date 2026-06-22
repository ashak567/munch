-- ─────────────────────────────────────────────────────────────────────────────
-- Add missing composite and supplementary indexes
-- Targets the most common query patterns identified during codebase audit.
-- Does NOT modify production data — only adds indexes.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. decisions(user_id, created_at DESC)
--    Used by: GET /api/decisions (paginated history), POST /api/decisions (recent 5)
--    The existing idx_decisions_user_id covers the user_id filter but not the
--    ORDER BY created_at DESC. This composite index enables an index-only scan
--    for the most frequent query pattern in the app.
create index if not exists idx_decisions_user_id_created_at
  on public.decisions (user_id, created_at desc);

-- 2. feedback(decision_id)
--    Used by: POST /api/feedback (duplicate check), GET /api/decisions (join),
--             POST /api/decisions (feedback history lookup)
--    The UNIQUE constraint on feedback.decision_id already creates an implicit
--    index, so this is a no-op safety net.
create index if not exists idx_feedback_decision_id
  on public.feedback (decision_id);

-- 3. preferences(user_id, category)
--    Used by: POST /api/decisions (preference lookup by user+category),
--             POST /api/feedback (bulk score SELECT by user+category+tags),
--             GET /api/preferences (top scores by user)
--    The existing UNIQUE(user_id, category, tag) covers equality on all three
--    columns, but a dedicated (user_id, category) index is more efficient for
--    the common two-column filter pattern without tag specificity.
create index if not exists idx_preferences_user_id_category
  on public.preferences (user_id, category);
