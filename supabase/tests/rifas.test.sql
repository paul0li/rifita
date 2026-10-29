-- Reglas y RLS de rifas, vendedoras, ventas y sorteos, por rol.
begin;
create extension if not exists pgtap with schema extensions;
select plan(38);

-- Personas: la organizadora (a), una vendedora (b) y alguien más (c).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'organizadora@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'vendedora@example.com'),
  ('00000000-0000-0000-0000-00000000000c', 'otra@example.com');

create function pg_temp.como(p_usuario uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_usuario, 'role', 'authenticated')::text, true);
$$;

-- Crear la rifa ------------------------------------------------------------

set local role authenticated;
select pg_temp.como('00000000-0000-0000-0000-00000000000a');

select lives_ok($$
  insert into public.rifas (id, titulo, cantidad_numeros, valor, datos_transferencia, fecha_termino)
  values ('11111111-1111-1111-1111-111111111111', 'Rifa del curso', 100, 2000,
          'Cuenta RUT 12.345.678-9', now() + interval '1 month')
$$, 'la organizadora crea su rifa');

select lives_ok($$
  insert into public.premios (rifa_id, orden, descripcion) values
    ('11111111-1111-1111-1111-111111111111', 1, 'Una canasta'),
    ('11111111-1111-1111-1111-111111111111', 2, 'Una torta')
$$, 'la organizadora agrega premios');

select throws_ok($$
  insert into public.rifas (titulo, cantidad_numeros, valor, datos_transferencia, fecha_termino)
  values ('Otra', 10, 1000, 'Cuenta', now() + interval '1 week')
$$, 'P0001', 'Ya tienes una rifa abierta', 'no puede tener dos rifas abiertas');

select pg_temp.como('00000000-0000-0000-0000-00000000000c');

select throws_ok($$
  insert into public.rifas (titulo, cantidad_numeros, valor, datos_transferencia, fecha_termino)
  values ('Muy larga', 10, 1000, 'Cuenta', now() + interval '4 months')
$$, '23514', null, 'una rifa no puede durar más de 3 meses');

select throws_ok($$
  insert into public.rifas (titulo, cantidad_numeros, valor, datos_transferencia, fecha_termino)
  values ('Enorme', 1001, 1000, 'Cuenta', now() + interval '1 month')
$$, '23514', null, 'una rifa no puede tener más de 1000 números');

select throws_ok($$
  insert into public.rifas (dueno_id, titulo, cantidad_numeros, valor, datos_transferencia, fecha_termino)
  values ('00000000-0000-0000-0000-00000000000b', 'Ajena', 10, 1000, 'Cuenta', now() + interval '1 month')
$$, '42501', null, 'nadie crea una rifa a nombre de otra persona');

select is((select count(*)::int from public.rifas), 0, 'otra persona no ve rifas ajenas');
select is((select count(*)::int from public.premios), 0, 'otra persona no ve premios ajenos');

-- Lo público ---------------------------------------------------------------

reset role;
set local role anon;
select set_config('request.jwt.claims', '', true);

select throws_ok('select * from public.rifas', '42501', null, 'un visitante no lee la tabla de rifas');
select throws_ok('select * from public.ventas', '42501', null, 'un visitante no lee la tabla de ventas');
select is(
  public.obtener_rifa('11111111-1111-1111-1111-111111111111') ->> 'titulo',
  'Rifa del curso',
  'un visitante con el UUID ve la rifa'
);
select is(
  public.obtener_rifa('11111111-1111-1111-1111-111111111111') -> 'premios' -> 1 ->> 'descripcion',
  'Una torta',
  'la rifa pública trae los premios en orden'
);
select ok(
  not (public.obtener_rifa('11111111-1111-1111-1111-111111111111') ? 'dueno_id'),
  'la rifa pública no dice quién es la dueña'
);
select throws_ok(
  $$select public.aceptar_invitacion('11111111-1111-1111-1111-111111111111', 'x')$$,
  '42501', null, 'un visitante no puede aceptar invitaciones'
);

-- Vender como organizadora ---------------------------------------------------

reset role;
set local role authenticated;
select pg_temp.como('00000000-0000-0000-0000-00000000000a');

select lives_ok($$
  insert into public.ventas (rifa_id, numero, comprador_cifrado)
  values ('11111111-1111-1111-1111-111111111111', 7, 'cifrado-de-la-organizadora')
$$, 'la organizadora vende un número');

select is(
  (select marcado_por from public.ventas where numero = 7),
  '00000000-0000-0000-0000-00000000000a'::uuid,
  'queda registrado quién marcó el número'
);

select throws_ok($$
  insert into public.ventas (rifa_id, numero) values ('11111111-1111-1111-1111-111111111111', 101)
$$, 'P0001', 'El número 101 no existe en esta rifa', 'no se vende un número que no existe');

select throws_ok($$
  insert into public.ventas (rifa_id, numero) values ('11111111-1111-1111-1111-111111111111', 7)
$$, '23505', null, 'no se vende dos veces el mismo número');

select is(
  public.obtener_rifa('11111111-1111-1111-1111-111111111111') -> 'pagados',
  '[7]'::jsonb,
  'la rifa pública muestra los números pagados'
);

-- Invitar y vender como vendedora -------------------------------------------

select lives_ok($$
  insert into public.vendedoras (id, rifa_id, nombre, codigo_hash, codigo_cifrado)
  values ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Juana',
          encode(extensions.digest('codigo-de-juana', 'sha256'), 'hex'), 'codigo-cifrado')
$$, 'la organizadora invita a una vendedora');

select pg_temp.como('00000000-0000-0000-0000-00000000000b');

select throws_ok(
  $$select public.aceptar_invitacion('11111111-1111-1111-1111-111111111111', 'codigo-falso')$$,
  'P0002', 'Esta invitación no existe', 'un código equivocado no sirve'
);
select is(
  public.aceptar_invitacion('11111111-1111-1111-1111-111111111111', 'codigo-de-juana'),
  '22222222-2222-2222-2222-222222222222'::uuid,
  'la vendedora acepta con el código de su link'
);
select is(
  (select count(*)::int from public.rifas),
  1,
  'la vendedora ve la rifa donde vende'
);

select lives_ok($$
  insert into public.ventas (rifa_id, numero, vendedora_id, comprador_cifrado)
  values ('11111111-1111-1111-1111-111111111111', 8, '22222222-2222-2222-2222-222222222222', 'cifrado-de-juana')
$$, 'la vendedora vende un número a su nombre');

select throws_ok($$
  insert into public.ventas (rifa_id, numero, comprador_cifrado)
  values ('11111111-1111-1111-1111-111111111111', 9, 'x')
$$, '42501', null, 'la vendedora no vende a nombre de la organizadora');

select is(
  (select array_agg(numero order by numero) from public.ventas),
  array[8],
  'la vendedora solo ve sus propias ventas cifradas'
);

delete from public.ventas where numero = 7;
reset role;
select is((select count(*)::int from public.ventas where rifa_id = '11111111-1111-1111-1111-111111111111' and numero = 7), 1,
  'la vendedora no puede liberar un número que no vendió');
set local role authenticated;

select pg_temp.como('00000000-0000-0000-0000-00000000000c');

select throws_ok(
  $$select public.aceptar_invitacion('11111111-1111-1111-1111-111111111111', 'codigo-de-juana')$$,
  'P0001', 'Esta invitación ya la usó otra cuenta', 'una invitación sirve para una sola cuenta'
);
select throws_ok($$
  insert into public.ventas (rifa_id, numero, vendedora_id)
  values ('11111111-1111-1111-1111-111111111111', 10, '22222222-2222-2222-2222-222222222222')
$$, '42501', null, 'otra persona no vende en una rifa ajena');

-- Sorteo ---------------------------------------------------------------------

select pg_temp.como('00000000-0000-0000-0000-00000000000b');
select throws_ok(
  $$select public.fijar_sorteo('11111111-1111-1111-1111-111111111111')$$,
  '42501', null, 'una vendedora no sortea'
);

select pg_temp.como('00000000-0000-0000-0000-00000000000a');
select is(
  public.fijar_sorteo('11111111-1111-1111-1111-111111111111') -> 'participantes',
  '[7, 8]'::jsonb,
  'al sortear se congelan los números pagados'
);
select throws_ok(
  $$select public.fijar_sorteo('11111111-1111-1111-1111-111111111111')$$,
  'P0001', 'Esta rifa ya se sorteó', 'no se puede volver a sortear'
);
select throws_ok($$
  insert into public.ventas (rifa_id, numero) values ('11111111-1111-1111-1111-111111111111', 20)
$$, 'P0001', 'La rifa ya no está abierta', 'después de sortear no se venden más números');
select throws_ok(
  $$select public.publicar_sorteo('11111111-1111-1111-1111-111111111111', repeat('a', 64), array[7, 8], null)$$,
  'P0001', 'Todavía no sale la ronda de drand', 'no se publica antes de que salga la ronda'
);

-- Como si ya hubiera pasado la ronda.
reset role;
update public.sorteos set ronda = ronda - 100;
set local role authenticated;

select throws_ok(
  $$select public.publicar_sorteo('11111111-1111-1111-1111-111111111111', repeat('a', 64), array[7, 99], null)$$,
  'P0001', 'Los ganadores no calzan con los participantes', 'los ganadores tienen que ser participantes'
);
select lives_ok(
  $$select public.publicar_sorteo('11111111-1111-1111-1111-111111111111', repeat('a', 64), array[8, 7], array['Pedro S.', 'Ana M.'])$$,
  'la organizadora publica el resultado'
);

-- Ciclo de vida y baja -------------------------------------------------------

reset role;
update public.rifas
set creada_en = now() - interval '5 months', fecha_termino = now() - interval '4 months';
-- pg_cron corre sin sesión.
select set_config('request.jwt.claims', '', true);
select public.limpiar_rifas_vencidas();
select is(
  (select count(*)::int from public.ventas where rifa_id = '11111111-1111-1111-1111-111111111111' and comprador_cifrado is not null),
  0,
  'a los 3 meses del término se borran los datos de compradores'
);

set local role authenticated;
select pg_temp.como('00000000-0000-0000-0000-00000000000a');
select public.dar_de_baja();
reset role;
select is(
  (select count(*)::int from public.rifas where dueno_id = '00000000-0000-0000-0000-00000000000a'),
  0,
  'darse de baja borra las rifas propias'
);

select * from finish();
rollback;
