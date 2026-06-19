import type { PatternScheme, ColorInfo, StepNote, SchemeStatus, LineMethod, RiskLevel } from '../types'
import { BOX_TYPES, COLORS, LINE_METHODS, STATUSES, RISK_LEVELS } from '../constants'

const STORAGE_KEY = 'lacquer_pattern_schemes'

function isValidColorInfo(obj: unknown): obj is ColorInfo {
  if (!obj || typeof obj !== 'object') return false
  const c = obj as Record<string, unknown>
  return typeof c.name === 'string' && typeof c.hex === 'string'
}

function isValidStepNote(obj: unknown): obj is StepNote {
  if (!obj || typeof obj !== 'object') return false
  const s = obj as Record<string, unknown>
  return typeof s.step === 'number' && typeof s.title === 'string' && typeof s.note === 'string'
}

function isInArray<T>(value: unknown, arr: readonly T[]): value is T {
  return arr.includes(value as T)
}

function validateScheme(obj: unknown, index: number): { scheme: PatternScheme; issues: string[] } {
  const issues: string[] = []
  const o = (obj || {}) as Record<string, unknown>

  if (!obj || typeof obj !== 'object') {
    issues.push(`第 ${index + 1} 项：不是有效的对象`)
  }

  const name = typeof o.name === 'string' ? o.name : ''
  if (!name) {
    issues.push(`第 ${index + 1} 项：缺少方案名称，已自动填写`)
  }

  const boxType = isInArray(o.boxType, BOX_TYPES) ? o.boxType : BOX_TYPES[0]
  if (!isInArray(o.boxType, BOX_TYPES)) {
    issues.push(`第 ${index + 1} 项：盒型「${o.boxType}」无效，已自动修正为「${boxType}」`)
  }

  const mainColor = isValidColorInfo(o.mainColor)
    ? o.mainColor
    : (COLORS.find(c => c.name === (o.mainColor as ColorInfo)?.name) || COLORS[0])
  if (!isValidColorInfo(o.mainColor)) {
    issues.push(`第 ${index + 1} 项：主色格式无效，已自动修正`)
  }

  const secondaryColor = isValidColorInfo(o.secondaryColor)
    ? o.secondaryColor
    : (COLORS.find(c => c.name === (o.secondaryColor as ColorInfo)?.name) || COLORS[3])
  if (!isValidColorInfo(o.secondaryColor)) {
    issues.push(`第 ${index + 1} 项：辅色格式无效，已自动修正`)
  }

  const lineMethod = isInArray(o.lineMethod, LINE_METHODS) ? o.lineMethod : '描金'
  if (!isInArray(o.lineMethod, LINE_METHODS)) {
    issues.push(`第 ${index + 1} 项：描线方式无效，已自动修正为「描金」`)
  }

  const coatingCount = typeof o.coatingCount === 'number' && o.coatingCount >= 0
    ? o.coatingCount
    : (o.coatingCount === null ? null : null)

  const durationHours = typeof o.durationHours === 'number' && o.durationHours >= 0 ? o.durationHours : 4
  if (!(typeof o.durationHours === 'number' && o.durationHours >= 0)) {
    issues.push(`第 ${index + 1} 项：时长无效，已自动修正为 4 小时`)
  }

  const targetAudience = typeof o.targetAudience === 'string' ? o.targetAudience : ''
  const operationReminder = typeof o.operationReminder === 'string' ? o.operationReminder : ''

  const status = isInArray(o.status, STATUSES) ? o.status : '待试配'
  if (!isInArray(o.status, STATUSES)) {
    issues.push(`第 ${index + 1} 项：状态无效，已自动修正为「待试配」`)
  }

  const colorDescription = typeof o.colorDescription === 'string' ? o.colorDescription : ''

  let stepNotes: StepNote[] = [{ step: 1, title: '制胎', note: '' }]
  if (Array.isArray(o.stepNotes) && o.stepNotes.length > 0) {
    stepNotes = o.stepNotes
      .map((s, i) => {
        if (isValidStepNote(s)) return s
        return { step: i + 1, title: `步骤${i + 1}`, note: '' }
      })
      .filter((s): s is StepNote => s !== null)
    if (stepNotes.length !== o.stepNotes.length) {
      issues.push(`第 ${index + 1} 项：部分步骤格式无效，已自动修正`)
    }
  } else {
    issues.push(`第 ${index + 1} 项：步骤为空，已自动添加默认步骤`)
  }

  const riskLevel = isInArray(o.riskLevel, RISK_LEVELS) ? o.riskLevel : '中'
  if (!isInArray(o.riskLevel, RISK_LEVELS)) {
    issues.push(`第 ${index + 1} 项：风险等级无效，已自动修正为「中」`)
  }

  const now = Date.now()
  const scheme: PatternScheme = {
    id: typeof o.id === 'string' && o.id ? o.id : generateId(),
    name: name || `方案${index + 1}`,
    boxType,
    mainColor,
    secondaryColor,
    lineMethod,
    coatingCount,
    durationHours,
    targetAudience,
    operationReminder,
    status,
    colorDescription,
    stepNotes,
    riskLevel,
    createdAt: typeof o.createdAt === 'number' && o.createdAt > 0 ? o.createdAt : now,
    updatedAt: typeof o.updatedAt === 'number' && o.updatedAt > 0 ? o.updatedAt : now
  }

  return { scheme, issues }
}

export function loadSchemes(): PatternScheme[] {
  try {
    const data = sessionStorage.getItem(STORAGE_KEY)
    if (data) {
      const parsed = JSON.parse(data)
      if (Array.isArray(parsed)) {
        const validated = parsed.map((item, i) => validateScheme(item, i).scheme)
        return validated
      }
    }
  } catch (e) {
    console.error('Failed to load schemes from storage:', e)
  }
  return []
}

export function saveSchemes(schemes: PatternScheme[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(schemes))
  } catch (e) {
    console.error('Failed to save schemes to storage:', e)
  }
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

export function exportToJson(schemes: PatternScheme[]): void {
  const dataStr = JSON.stringify(schemes, null, 2)
  const blob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `漆盒纹样方案_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function importFromJson(file: File): Promise<{ schemes: PatternScheme[]; issues: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        let data: unknown
        try {
          data = JSON.parse(content)
        } catch (parseErr) {
          reject(new Error('JSON 解析失败，请检查文件格式是否正确'))
          return
        }

        if (!Array.isArray(data)) {
          reject(new Error('JSON 文件格式不正确，根节点应该是数组'))
          return
        }

        if (data.length === 0) {
          reject(new Error('JSON 文件中没有方案数据'))
          return
        }

        const allIssues: string[] = []
        const validatedSchemes: PatternScheme[] = []

        data.forEach((item, index) => {
          const { scheme, issues } = validateScheme(item, index)
          validatedSchemes.push(scheme)
          allIssues.push(...issues)
        })

        resolve({ schemes: validatedSchemes, issues: allIssues })
      } catch (err) {
        reject(new Error(`导入失败：${(err as Error).message}`))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}
