-- Eliminar cuenta fallaba para cualquiera con historial: inscripciones,
-- equipos o comunidades propias apuntan a profiles con ON DELETE RESTRICT,
-- asi que borrar el usuario de auth (que cascadeaba al perfil) reventaba.
-- Ahora el perfil sobrevive anonimizado ("Jugador eliminado") para no romper
-- resultados ni rankings, y lo que se borra es el usuario de auth (login,
-- email, sesiones). La anonimizacion la hace deleteMyAccount.
alter table public.profiles drop constraint if exists profiles_id_fkey;
