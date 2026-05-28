-- PadelKing — categoría opcional + nuevo set de categorías.
--
-- 1) Saca el trigger de elegibilidad que bloqueaba inscripciones por categoría.
--    skill_category pasa a ser dato interno, no limita nada.
-- 2) Agrega las nuevas categorías al enum team_category:
--      Masculino: '1'..'6'
--      Mixto: 'mixto_a'..'mixto_d'
--      Femenino: 'femenino_a'..'femenino_d'
--    Los valores antiguos quedan (no rompe data existente); los nuevos son los
--    que el UI ofrece de ahora en adelante.

-- ============================================================
-- 1. Trigger de elegibilidad: fuera
-- ============================================================
drop trigger if exists validate_registration_before_insert on public.tournament_registrations;
drop function if exists public.validate_registration_eligibility();

-- ============================================================
-- 2. Nuevas categorías
-- ============================================================
alter type public.team_category add value if not exists '1';
alter type public.team_category add value if not exists '2';
alter type public.team_category add value if not exists '3';
alter type public.team_category add value if not exists '4';
alter type public.team_category add value if not exists '5';
alter type public.team_category add value if not exists '6';

alter type public.team_category add value if not exists 'mixto_a';
alter type public.team_category add value if not exists 'mixto_b';
alter type public.team_category add value if not exists 'mixto_c';
alter type public.team_category add value if not exists 'mixto_d';

alter type public.team_category add value if not exists 'femenino_a';
alter type public.team_category add value if not exists 'femenino_b';
alter type public.team_category add value if not exists 'femenino_c';
alter type public.team_category add value if not exists 'femenino_d';
