begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'organizadora@example.com'),
  ('00000000-0000-0000-0000-00000000000b', 'otra@example.com');

-- Sin sesión no se puede.
set local role anon;
select throws_ok(
  'select public.dar_de_baja()',
  '42501',
  null,
  'un visitante sin sesión no puede llamarla'
);
reset role;

-- Con sesión, borra la propia cuenta.
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}',
  true
);
select lives_ok('select public.dar_de_baja()', 'una persona con sesión puede darse de baja');
reset role;

select is(
  (select count(*) from auth.users where id = '00000000-0000-0000-0000-00000000000a')::int,
  0,
  'la cuenta propia queda borrada'
);
select is(
  (select count(*) from auth.users where id = '00000000-0000-0000-0000-00000000000b')::int,
  1,
  'las demás cuentas siguen ahí'
);

select * from finish();
rollback;
