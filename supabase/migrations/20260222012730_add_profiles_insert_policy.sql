/*
  # Add INSERT policy to profiles table

  1. Security
    - Add INSERT policy to allow authenticated users to create their own profile
    - Users can only insert a profile with their own auth.uid()
*/

CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
TO public
WITH CHECK (auth.uid() = id);