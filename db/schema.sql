-- ============================================================================
-- Painel Financeiro - database creation script (PostgreSQL 17)
-- Naming standard: ENGLISH for everything (tables and columns). ASCII-only.
-- Structure only - no data. Transactions are re-imported from Autmais.
--
-- gen_random_uuid() is native in PostgreSQL 13+. On older versions run:
--   create extension if not exists pgcrypto;
--
-- Local test:  psql -U postgres -f schema.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- companies - companies shown in the panel (from Autmais)
-- ---------------------------------------------------------------------------
create table if not exists companies (
  id                 uuid primary key default gen_random_uuid(),
  autmais_company_id text not null unique,
  name               text,
  cnpj               text,
  created_at         timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- accounts - bank accounts of each company
-- ---------------------------------------------------------------------------
create table if not exists accounts (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid references companies (id),
  autmais_connection_id text not null unique,
  bank                  text,
  type                  text,
  subtype               text,
  number                text,
  balance               numeric,
  updated_at            timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- chart_of_accounts - managerial chart of accounts (balancete)
-- ---------------------------------------------------------------------------
create table if not exists chart_of_accounts (
  id         uuid primary key default gen_random_uuid(),
  code       text,
  name       text not null,
  group_name text,
  sort_order integer
);

-- ---------------------------------------------------------------------------
-- rules - classification rules (DE-PARA)
-- ---------------------------------------------------------------------------
create table if not exists rules (
  id           uuid primary key default gen_random_uuid(),
  match_type   text not null check (match_type in ('doc', 'keyword', 'category', 'internal')),
  match_value  text not null,
  account_code text,
  account_name text not null,
  priority     integer not null default 100,
  active       boolean not null default true,
  created_at   timestamptz default now()
);

-- ---------------------------------------------------------------------------
-- sync_logs - history of syncs with Autmais
-- ---------------------------------------------------------------------------
create table if not exists sync_logs (
  id                 uuid primary key default gen_random_uuid(),
  started_at         timestamptz default now(),
  finished_at        timestamptz,
  accounts_count     integer,
  transactions_count integer,
  status             text,
  error              text
);

-- ---------------------------------------------------------------------------
-- insights_cache - cache of AI analyses per month
-- ---------------------------------------------------------------------------
create table if not exists insights_cache (
  id              text primary key default 'general',
  reference_month text,
  content         jsonb not null,
  model           text,
  input_tokens    integer,
  output_tokens   integer,
  generated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- transactions - bank statement (one row per Autmais transaction)
-- ---------------------------------------------------------------------------
create table if not exists transactions (
  id                        uuid primary key default gen_random_uuid(),
  autmais_id                text not null unique,          -- Autmais _id (idempotency)
  account_id                uuid references accounts (id),
  company_id                uuid references companies (id),
  date                      date,
  datetime                  timestamptz,
  type                      text,                          -- CREDIT / DEBIT (original Autmais value)
  amount                    numeric,
  description               text,
  counterparty_name         text,
  counterparty_doc          text,
  merchant_name             text,
  merchant_doc              text,
  merchant_cnae             text,
  autmais_category          text,
  account_code              text,                          -- applied classification
  account_name              text,
  classification_source     text,
  classification_confidence text,
  is_internal               boolean not null default false,
  override_account_code     text,
  override_account_name     text,
  raw                       jsonb,                         -- original Autmais payload
  created_at                timestamptz default now()
);

-- performance indexes (queries by period, company and account)
create index if not exists transactions_date_idx         on transactions (date);
create index if not exists transactions_company_idx      on transactions (company_id);
create index if not exists transactions_account_code_idx on transactions (account_code);
