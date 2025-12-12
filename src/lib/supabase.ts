import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Profile {
  id: string
  user_name: string
  baseline_q: number
  created_at: string
  updated_at: string
}

export interface CalibrationSession {
  id: string
  user_id: string
  duration_minutes: number
  final_q: number | null
  q_improvement: number | null
  avg_collapse_bias: number | null
  started_at: string
  completed_at: string | null
}

export interface Measurement {
  id: string
  session_id: string
  interval_number: number
  q_score: number
  fear_density: number
  mood_input: number
  stress_input: number
  collapse_bias: number
  mean_dice: number
  recommendation: string
  measured_at: string
}

export interface UserSettings {
  user_id: string
  k_symbiosis: number
  k_death: number
  ocean_threshold: number
  tank_threshold: number
}
