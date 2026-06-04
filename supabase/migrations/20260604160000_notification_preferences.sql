-- Notification preferences per profile (optionally scoped per community).
--
-- Usage:
--   Consultar prefs con
--     SELECT * FROM public.notification_preferences
--     WHERE profile_id = ? AND (community_id IS NULL OR community_id = ?);
--   si row no existe, defecto = true.
--
-- community_id IS NULL => global preference (applies across communities).
-- community_id = X     => override for that specific community.
-- kind values (enum-like, validated by CHECK):
--   'tournament_reminder', 'match_result', 'ranking_change', 'feed', 'community_announcement'.

CREATE TABLE IF NOT EXISTS public.notification_preferences (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  community_id uuid NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN (
    'tournament_reminder',
    'match_result',
    'ranking_change',
    'feed',
    'community_announcement'
  )),
  enabled boolean NOT NULL DEFAULT true,
  PRIMARY KEY (profile_id, community_id, kind)
);

CREATE INDEX IF NOT EXISTS notification_preferences_profile_community_idx
  ON public.notification_preferences (profile_id, community_id);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Self read
DROP POLICY IF EXISTS "notif_prefs_self_select" ON public.notification_preferences;
CREATE POLICY "notif_prefs_self_select"
  ON public.notification_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = profile_id);

-- Self insert
DROP POLICY IF EXISTS "notif_prefs_self_insert" ON public.notification_preferences;
CREATE POLICY "notif_prefs_self_insert"
  ON public.notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = profile_id);

-- Self update
DROP POLICY IF EXISTS "notif_prefs_self_update" ON public.notification_preferences;
CREATE POLICY "notif_prefs_self_update"
  ON public.notification_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- Self delete
DROP POLICY IF EXISTS "notif_prefs_self_delete" ON public.notification_preferences;
CREATE POLICY "notif_prefs_self_delete"
  ON public.notification_preferences
  FOR DELETE
  TO authenticated
  USING (auth.uid() = profile_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_preferences TO authenticated;
