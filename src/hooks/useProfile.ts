import { useState, useEffect } from 'react'
import { supabase, type Profile, type UserSettings } from '../lib/supabase'

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      const [profileResult, settingsResult] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
      ])

      if (profileResult.data) setProfile(profileResult.data)
      if (settingsResult.data) setSettings(settingsResult.data)
      setLoading(false)
    }

    fetchData()
  }, [userId])

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!userId) return

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)

    if (error) throw error
    setProfile(prev => (prev ? { ...prev, ...updates } : null))
  }

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!userId) return

    const { error } = await supabase
      .from('user_settings')
      .update(updates)
      .eq('user_id', userId)

    if (error) throw error
    setSettings(prev => (prev ? { ...prev, ...updates } : null))
  }

  return {
    profile,
    settings,
    loading,
    updateProfile,
    updateSettings,
  }
}
