/*
  # Add full name to profiles

  1. Changes
    - Add `full_name` column to `profiles` table
      - Type: TEXT
      - Nullable: YES (to avoid breaking existing profiles)
      - No default value
  
  2. Notes
    - Existing profiles will have NULL for full_name
    - UI will handle NULL values with fallbacks ("Champ", "User")
*/

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS full_name TEXT;