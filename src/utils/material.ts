import type { PatternScheme, MaterialSummary } from '../types'
import { checkSingleScheme } from './checker'

export function generateMaterialSummary(schemes: PatternScheme[]): {
  mainColors: MaterialSummary[]
  secondaryColors: MaterialSummary[]
  lineMethods: { method: string; count: number }[]
  totalSchemes: number
  totalHours: number
  boxTypeSummary: { type: string; count: number }[]
  executableSchemes: PatternScheme[]
  excludedSchemes: { name: string; reasons: string[] }[]
} {
  const finalizedSchemes = schemes.filter(s => {
    if (s.status !== '已定稿') return false
    const checks = checkSingleScheme(s)
    const hasErrors = checks.some(c => c.type === 'error')
    return !hasErrors
  })

  const excludedSchemes = schemes
    .filter(s => s.status === '已定稿')
    .map(s => ({
      scheme: s,
      checks: checkSingleScheme(s).filter(c => c.type === 'error')
    }))
    .filter(item => item.checks.length > 0)
    .map(item => ({
      name: item.scheme.name,
      reasons: item.checks.map(c => c.message)
    }))

  const mainColorMap = new Map<string, { count: number; boxTypes: Set<string> }>()
  const secondaryColorMap = new Map<string, { count: number; boxTypes: Set<string> }>()
  const lineMethodMap = new Map<string, number>()
  const boxTypeMap = new Map<string, number>()
  let totalHours = 0

  finalizedSchemes.forEach(scheme => {
    const mc = scheme.mainColor.name
    if (!mainColorMap.has(mc)) {
      mainColorMap.set(mc, { count: 0, boxTypes: new Set() })
    }
    const mcData = mainColorMap.get(mc)!
    mcData.count++
    mcData.boxTypes.add(scheme.boxType)

    const sc = scheme.secondaryColor.name
    if (!secondaryColorMap.has(sc)) {
      secondaryColorMap.set(sc, { count: 0, boxTypes: new Set() })
    }
    const scData = secondaryColorMap.get(sc)!
    scData.count++
    scData.boxTypes.add(scheme.boxType)

    const lm = scheme.lineMethod
    lineMethodMap.set(lm, (lineMethodMap.get(lm) || 0) + 1)

    boxTypeMap.set(scheme.boxType, (boxTypeMap.get(scheme.boxType) || 0) + 1)

    totalHours += scheme.durationHours
  })

  const mainColors: MaterialSummary[] = Array.from(mainColorMap.entries()).map(([color, data]) => ({
    color,
    count: data.count,
    boxTypes: Array.from(data.boxTypes)
  })).sort((a, b) => b.count - a.count)

  const secondaryColors: MaterialSummary[] = Array.from(secondaryColorMap.entries()).map(([color, data]) => ({
    color,
    count: data.count,
    boxTypes: Array.from(data.boxTypes)
  })).sort((a, b) => b.count - a.count)

  const lineMethods = Array.from(lineMethodMap.entries()).map(([method, count]) => ({ method, count })).sort((a, b) => b.count - a.count)

  const boxTypeSummary = Array.from(boxTypeMap.entries()).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count)

  return {
    mainColors,
    secondaryColors,
    lineMethods,
    totalSchemes: finalizedSchemes.length,
    totalHours,
    boxTypeSummary,
    executableSchemes: finalizedSchemes,
    excludedSchemes
  }
}
