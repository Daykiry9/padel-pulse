-- Reasigna todo lo de un perfil eliminado ("Jugador eliminado") a una cuenta
-- nueva: cada columna con FK a profiles(id) pasa del id viejo al nuevo, se
-- restauran los datos personales del respaldo y se borra el perfil huerfano.
--
-- Uso: reemplazar OLD_ID, NEW_EMAIL y los datos del respaldo
-- (backups/<nombre>.json) y correrlo en el SQL editor de Supabase.
do $$
declare
  old_id uuid := 'OLD_ID';
  new_id uuid := (select id from auth.users where email = 'NEW_EMAIL');
  fk record;
begin
  if new_id is null then
    raise exception 'No existe usuario con ese email';
  end if;

  -- Filas que la cuenta nueva ya tenga y chocarian con unicos (p. ej. ser
  -- miembro de la misma comunidad) se borran de la nueva antes de mover.
  delete from public.community_members cm
  where cm.profile_id = new_id
    and exists (select 1 from public.community_members o where o.profile_id = old_id and o.community_id = cm.community_id);
  delete from public.notification_preferences np
  where np.profile_id = new_id
    and exists (select 1 from public.notification_preferences o where o.profile_id = old_id and o.community_id = np.community_id and o.kind = np.kind);

  for fk in
    select c.conrelid::regclass as tbl, a.attname as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f' and c.confrelid = 'public.profiles'::regclass
  loop
    execute format('update %s set %I = $1 where %I = $2', fk.tbl, fk.col, fk.col) using new_id, old_id;
  end loop;

  update public.profiles n set
    display_name = o.display_name, city = o.city, skill_level = o.skill_level, rating = o.rating,
    skill_category = o.skill_category, gender = o.gender, elo_rating = o.elo_rating,
    is_super_admin = o.is_super_admin
  from public.profiles o
  where n.id = new_id and o.id = old_id;

  delete from public.profiles where id = old_id;
end $$;

-- Despues, restaurar a mano lo que la anonimizacion borro (phone, birthdate,
-- instagram_handle, dominant_hand, favorite_position, playing_since_year,
-- avatar_url, marketing_opt_in, active_community_id) desde el respaldo.
