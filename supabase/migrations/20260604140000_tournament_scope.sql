-- PadelKing — tournament.scope: club_open | club_private | community
--
-- Hasta hoy un torneo se diferenciaba por la presencia de community_id vs club_id,
-- y el constraint tournament_has_organizer (club_id IS NOT NULL OR community_id IS NOT NULL)
-- garantizaba que tuviera dueño. Esto mezclaba dos cosas distintas:
--   - QUIÉN organiza (club vs comunidad)
--   - QUIÉN puede inscribirse (público de la ciudad vs miembros del club vs miembros de la comunidad)
--
-- Esta migración introduce `scope` explícito con 3 valores:
--   - 'community'    → community_id NOT NULL, club_id NULL. Organiza la comunidad.
--   - 'club_private' → club_id NOT NULL, community_id NULL. Organiza el club, solo socios.
--   - 'club_open'    → club_id NOT NULL, community_id NULL. Organiza el club, abierto a la ciudad (city_id).
--
-- También endurece community_id a ON DELETE RESTRICT (data integrity: no se puede
-- borrar una comunidad mientras tenga torneos colgados; antes era CASCADE silencioso).

begin;

-- ============================================================
-- 1. Columna scope (nullable inicial para poder backfillear)
-- ============================================================
alter table public.tournaments
  add column scope text;

-- ============================================================
-- 2. Backfill
-- ============================================================
update public.tournaments
  set scope = 'community'
  where community_id is not null;

update public.tournaments
  set scope = 'club_private'
  where club_id is not null and community_id is null;

-- Dato sucio histórico: filas con AMBOS club_id y community_id (no debería
-- pasar bajo el constraint anterior, que solo exigía "al menos uno", pero
-- existe data legacy con los dos seteados). Política: si una fila tiene
-- community_id, gana el scope='community' y limpiamos club_id para satisfacer
-- el nuevo CHECK más estricto.
update public.tournaments
  set club_id = null
  where scope = 'community' and club_id is not null;

-- Defensa: cualquier fila restante sin scope es un estado inválido (ningún organizador).
-- El constraint anterior tournament_has_organizer lo prohibía, así que esto no debería
-- matchear nada. Si lo hace, la migración fallará al aplicar SET NOT NULL — lo cual es
-- lo correcto (queremos detectar data sucia antes de continuar).

-- ============================================================
-- 3. NOT NULL + reemplazar el constraint de organizador
-- ============================================================
alter table public.tournaments
  alter column scope set not null;

alter table public.tournaments
  drop constraint if exists tournament_has_organizer;

alter table public.tournaments
  add constraint new_scope_consistent
  check (
    (scope = 'community'    and community_id is not null and club_id is null) or
    (scope = 'club_private' and club_id is not null and community_id is null) or
    (scope = 'club_open'    and club_id is not null and community_id is null)
  );

-- ============================================================
-- 4. tournaments.city_id: ya existe (agregada en 20260520200000) pero sin
--    ON DELETE explícito (NO ACTION). La cambiamos a SET NULL para evitar
--    bloquear el borrado de una ciudad y que el torneo simplemente quede
--    "sin ciudad" (especialmente útil para scope='club_open').
-- ============================================================
do $$
declare
  v_constraint_name text;
begin
  select tc.constraint_name
    into v_constraint_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on kcu.constraint_name = tc.constraint_name
   and kcu.table_schema   = tc.table_schema
  where tc.table_schema = 'public'
    and tc.table_name   = 'tournaments'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'city_id'
  limit 1;

  if v_constraint_name is not null then
    execute format('alter table public.tournaments drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.tournaments
  add constraint tournaments_city_id_fkey
  foreign key (city_id) references public.cities(id) on delete set null;

-- ============================================================
-- 5. Partial index para descubrimiento de torneos club_open por ciudad
-- ============================================================
create index if not exists tournaments_club_open_city_idx
  on public.tournaments (city_id, status)
  where scope = 'club_open';

-- ============================================================
-- 6. tournaments.community_id: CASCADE → RESTRICT
--    Antes: borrar comunidad borraba todos sus torneos en silencio.
--    Ahora: si la comunidad tiene torneos, el delete debe ser manejado
--    explícitamente por la app (cancelar/migrar torneos primero).
-- ============================================================
do $$
declare
  v_constraint_name text;
begin
  select tc.constraint_name
    into v_constraint_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on kcu.constraint_name = tc.constraint_name
   and kcu.table_schema   = tc.table_schema
  where tc.table_schema = 'public'
    and tc.table_name   = 'tournaments'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'community_id'
  limit 1;

  if v_constraint_name is not null then
    execute format('alter table public.tournaments drop constraint %I', v_constraint_name);
  end if;
end $$;

alter table public.tournaments
  add constraint tournaments_community_id_fkey
  foreign key (community_id) references public.communities(id) on delete restrict;

-- ============================================================
-- 7. RLS — no requiere cambios.
--    La policy "organizers can manage tournaments" (creada en
--    20260526130000_community_tournaments.sql) ya cubre los 3 scopes:
--      - scope='community'    → match por communities.owner_id
--      - scope='club_private' → match por clubs.owner_id
--      - scope='club_open'    → match por clubs.owner_id (mismo club_id NOT NULL)
--    La policy SELECT "tournaments are public read" sigue como `using (true)`,
--    lo cual es correcto para descubrimiento (los detalles privados de un
--    club_private siguen siendo visibles a nivel de listado/detalle pero la
--    autorización para inscribirse vive en tournament_registrations).
-- ============================================================

commit;
