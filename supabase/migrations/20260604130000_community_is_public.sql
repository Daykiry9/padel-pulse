-- ============================================================
-- Community is_public flag (privacy)
-- ============================================================
-- Comunidades publicas son listadas en el directorio y aceptan
-- "Pedir unirme" abierto. Comunidades privadas solo se acceden
-- por invitacion / link directo. La RLS existente sigue siendo
-- "public read" sobre communities (el flag controla UI, no acceso
-- a la fila — el detalle por slug sigue visible para auth users).
-- ============================================================

alter table public.communities
  add column if not exists is_public boolean not null default true;

create index if not exists communities_is_public_idx
  on public.communities (is_public)
  where is_public = true;

comment on column public.communities.is_public is
  'true = comunidad publica, listada en directorio. false = privada, solo por invitacion.';
