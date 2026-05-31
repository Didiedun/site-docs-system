-- Minimal persistence for projects + generated documents.
create table if not exists projects (
  id           text primary key,
  tajuk        text not null,
  contractor   text,
  contract_no  text,
  start_date   date,
  finish_date  date,
  attendees    jsonb default '[]',
  signatories  jsonb default '{}',
  created_at   timestamptz default now()
);

create table if not exists documents (
  id          uuid primary key default gen_random_uuid(),
  project_id  text references projects(id),
  kind        text not null check (kind in ('memo','minit','diary')),
  memo_type   text,
  body        text not null,
  created_at  timestamptz default now()
);

create index if not exists documents_project_idx on documents(project_id, created_at desc);

-- NOTE: enable Row Level Security + policies before going to production.
