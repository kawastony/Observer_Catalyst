import { useState, useEffect } from 'react'
import { supabase, type CalibrationSession, type Measurement } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts'

interface DashboardProps {
  userId: string
  userName: string
  baselineQ: number
  onStartSession: () => void
}

export function Dashboard({ userId, userName, baselineQ, onStartSession }: DashboardProps) {
  const [sessions, setSessions] = useState<CalibrationSession[]>([])
  const [selectedSession, setSelectedSession] = useState<CalibrationSession | null>(null)
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions()
  }, [userId])

  useEffect(() => {
    if (selectedSession) {
      fetchMeasurements(selectedSession.id)
    }
  }, [selectedSession])

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from('calibration_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })

    if (!error && data) {
      setSessions(data)
      if (data.length > 0 && !selectedSession) {
        setSelectedSession(data[0])
      }
    }
    setLoading(false)
  }

  const fetchMeasurements = async (sessionId: string) => {
    const { data, error } = await supabase
      .from('measurements')
      .select('*')
      .eq('session_id', sessionId)
      .order('interval_number', { ascending: true })

    if (!error && data) {
      setMeasurements(data)
    }
  }

  const getQTrendData = () => {
    return measurements.map((m) => ({
      interval: m.interval_number,
      qScore: parseFloat(m.q_score.toString()),
      fearDensity: parseFloat(m.fear_density.toString()),
    }))
  }

  const getCollapseBiasData = () => {
    return measurements.map((m) => ({
      interval: m.interval_number,
      bias: parseFloat(m.collapse_bias.toString()),
      meanDice: parseFloat(m.mean_dice.toString()),
    }))
  }

  const getAverageQ = () => {
    if (sessions.length === 0) return baselineQ
    const completedSessions = sessions.filter(s => s.final_q !== null)
    if (completedSessions.length === 0) return baselineQ
    return completedSessions.reduce((sum, s) => sum + parseFloat(s.final_q!.toString()), 0) / completedSessions.length
  }

  const getBestQ = () => {
    if (sessions.length === 0) return baselineQ
    const completedSessions = sessions.filter(s => s.final_q !== null)
    if (completedSessions.length === 0) return baselineQ
    return Math.max(...completedSessions.map(s => parseFloat(s.final_q!.toString())))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-ocean-50 via-white to-ocean-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Welcome, {userName}</h1>
              <p className="text-gray-600">Q-Calibration Dashboard</p>
            </div>
            <button
              onClick={onStartSession}
              className="bg-ocean-600 hover:bg-ocean-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              New Session
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-ocean-50 rounded-lg p-6">
              <div className="text-sm text-gray-600 mb-2">Baseline Q</div>
              <div className="text-3xl font-bold text-ocean-600">{baselineQ.toFixed(3)}</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="text-sm text-gray-600 mb-2">Average Q</div>
              <div className="text-3xl font-bold text-gray-800">{getAverageQ().toFixed(3)}</div>
            </div>

            <div className="bg-green-50 rounded-lg p-6">
              <div className="text-sm text-gray-600 mb-2">Best Q</div>
              <div className="text-3xl font-bold text-green-600">{getBestQ().toFixed(3)}</div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="text-sm text-gray-600 mb-2">Total Sessions</div>
              <div className="text-3xl font-bold text-gray-800">{sessions.length}</div>
            </div>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Sessions Yet</h2>
            <p className="text-gray-600 mb-6">Start your first calibration session to begin tracking your Q scores.</p>
            <button
              onClick={onStartSession}
              className="bg-ocean-600 hover:bg-ocean-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              Start First Session
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Session History</h2>
              <div className="space-y-2">
                {sessions.map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    className={`w-full text-left p-4 rounded-lg transition-colors ${
                      selectedSession?.id === session.id
                        ? 'bg-ocean-100 border-2 border-ocean-500'
                        : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-800">
                          {new Date(session.started_at).toLocaleDateString()} at{' '}
                          {new Date(session.started_at).toLocaleTimeString()}
                        </div>
                        {session.completed_at && (
                          <div className="text-sm text-gray-600 mt-1">
                            Duration: {session.duration_minutes} minutes
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        {session.final_q !== null ? (
                          <>
                            <div className="text-2xl font-bold text-ocean-600">
                              {parseFloat(session.final_q.toString()).toFixed(3)}
                            </div>
                            {session.q_improvement !== null && (
                              <div
                                className={`text-sm font-semibold ${
                                  parseFloat(session.q_improvement.toString()) > 0
                                    ? 'text-green-600'
                                    : 'text-tank-600'
                                }`}
                              >
                                {parseFloat(session.q_improvement.toString()) > 0 ? '+' : ''}
                                {parseFloat(session.q_improvement.toString()).toFixed(3)}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-sm text-gray-500">In Progress</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedSession && measurements.length > 0 && (
              <>
                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Q Trajectory & Fear Density</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={getQTrendData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="interval" label={{ value: 'Interval', position: 'insideBottom', offset: -5 }} />
                      <YAxis domain={[0, 1]} label={{ value: 'Score', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="qScore"
                        stroke="#0284c7"
                        strokeWidth={3}
                        name="Q Score"
                        dot={{ fill: '#0284c7', r: 4 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="fearDensity"
                        stroke="#ef4444"
                        strokeWidth={2}
                        name="Fear Density"
                        dot={{ fill: '#ef4444', r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-6">Collapse Bias Evolution</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getCollapseBiasData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="interval" label={{ value: 'Interval', position: 'insideBottom', offset: -5 }} />
                      <YAxis label={{ value: 'Value', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="bias" fill="#0284c7" name="Theoretical Bias" />
                      <Bar dataKey="meanDice" fill="#7dd3fc" name="Mean Dice" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">Recommendations</h2>
                  <div className="space-y-3">
                    {measurements.map((m) => (
                      <div key={m.id} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-sm text-gray-500 mb-1">Interval {m.interval_number}</div>
                            <div className="text-gray-800">{m.recommendation}</div>
                          </div>
                          <div className="ml-4 text-right">
                            <div className="text-lg font-bold text-ocean-600">
                              {parseFloat(m.q_score.toString()).toFixed(3)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
