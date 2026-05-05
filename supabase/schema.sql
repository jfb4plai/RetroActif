-- ══════════════════════════════════════════════════════════════
-- RetroActif — Schéma SQL Supabase
-- À coller et exécuter dans l'éditeur SQL de votre projet Supabase
-- ══════════════════════════════════════════════════════════════

-- Extension UUID (déjà active sur Supabase)
create extension if not exists "uuid-ossp";

-- ── PROFILES ─────────────────────────────────────────────────
-- Un profil par enseignant, lié à auth.users
create table if not exists public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text,
  prenom              text,
  etablissement       text,
  matiere             text,
  niveau_enseignement text,    -- fondamental | secondaire_inf | secondaire_2 | secondaire_3 | cefa
  type_enseignement   text,    -- general | technique | technique_qual | qualifiant | cefa
  niveau_maitrise     text default 'debutant', -- debutant | intermediaire | expert
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- RLS : chaque enseignant ne voit que son propre profil
alter table public.profiles enable row level security;
create policy "Profil personnel" on public.profiles
  for all using (auth.uid() = id);

-- ── RÉTROACTIONS ─────────────────────────────────────────────
create table if not exists public.retroactions (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid references auth.users(id) on delete cascade default auth.uid(),

  -- Contexte
  niveau               text,
  type_enseignement    text,
  matiere              text,
  type_retroaction     text,    -- production | evaluation | bulletin
  eleve_code           text,    -- identifiant anonyme (pas de nom)
  production_type      text,

  -- Contenu
  points_forts         text,
  difficultes          text,
  infos_complementaires text,
  texte_genere         text,    -- texte brut produit par Claude
  note_personnelle     text,    -- touche personnelle de l'enseignant (20%)
  texte_final          text,    -- version finale (généré + personnalisé)
  texte_original       text,    -- version initiale avant amélioration (mode expert)

  -- Suivi
  suivi_prevu          boolean default false,
  modalite_suivi       text,
  suivi_realise        boolean default false,

  -- Métadonnées
  mode_construction    text,    -- debutant | intermediaire | expert | logigramme
  periode              text,    -- trim1 | trim2 | trim3 | sem1 | sem2
  checklist            jsonb,   -- résultats checklist (mode expert)
  logigramme_chemin    text[],  -- chemin parcouru dans le logigramme

  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- Index pour les requêtes fréquentes
create index if not exists retroactions_user_id_idx on public.retroactions(user_id);
create index if not exists retroactions_eleve_code_idx on public.retroactions(eleve_code);
create index if not exists retroactions_created_at_idx on public.retroactions(created_at desc);

-- RLS
alter table public.retroactions enable row level security;
create policy "Rétroactions personnelles" on public.retroactions
  for all using (auth.uid() = user_id);

-- ── BULLETINS ────────────────────────────────────────────────
create table if not exists public.bulletins (
  id                        uuid primary key default uuid_generate_v4(),
  user_id                   uuid references auth.users(id) on delete cascade default auth.uid(),

  eleve_code                text not null,
  periode                   text,
  matiere                   text,
  niveau                    text,

  texte_genere              text,
  texte_final               text,
  bulletin_precedent        text,    -- référence pour détecter les doublons
  nb_retroactions_source    int,

  created_at                timestamptz default now()
);

create index if not exists bulletins_user_id_idx on public.bulletins(user_id);
create index if not exists bulletins_eleve_code_idx on public.bulletins(eleve_code);

alter table public.bulletins enable row level security;
create policy "Bulletins personnels" on public.bulletins
  for all using (auth.uid() = user_id);

-- ── DIALOGUES ────────────────────────────────────────────────
create table if not exists public.dialogues (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid references auth.users(id) on delete cascade default auth.uid(),
  retroaction_id   uuid references public.retroactions(id) on delete cascade,
  eleve_code       text,

  -- Réponses enregistrées lors du dialogue face-à-face
  interpretation   text,
  question_clarif  text,
  action1          text,
  action2          text,
  apres_revision   text,

  created_at       timestamptz default now()
);

alter table public.dialogues enable row level security;
create policy "Dialogues personnels" on public.dialogues
  for all using (auth.uid() = user_id);

-- ── AUTO-ÉVALUATIONS (Module 5) ──────────────────────────────
create table if not exists public.auto_evaluations (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade default auth.uid(),
  reponses    jsonb not null,  -- { q1: 3, q2: 2, ... }
  created_at  timestamptz default now()
);

alter table public.auto_evaluations enable row level security;
create policy "Auto-évaluations personnelles" on public.auto_evaluations
  for all using (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════
-- Trigger : mise à jour automatique de updated_at
-- ══════════════════════════════════════════════════════════════
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger update_retroactions_updated_at
  before update on public.retroactions
  for each row execute function public.update_updated_at();
