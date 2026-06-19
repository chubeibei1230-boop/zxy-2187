export type SchemeStatus = '待试配' | '已定稿' | '需调整' | '仅展示'

export type RiskLevel = '低' | '中' | '高'

export type LineMethod = '描金' | '描银' | '黑漆描线' | '色漆描线' | '无描线'

export interface ColorInfo {
  name: string
  hex: string
}

export interface StepNote {
  step: number
  title: string
  note: string
}

export interface PatternScheme {
  id: string
  name: string
  boxType: string
  mainColor: ColorInfo
  secondaryColor: ColorInfo
  lineMethod: LineMethod
  coatingCount: number | null
  durationHours: number
  targetAudience: string
  operationReminder: string
  status: SchemeStatus
  colorDescription: string
  stepNotes: StepNote[]
  riskLevel: RiskLevel
  createdAt: number
  updatedAt: number
}

export interface FilterOptions {
  boxType: string
  mainColor: string
  status: SchemeStatus | ''
  minDuration: number | null
  maxDuration: number | null
  riskLevel: RiskLevel | ''
}

export interface CheckResult {
  id: string
  type: 'error' | 'warning' | 'info'
  message: string
}

export interface MaterialSummary {
  color: string
  count: number
  boxTypes: string[]
}
