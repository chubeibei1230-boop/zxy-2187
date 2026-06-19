import type { PatternScheme, CheckResult, SchemeReadiness } from '../types'
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

export function getSchemeReadiness(scheme: PatternScheme): SchemeReadiness {
  const checks = checkSingleScheme(scheme)
  const errors = checks.filter(c => c.type === 'error')
  const warnings = checks.filter(c => c.type === 'warning')
  const infos = checks.filter(c => c.type === 'info')

  const blockingReasons = errors.map(e => e.message)

  const hasMissingInfo =
    scheme.coatingCount === null ||
    scheme.targetAudience.trim() === '' ||
    scheme.operationReminder.trim() === '' ||
    scheme.colorDescription.trim() === '' ||
    scheme.stepNotes.some(s => s.title.trim() === '' || s.note.trim() === '')

  const hasDurationOverflow = scheme.durationHours > MAX_ACTIVITY_DURATION

  const hasColorConflict = isColorConflict(scheme.mainColor.hex, scheme.secondaryColor.hex)

  const hasInsufficientAdjustment =
    scheme.status === '需调整' &&
    !scheme.colorDescription.includes('调整') &&
    !scheme.stepNotes.some(s => s.note.includes('调整'))

  let priorityScore = 0
  if (errors.length > 0) priorityScore += errors.length * 100
  if (warnings.length > 0) priorityScore += warnings.length * 10
  if (infos.length > 0) priorityScore += infos.length * 1
  if (scheme.status === '需调整') priorityScore += 50
  if (scheme.status === '待试配') priorityScore += 20

  const isReadyForFinal =
    blockingReasons.length === 0 &&
    !hasMissingInfo &&
    !hasDurationOverflow &&
    !hasColorConflict &&
    scheme.status !== '需调整' &&
    scheme.status !== '仅展示'

  return {
    isReadyForFinal,
    blockingReasons,
    hasMissingInfo,
    hasDurationOverflow,
    hasColorConflict,
    hasInsufficientAdjustment,
    priorityScore
  }
}

export function isPriorityScheme(scheme: PatternScheme): boolean {
  const readiness = getSchemeReadiness(scheme)
  return (
    readiness.hasMissingInfo ||
    readiness.hasDurationOverflow ||
    readiness.hasColorConflict ||
    readiness.hasInsufficientAdjustment ||
    readiness.blockingReasons.length > 0
  )
}

export function sortSchemesByPriority(schemes: PatternScheme[]): PatternScheme[] {
  return [...schemes].sort((a, b) => {
    const ra = getSchemeReadiness(a)
    const rb = getSchemeReadiness(b)
    if (rb.priorityScore !== ra.priorityScore) {
      return rb.priorityScore - ra.priorityScore
    }
    return b.updatedAt - a.updatedAt
  })
}
