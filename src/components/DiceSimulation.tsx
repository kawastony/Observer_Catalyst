import { useState, useEffect } from 'react'
import { QComputation } from '../lib/qComputation'

interface DiceSimulationProps {
  qScore: number
  kSymbiosis: number
}

export function DiceSimulation({ qScore, kSymbiosis }: DiceSimulationProps) {
  const [rolling, setRolling] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [biasResult, setBiasResult] = useState<any>(null)

  useEffect(() => {
    const qComputation = new QComputation(kSymbiosis)
    const bias = qComputation.computeCollapseBias(qScore, 1000)
    setBiasResult(bias)
  }, [qScore, kSymbiosis])

  const rollDice = () => {
    setRolling(true)
    setResult(null)

    setTimeout(() => {
      if (biasResult) {
        const rand = Math.random()
        let cumulative = 0
        for (let i = 0; i < 6; i++) {
          cumulative += biasResult.probabilities[i]
          if (rand <= cumulative) {
            setResult(i + 1)
            break
          }
        }
      }
      setRolling(false)
    }, 1000)
  }

  if (!biasResult) return null

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <h3 className="text-2xl font-bold text-gray-800 mb-4">Quantum Collapse Bias Simulation</h3>
      <p className="text-gray-600 mb-6">
        Based on your current Q score, the dice roll probabilities are influenced by your observer state.
      </p>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-ocean-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Theoretical Bias</div>
          <div className="text-3xl font-bold text-ocean-600">
            {biasResult.theoreticalBias.toFixed(3)}
          </div>
          <div className="text-xs text-gray-500 mt-1">{biasResult.interpretation}</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Expected Average</div>
          <div className="text-3xl font-bold text-gray-800">
            {biasResult.meanDice.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Favorable: {(biasResult.favorableRate * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center mb-6">
        <div className="text-center">
          {rolling ? (
            <div className="w-24 h-24 bg-gray-200 rounded-xl flex items-center justify-center animate-spin">
              <div className="text-4xl">🎲</div>
            </div>
          ) : result ? (
            <div className={`w-24 h-24 ${result >= 4 ? 'bg-ocean-500' : 'bg-tank-500'} rounded-xl flex items-center justify-center text-white`}>
              <div className="text-5xl font-bold">{result}</div>
            </div>
          ) : (
            <div className="w-24 h-24 bg-gray-100 rounded-xl flex items-center justify-center">
              <div className="text-4xl">🎲</div>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={rollDice}
        disabled={rolling}
        className="w-full bg-ocean-600 hover:bg-ocean-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {rolling ? 'Rolling...' : 'Roll Dice'}
      </button>

      <div className="mt-6 grid grid-cols-6 gap-2">
        {biasResult.probabilities.map((prob: number, idx: number) => (
          <div key={idx} className="text-center">
            <div className="text-xs text-gray-500 mb-1">{idx + 1}</div>
            <div className="h-16 bg-gray-100 rounded relative overflow-hidden">
              <div
                className="absolute bottom-0 left-0 right-0 bg-ocean-400 transition-all"
                style={{ height: `${prob * 100 * 6}%` }}
              />
            </div>
            <div className="text-xs text-gray-600 mt-1">{(prob * 100).toFixed(1)}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}
