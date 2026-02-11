/*
  # Create shot_analyses table for storing basketball shot analysis results

  1. New Tables
    - `shot_analyses`
      - `id` (uuid, primary key, auto-generated)
      - `user_id` (uuid, foreign key to auth.users, cascade on delete)
      - `created_at` (timestamptz, auto-set to now())
      - `shot_type` (text, nullable - stores '3pt', 'ft', 'layup', 'mid')
      - `score` (integer, nullable - 0-100 shooting form score)
      - `metrics` (jsonb, stores all 10 ShotMetrics values)
      - `strengths` (jsonb array, stores strength bullet points)
      - `improvements` (jsonb array, stores improvement recommendations)
      - `ai_coach_tip` (jsonb, nullable - stores CoachTip object)
      - `engine_version` (text, nullable - for future tracking)
      - `source` (text, default 'client' - tracking where analysis came from)
      - `video_meta` (jsonb, stores processedFrames, totalFrames, etc.)

  2. Indexes
    - Composite index on (user_id, created_at DESC) for fast user history queries

  3. Security
    - Enable RLS on `shot_analyses` table
    - Add policy for authenticated users to read their own data
    - Add policy for authenticated users to insert their own data
    - Add policy for authenticated users to update their own data
    - Add policy for authenticated users to delete their own data
*/

-- Create shot_analyses table
CREATE TABLE IF NOT EXISTS shot_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  shot_type text,
  score int,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  improvements jsonb NOT NULL DEFAULT '[]'::jsonb,
  ai_coach_tip jsonb,
  engine_version text,
  source text NOT NULL DEFAULT 'client',
  video_meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- Create index for fast user queries sorted by date
CREATE INDEX IF NOT EXISTS shot_analyses_user_created_at_idx
  ON shot_analyses (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE shot_analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own analyses
CREATE POLICY "Users can read own shot analyses"
  ON shot_analyses
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own analyses
CREATE POLICY "Users can insert own shot analyses"
  ON shot_analyses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own analyses
CREATE POLICY "Users can update own shot analyses"
  ON shot_analyses
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own analyses
CREATE POLICY "Users can delete own shot analyses"
  ON shot_analyses
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
