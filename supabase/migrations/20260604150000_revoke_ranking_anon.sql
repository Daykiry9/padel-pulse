-- Revoke anon access to player_ranking_consolidated view.
-- Keeps the view in place for potential future global stats; only restricts who can read it.

REVOKE SELECT ON public.player_ranking_consolidated FROM anon;
GRANT SELECT ON public.player_ranking_consolidated TO authenticated, service_role;
