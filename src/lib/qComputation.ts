export interface ManualInput {
  mood: number
  stress: number
}

export interface QComputationResult {
  qScore: number
  fearDensity: number
  sSyncEeg: number
  sSyncHrv: number
}

export interface CollapseBiasResult {
  theoreticalBias: number
  meanDice: number
  favorableRate: number
  probabilities: number[]
  qFactor: number
  interpretation: string
}

export class QComputation {
  private kSymbiosis: number

  constructor(kSymbiosis: number = 2.8) {
    this.kSymbiosis = kSymbiosis
  }

  computeQFromManualInput(
    manualInput: ManualInput,
    baselineQ: number
  ): QComputationResult {
    const mood = Math.max(0, Math.min(manualInput.mood / 10.0, 1))
    const stress = Math.max(0, Math.min(manualInput.stress / 10.0, 1))

    const sSyncEeg = mood
    const sSyncHrv = 1 - stress

    const fearBase = 1 - (sSyncEeg + sSyncHrv) / 2
    const fearDensity = fearBase * (1 - baselineQ)

    const qComputed = Math.max(
      0,
      Math.min((sSyncEeg * sSyncHrv) * (1 - fearDensity), 1)
    )

    return {
      qScore: qComputed,
      fearDensity,
      sSyncEeg,
      sSyncHrv,
    }
  }

  computeCollapseBias(qCurrent: number, nTrials: number = 1000): CollapseBiasResult {
    const psiSquaredR = qCurrent * (1 + this.kSymbiosis * Math.log(qCurrent + 1e-6))
    const collapseBias = Math.max(0, Math.min(psiSquaredR, 2.0))

    let probabilities: number[]

    if (collapseBias > 1.0) {
      probabilities = Array(6).fill(1 - collapseBias)
      for (let i = 3; i < 6; i++) {
        probabilities[i] += (collapseBias - 1.0) / 3
      }
    } else {
      probabilities = Array(6).fill(1 + (1 - collapseBias))
      for (let i = 0; i < 3; i++) {
        probabilities[i] += (1 - collapseBias) / 3
      }
    }

    const sum = probabilities.reduce((a, b) => a + b, 0)
    probabilities = probabilities.map(p => p / sum)

    const outcomes: number[] = []
    for (let i = 0; i < nTrials; i++) {
      const rand = Math.random()
      let cumulative = 0
      for (let j = 0; j < 6; j++) {
        cumulative += probabilities[j]
        if (rand <= cumulative) {
          outcomes.push(j + 1)
          break
        }
      }
    }

    const meanOutcome = outcomes.reduce((a, b) => a + b, 0) / outcomes.length
    const favorableRate = outcomes.filter(o => o >= 4).length / outcomes.length

    return {
      theoreticalBias: collapseBias,
      meanDice: meanOutcome,
      favorableRate,
      probabilities,
      qFactor: qCurrent,
      interpretation: collapseBias > 1 ? 'Ocean Tilt (+)' : 'Tank Drag (-)',
    }
  }

  getRecommendation(qScore: number, oceanThreshold: number = 0.8, tankThreshold: number = 0.5): string {
    if (qScore < tankThreshold) {
      return 'TANK: High fear density. Practice: Deep breathing, release disagreement.'
    } else if (qScore < oceanThreshold) {
      return 'NEUTRAL: Building poise. Focus: Gratitude, unity consciousness meditation.'
    } else {
      return 'OCEAN: High Q achieved! Maintain: Loving awareness, symbiotic mindset.'
    }
  }

  getQState(qScore: number, oceanThreshold: number = 0.8, tankThreshold: number = 0.5): 'tank' | 'neutral' | 'ocean' {
    if (qScore < tankThreshold) return 'tank'
    if (qScore < oceanThreshold) return 'neutral'
    return 'ocean'
  }
}
