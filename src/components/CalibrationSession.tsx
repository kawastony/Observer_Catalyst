import { useState, useEffect } from 'react'
import { supabase, type Measurement } from '../lib/supabase'
import { QComputation } from '../lib/qComputation'
import { DiceSimulation } from './DiceSimulation'

interface CalibrationSessionProps {
  userId: string
  baselineQ: number
  settings: {
    k_symbiosis: number
    k_death: number
    ocean_threshold: number
    tank_threshold: number
  }
  onComplete: () => void
}

export function CalibrationSessionComponent({
  userId,
  baselineQ,
  settings,
  onComplete,
}: CalibrationSessionProps) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [intervalNumber, setIntervalNumber] = useState(0)
  const [mood, setMood] = useState(5)
  const [stress, setStress] = useState(5)
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [currentQ, setCurrentQ] = useState(baselineQ)
  const [isActive, setIsActive] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(30)
  const [durationMinutes] = useState(5)
  const intervalSeconds = 30

  const qComputation = new QComputation(settings.k_symbiosis)

  const startSession = async () => {
    const { data, error } = await supabase
      .from('calibration_sessions')
      .insert({
        user_id: userId,
        duration_minutes: durationMinutes,
      })
      .select()
      .single()

    if (error) {
      console.error('Error starting session:', error)
      return
    }

    setSessionId(data.id)
    setIsActive(true)
    setIntervalNumber(1)
  }

  const saveMeasurement = async () => {
    if (!sessionId) return

    const result = qComputation.computeQFromManualInput({ mood, stress }, baselineQ)
    const biasResult = qComputation.computeCollapseBias(result.qScore)
    const recommendation = qComputation.getRecommendation(
      result.qScore,
      settings.ocean_threshold,
      settings.tank_threshold
    )

    const { data, error } = await supabase
      .from('measurements')
      .insert({
        session_id: sessionId,
        interval_number: intervalNumber,
        q_score: result.qScore,
        fear_density: result.fearDensity,
        mood_input: mood,
        stress_input: stress,
        collapse_bias: biasResult.theoreticalBias,
        mean_dice: biasResult.meanDice,
        recommendation,
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving measurement:', error)
      return
    }

    setMeasurements([...measurements, data])
    setCurrentQ(result.qScore)

    if (intervalNumber >= (durationMinutes * 60) / intervalSeconds) {
      await completeSession(result.qScore)
    } else {
      setIntervalNumber(intervalNumber + 1)
      setTimeRemaining(intervalSeconds)
    }
  }

  const completeSession = async (finalQ: number) => {
    if (!sessionId) return

    const avgBias = measurements.reduce((sum, m) => sum + m.collapse_bias, 0) / measurements.length

    await supabase
      .from('calibration_sessions')
      .update({
        final_q: finalQ,
        q_improvement: finalQ - baselineQ,
        avg_collapse_bias: avgBias,
        completed_at: new Date().toISOString(),
      })
      .eq('id', sessionId)

    setIsActive(false)
    onComplete()
  }

  useEffect(() => {
    if (!isActive || timeRemaining === 0) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [isActive, timeRemaining])

  const getStateColor = () => {
    const state = qComputation.getQState(currentQ, settings.ocean_threshold, settings.tank_threshold)
    if (state === 'ocean') return 'bg-ocean-500'
    if (state === 'neutral') return 'bg-yellow-500'
    return 'bg-tank-500'
  }

  const getStateText = () => {
    const state = qComputation.getQState(currentQ, settings.ocean_threshold, settings.tank_threshold)
    if (state === 'ocean') return 'OCEAN: High Q Achieved'
    if (state === 'neutral') return 'NEUTRAL: Building Poise'
    return 'TANK: High Fear Density'
  }

  if (!isActive && !sessionId) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Start Q-Calibration Session</h2>
          <p className="text-gray-600 mb-6">
            Begin a {durationMinutes}-minute calibration session. You'll be prompted every {intervalSeconds} seconds
            to input your current mood and stress levels. The system will compute your Observer Quality (Q)
            score and provide real-time feedback.
          </p>
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between p-4 bg-ocean-50 rounded-lg">
              <span className="font-medium text-gray-700">Current Baseline Q:</span>
              <span className="text-2xl font-bold text-ocean-600">{baselineQ.toFixed(3)}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">Duration:</span>
              <span className="text-lg font-semibold text-gray-800">{durationMinutes} minutes</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="font-medium text-gray-700">Intervals:</span>
              <span className="text-lg font-semibold text-gray-800">Every {intervalSeconds} seconds</span>
            </div>
          </div>
          <button
            onClick={startSession}
            className="w-full bg-ocean-600 hover:bg-ocean-700 text-white font-semibold py-4 rounded-lg transition-colors"
          >
            Begin Calibration
          </button>
        </div>
      </div>
    )
  }

  if (!isActive && sessionId) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-ocean-700 mb-4">Session Complete</h2>
          <p className="text-gray-600 mb-4">Your calibration session has been saved.</p>
          <div className="text-5xl font-bold text-ocean-600 mb-2">{currentQ.toFixed(3)}</div>
          <p className="text-gray-500 mb-6">Final Q Score</p>
          <button
            onClick={onComplete}
            className="bg-ocean-600 hover:bg-ocean-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            View Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Calibration in Progress</h2>
            <p className="text-gray-600">
              Interval {intervalNumber} of {(durationMinutes * 60) / intervalSeconds}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-ocean-600">{timeRemaining}s</div>
            <div className="text-sm text-gray-500">until next interval</div>
          </div>
        </div>

        <div className={`${getStateColor()} text-white rounded-lg p-4 mb-6`}>
          <div className="flex items-center justify-between">
            <span className="font-semibold">{getStateText()}</span>
            <span className="text-2xl font-bold">Q: {currentQ.toFixed(3)}</span>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mood (0 = Low, 10 = High): {mood}
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={mood}
              onChange={(e) => setMood(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-ocean-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Low</span>
              <span>Neutral</span>
              <span>High</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stress (0 = None, 10 = Extreme): {stress}
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={stress}
              onChange={(e) => setStress(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-tank-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>None</span>
              <span>Moderate</span>
              <span>Extreme</span>
            </div>
          </div>

          <button
            onClick={saveMeasurement}
            className="w-full bg-ocean-600 hover:bg-ocean-700 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Submit Measurement
          </button>
        </div>
      </div>

      {measurements.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Measurements</h3>
          <div className="space-y-2">
            {measurements.slice(-3).reverse().map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-600">
                  Interval {m.interval_number}
                </span>
                <span className="text-sm font-bold text-ocean-600">Q: {m.q_score.toFixed(3)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <DiceSimulation qScore={currentQ} kSymbiosis={settings.k_symbiosis} />
    </div>
  )
}
