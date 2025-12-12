import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useProfile } from './hooks/useProfile'
import { Auth } from './components/Auth'
import { Dashboard } from './components/Dashboard'
import { CalibrationSessionComponent } from './components/CalibrationSession'

type View = 'dashboard' | 'session'

export default function App() {
  const { user, loading, signIn, signUp, signOut } = useAuth()
  const { profile, settings, loading: profileLoading } = useProfile(user?.id)
  const [view, setView] = useState<View>('dashboard')

  if (loading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-ocean-50 via-white to-ocean-100">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <Auth onSignIn={signIn} onSignUp={signUp} />
  }

  if (!profile || !settings) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-ocean-50 via-white to-ocean-100">
        <div className="text-xl text-gray-600">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setView('dashboard')}
              className="text-2xl font-bold text-ocean-700"
            >
              ObserverCatalyst
            </button>
            <div className="flex items-center gap-4">
              <span className="text-gray-600">{profile.user_name}</span>
              <button
                onClick={signOut}
                className="text-gray-600 hover:text-gray-800 font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="py-8">
        {view === 'dashboard' ? (
          <Dashboard
            userId={user.id}
            userName={profile.user_name}
            baselineQ={parseFloat(profile.baseline_q.toString())}
            onStartSession={() => setView('session')}
          />
        ) : (
          <CalibrationSessionComponent
            userId={user.id}
            baselineQ={parseFloat(profile.baseline_q.toString())}
            settings={{
              k_symbiosis: parseFloat(settings.k_symbiosis.toString()),
              k_death: parseFloat(settings.k_death.toString()),
              ocean_threshold: parseFloat(settings.ocean_threshold.toString()),
              tank_threshold: parseFloat(settings.tank_threshold.toString()),
            }}
            onComplete={() => setView('dashboard')}
          />
        )}
      </div>
    </div>
  )
}
