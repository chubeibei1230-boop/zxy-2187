export type SchemeStatus = '待试配' | '已定稿' | '需调整' | '仅展示'

export type RiskLevel = '低' | '中' | '高'

export type LineMethod = '描金' | '描银' | '黑漆描线' | '色漆描线' | '无描线'

export type WorkbenchView = 'all' | 'priority'

export type WorkbenchTab = 'list' | 'summary'

export type ReviewConclusion = '通过' | '需调整' | '待定' | '驳回'

export type ChangeField =
  | 'name'
  | 'boxType'
  | 'mainColor'
  | 'secondaryColor'
  | 'lineMethod'
  | 'coatingCount'
  | 'durationHours'
  | 'targetAudience'
  | 'operationReminder'
  | 'status'
  | 'colorDescription'
  | 'riskLevel'
  | 'stepNotes'

export const CHANGE_FIELD_LABELS: Record<ChangeField, string> = {
  name: '方案名称',
  boxType: '盒型',
  mainColor: '主色',
  secondaryColor: '辅色',
  lineMethod: '描线方式',
  coatingCount: '罩面次数',
  durationHours: '预计时长',
  targetAudience: '适合人群',
  operationReminder: '操作提醒',
  status: '状态',
  colorDescription: '配色说明',
  riskLevel: '风险等级',
  stepNotes: '工艺步骤'
}

export interface ColorInfo {
  name: string
  hex: string
}

export interface StepNote {
  step: number
  title: string
  note: string
}

export interface ReviewRecord {
  id: string
  timestamp: number
  conclusion: ReviewConclusion
  reviewer: string
  comment: string
  statusBefore: SchemeStatus
  statusAfter: SchemeStatus
}

export interface FieldChange {
  id: string
  timestamp: number
  field: ChangeField
  fieldLabel: string
  beforeValue: string
  afterValue: string
  operator: string
  reason?: string
}

export interface AdjustmentReason {
  id: string
  createdAt: number
  content: string
}

export interface AdjustmentProgress {
  id: string
  timestamp: number
  content: string
  operator: string
}

export interface FinalizedSummary {
  generatedAt: number
  managerView: {
    decisionBasis: string
    riskAssessment: string
    keyHighlights: string[]
  }
  workbenchView: {
    executionStandard: string
    keyPoints: string[]
    qualityRequirements: string
  }
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
  reviewRecords: ReviewRecord[]
  fieldChanges: FieldChange[]
  adjustmentReasons: AdjustmentReason[]
  adjustmentProgress: AdjustmentProgress[]
  finalizedSummary: FinalizedSummary | null
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

export interface SchemeReadiness {
  isReadyForFinal: boolean
  blockingReasons: string[]
  hasMissingInfo: boolean
  hasDurationOverflow: boolean
  hasColorConflict: boolean
  hasInsufficientAdjustment: boolean
  priorityScore: number
}
