/*
  # Create gemini_usage_log table

  ## Summary
  Creates a usage log table for tracking Gemini API calls from Edge Functions.
  Used for per-user rate limiting (10 calls/hour) and usage monitoring.

  ## New Tables
  - `gemini_usage_log`
    - `id` (uuid, primary key) - unique log entry
    - `user_id` (uuid, not null) - references auth.users
    - `created_at` (timestamptz, default now) - timestamp of the call
    - `status` (text, not null) - outcome status: ok, error, rate_limited, bad_json, bad_schema, workout_ok, etc.
    - `tokens_used` (int, nullable) - token count from Gemini response metadata

  ## Indexes
  - Composite index on (user_id, created_at desc) for efficient rate limit queries

  ## Security
  - RLS enabled
  - Only the service role (Edge Functions) can insert rows
  - Users can read their own rows (for potential future usage dashboard)

  ## Notes
  1. The Edge Function uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS for inserts
  2. The rate limit check queries rows where created_at >= now() - 1 hour
  3. If this table does not exist, the Edge Function gracefully continues without blocking
*/

CREATE TABLE IF NOT EXISTS public.gemini_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL,
  tokens_used int NULL
);

CREATE INDEX IF NOT EXISTS gemini_usage_log_user_time_idx
  ON public.gemini_usage_log (user_id, created_at DESC);

ALTER TABLE public.gemini_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage logs"
  ON public.gemini_usage_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
