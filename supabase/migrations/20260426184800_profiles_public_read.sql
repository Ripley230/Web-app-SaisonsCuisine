-- Permet de lire les profils (username/bio/avatar) avant connexion.
-- Necessaire pour afficher le compteur d'utilisateurs sur l'ecran login.
alter table public.profiles enable row level security;

drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read"
  on public.profiles
  for select
  to anon, authenticated
  using (true);
