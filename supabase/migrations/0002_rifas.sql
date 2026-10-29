-- Rifas, premios, vendedoras, ventas y sorteos, con sus reglas y RLS.
--
-- Los nombres y contactos de quienes compran llegan cifrados desde el
-- navegador (ventas.comprador_cifrado): el servidor nunca tiene la clave.

-- Nadie anónimo toca las tablas directamente; la página pública usa
-- obtener_rifa().
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke execute on functions from anon, public;

-- Tablas -------------------------------------------------------------------

create table public.rifas (
  id uuid primary key default gen_random_uuid(),
  dueno_id uuid not null default auth.uid() references auth.users on delete cascade,
  titulo text not null check (char_length(titulo) between 1 and 120),
  descripcion text not null default '' check (char_length(descripcion) <= 2000),
  cantidad_numeros int not null check (cantidad_numeros between 1 and 1000),
  valor int not null check (valor between 1 and 100000000),
  datos_transferencia text not null check (char_length(datos_transferencia) between 1 and 1000),
  fecha_termino timestamptz not null,
  creada_en timestamptz not null default now(),
  check (fecha_termino > creada_en),
  check (fecha_termino <= creada_en + interval '3 months')
);

create index on public.rifas (dueno_id);

create table public.premios (
  rifa_id uuid not null references public.rifas on delete cascade,
  orden int not null check (orden between 1 and 50),
  descripcion text not null check (char_length(descripcion) between 1 and 300),
  primary key (rifa_id, orden)
);

create table public.vendedoras (
  id uuid primary key default gen_random_uuid(),
  rifa_id uuid not null references public.rifas on delete cascade,
  nombre text not null check (char_length(nombre) between 1 and 80),
  -- SHA-256 en hexadecimal del código de invitación, que solo viaja en el link.
  codigo_hash text not null unique check (codigo_hash ~ '^[0-9a-f]{64}$'),
  -- El mismo código, cifrado con la clave de la rifa, para que la organizadora
  -- pueda volver a copiar el link.
  codigo_cifrado text not null check (char_length(codigo_cifrado) <= 500),
  usuario_id uuid references auth.users on delete set null,
  creada_en timestamptz not null default now(),
  aceptada_en timestamptz,
  unique (rifa_id, usuario_id)
);

create table public.ventas (
  rifa_id uuid not null references public.rifas on delete cascade,
  numero int not null check (numero >= 1),
  -- null: la vendió la organizadora.
  vendedora_id uuid references public.vendedoras on delete set null,
  -- iv + texto cifrado con AES-GCM, en base64url. Se borra a los 3 meses.
  comprador_cifrado text check (char_length(comprador_cifrado) <= 4000),
  marcado_por uuid default auth.uid() references auth.users on delete set null,
  marcado_en timestamptz not null default now(),
  primary key (rifa_id, numero)
);

create index on public.ventas (vendedora_id);

create table public.sorteos (
  rifa_id uuid primary key references public.rifas on delete cascade,
  participantes int[] not null,
  ronda bigint not null,
  fijado_en timestamptz not null default now(),
  aleatoriedad text check (aleatoriedad ~ '^[0-9a-f]{64}$'),
  ganadores int[],
  nombres_ganadores text[],
  publicado_en timestamptz
);

-- Ayudantes para las políticas ---------------------------------------------
-- security definer para que las políticas no se llamen entre sí.

create function public.es_duena(p_rifa uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.rifas where id = p_rifa and dueno_id = auth.uid());
$$;

create function public.mi_vendedora(p_rifa uuid)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select id from public.vendedoras where rifa_id = p_rifa and usuario_id = auth.uid();
$$;

create function public.rifa_abierta(p_rifa uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.rifas r
    where r.id = p_rifa
      and r.fecha_termino > now()
      and not exists (select 1 from public.sorteos s where s.rifa_id = r.id)
  );
$$;

grant execute on function public.es_duena(uuid), public.mi_vendedora(uuid),
  public.rifa_abierta(uuid) to authenticated;

-- Reglas -------------------------------------------------------------------

-- Una persona tiene a lo más una rifa abierta como dueña.
create function public.una_rifa_abierta()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if exists (
    select 1 from public.rifas r
    where r.dueno_id = new.dueno_id
      and r.fecha_termino > now()
      and not exists (select 1 from public.sorteos s where s.rifa_id = r.id)
  ) then
    raise exception 'Ya tienes una rifa abierta' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger una_rifa_abierta before insert on public.rifas
  for each row execute function public.una_rifa_abierta();

-- Solo se venden números de la rifa, mientras está abierta. Quién y cuándo lo
-- pone el servidor. No aplica a lo que hace la base por su cuenta: borrados en
-- cascada (pg_trigger_depth() > 1) y la limpieza de pg_cron (sin sesión).
create function public.revisar_venta()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_cantidad int;
begin
  if pg_trigger_depth() > 1 or auth.uid() is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if not public.rifa_abierta(case when tg_op = 'DELETE' then old.rifa_id else new.rifa_id end) then
    raise exception 'La rifa ya no está abierta' using errcode = 'P0001';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  select cantidad_numeros into v_cantidad from public.rifas where id = new.rifa_id;
  if new.numero > v_cantidad then
    raise exception 'El número % no existe en esta rifa', new.numero using errcode = 'P0001';
  end if;
  if tg_op = 'INSERT' then
    new.marcado_por := auth.uid();
    new.marcado_en := now();
  end if;
  return new;
end;
$$;

create trigger revisar_venta before insert or update or delete on public.ventas
  for each row execute function public.revisar_venta();

-- RLS ----------------------------------------------------------------------

alter table public.rifas enable row level security;
alter table public.premios enable row level security;
alter table public.vendedoras enable row level security;
alter table public.ventas enable row level security;
alter table public.sorteos enable row level security;

revoke all on public.rifas, public.premios, public.vendedoras, public.ventas,
  public.sorteos from anon, authenticated;

-- Lo que una persona con sesión puede intentar; RLS decide sobre qué filas.
grant select, insert, delete on public.rifas to authenticated;
grant select, insert on public.premios to authenticated;
grant select, insert, delete on public.vendedoras to authenticated;
grant select, insert, update, delete on public.ventas to authenticated;

create policy "la dueña y sus vendedoras ven la rifa" on public.rifas
  for select to authenticated
  using (dueno_id = auth.uid() or public.mi_vendedora(id) is not null);
create policy "cualquiera con sesión crea su rifa" on public.rifas
  for insert to authenticated
  with check (dueno_id = auth.uid());
create policy "la dueña borra su rifa" on public.rifas
  for delete to authenticated
  using (dueno_id = auth.uid());

create policy "la dueña y sus vendedoras ven los premios" on public.premios
  for select to authenticated
  using (public.es_duena(rifa_id) or public.mi_vendedora(rifa_id) is not null);
create policy "la dueña agrega premios" on public.premios
  for insert to authenticated
  with check (public.es_duena(rifa_id));

create policy "la dueña ve sus vendedoras y cada una se ve a sí misma" on public.vendedoras
  for select to authenticated
  using (public.es_duena(rifa_id) or usuario_id = auth.uid());
create policy "la dueña invita" on public.vendedoras
  for insert to authenticated
  with check (public.es_duena(rifa_id) and usuario_id is null);
create policy "la dueña quita vendedoras" on public.vendedoras
  for delete to authenticated
  using (public.es_duena(rifa_id));

create policy "la dueña ve todas las ventas y cada vendedora las suyas" on public.ventas
  for select to authenticated
  using (
    public.es_duena(rifa_id)
    or (vendedora_id is not null and vendedora_id = public.mi_vendedora(rifa_id))
  );
create policy "la dueña vende a su nombre y cada vendedora al suyo" on public.ventas
  for insert to authenticated
  with check (
    (public.es_duena(rifa_id) and vendedora_id is null)
    or (vendedora_id is not null and vendedora_id = public.mi_vendedora(rifa_id))
  );
create policy "la dueña corrige cualquier venta" on public.ventas
  for update to authenticated
  using (public.es_duena(rifa_id))
  with check (public.es_duena(rifa_id));
create policy "la dueña libera cualquier número y cada vendedora los suyos" on public.ventas
  for delete to authenticated
  using (
    public.es_duena(rifa_id)
    or (vendedora_id is not null and vendedora_id = public.mi_vendedora(rifa_id))
  );

-- sorteos: sin políticas; solo se toca con fijar_sorteo y publicar_sorteo.

-- Funciones ----------------------------------------------------------------

-- Lo que ve cualquiera que tenga el link de la rifa. Nunca incluye datos de
-- compradores ni quién es la dueña.
create function public.obtener_rifa(p_id uuid)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id,
    'titulo', r.titulo,
    'descripcion', r.descripcion,
    'cantidad_numeros', r.cantidad_numeros,
    'valor', r.valor,
    'datos_transferencia', r.datos_transferencia,
    'fecha_termino', r.fecha_termino,
    'abierta', public.rifa_abierta(r.id),
    'premios', coalesce((
      select jsonb_agg(jsonb_build_object('orden', p.orden, 'descripcion', p.descripcion) order by p.orden)
      from public.premios p where p.rifa_id = r.id
    ), '[]'::jsonb),
    'pagados', coalesce((
      select jsonb_agg(v.numero order by v.numero) from public.ventas v where v.rifa_id = r.id
    ), '[]'::jsonb),
    'sorteo', (
      select jsonb_build_object(
        'participantes', s.participantes,
        'ronda', s.ronda,
        'aleatoriedad', s.aleatoriedad,
        'ganadores', s.ganadores,
        'nombres_ganadores', s.nombres_ganadores
      )
      from public.sorteos s where s.rifa_id = r.id
    ),
    'soy_duena', r.dueno_id is not distinct from auth.uid(),
    'mi_vendedora', public.mi_vendedora(r.id)
  )
  from public.rifas r
  where r.id = p_id;
$$;

grant execute on function public.obtener_rifa(uuid) to anon, authenticated;

-- La vendedora abre su link y queda vinculada a la invitación.
create function public.aceptar_invitacion(p_rifa uuid, p_codigo text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_invitacion public.vendedoras;
begin
  if auth.uid() is null then
    raise exception 'Hay que iniciar sesión' using errcode = '42501';
  end if;

  select * into v_invitacion from public.vendedoras
  where rifa_id = p_rifa
    and codigo_hash = encode(extensions.digest(p_codigo, 'sha256'), 'hex');

  if v_invitacion.id is null then
    raise exception 'Esta invitación no existe' using errcode = 'P0002';
  end if;
  if v_invitacion.usuario_id = auth.uid() then
    return v_invitacion.id;
  end if;
  if v_invitacion.usuario_id is not null then
    raise exception 'Esta invitación ya la usó otra cuenta' using errcode = 'P0001';
  end if;
  if public.es_duena(p_rifa) then
    raise exception 'La organizadora no necesita invitación' using errcode = 'P0001';
  end if;
  if public.mi_vendedora(p_rifa) is not null then
    raise exception 'Ya vendes en esta rifa' using errcode = 'P0001';
  end if;

  update public.vendedoras
  set usuario_id = auth.uid(), aceptada_en = now()
  where id = v_invitacion.id;
  return v_invitacion.id;
end;
$$;

grant execute on function public.aceptar_invitacion(uuid, text) to authenticated;

-- drand quicknet: una ronda cada 3 segundos desde su génesis.
create function public.ronda_drand(p_momento timestamptz)
returns bigint
language sql immutable
as $$
  select floor((extract(epoch from p_momento) - 1692803367) / 3)::bigint + 1;
$$;

-- Congela los participantes y fija una ronda de drand unos 30 segundos en el
-- futuro. Una sola vez por rifa.
create function public.fijar_sorteo(p_rifa uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_participantes int[];
begin
  if not public.es_duena(p_rifa) then
    raise exception 'Solo la organizadora sortea' using errcode = '42501';
  end if;
  if exists (select 1 from public.sorteos where rifa_id = p_rifa) then
    raise exception 'Esta rifa ya se sorteó' using errcode = 'P0001';
  end if;

  select array_agg(numero order by numero) into v_participantes
  from public.ventas where rifa_id = p_rifa;
  if v_participantes is null then
    raise exception 'No hay números pagados' using errcode = 'P0001';
  end if;

  insert into public.sorteos (rifa_id, participantes, ronda)
  values (p_rifa, v_participantes, public.ronda_drand(now()) + 10);

  return public.obtener_rifa(p_rifa) -> 'sorteo';
end;
$$;

-- Guarda el resultado que calculó el navegador de la organizadora. Se puede
-- comprobar en /<uuid>/verificar.
create function public.publicar_sorteo(
  p_rifa uuid,
  p_aleatoriedad text,
  p_ganadores int[],
  p_nombres text[]
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_sorteo public.sorteos;
  v_premios int;
begin
  if not public.es_duena(p_rifa) then
    raise exception 'Solo la organizadora sortea' using errcode = '42501';
  end if;

  select * into v_sorteo from public.sorteos where rifa_id = p_rifa for update;
  if v_sorteo.rifa_id is null then
    raise exception 'Primero hay que fijar el sorteo' using errcode = 'P0001';
  end if;
  if v_sorteo.publicado_en is not null then
    raise exception 'El resultado ya está publicado' using errcode = 'P0001';
  end if;
  if public.ronda_drand(now()) < v_sorteo.ronda then
    raise exception 'Todavía no sale la ronda de drand' using errcode = 'P0001';
  end if;

  select count(*) into v_premios from public.premios where rifa_id = p_rifa;
  if cardinality(p_ganadores) <> least(v_premios, cardinality(v_sorteo.participantes))
    or not p_ganadores <@ v_sorteo.participantes
    or (select count(distinct g) from unnest(p_ganadores) g) <> cardinality(p_ganadores)
  then
    raise exception 'Los ganadores no calzan con los participantes' using errcode = 'P0001';
  end if;
  if p_nombres is not null and cardinality(p_nombres) <> cardinality(p_ganadores) then
    raise exception 'Falta el nombre de algún ganador' using errcode = 'P0001';
  end if;

  update public.sorteos
  set aleatoriedad = p_aleatoriedad,
      ganadores = p_ganadores,
      nombres_ganadores = p_nombres,
      publicado_en = now()
  where rifa_id = p_rifa;
end;
$$;

grant execute on function public.fijar_sorteo(uuid),
  public.publicar_sorteo(uuid, text, int[], text[]) to authenticated;

-- Ciclo de vida ------------------------------------------------------------

-- A los 3 meses del término se borran los datos de compradores; al año, la rifa.
create function public.limpiar_rifas_vencidas()
returns void
language sql security definer set search_path = ''
as $$
  update public.ventas v
  set comprador_cifrado = null
  from public.rifas r
  where r.id = v.rifa_id
    and v.comprador_cifrado is not null
    and r.fecha_termino < now() - interval '3 months';

  delete from public.rifas where fecha_termino < now() - interval '1 year';
$$;

create extension if not exists pg_cron;

select cron.schedule('limpiar-rifas-vencidas', '15 4 * * *', 'select public.limpiar_rifas_vencidas()');
