-- PadelKing — Confirmación de scores por las dos parejas + fallback organizador/auto
--
-- Hoy solo el organizador reporta scores (UI en /manage) y el ELO se aplica
-- al instante. Queremos que cualquiera de las 2 parejas pueda reportar, la
-- otra confirme (o dispute), y que el organizador pueda forzar el cierre.
-- Como fallback, un cron auto-confirma a las 48h si nadie respondió.
--
-- Los flags confirmed_by_one / confirmed_by_two ya existen (migración
-- 20260520200000) pero nunca se usaron. Acá agregamos:
--   - estado 'pending_confirmation' al enum match_status
--   - reported_by_registration_id: qué registration reportó (para que la
--     misma pareja no "confirme" su propio reporte)
--   - reported_at: timestamp del reporte (para el timeout de 48h del cron)

-- 1) Nuevo valor del enum. ADD VALUE no corre dentro de un bloque que luego
--    use el valor en la misma transacción; lo dejamos como statement suelto.
alter type public.match_status add value if not exists 'pending_confirmation';

-- 2) Columnas de tracking del reporte
alter table public.matches
  add column if not exists reported_by_registration_id uuid
    references public.tournament_registrations(id) on delete set null,
  add column if not exists reported_at timestamptz;

comment on column public.matches.reported_by_registration_id is
  'Registration (pareja) que reportó el score. NULL = reportado por el organizador o sin reporte.';
comment on column public.matches.reported_at is
  'Cuándo se reportó el score (para auto-confirm de 48h via cron).';

-- 3) Índice para el cron: buscar matches por status + reported_at rápido.
--    (No-parcial a propósito: un índice parcial con where status =
--    'pending_confirmation' usaría el enum value recién agregado en la
--    misma transacción, lo cual Postgres rechaza.)
create index if not exists matches_status_reported_idx
  on public.matches (status, reported_at);
