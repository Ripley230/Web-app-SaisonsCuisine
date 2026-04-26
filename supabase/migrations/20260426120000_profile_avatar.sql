-- Colonne profil (executer dans le SQL Editor Supabase ou via CLI migrate)
alter table public.profiles
  add column if not exists avatar_url text;

-- Bucket public pour les URLs d'avatar (comme recipe-images)
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

-- Lecture publique des fichiers avatar
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Upload / maj : dossier = auth.uid()
drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Moderation : supprimer le fichier d'un autre utilisateur
drop policy if exists "avatars_delete_admin" on storage.objects;
create policy "avatars_delete_admin"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and exists (
      select 1 from public.profiles p
      where p.user_id = auth.uid() and coalesce(p.is_admin, false) = true
    )
  );
