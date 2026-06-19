import type { PatternScheme, CheckResult } from '../types'
import { MAX_SCHEMES_PER_BOX, MAX_ACTIVITY_DURATION } from '../constants'

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null
}

function colorBrightness(hex: string): number {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000
}

function colorContrast(hex1: string, hex2: string): number {
  const b1 = colorBrightness(hex1)
  const b2 = colorBrightness(hex2)
  return Math.abs(b1 - b2)
}

function isColorConflict(mainHex: string, secondaryHex: string): boolean {
  const contrast = colorContrast(mainHex, secondaryHex)
  return contrast < 50
}

export function checkSingleScheme(scheme: PatternScheme): CheckResult[] {
  const results: CheckResult[] = []

  if (isColorConflict(scheme.mainColor.hex, scheme.secondaryColor.hex)) {
    results.push({
      id: `color-conflict-${scheme.id}`,
      type: 'warning',
      message: `主色「${scheme.mainColor.name}」与辅色「${scheme.secondaryColor.name}」对比度较低，可能影响视觉层次`
    })
  }

  if (scheme.coatingCount === null || scheme.coatingCount <= 0) {
    results.push({
      id: `coating-missing-${scheme.id}`,
      type: 'error',
      message: '罩面次数未填写或无效'
    })
  }

  if (scheme.durationHours > MAX_ACTIVITY_DURATION) {
    results.push({
      id: `duration-overflow-${scheme.id}`,
      type: 'warning',
      message: `预计时长 ${scheme.durationHours} 小时超出活动窗口（建议 ≤ ${MAX_ACTIVITY_DURATION} 小时）`
    })
  }

  if (scheme.status === '需调整' && !scheme.colorDescription?.includes('调整') && !scheme.stepNotes.some(s => s.note.includes('调整'))) {
    results.push({
      id: `status-note-mismatch-${scheme.id}`,
      type: 'info',
      message: '状态为「需调整」但配色说明和步骤备注中未找到调整相关内容'
    })
  }

  if (scheme.status === '已定稿' && scheme.coatingCount === null) {
    results.push({
      id: `finalized-invalid-${scheme.id}`,
      type: 'error',
      message: '已定稿方案必须填写罩面次数'
    })
  }

  return results
}

export function checkAllSchemes(schemes: PatternScheme[]): CheckResult[] {
  const allResults: CheckResult[] = []

  const boxTypeCount: Record<string, number> = {}
  schemes.forEach(s => {
    boxTypeCount[s.boxType] = (boxTypeCount[s.boxType] || 0) + 1
  })

  Object.entries(boxTypeCount).forEach(([boxType, count]) => {
    if (count > MAX_SCHEMES_PER_BOX) {
      allResults.push({
        id: `box-overflow-${boxType}`,
        type: 'warning',
        message: `「${boxType}」已有 ${count} 个方案，建议控制在 ${MAX_SCHEMES_PER_BOX} 个以内`
      })
    }
  })

  schemes.forEach(scheme => {
    allResults.push(...checkSingleScheme(scheme))
  })

  return allResults
}

export function getSchemeCheckCount(results: CheckResult[]): { errors: number; warnings: number; infos: number } {
  return {
    errors: results.filter(r => r.type === 'error').length,
    warnings: results.filter(r => r.type === 'warning').length,
    infos: results.filter(r => r.type === 'info').length
  }
}
