-- Dar de baja la cuenta propia. Borra la fila de auth.users; las tablas de
-- rifas que vengan después la referencian con «on delete cascade», así que la
-- baja se lleva todas las rifas de la persona.

create function public.dar_de_baja()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Hay que iniciar sesión para dar de baja la cuenta'
      using errcode = '42501';
  end if;

  delete from auth.users where id = auth.uid();
end;
$$;

revoke execute on function public.dar_de_baja() from public, anon;
grant execute on function public.dar_de_baja() to authenticated;
