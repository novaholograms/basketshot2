/*
  # Add avatar_url to profiles + avatars Storage bucket

  ## Changes

  1. Modified Tables
     - `profiles`: adds `avatar_url TEXT` column (nullable) to store the public URL
       of each user's profile photo uploaded to Supabase Storage.

  2. Storage
     - Creates a new public bucket named `avatars` (public = true so photos are
       readable without auth by anyone with the URL).

  3. Security (storage.objects RLS)
     - Public SELECT on the avatars bucket (any reader).
     - Authenticated INSERT only into the caller's own folder ({uid}/...).
     - Authenticated UPDATE only into the caller's own folder.
     - Authenticated DELETE only from the caller's own folder.

  ## Notes
  - All statements use IF EXISTS / ON CONFLICT so the migration is safe to run
    multiple times (idempotent).
  - RLS is already enabled on storage.objects by Supabase by default.
  - The profiles SELECT for avatar_url happens automatically because AuthContext
    already uses select("*").
*/

-- 1. Add avatar_url to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Create avatars bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- 3. Public read for avatars bucket
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
CREATE POLICY "Public read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 4. Authenticated users upload only into their own folder
DROP POLICY IF EXISTS "User upload own avatar" ON storage.objects;
CREATE POLICY "User upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND name LIKE (auth.uid()::text || '/%')
  );

-- 5. Authenticated users update only their own folder
DROP POLICY IF EXISTS "User update own avatar" ON storage.objects;
CREATE POLICY "User update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND name LIKE (auth.uid()::text || '/%')
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND name LIKE (auth.uid()::text || '/%')
  );

-- 6. Authenticated users delete only from their own folder
DROP POLICY IF EXISTS "User delete own avatar" ON storage.objects;
CREATE POLICY "User delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND name LIKE (auth.uid()::text || '/%')
  );
