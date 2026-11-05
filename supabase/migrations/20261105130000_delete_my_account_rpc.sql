-- Eliminar cuenta via RPC del propio usuario, sin depender de la service role
-- key del servidor (la de Vercel quedo invalida y la baja fallaba con
-- "No pudimos eliminar tu cuenta"). Anonimiza el perfil (que sobrevive por
-- el historial, ver 20261105120000) y borra el usuario de auth.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  update public.profiles set
    display_name = 'Jugador eliminado',
    avatar_url = null,
    city = null,
    phone = null,
    birthdate = null,
    instagram_handle = null,
    dominant_hand = null,
    favorite_position = null,
    playing_since_year = null,
    marketing_opt_in = false,
    is_super_admin = false,
    active_community_id = null
  where id = uid;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
