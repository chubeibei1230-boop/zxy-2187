import type { PatternScheme, MaterialSummary } from '../types'

export function generateMaterialSummary(schemes: PatternScheme[]): {
  mainColors: MaterialSummary[]
  secondaryColors: MaterialSummary[]
  lineMethods: { method: string; count: number }[]
  totalSchemes: number
  totalHours: number
  boxTypeSummary: { type: string; count: number }[]
} {
  const finalizedSchemes = schemes.filter(s => s.status === '已定稿')

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
    boxTypeSummary
  }
}
