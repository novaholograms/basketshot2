/*
  # Create diary_entries table

  1. New Tables
    - `diary_entries`
      - `id` (uuid, primary key, auto-generated)
      - `user_id` (uuid, FK → auth.users ON DELETE CASCADE)
      - `created_at` (timestamptz, default now())
      - `entry_date` (date, default today)
      - `title` (text, default '')
      - `notes` (text, default '')
      - `rating` (int, nullable)
      - `meta` (jsonb, nullable)

  2. Indexes
    - `diary_entries_user_id_idx` on user_id for fast per-user queries
    - `diary_entries_entry_date_idx` on entry_date DESC for chronological listing

  3. Security
    - Enable RLS on `diary_entries`
    - 4 policies (SELECT / INSERT / UPDATE / DELETE), all scoped to authenticated users owning the row via auth.uid() = user_id
    - ON DELETE CASCADE ensures rows are removed automatically when the auth user is deleted (covers delete-account flow)
*/

CREATE TABLE IF NOT EXISTS diary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  entry_date date NOT NULL DEFAULT (now()::date),
  title text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  rating int NULL,
  meta jsonb NULL
);

CREATE INDEX IF NOT EXISTS diary_entries_user_id_idx ON diary_entries(user_id);
CREATE INDEX IF NOT EXISTS diary_entries_entry_date_idx ON diary_entries(entry_date DESC);

ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own diary entries"
  ON diary_entries FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own diary entries"
  ON diary_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own diary entries"
  ON diary_entries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own diary entries"
  ON diary_entries FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
