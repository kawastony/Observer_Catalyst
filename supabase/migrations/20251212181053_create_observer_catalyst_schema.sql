/*
  # ObserverCatalyst Database Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `user_name` (text)
      - `baseline_q` (decimal, default 0.5)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `calibration_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `duration_minutes` (integer)
      - `final_q` (decimal)
      - `q_improvement` (decimal)
      - `avg_collapse_bias` (decimal)
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)
    
    - `measurements`
      - `id` (uuid, primary key)
      - `session_id` (uuid, references calibration_sessions)
      - `interval_number` (integer)
      - `q_score` (decimal)
      - `fear_density` (decimal)
      - `mood_input` (decimal)
      - `stress_input` (decimal)
      - `collapse_bias` (decimal)
      - `mean_dice` (decimal)
      - `recommendation` (text)
      - `measured_at` (timestamptz)
    
    - `user_settings`
      - `user_id` (uuid, primary key, references profiles)
      - `k_symbiosis` (decimal, default 2.8)
      - `k_death` (decimal, default -1.5)
      - `ocean_threshold` (decimal, default 0.8)
      - `tank_threshold` (decimal, default 0.5)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  user_name text NOT NULL DEFAULT 'Observer',
  baseline_q decimal NOT NULL DEFAULT 0.5 CHECK (baseline_q >= 0 AND baseline_q <= 1),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create calibration_sessions table
CREATE TABLE IF NOT EXISTS calibration_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  duration_minutes integer NOT NULL DEFAULT 10,
  final_q decimal CHECK (final_q >= 0 AND final_q <= 1),
  q_improvement decimal,
  avg_collapse_bias decimal,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE calibration_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON calibration_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sessions"
  ON calibration_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions"
  ON calibration_sessions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own sessions"
  ON calibration_sessions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create measurements table
CREATE TABLE IF NOT EXISTS measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES calibration_sessions(id) ON DELETE CASCADE,
  interval_number integer NOT NULL,
  q_score decimal NOT NULL CHECK (q_score >= 0 AND q_score <= 1),
  fear_density decimal NOT NULL CHECK (fear_density >= 0 AND fear_density <= 1),
  mood_input decimal NOT NULL CHECK (mood_input >= 0 AND mood_input <= 10),
  stress_input decimal NOT NULL CHECK (stress_input >= 0 AND stress_input <= 10),
  collapse_bias decimal NOT NULL,
  mean_dice decimal NOT NULL,
  recommendation text NOT NULL DEFAULT '',
  measured_at timestamptz DEFAULT now()
);

ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own measurements"
  ON measurements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calibration_sessions
      WHERE calibration_sessions.id = measurements.session_id
      AND calibration_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own measurements"
  ON measurements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calibration_sessions
      WHERE calibration_sessions.id = measurements.session_id
      AND calibration_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own measurements"
  ON measurements FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calibration_sessions
      WHERE calibration_sessions.id = measurements.session_id
      AND calibration_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calibration_sessions
      WHERE calibration_sessions.id = measurements.session_id
      AND calibration_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own measurements"
  ON measurements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM calibration_sessions
      WHERE calibration_sessions.id = measurements.session_id
      AND calibration_sessions.user_id = auth.uid()
    )
  );

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  k_symbiosis decimal NOT NULL DEFAULT 2.8,
  k_death decimal NOT NULL DEFAULT -1.5,
  ocean_threshold decimal NOT NULL DEFAULT 0.8 CHECK (ocean_threshold >= 0 AND ocean_threshold <= 1),
  tank_threshold decimal NOT NULL DEFAULT 0.5 CHECK (tank_threshold >= 0 AND tank_threshold <= 1)
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON user_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON calibration_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON calibration_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_measurements_session_id ON measurements(session_id);
CREATE INDEX IF NOT EXISTS idx_measurements_measured_at ON measurements(measured_at);
