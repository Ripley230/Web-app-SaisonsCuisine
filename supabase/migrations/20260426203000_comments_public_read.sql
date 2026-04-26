-- Commentaires visibles par tous (detail recette), y compris sans session.
-- A executer dans le SQL Editor Supabase si les commentaires ne s'affichent pas hors connexion
-- ou si une policy RLS limite le SELECT.

alter table public.comments enable row level security;

drop policy if exists "comments_select_public" on public.comments;
create policy "comments_select_public"
  on public.comments
  for select
  to anon, authenticated
  using (true);

-- Ajout reserve aux utilisateurs connectes (auteur du commentaire)
drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_insert_own"
  on public.comments
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Suppression par l'auteur du commentaire
drop policy if exists "comments_delete_own" on public.comments;
create policy "comments_delete_own"
  on public.comments
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Suppression par admin (console moderation / suppression profil)
drop policy if exists "comments_delete_admin" on public.comments;
create policy "comments_delete_admin"
  on public.comments
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and coalesce(p.is_admin, false) = true
    )
  );
