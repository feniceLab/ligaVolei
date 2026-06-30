-- =============================================
-- LIGA CATARINENSE DE VOLEIBOL — Schema
-- =============================================

-- Extensões
create extension if not exists "uuid-ossp";

-- =============================================
-- PROFILES (vinculado ao Supabase Auth)
-- =============================================
create table profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  nome text not null,
  telefone text,
  categoria text, -- ex: "A1", "A2", "B1", etc.
  valor_por_jogo numeric(10,2) not null default 0,
  role text not null default 'arbitro' check (role in ('admin', 'arbitro')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- =============================================
-- COMPETIÇÕES
-- =============================================
create table competicoes (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  categoria text not null, -- ex: "Masculino", "Feminino", "Misto"
  temporada text not null, -- ex: "2026"
  data_inicio date not null,
  data_fim date not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- =============================================
-- JOGOS
-- =============================================
create table jogos (
  id uuid primary key default uuid_generate_v4(),
  competicao_id uuid references competicoes(id) on delete cascade not null,
  data date not null,
  horario time not null,
  local text not null,
  mandante text not null,
  visitante text not null,
  arbitros_necessarios int not null default 2 check (arbitros_necessarios in (1, 2)),
  status text not null default 'pendente' check (status in ('pendente', 'escalado', 'realizado', 'cancelado')),
  criado_em timestamptz not null default now()
);

-- =============================================
-- DISPONIBILIDADES
-- =============================================
create table disponibilidades (
  id uuid primary key default uuid_generate_v4(),
  arbitro_id uuid references profiles(id) on delete cascade not null,
  jogo_id uuid references jogos(id) on delete cascade not null,
  disponivel boolean not null default true,
  criado_em timestamptz not null default now(),
  unique(arbitro_id, jogo_id)
);

-- =============================================
-- ESCALAÇÕES
-- =============================================
create table escalacoes (
  id uuid primary key default uuid_generate_v4(),
  jogo_id uuid references jogos(id) on delete cascade not null,
  arbitro_id uuid references profiles(id) on delete cascade not null,
  escalado_em timestamptz not null default now(),
  notificado boolean not null default false,
  unique(jogo_id, arbitro_id)
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

alter table profiles enable row level security;
alter table competicoes enable row level security;
alter table jogos enable row level security;
alter table disponibilidades enable row level security;
alter table escalacoes enable row level security;

-- Helper: verifica se usuário é admin
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where user_id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- PROFILES
create policy "Admin vê todos os perfis" on profiles
  for select using (is_admin());

create policy "Árbitro vê seu próprio perfil" on profiles
  for select using (user_id = auth.uid());

create policy "Admin gerencia perfis" on profiles
  for all using (is_admin());

create policy "Usuário atualiza próprio perfil" on profiles
  for update using (user_id = auth.uid());

-- COMPETIÇÕES
create policy "Todos veem competições ativas" on competicoes
  for select using (ativo = true or is_admin());

create policy "Admin gerencia competições" on competicoes
  for all using (is_admin());

-- JOGOS
create policy "Todos veem jogos" on jogos
  for select using (true);

create policy "Admin gerencia jogos" on jogos
  for all using (is_admin());

-- DISPONIBILIDADES
create policy "Admin vê todas disponibilidades" on disponibilidades
  for select using (is_admin());

create policy "Árbitro vê suas disponibilidades" on disponibilidades
  for select using (
    arbitro_id in (select id from profiles where user_id = auth.uid())
  );

create policy "Árbitro gerencia suas disponibilidades" on disponibilidades
  for all using (
    arbitro_id in (select id from profiles where user_id = auth.uid())
  );

create policy "Admin gerencia disponibilidades" on disponibilidades
  for all using (is_admin());

-- ESCALAÇÕES
create policy "Todos veem escalações" on escalacoes
  for select using (true);

create policy "Admin gerencia escalações" on escalacoes
  for all using (is_admin());

-- =============================================
-- TRIGGER: criar perfil ao criar usuário
-- =============================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (user_id, nome, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'arbitro')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- =============================================
-- ÍNDICES
-- =============================================
create index idx_jogos_data on jogos(data);
create index idx_jogos_competicao on jogos(competicao_id);
create index idx_disponibilidades_jogo on disponibilidades(jogo_id);
create index idx_disponibilidades_arbitro on disponibilidades(arbitro_id);
create index idx_escalacoes_jogo on escalacoes(jogo_id);
create index idx_profiles_user on profiles(user_id);
