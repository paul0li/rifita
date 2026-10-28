# 0005 — Supabase como backend

**Estado:** Aceptado · 2026-10-28

## Contexto

El proyecto no tiene presupuesto y lo mantiene poca gente. Necesita login con
Google, una base de datos con permisos por fila, tareas programadas para los
avisos y los borrados, y un hosting que no cueste.

## Decisión

Usar Supabase: Auth con Google (solo el correo), Postgres con Row Level
Security como única capa de permisos, y `pg_cron` para los avisos de término y
los borrados del ciclo de vida. El frontend es estático y se sirve desde un
hosting gratuito. El framework del frontend se decide aparte.

## Consecuencias

La seguridad depende de que las políticas RLS estén bien: por eso cada una
tiene tests que prueban lo que permite y lo que niega. El esquema vive en
migraciones numeradas en `supabase/migrations/`. Quedarse en el plan gratuito
impone límites de tamaño y de proyectos pausados por inactividad.

## Qué la revertiría

Que el plan gratuito deje de alcanzar o cambie sus condiciones, o que la lógica
necesaria no quepa en RLS y funciones de Postgres.
