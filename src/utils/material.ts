import type { PatternScheme, MaterialSummary } from '../types'
import { checkSingleScheme, getSchemeReadiness } from './checker'

export function generateMaterialSummary(schemes: PatternScheme[]): {
  mainColors: MaterialSummary[]
  secondaryColors: MaterialSummary[]
  lineMethods: { method: string; count: number }[]
  totalSchemes: number
  totalHours: number
  boxTypeSummary: { type: string; count: number }[]
  executableSchemes: PatternScheme[]
  allFinalizedSchemes: PatternScheme[]
  excludedSchemes: { name: string; reasons: string[] }[]
} {
  const allFinalizedSchemes = schemes.filter(s => s.status === '已定稿')
  const finalizedSchemes = allFinalizedSchemes.filter(s => {
    const readiness = getSchemeReadiness(s)
    return readiness.isReadyForFinal
  })

  const excludedSchemes = schemes
    .filter(s => s.status === '已定稿')
    .map(s => {
      const readiness = getSchemeReadiness(s)
      const reasons: string[] = []
      if (readiness.blockingReasons.length > 0) reasons.push(...readiness.blockingReasons)
      if (readiness.hasMissingInfo) reasons.push('存在缺失的必填信息')
      if (readiness.hasDurationOverflow) reasons.push(`预计时长 ${s.durationHours}h 超出建议上限`)
      if (readiness.hasColorConflict) reasons.push('主辅色对比度较低，可能影响视觉层次')
      return { scheme: s, reasons }
    })
    .filter(item => item.reasons.length > 0)
    .map(item => ({
      name: item.scheme.name,
      reasons: item.reasons
    }))

  const mainColorMap = new Map<string, { count: number; boxTypes: Set<string> }>()
  const secondaryColorMap = new Map<string, { count: number; boxTypes: Set<string> }>()
  const lineMethodMap = new Map<string, number>()
  const boxTypeMap = new Map<string, number>()
  let totalHours = 0

  allFinalizedSchemes.forEach(scheme => {
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
    totalSchemes: allFinalizedSchemes.length,
    totalHours,
    boxTypeSummary,
    executableSchemes: finalizedSchemes,
    allFinalizedSchemes,
    excludedSchemes
  }
}
