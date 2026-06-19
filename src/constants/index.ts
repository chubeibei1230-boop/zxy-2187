import type { ColorInfo, LineMethod, RiskLevel, SchemeStatus, ExecutionStatus, TestResult } from '../types'

export const BOX_TYPES = [
  '方形食盒',
  '圆形捧盒',
  '葵瓣式盒',
  '海棠式盒',
  '委角方盒',
  '长方套盒',
  '八方盒',
  '瓜棱形盒'
]

export const COLORS: ColorInfo[] = [
  { name: '朱砂红', hex: '#C82506' },
  { name: '珊瑚红', hex: '#F26B6B' },
  { name: '胭脂红', hex: '#9D2933' },
  { name: '金黄', hex: '#FFB61E' },
  { name: '明黄', hex: '#FFD700' },
  { name: '土黄', hex: '#C9A86C' },
  { name: '石绿', hex: '#2B8A6E' },
  { name: '翠绿', hex: '#00A86B' },
  { name: '孔雀绿', hex: '#00A693' },
  { name: '石青', hex: '#1E5C91' },
  { name: '藏蓝', hex: '#2A3F68' },
  { name: '天蓝', hex: '#4A90D9' },
  { name: '紫色', hex: '#7B5EA7' },
  { name: '藕荷', hex: '#C9A0DC' },
  { name: '黑色', hex: '#1A1A1A' },
  { name: '白色', hex: '#F5F5F5' },
  { name: '褐色', hex: '#8B5A2B' },
  { name: '棕色', hex: '#6B4423' }
]

export const LINE_METHODS: LineMethod[] = [
  '描金',
  '描银',
  '黑漆描线',
  '色漆描线',
  '无描线'
]

export const STATUSES: SchemeStatus[] = [
  '待试配',
  '已定稿',
  '需调整',
  '仅展示'
]

export const RISK_LEVELS: RiskLevel[] = ['低', '中', '高']

export const STATUS_COLOR_MAP: Record<SchemeStatus, string> = {
  '待试配': '#FFB61E',
  '已定稿': '#00A86B',
  '需调整': '#C82506',
  '仅展示': '#7B5EA7'
}

export const RISK_COLOR_MAP: Record<RiskLevel, string> = {
  '低': '#00A86B',
  '中': '#FFB61E',
  '高': '#C82506'
}

export const EXECUTION_STATUSES: ExecutionStatus[] = ['待执行', '执行中', '已完成', '需返工']

export const EXECUTION_STATUS_COLOR_MAP: Record<ExecutionStatus, string> = {
  '待执行': '#6C757D',
  '执行中': '#17A2B8',
  '已完成': '#00A86B',
  '需返工': '#C82506'
}

export const TEST_RESULTS: TestResult[] = ['通过', '需调整', '待定']

export const TEST_RESULT_COLOR_MAP: Record<TestResult, string> = {
  '通过': '#00A86B',
  '需调整': '#C82506',
  '待定': '#FFB61E'
}

export const MAX_SCHEMES_PER_BOX = 5

export const MAX_ACTIVITY_DURATION = 8
