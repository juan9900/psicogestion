-- Agenda de consultas: configuración de horarios, días bloqueados y citas.
-- Portable a cualquier PostgreSQL (Supabase / Postgres 15+).

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- Tipos
do $$ begin
  create type modalidad_cita as enum ('online', 'presencial');
exception when duplicate_object then null; end $$;

do $$ begin
  create type estado_cita as enum ('pendiente', 'confirmada', 'cancelada');
exception when duplicate_object then null; end $$;

-- Helper reutilizable: mantiene updated_at al actualizar una fila.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Configuración global de la agenda (una sola fila).
create table if not exists public.config_agenda (
  id smallint primary key default 1,
  duracion_cita_min int not null default 60 check (duracion_cita_min between 5 and 480),
  zona_horaria text not null default 'America/Caracas',
  updated_at timestamptz not null default now(),
  constraint config_agenda_singleton check (id = 1)
);

-- Franjas laborables por día de la semana (0=domingo ... 6=sábado).
-- Un día puede tener varias franjas (ej. mañana y tarde). Sin franjas = no laborable.
create table if not exists public.franjas_disponibilidad (
  id uuid primary key default gen_random_uuid(),
  dia_semana smallint not null check (dia_semana between 0 and 6),
  hora_inicio time not null,
  hora_fin time not null,
  updated_at timestamptz not null default now(),
  constraint franja_valida check (hora_fin > hora_inicio),
  constraint uq_franja unique (dia_semana, hora_inicio, hora_fin)
);
create index if not exists idx_franjas_dia on public.franjas_disponibilidad (dia_semana);

-- Días u horas bloqueadas (feriados, vacaciones, ausencias).
-- hora_inicio/hora_fin nulas = día completo.
create table if not exists public.dias_bloqueados (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  hora_inicio time,
  hora_fin time,
  motivo text,
  updated_at timestamptz not null default now(),
  constraint rango_bloqueo check (
    (hora_inicio is null and hora_fin is null)
    or (hora_inicio is not null and hora_fin is not null and hora_fin > hora_inicio)
  )
);
create index if not exists idx_bloqueos_fecha on public.dias_bloqueados (fecha);

-- Citas
create table if not exists public.citas (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  hora time not null,
  modalidad modalidad_cita not null,
  nombre text not null,
  email text,
  telefono text,
  motivo text,
  estado estado_cita not null default 'pendiente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bloqueo de horas: una hora no puede tener dos citas activas a la vez.
-- El índice parcial ignora las canceladas (que liberan el bloque).
create unique index if not exists uq_cita_slot_activo
  on public.citas (fecha, hora)
  where estado <> 'cancelada';

create index if not exists idx_citas_fecha on public.citas (fecha);

-- Triggers de updated_at
drop trigger if exists trg_config_agenda_updated on public.config_agenda;
create trigger trg_config_agenda_updated before update on public.config_agenda
  for each row execute function public.set_updated_at();

drop trigger if exists trg_franjas_updated on public.franjas_disponibilidad;
create trigger trg_franjas_updated before update on public.franjas_disponibilidad
  for each row execute function public.set_updated_at();

drop trigger if exists trg_bloqueos_updated on public.dias_bloqueados;
create trigger trg_bloqueos_updated before update on public.dias_bloqueados
  for each row execute function public.set_updated_at();

drop trigger if exists trg_citas_updated on public.citas;
create trigger trg_citas_updated before update on public.citas
  for each row execute function public.set_updated_at();
