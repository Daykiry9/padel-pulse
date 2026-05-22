-- Asignar super admin role a juanesvgarcia@gmail.com
update public.profiles
set is_super_admin = true
where id = (select id from auth.users where lower(email) = 'juanesvgarcia@gmail.com');
