/*
  # Add game fields to diary_entries

  Extends the existing diary_entries table with basketball game tracking fields.

  ## Changes
  - `result` (text, nullable): Game outcome — 'win', 'loss', 'draw', or 'not_finished'
  - `score_manual` (text, nullable): Optional free-text score string, e.g. "92-88"
  - `points` (int, nullable): Points scored by the player
  - `rebounds` (int, nullable): Rebounds by the player
  - `assists` (int, nullable): Assists by the player
  - `best_aspects` (jsonb, nullable): Array of strings — what went best (e.g. ["3PT", "Defense"])
  - `worst_aspects` (jsonb, nullable): Array of strings — what went worst

  ## Notes
  - All columns are nullable so existing entries are unaffected
  - Existing `notes` column is reused for "How did you feel?" text
  - Existing `rating` column is available for future use
  - No RLS changes: existing policies cover all columns automatically
*/

alter table public.diary_entries
  add column if not exists result text null,
  add column if not exists score_manual text null,
  add column if not exists points int null,
  add column if not exists rebounds int null,
  add column if not exists assists int null,
  add column if not exists best_aspects jsonb null default '[]'::jsonb,
  add column if not exists worst_aspects jsonb null default '[]'::jsonb;
