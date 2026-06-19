import './styles.css'
import type {
  PatternScheme,
  FilterOptions,
  StepNote,
  SchemeStatus,
  RiskLevel,
  ColorInfo,
  WorkbenchView,
  WorkbenchTab,
  SchemeReadiness,
  ReviewRecord,
  FieldChange,
  AdjustmentReason,
  AdjustmentProgress,
  FinalizedSummary,
  ReviewConclusion,
  ChangeField
} from './types'
import {
  CHANGE_FIELD_LABELS
} from './types'
import {
  BOX_TYPES,
  COLORS,
  LINE_METHODS,
  STATUSES,
  RISK_LEVELS,
  STATUS_COLOR_MAP,
  RISK_COLOR_MAP,
  MAX_ACTIVITY_DURATION
} from './constants'
import { loadSchemes, saveSchemes, generateId, exportToJson, importFromJson } from './utils/storage'
import {
  checkAllSchemes,
  checkSingleScheme,
  getSchemeReadiness,
  isPriorityScheme,
  sortSchemesByPriority
} from './utils/checker'
import { filterSchemes, sortSchemes } from './utils/filter'
import { generateMaterialSummary } from './utils/material'
import { createSampleSchemes } from './utils/sampleData'

type AppView = 'manager' | 'workbench'

const REVIEW_CONCLUSION_COLORS: Record<ReviewConclusion, string> = {
  '通过': '#00A86B',
  '需调整': '#C82506',
  '待定': '#FFB61E',
  '驳回': '#7B5EA7'
}

class App {
  private schemes: PatternScheme[] = []
  private selectedId: string | null = null
  private selectedIds: Set<string> = new Set()
  private filters: FilterOptions = {
    boxType: '',
    mainColor: '',
    status: '',
    minDuration: null,
    maxDuration: null,
    riskLevel: ''
  }
  private showChecks = true
  private showFinalizedModal = false
  private batchMode = false

  private currentView: AppView = 'workbench'
  private workbenchTab: WorkbenchTab = 'list'
  private workbenchView: WorkbenchView = 'all'
  private workbenchSelectedId: string | null = null
  private workbenchFilters: FilterOptions = {
    boxType: '',
    mainColor: '',
    status: '',
    minDuration: null,
    maxDuration: null,
    riskLevel: ''
  }

  private summaryTabManager: Record<string, 'manager' | 'workbench'> = {}

  private appElement: HTMLElement

  constructor() {
    this.appElement = document.getElementById('app')!
    this.init()
  }

  private init(): void {
    const stored = loadSchemes()
    if (stored.length > 0) {
      this.schemes = stored.map(s => ({
        ...s,
        reviewRecords: s.reviewRecords || [],
        fieldChanges: s.fieldChanges || [],
        adjustmentReasons: s.adjustmentReasons || [],
        adjustmentProgress: s.adjustmentProgress || [],
        finalizedSummary: s.finalizedSummary || null
      }))
    } else {
      this.schemes = createSampleSchemes()
      this.save()
    }

    if (this.schemes.length > 0) {
      this.selectedId = this.schemes[0].id
      this.workbenchSelectedId = this.schemes[0].id
    }

    this.render()
  }

  private save(): void {
    saveSchemes(this.schemes)
  }

  private getSelectedScheme(): PatternScheme | undefined {
    return this.schemes.find(s => s.id === this.selectedId)
  }

  private getWorkbenchSelectedScheme(): PatternScheme | undefined {
    return this.schemes.find(s => s.id === this.workbenchSelectedId)
  }

  private getFilteredSchemes(): PatternScheme[] {
    let result = filterSchemes(this.schemes, this.filters)
    result = sortSchemes(result, 'updatedAt', false)
    return result
  }

  private getWorkbenchFilteredSchemes(): PatternScheme[] {
    let result = filterSchemes(this.schemes, this.workbenchFilters)
    if (this.workbenchView === 'priority') {
      result = result.filter(s => isPriorityScheme(s))
      result = sortSchemesByPriority(result)
    } else {
      result = sortSchemesByPriority(result)
    }
    return result
  }

  private formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const mm = String(date.getMinutes()).padStart(2, '0')
    return `${y}-${m}-${d} ${hh}:${mm}`
  }

  private serializeFieldValue(field: ChangeField, scheme: PatternScheme): string {
    const value = (scheme as any)[field]
    return this.serializeValue(field, value)
  }

  private serializeValue(field: ChangeField, value: any): string {
    if (value === null || value === undefined) return '（未设置）'
    switch (field) {
      case 'mainColor':
      case 'secondaryColor':
        return value ? `${value.name}(${value.hex})` : '（未设置）'
      case 'coatingCount':
        return value !== null ? `${value} 次` : '（未设置）'
      case 'durationHours':
        return `${value} 小时`
      case 'riskLevel':
        return `${value}风险`
      case 'stepNotes':
        if (Array.isArray(value) && value.length > 0) {
          return `共 ${value.length} 步`
        }
        return '（无步骤）'
      default:
        if (typeof value === 'string') {
          return value || '（未填写）'
        }
        return String(value)
    }
  }

  private generateFieldChange(id: string, field: ChangeField, before: any, after: any, operator: string, reason?: string): FieldChange {
    return {
      id: generateId(),
      timestamp: Date.now(),
      field,
      fieldLabel: CHANGE_FIELD_LABELS[field],
      beforeValue: this.serializeValue(field, before),
      afterValue: this.serializeValue(field, after),
      operator,
      reason
    }
  }

  private autoGenerateSummary(scheme: PatternScheme): FinalizedSummary {
    const highlights: string[] = []
    highlights.push(`盒型采用「${scheme.boxType}」，工艺类型明确`)
    highlights.push(`主色「${scheme.mainColor.name}」搭配辅色「${scheme.secondaryColor.name}」，视觉层次清晰`)
    highlights.push(`描线方式：${scheme.lineMethod}，工艺细节明确`)
    if (scheme.coatingCount !== null) highlights.push(`罩面次数：${scheme.coatingCount} 次`)
    highlights.push(`预计工时：${scheme.durationHours} 小时`)
    highlights.push(`适合人群：${scheme.targetAudience || '通用'}`)

    const keyPoints: string[] = []
    keyPoints.push(`确认盒型：${scheme.boxType}`)
    keyPoints.push(`主色 ${scheme.mainColor.name} (${scheme.mainColor.hex})`)
    keyPoints.push(`辅色 ${scheme.secondaryColor.name} (${scheme.secondaryColor.hex})`)
    keyPoints.push(`描线：${scheme.lineMethod}`)
    if (scheme.coatingCount !== null) keyPoints.push(`罩面：${scheme.coatingCount} 次`)
    keyPoints.push(`总工时：${scheme.durationHours} 小时`)
    keyPoints.push(`步骤数：${scheme.stepNotes.length} 步`)

    const decisionBasis = `经过综合评审，本方案在盒型选型合理，主辅色搭配协调，工艺流程明确，具备可执行性，符合活动物料准备标准。`

    let riskAssessment = ''
    if (scheme.riskLevel === '高') {
      riskAssessment = '本方案工艺复杂度较高，对制作人员技术要求高，需安排经验丰富的工艺师全程把控质量，严格按照工艺要求执行。'
    } else if (scheme.riskLevel === '中') {
      riskAssessment = '本方案存在一定工艺难度，需按规范操作，重点关注配色准确性和工艺细节，注意关键环节质量把控。'
    } else {
      riskAssessment = '本方案工艺难度较低，适合常规制作流程，风险可控，按标准工艺标准执行即可。'
    }

    const executionStandard = `按标准工艺流程执行，确保每一步工艺参数准确，注意配色均匀性，保证成品质量一致。`

    const qualityRequirements = `严格遵循工艺规范，确保配色准确、线条流畅、罩面均匀，成品达到${scheme.riskLevel}风险等级对应质量标准。`

    return {
      generatedAt: Date.now(),
      managerView: {
        decisionBasis,
        riskAssessment,
        keyHighlights: highlights
      },
      workbenchView: {
        executionStandard,
        keyPoints,
        qualityRequirements
      }
    }
  }

  private tryUpdateStatus(id: string, newStatus: SchemeStatus): boolean {
    const scheme = this.schemes.find(s => s.id === id)
    if (!scheme) return false

    if (newStatus === '需调整' && scheme.status !== '需调整') {
      const reason = prompt('请输入调整原因：', '')
      if (reason === null) return false
      if (!reason.trim()) {
        alert('请输入调整原因')
        return false
      }

      const newReason: AdjustmentReason = {
        id: generateId(),
        createdAt: Date.now(),
        content: reason.trim()
      }

      const fieldChanges = [...scheme.fieldChanges]
      fieldChanges.push(this.generateFieldChange(id, 'status', scheme.status, newStatus, '系统', reason.trim()))

      const newAdjustmentReasons = [...scheme.adjustmentReasons, newReason]

      const index = this.schemes.findIndex(s => s.id === id)
      if (index !== -1) {
        this.schemes[index] = {
          ...this.schemes[index],
          status: newStatus,
          adjustmentReasons: newAdjustmentReasons,
          fieldChanges,
          updatedAt: Date.now()
        }
        this.save()
        this.render()
      }
      return true
    }

    if (newStatus === '已定稿' && scheme.status !== '已定稿') {
      const readiness = getSchemeReadiness(scheme)
      if (!readiness.isReadyForFinal) {
        const issues: string[] = []
        if (readiness.blockingReasons.length > 0) issues.push(...readiness.blockingReasons)
        if (readiness.hasMissingInfo) issues.push('存在缺失的必填信息')
        if (readiness.hasDurationOverflow) issues.push(`预计时长 ${scheme.durationHours}h 超出建议上限`)
        if (readiness.hasColorConflict) issues.push('主辅色对比度较低，可能影响视觉层次')

        const confirmMsg = `该方案暂不满足定稿条件，存在以下问题：\n\n${issues.map((i, idx) => `${idx + 1}. ${i}`).join('\n')}\n\n是否仍要强制标记为「已定稿」？`

        if (!confirm(confirmMsg)) {
          return false
        }
      }

      const summary = this.autoGenerateSummary(scheme)
      const reviewRecord: ReviewRecord = {
        id: generateId(),
        timestamp: Date.now(),
        conclusion: '通过',
        reviewer: '系统自动',
        comment: '方案已通过评审，自动标记为已定稿状态。',
        statusBefore: scheme.status,
        statusAfter: '已定稿'
      }

      const fieldChanges = [...scheme.fieldChanges]
      fieldChanges.push(this.generateFieldChange(id, 'status', scheme.status, newStatus, '系统'))

      const index = this.schemes.findIndex(s => s.id === id)
      if (index !== -1) {
        this.schemes[index] = {
          ...this.schemes[index],
          status: newStatus,
          finalizedSummary: summary,
          reviewRecords: [...scheme.reviewRecords, reviewRecord],
          fieldChanges,
          updatedAt: Date.now()
        }
        this.save()
        this.render()
      }
      return true
    }

    this.updateScheme(id, { status: newStatus })
    return true
  }

  private updateScheme(id: string, updates: Partial<PatternScheme>): void {
    const index = this.schemes.findIndex(s => s.id === id)
    if (index !== -1) {
      const original = { ...this.schemes[index] }
      const newFieldChanges: FieldChange[] = []

      Object.keys(updates).forEach(key => {
        const field = key as ChangeField
        if (key === 'updatedAt') return
        const before = (original as any)[key]
        const after = (updates as any)[key]

        let isChanged = false
        if (key === 'mainColor' || key === 'secondaryColor') {
          if (before && after && (before.name !== after.name || before.hex !== after.hex)) {
            isChanged = true
          }
        } else if (key === 'stepNotes') {
          if (JSON.stringify(before) !== JSON.stringify(after)) {
            isChanged = true
          }
        } else {
          if (before !== after) {
            isChanged = true
          }
        }

        if (isChanged && CHANGE_FIELD_LABELS[field]) {
          newFieldChanges.push(this.generateFieldChange(id, field, before, after, '用户修改'))
        }
      })

      this.schemes[index] = {
        ...this.schemes[index],
        ...updates,
        fieldChanges: [...this.schemes[index].fieldChanges, ...newFieldChanges],
        updatedAt: Date.now()
      }
      this.save()
      this.render()
    }
  }

  private addScheme(scheme: PatternScheme): void {
    this.schemes.unshift(scheme)
    this.selectedId = scheme.id
    this.workbenchSelectedId = scheme.id
    this.save()
    this.render()
  }

  private duplicateScheme(id: string): void {
    const original = this.schemes.find(s => s.id === id)
    if (original) {
      const newScheme: PatternScheme = {
        ...original,
        id: generateId(),
        name: original.name + ' 副本',
        status: '待试配',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        stepNotes: original.stepNotes.map(s => ({ ...s })),
        reviewRecords: [],
        fieldChanges: [],
        adjustmentReasons: [],
        adjustmentProgress: [],
        finalizedSummary: null
      }
      this.addScheme(newScheme)
    }
  }

  private deleteScheme(id: string): void {
    if (!confirm('确定要删除这个方案吗？')) return
    this.schemes = this.schemes.filter(s => s.id !== id)
    if (this.selectedId === id) {
      this.selectedId = this.schemes.length > 0 ? this.schemes[0].id : null
    }
    if (this.workbenchSelectedId === id) {
      this.workbenchSelectedId = this.schemes.length > 0 ? this.schemes[0].id : null
    }
    this.selectedIds.delete(id)
    this.save()
    this.render()
  }

  private createNewScheme(): void {
    const newScheme: PatternScheme = {
      id: generateId(),
      name: '新方案',
      boxType: BOX_TYPES[0],
      mainColor: COLORS[0],
      secondaryColor: COLORS[3],
      lineMethod: '描金',
      coatingCount: null,
      durationHours: 4,
      targetAudience: '',
      operationReminder: '',
      status: '待试配',
      colorDescription: '',
      stepNotes: [{ step: 1, title: '制胎', note: '' }],
      riskLevel: '中',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      reviewRecords: [],
      fieldChanges: [],
      adjustmentReasons: [],
      adjustmentProgress: [],
      finalizedSummary: null
    }
    this.addScheme(newScheme)
  }

  private batchUpdateStatus(status: SchemeStatus): void {
    if (this.selectedIds.size === 0) return
    const filtered = this.getFilteredSchemes()
    const filteredIds = new Set(filtered.map(s => s.id))
    const toUpdate = Array.from(this.selectedIds).filter(id => filteredIds.has(id))

    if (toUpdate.length === 0) {
      alert('当前筛选结果中没有选中的方案')
      return
    }

    let adjustmentReason = ''
    if (status === '需调整') {
      const reason = prompt(`请输入这 ${toUpdate.length} 个方案的调整原因：`, '')
      if (reason === null) return
      if (!reason.trim()) {
        alert('请输入调整原因')
        return
      }
      adjustmentReason = reason.trim()
    }

    if (status === '已定稿') {
      const notReadySchemes: { name: string; issues: string[] }[] = []
      toUpdate.forEach(id => {
        const scheme = this.schemes.find(s => s.id === id)
        if (scheme && scheme.status !== '已定稿') {
          const readiness = getSchemeReadiness(scheme)
          if (!readiness.isReadyForFinal) {
            const issues: string[] = []
            if (readiness.blockingReasons.length > 0) issues.push(...readiness.blockingReasons)
            if (readiness.hasMissingInfo) issues.push('存在缺失的必填信息')
            if (readiness.hasDurationOverflow) issues.push(`预计时长 ${scheme.durationHours}h 超出建议上限`)
            if (readiness.hasColorConflict) issues.push('主辅色对比度较低，可能影响视觉层次')
            notReadySchemes.push({ name: scheme.name, issues })
          }
        }
      })

      if (notReadySchemes.length > 0) {
        let confirmMsg = `以下 ${notReadySchemes.length} 个方案暂不满足定稿条件：\n\n`
        notReadySchemes.slice(0, 5).forEach((item, idx) => {
          confirmMsg += `${idx + 1}. 「${item.name}」\n`
          confirmMsg += `   ${item.issues[0]}\n`
        })
        if (notReadySchemes.length > 5) {
          confirmMsg += `... 还有 ${notReadySchemes.length - 5} 个方案存在问题\n`
        }
        confirmMsg += `\n是否仍要将全部 ${toUpdate.length} 个方案强制标记为「已定稿」？\n\n确定后将自动生成定稿摘要和评审记录。`

        if (!confirm(confirmMsg)) return
      } else {
        if (!confirm(`确定将当前筛选结果中选中的 ${toUpdate.length} 个方案标记为「${status}」吗？\n\n确定后将自动生成定稿摘要和评审记录。`)) return
      }
    } else if (status === '需调整') {
      if (!confirm(`确定将当前筛选结果中选中的 ${toUpdate.length} 个方案标记为「${status}」吗？\n\n调整原因：${adjustmentReason}`)) return
    } else {
      if (!confirm(`确定将当前筛选结果中选中的 ${toUpdate.length} 个方案标记为「${status}」吗？`)) return
    }

    const toUpdateSet = new Set(toUpdate)
    this.schemes = this.schemes.map(s => {
      if (toUpdateSet.has(s.id)) {
        const statusBefore = s.status
        const newFieldChange = this.generateFieldChange(s.id, 'status', statusBefore, status, '批量操作', adjustmentReason || undefined)

        let updates: Partial<PatternScheme> = {
          status,
          updatedAt: Date.now(),
          fieldChanges: [...s.fieldChanges, newFieldChange]
        }

        if (status === '需调整' && statusBefore !== '需调整') {
          const newReason: AdjustmentReason = {
            id: generateId(),
            createdAt: Date.now(),
            content: adjustmentReason
          }
          updates.adjustmentReasons = [...s.adjustmentReasons, newReason]
        }

        if (status === '已定稿' && statusBefore !== '已定稿') {
          const summary = this.autoGenerateSummary(s)
          const reviewRecord: ReviewRecord = {
            id: generateId(),
            timestamp: Date.now(),
            conclusion: '通过',
            reviewer: '批量操作',
            comment: '批量标记为已定稿状态，自动生成定稿摘要。',
            statusBefore,
            statusAfter: '已定稿'
          }
          updates.finalizedSummary = summary
          updates.reviewRecords = [...s.reviewRecords, reviewRecord]
        }

        return { ...s, ...updates }
      }
      return s
    })

    this.selectedIds = new Set(
      Array.from(this.selectedIds).filter(id => filteredIds.has(id))
    )

    this.save()
    this.render()
  }

  private toggleSelectAll(): void {
    const filtered = this.getFilteredSchemes()
    const allSelected = filtered.every(s => this.selectedIds.has(s.id))
    if (allSelected) {
      filtered.forEach(s => this.selectedIds.delete(s.id))
    } else {
      filtered.forEach(s => this.selectedIds.add(s.id))
    }
    this.render()
  }

  private renderReviewSection(scheme: PatternScheme, prefix: string = ''): string {
    const sortedRecords = [...scheme.reviewRecords].sort((a, b) => b.timestamp - a.timestamp)

    const conclusionOptions: ReviewConclusion[] = ['通过', '需调整', '待定', '驳回']

    return `
      <div class="detail-section">
        <div class="detail-section-title">
          <span>📋 评审记录</span>
          <span style="font-size:12px; color:var(--text-light); font-weight:normal">共 ${scheme.reviewRecords.length} 条</span>
        </div>

        <div class="review-timeline" style="margin-bottom:16px">
          ${sortedRecords.length === 0 ? `
            <div style="padding:16px; text-align:center; color:var(--text-muted); font-size:13px; background:var(--bg); border-radius:6px">
              暂无评审记录
            </div>
          ` : sortedRecords.map(record => `
            <div class="timeline-item" style="display:flex; gap:12px; padding:12px 0; border-bottom:1px dashed var(--border-light)">
              <div style="flex-shrink:0; width:8px; height:8px; border-radius:50%; background:${REVIEW_CONCLUSION_COLORS[record.conclusion]}; margin-top:8px"></div>
              <div style="flex:1">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px">
                  <span class="scheme-status" style="background:${REVIEW_CONCLUSION_COLORS[record.conclusion]}; font-size:11px; padding:2px 8px">${record.conclusion}</span>
                  <span style="font-weight:500; font-size:13px">${this.escapeHtml(record.reviewer)}</span>
                  <span style="color:var(--text-light); font-size:12px">${this.formatTimestamp(record.timestamp)}</span>
                </div>
                ${record.comment ? `<div style="font-size:13px; color:var(--text-secondary); margin-top:4px">${this.escapeHtml(record.comment)}</div>` : ''}
                <div style="font-size:12px; color:var(--text-muted); margin-top:4px">
                  状态变化：${record.statusBefore} → ${record.statusAfter}
                </div>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="review-form" style="background:var(--bg); padding:12px; border-radius:6px">
          <div style="font-size:13px; font-weight:500; margin-bottom:8px">添加评审记录</div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:8px">
            <div>
              <label style="display:block; font-size:12px; color:var(--text-light); margin-bottom:4px">评审结论</label>
              <select id="${prefix}review-conclusion" style="width:100%; padding:6px 8px; border:1px solid var(--border); border-radius:4px; font-size:13px">
                ${conclusionOptions.map(c => `<option value="${c}" style="color:${REVIEW_CONCLUSION_COLORS[c]}">${c}</option>`).join('')}
              </select>
            </div>
            <div>
              <label style="display:block; font-size:12px; color:var(--text-light); margin-bottom:4px">评审人</label>
              <input type="text" id="${prefix}review-reviewer" placeholder="请输入评审人姓名" style="width:100%; padding:6px 8px; border:1px solid var(--border); border-radius:4px; font-size:13px">
            </div>
          </div>
          <div style="margin-bottom:8px">
            <label style="display:block; font-size:12px; color:var(--text-light); margin-bottom:4px">评审意见</label>
            <textarea id="${prefix}review-comment" rows="2" placeholder="请输入评审意见..." style="width:100%; padding:6px 8px; border:1px solid var(--border); border-radius:4px; font-size:13px; resize:vertical"></textarea>
          </div>
          <button class="btn btn-sm btn-primary" id="${prefix}btn-add-review" style="width:100%">+ 添加评审记录</button>
        </div>
      </div>
    `
  }

  private renderChangeTimeline(scheme: PatternScheme): string {
    const sortedChanges = [...scheme.fieldChanges].sort((a, b) => b.timestamp - a.timestamp)

    return `
      <div class="detail-section">
        <div class="detail-section-title">
          <span>📝 变更轨迹</span>
          <span style="font-size:12px; color:var(--text-light); font-weight:normal">共 ${scheme.fieldChanges.length} 条变更</span>
        </div>

        <div class="change-timeline">
          ${sortedChanges.length === 0 ? `
            <div style="padding:16px; text-align:center; color:var(--text-muted); font-size:13px; background:var(--bg); border-radius:6px">
              暂无变更记录
            </div>
          ` : sortedChanges.map(change => `
            <div class="timeline-item" style="display:flex; gap:12px; padding:10px 0; border-bottom:1px dashed var(--border-light)">
              <div style="flex-shrink:0; width:6px; height:6px; border-radius:50%; background:var(--primary); margin-top:10px"></div>
              <div style="flex:1">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px">
                  <span style="font-weight:500; font-size:13px">${change.fieldLabel}</span>
                  <span style="color:var(--text-light); font-size:12px">${this.formatTimestamp(change.timestamp)}</span>
                  <span style="color:var(--text-muted); font-size:12px; margin-left:auto">操作人：${this.escapeHtml(change.operator)}</span>
                </div>
                <div style="font-size:12px; color:var(--text-secondary); display:flex; align-items:center; gap:6px; flex-wrap:wrap">
                  <span style="background:#FFF5F5; color:#C82506; padding:2px 6px; border-radius:3px">${this.escapeHtml(change.beforeValue)}</span>
                  <span style="color:var(--text-muted)">→</span>
                  <span style="background:#F0FFF4; color:#00A86B; padding:2px 6px; border-radius:3px">${this.escapeHtml(change.afterValue)}</span>
                </div>
                ${change.reason ? `<div style="font-size:12px; color:var(--text-muted); margin-top:4px">原因：${this.escapeHtml(change.reason)}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `
  }

  private renderAdjustmentPanel(scheme: PatternScheme, prefix: string = ''): string {
    if (scheme.status !== '需调整') return ''

    const pendingReasons = [...scheme.adjustmentReasons]
    const recentProgress = [...scheme.adjustmentProgress].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5)

    return `
      <div class="detail-section" style="background:#FFF5F5; border:1px solid #FFD6D6">
        <div class="detail-section-title" style="color:#C82506">
          <span>⚠ 调整处理面板</span>
          <span style="font-size:12px; font-weight:normal; color:#C82506">待处理原因：${pendingReasons.length} 项</span>
        </div>

        ${pendingReasons.length > 0 ? `
          <div style="margin-bottom:12px">
            <div style="font-size:12px; color:var(--text-light); margin-bottom:6px">待处理调整原因：</div>
            ${pendingReasons.map(r => `
              <div style="background:#fff; padding:8px 12px; border-radius:4px; font-size:13px; margin-bottom:6px; border-left:3px solid #C82506">
                <div style="display:flex; justify-content:space-between; align-items:center">
                  <span>${this.escapeHtml(r.content)}</span>
                  <span style="font-size:11px; color:var(--text-light)">${this.formatTimestamp(r.createdAt)}</span>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${recentProgress.length > 0 ? `
          <div style="margin-bottom:12px">
            <div style="font-size:12px; color:var(--text-light); margin-bottom:6px">最近处理进展：</div>
            ${recentProgress.map(p => `
              <div style="background:#fff; padding:8px 12px; border-radius:4px; font-size:13px; margin-bottom:6px; border-left:3px solid #FFB61E">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px">
                  <span style="font-weight:500">${this.escapeHtml(p.operator)}</span>
                  <span style="font-size:11px; color:var(--text-light)">${this.formatTimestamp(p.timestamp)}</span>
                </div>
                <div style="color:var(--text-secondary)">${this.escapeHtml(p.content)}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div style="background:#fff; padding:12px; border-radius:6px">
          <div style="font-size:13px; font-weight:500; margin-bottom:8px">添加处理进展</div>
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:8px; margin-bottom:8px">
            <div>
              <label style="display:block; font-size:12px; color:var(--text-light); margin-bottom:4px">处理人</label>
              <input type="text" id="${prefix}progress-operator" placeholder="请输入处理人姓名" style="width:100%; padding:6px 8px; border:1px solid var(--border); border-radius:4px; font-size:13px">
            </div>
            <div></div>
          </div>
          <div style="margin-bottom:8px">
            <label style="display:block; font-size:12px; color:var(--text-light); margin-bottom:4px">进展说明</label>
            <textarea id="${prefix}progress-content" rows="2" placeholder="请描述当前处理进展..." style="width:100%; padding:6px 8px; border:1px solid var(--border); border-radius:4px; font-size:13px; resize:vertical"></textarea>
          </div>
          <button class="btn btn-sm" id="${prefix}btn-add-progress" style="width:100%; background:#FFB61E; color:#fff; border-color:#FFB61E">+ 添加处理进展</button>
        </div>
      </div>
    `
  }

  private renderFinalizedSummarySection(scheme: PatternScheme, prefix: string = ''): string {
    const hasSummary = scheme.finalizedSummary !== null
    const isFinalOrHasSummary = scheme.status === '已定稿' || hasSummary
    if (!isFinalOrHasSummary) return ''

    const currentTab = this.summaryTabManager[scheme.id] || 'manager'

    return `
      <div class="detail-section" style="background:#F0FFF4; border:1px solid #B8E6C8">
        <div class="detail-section-title" style="color:#00A86B">
          <span>📄 定稿摘要</span>
          ${hasSummary ? `<span style="font-size:12px; font-weight:normal; color:#00A86B">生成时间：${this.formatTimestamp(scheme.finalizedSummary!.generatedAt)}</span>` : ''}
        </div>

        ${!hasSummary ? `
          <div style="text-align:center; padding:20px">
            <div style="color:var(--text-muted); font-size:13px; margin-bottom:12px">
              ${scheme.status === '已定稿' ? '尚未生成定稿摘要，点击下方按钮自动生成' : '可以生成定稿摘要以便查看'}
            </div>
            <button class="btn btn-sm btn-primary" id="${prefix}btn-gen-summary">自动生成定稿摘要</button>
          </div>
        ` : `
          <div class="summary-tabs" style="display:flex; gap:4px; margin-bottom:12px; border-bottom:1px solid var(--border-light)">
            <button class="summary-tab ${currentTab === 'manager' ? 'active' : ''}" data-summary-tab="manager" data-scheme-id="${scheme.id}" style="padding:6px 16px; border:none; background:${currentTab === 'manager' ? 'var(--primary)' : 'transparent'}; color:${currentTab === 'manager' ? '#fff' : 'var(--text-secondary)'}; border-radius:4px 4px 0 0; font-size:13px; cursor:pointer">
              👔 管理视角
            </button>
            <button class="summary-tab ${currentTab === 'workbench' ? 'active' : ''}" data-summary-tab="workbench" data-scheme-id="${scheme.id}" style="padding:6px 16px; border:none; background:${currentTab === 'workbench' ? 'var(--primary)' : 'transparent'}; color:${currentTab === 'workbench' ? '#fff' : 'var(--text-secondary)'}; border-radius:4px 4px 0 0; font-size:13px; cursor:pointer">
              🔧 工位视角
            </button>
          </div>

          ${currentTab === 'manager' ? `
            <div class="summary-content" style="background:#fff; padding:12px; border-radius:6px">
              <div style="margin-bottom:12px">
                <div style="font-size:13px; font-weight:500; color:var(--text-primary); margin-bottom:6px">决策依据</div>
                <div style="font-size:13px; color:var(--text-secondary); line-height:1.6">${this.escapeHtml(scheme.finalizedSummary!.managerView.decisionBasis)}</div>
              </div>
              <div style="margin-bottom:12px">
                <div style="font-size:13px; font-weight:500; color:var(--text-primary); margin-bottom:6px">风险评估</div>
                <div style="font-size:13px; color:var(--text-secondary); line-height:1.6">${this.escapeHtml(scheme.finalizedSummary!.managerView.riskAssessment)}</div>
              </div>
              <div>
                <div style="font-size:13px; font-weight:500; color:var(--text-primary); margin-bottom:6px">关键亮点</div>
                <ul style="margin:0; padding-left:20px; font-size:13px; color:var(--text-secondary); line-height:1.8">
                  ${scheme.finalizedSummary!.managerView.keyHighlights.map(h => `<li>${this.escapeHtml(h)}</li>`).join('')}
                </ul>
              </div>
            </div>
          ` : `
            <div class="summary-content" style="background:#fff; padding:12px; border-radius:6px">
              <div style="margin-bottom:12px">
                <div style="font-size:13px; font-weight:500; color:var(--text-primary); margin-bottom:6px">执行标准</div>
                <div style="font-size:13px; color:var(--text-secondary); line-height:1.6">${this.escapeHtml(scheme.finalizedSummary!.workbenchView.executionStandard)}</div>
              </div>
              <div style="margin-bottom:12px">
                <div style="font-size:13px; font-weight:500; color:var(--text-primary); margin-bottom:6px">关键要点</div>
                <ul style="margin:0; padding-left:20px; font-size:13px; color:var(--text-secondary); line-height:1.8">
                  ${scheme.finalizedSummary!.workbenchView.keyPoints.map(k => `<li>${this.escapeHtml(k)}</li>`).join('')}
                </ul>
              </div>
              <div>
                <div style="font-size:13px; font-weight:500; color:var(--text-primary); margin-bottom:6px">质量要求</div>
                <div style="font-size:13px; color:var(--text-secondary); line-height:1.6">${this.escapeHtml(scheme.finalizedSummary!.workbenchView.qualityRequirements)}</div>
              </div>
            </div>
          `}
        `}
      </div>
    `
  }

  private render(): void {
    let html = ''

    if (this.currentView === 'manager') {
      html = this.renderManagerView()
    } else {
      html = this.renderWorkbenchView()
    }

    this.appElement.innerHTML = html
    this.bindEvents()
  }

  private renderManagerView(): string {
    const filtered = this.getFilteredSchemes()
    const filteredIds = new Set(filtered.map(s => s.id))

    if (this.selectedId !== null) {
      const stillInFiltered = filteredIds.has(this.selectedId)
      if (!stillInFiltered && filtered.length > 0) {
        this.selectedId = filtered[0].id
      } else if (!stillInFiltered) {
        this.selectedId = null
      }
    } else if (filtered.length > 0) {
      this.selectedId = filtered[0].id
    }

    this.selectedIds = new Set(
      Array.from(this.selectedIds).filter(id => filteredIds.has(id))
    )

    const allChecks = checkAllSchemes(this.schemes)
    const selectedScheme = this.getSelectedScheme()
    const selectedChecks = selectedScheme ? checkSingleScheme(selectedScheme) : []

    return `
      <header class="app-header">
        <div class="app-title">漆盒纹样配色管理</div>
        <div class="header-actions">
          <span style="font-size: 12px; color: var(--text-light);">
            共 ${this.schemes.length} 个方案
            ${allChecks.filter(c => c.type === 'error').length > 0 ? `· <span style="color:#C82506">${allChecks.filter(c => c.type === 'error').length} 个错误</span>` : ''}
            ${allChecks.filter(c => c.type === 'warning').length > 0 ? `· <span style="color:#E08B00">${allChecks.filter(c => c.type === 'warning').length} 个警告</span>` : ''}
          </span>
          <button class="btn btn-sm ${this.currentView === 'workbench' ? '' : 'btn-primary'}" id="btn-view-manager">配色管理</button>
          <button class="btn btn-sm ${this.currentView === 'workbench' ? 'btn-primary' : ''}" id="btn-view-workbench">方案评审工作台</button>
          <button class="btn btn-sm" id="btn-import">导入 JSON</button>
          <input type="file" id="file-input" accept=".json" style="display:none">
          <button class="btn btn-sm" id="btn-export">导出 JSON</button>
          <button class="btn btn-sm" id="btn-finalized">定稿清单</button>
          <button class="btn btn-primary btn-sm" id="btn-new">+ 新增方案</button>
        </div>
      </header>

      <div class="main-content">
        <aside class="sidebar">
          <div class="filter-section">
            <div class="filter-title">筛选条件</div>

            <div class="filter-row">
              <label>盒型</label>
              <select id="filter-boxType">
                <option value="">全部盒型</option>
                ${BOX_TYPES.map(bt => `<option value="${bt}" ${this.filters.boxType === bt ? 'selected' : ''}>${bt}</option>`).join('')}
              </select>
            </div>

            <div class="filter-row">
              <label>主色</label>
              <select id="filter-mainColor">
                <option value="">全部主色</option>
                ${COLORS.map(c => `<option value="${c.name}" ${this.filters.mainColor === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}
              </select>
            </div>

            <div class="filter-row">
              <label>状态</label>
              <select id="filter-status">
                <option value="">全部状态</option>
                ${STATUSES.map(s => `<option value="${s}" ${this.filters.status === s ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
            </div>

            <div class="filter-row">
              <label>风险等级</label>
              <select id="filter-riskLevel">
                <option value="">全部等级</option>
                ${RISK_LEVELS.map(r => `<option value="${r}" ${this.filters.riskLevel === r ? 'selected' : ''}>${r}风险</option>`).join('')}
              </select>
            </div>

            <div class="filter-row">
              <label>时长范围（小时）</label>
              <div class="duration-range">
                <input type="number" id="filter-minDuration" placeholder="最小" value="${this.filters.minDuration ?? ''}" min="0" step="0.5">
                <span>-</span>
                <input type="number" id="filter-maxDuration" placeholder="最大" value="${this.filters.maxDuration ?? ''}" min="0" step="0.5">
              </div>
            </div>

            <div class="filter-row" style="margin-top:12px">
              <label style="display:flex; align-items:center; gap:6px; cursor:pointer">
                <input type="checkbox" id="filter-batchMode" ${this.batchMode ? 'checked' : ''}>
                批量操作模式
              </label>
            </div>
          </div>

          <div class="list-header">
            <div class="list-title">方案列表</div>
            <div class="list-count">${filtered.length} 项</div>
          </div>

          <div class="list-container" id="scheme-list">
            ${filtered.length === 0 ? `
              <div class="empty-state">
                <div class="empty-state-icon">📦</div>
                <div>暂无方案</div>
              </div>
            ` : filtered.map(scheme => {
              const checks = checkSingleScheme(scheme)
              const errors = checks.filter(c => c.type === 'error').length
              const warnings = checks.filter(c => c.type === 'warning').length
              const infos = checks.filter(c => c.type === 'info').length
              return `
                <div class="scheme-item ${this.selectedId === scheme.id ? 'selected' : ''} ${this.batchMode ? 'with-checkbox' : ''}"
                     data-id="${scheme.id}">
                  ${this.batchMode ? `<input type="checkbox" class="scheme-item-checkbox" data-id="${scheme.id}" ${this.selectedIds.has(scheme.id) ? 'checked' : ''}>` : ''}
                  <div class="scheme-item-header">
                    <div class="scheme-name">${this.escapeHtml(scheme.name)}</div>
                    <span class="scheme-status" style="background:${STATUS_COLOR_MAP[scheme.status]}">${scheme.status}</span>
                  </div>
                  <div class="scheme-meta">
                    <span>${scheme.boxType}</span>
                    <span class="scheme-colors">
                      <span class="color-swatch color-swatch-sm" style="background:${scheme.mainColor.hex}" title="${scheme.mainColor.name}"></span>
                      <span style="color:var(--text-muted)">+</span>
                      <span class="color-swatch color-swatch-sm" style="background:${scheme.secondaryColor.hex}" title="${scheme.secondaryColor.name}"></span>
                    </span>
                    <span>${scheme.durationHours}h</span>
                  </div>
                  ${errors + warnings + infos > 0 ? `
                    <div class="scheme-checks">
                      ${errors > 0 ? `<span class="check-badge check-error">✕ ${errors} 错误</span>` : ''}
                      ${warnings > 0 ? `<span class="check-badge check-warning">⚠ ${errors > 0 ? warnings + ' 警告' : warnings + ' 个警告'}</span>` : ''}
                      ${infos > 0 && errors === 0 && warnings === 0 ? `<span class="check-badge check-info">ℹ ${infos}</span>` : ''}
                    </div>
                  ` : ''}
                </div>
              `
            }).join('')}
          </div>

          ${this.batchMode ? `
            <div class="batch-actions">
              <label>
                <input type="checkbox" id="select-all" ${filtered.length > 0 && filtered.every(s => this.selectedIds.has(s.id)) ? 'checked' : ''}>
                全选
              </label>
              <span style="font-size:12px;color:var(--text-light);margin-left:auto">已选 ${this.selectedIds.size} 项</span>
              <button class="btn btn-sm" data-batch-status="待试配">待试配</button>
              <button class="btn btn-sm" data-batch-status="已定稿">已定稿</button>
              <button class="btn btn-sm" data-batch-status="需调整">需调整</button>
              <button class="btn btn-sm" data-batch-status="仅展示">仅展示</button>
            </div>
          ` : ''}
        </aside>

        <main class="detail-panel">
          ${selectedScheme ? this.renderManagerDetail(selectedScheme, selectedChecks) : `
            <div class="empty-state">
              <div class="empty-state-icon">🎨</div>
              <div>请选择或创建一个纹样方案</div>
            </div>
          `}
        </main>
      </div>

      ${this.showFinalizedModal ? this.renderFinalizedModal() : ''}
    `
  }

  private renderManagerDetail(scheme: PatternScheme, checks: ReturnType<typeof checkSingleScheme>): string {
    return `
      <div class="detail-header">
        <div class="detail-title">
          <input type="text" id="detail-name" value="${this.escapeHtml(scheme.name)}" 
                 style="font-size:18px; font-weight:600; border:none; background:transparent; padding:4px 8px; border-radius:4px; min-width:200px"
                 onfocus="this.style.background='var(--bg)'" onblur="this.style.background='transparent'">
          <span class="scheme-status" style="background:${STATUS_COLOR_MAP[scheme.status]}; font-size:12px; padding:4px 10px">${scheme.status}</span>
        </div>
        <div class="detail-actions">
          <button class="btn btn-sm" id="btn-duplicate">复制</button>
          <button class="btn btn-sm" id="btn-delete" style="color:#C82506; border-color:#E8B0B0">删除</button>
        </div>
      </div>

      <div class="detail-body">
        ${checks.length > 0 ? `
          <div class="detail-section checks-panel">
            <div class="detail-section-title">
              <span>⚠ 检查提醒</span>
              <button class="btn btn-sm" id="btn-toggle-checks" style="font-size:11px">${this.showChecks ? '收起' : '展开'}</button>
            </div>
            ${this.showChecks ? `
              ${checks.map(check => `
                <div class="check-item ${check.type}">
                  <span class="check-icon">
                    ${check.type === 'error' ? '✕' : check.type === 'warning' ? '⚠' : 'ℹ'}
                  </span>
                  <span>${check.message}</span>
                </div>
              `).join('')}
            ` : ''}
          </div>
        ` : ''}

        <div class="detail-section">
          <div class="detail-section-title">基本信息</div>
          <div class="detail-grid">
            <div class="detail-field">
              <label>盒型</label>
              <select id="detail-boxType">
                ${BOX_TYPES.map(bt => `<option value="${bt}" ${scheme.boxType === bt ? 'selected' : ''}>${bt}</option>`).join('')}
              </select>
            </div>
            <div class="detail-field">
              <label>描线方式</label>
              <select id="detail-lineMethod">
                ${LINE_METHODS.map(lm => `<option value="${lm}" ${scheme.lineMethod === lm ? 'selected' : ''}>${lm}</option>`).join('')}
              </select>
            </div>
            <div class="detail-field">
              <label>罩面次数</label>
              <input type="number" id="detail-coatingCount" value="${scheme.coatingCount ?? ''}" placeholder="未填写" min="0" step="1">
            </div>
            <div class="detail-field">
              <label>预计完成时长（小时）</label>
              <input type="number" id="detail-durationHours" value="${scheme.durationHours}" min="0" step="0.5">
            </div>
            <div class="detail-field">
              <label>适合人群</label>
              <input type="text" id="detail-targetAudience" value="${this.escapeHtml(scheme.targetAudience)}" placeholder="如：初学者 / 中级爱好者">
            </div>
            <div class="detail-field">
              <label>风险等级</label>
              <select id="detail-riskLevel">
                ${RISK_LEVELS.map(r => `<option value="${r}" ${scheme.riskLevel === r ? 'selected' : ''}>${r}风险</option>`).join('')}
              </select>
            </div>
            <div class="detail-field">
              <label>状态</label>
              <select id="detail-status">
                ${STATUSES.map(s => `<option value="${s}" ${scheme.status === s ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">配色方案</div>
          <div class="detail-grid">
            <div class="detail-field">
              <label>主色</label>
              <div class="color-selector">
                <span class="color-swatch" style="background:${scheme.mainColor.hex}; width:28px; height:28px"></span>
                <span style="font-weight:500">${scheme.mainColor.name}</span>
              </div>
              <div class="color-picker-grid" id="mainColor-picker">
                ${COLORS.map(c => `
                  <div class="color-option ${scheme.mainColor.name === c.name ? 'selected' : ''}"
                       data-color-name="${c.name}" data-color-hex="${c.hex}" data-color-target="main"
                       style="background:${c.hex}" title="${c.name}"></div>
                `).join('')}
              </div>
            </div>
            <div class="detail-field">
              <label>辅色</label>
              <div class="color-selector">
                <span class="color-swatch" style="background:${scheme.secondaryColor.hex}; width:28px; height:28px"></span>
                <span style="font-weight:500">${scheme.secondaryColor.name}</span>
              </div>
              <div class="color-picker-grid" id="secondaryColor-picker">
                ${COLORS.map(c => `
                  <div class="color-option ${scheme.secondaryColor.name === c.name ? 'selected' : ''}"
                       data-color-name="${c.name}" data-color-hex="${c.hex}" data-color-target="secondary"
                       style="background:${c.hex}" title="${c.name}"></div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">操作提醒</div>
          <div class="detail-field">
            <textarea id="detail-operationReminder" rows="2" placeholder="填写操作注意事项...">${this.escapeHtml(scheme.operationReminder)}</textarea>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">配色说明</div>
          <div class="detail-field">
            <textarea id="detail-colorDescription" rows="3" placeholder="描述整体配色风格和意境...">${this.escapeHtml(scheme.colorDescription)}</textarea>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">
            <span>步骤备注</span>
            <span style="font-size:12px; color:var(--text-light); font-weight:normal">共 ${scheme.stepNotes.length} 步</span>
          </div>
          <ul class="steps-list" id="steps-list">
            ${scheme.stepNotes.map((step, idx) => `
              <li class="step-item" data-step-index="${idx}">
                <div class="step-number">${step.step}</div>
                <div class="step-content">
                  <input type="text" class="step-title-input" data-field="title" data-step-index="${idx}" 
                         value="${this.escapeHtml(step.title)}" placeholder="步骤标题">
                  <textarea class="step-note-input" data-field="note" data-step-index="${idx}"
                            placeholder="填写本步骤的详细说明和注意事项...">${this.escapeHtml(step.note)}</textarea>
                </div>
                <div class="step-actions">
                  <button class="icon-btn" data-step-action="up" data-step-index="${idx}" title="上移" ${idx === 0 ? 'disabled' : ''}>↑</button>
                  <button class="icon-btn" data-step-action="down" data-step-index="${idx}" title="下移" ${idx === scheme.stepNotes.length - 1 ? 'disabled' : ''}>↓</button>
                  <button class="icon-btn" data-step-action="delete" data-step-index="${idx}" title="删除">✕</button>
                </div>
              </li>
            `).join('')}
          </ul>
          <button class="add-step-btn" id="btn-add-step">+ 添加步骤</button>
        </div>

        ${this.renderReviewSection(scheme, '')}
        ${this.renderChangeTimeline(scheme)}
        ${this.renderAdjustmentPanel(scheme, '')}
        ${this.renderFinalizedSummarySection(scheme, '')}
      </div>
    `
  }

  private renderWorkbenchView(): string {
    const filtered = this.getWorkbenchFilteredSchemes()
    const filteredIds = new Set(filtered.map(s => s.id))

    if (this.workbenchSelectedId !== null) {
      const stillInFiltered = filteredIds.has(this.workbenchSelectedId)
      if (!stillInFiltered && filtered.length > 0) {
        this.workbenchSelectedId = filtered[0].id
      } else if (!stillInFiltered) {
        this.workbenchSelectedId = null
      }
    } else if (filtered.length > 0) {
      this.workbenchSelectedId = filtered[0].id
    }

    const allChecks = checkAllSchemes(this.schemes)
    const priorityCount = this.schemes.filter(s => isPriorityScheme(s)).length

    return `
      <header class="app-header workbench-header">
        <div class="app-title">
          <span>方案评审工作台</span>
          <span class="header-subtitle">面向运营/工艺负责人 · 集中评审纹样方案</span>
        </div>
        <div class="header-actions">
          <span style="font-size: 12px; color: var(--text-light);">
            共 ${this.schemes.length} 个方案
            ${priorityCount > 0 ? `· <span style="color:#C82506">${priorityCount} 项待处理</span>` : ''}
            ${allChecks.filter(c => c.type === 'error').length > 0 ? `· <span style="color:#C82506">${allChecks.filter(c => c.type === 'error').length} 个错误</span>` : ''}
          </span>
          <button class="btn btn-sm ${this.currentView === 'manager' ? '' : 'btn-primary'}" id="btn-view-workbench">方案评审工作台</button>
          <button class="btn btn-sm ${this.currentView === 'manager' ? 'btn-primary' : ''}" id="btn-view-manager">配色管理</button>
        </div>
      </header>

      <div class="workbench-tabs">
        <button class="workbench-tab ${this.workbenchTab === 'list' ? 'active' : ''}" data-wb-tab="list">
          📋 方案评审
        </button>
        <button class="workbench-tab ${this.workbenchTab === 'summary' ? 'active' : ''}" data-wb-tab="summary">
          📊 定稿汇总
        </button>
      </div>

      ${this.workbenchTab === 'list' ? this.renderWorkbenchList(filtered) : this.renderWorkbenchSummary()}
    `
  }

  private renderWorkbenchList(filtered: PatternScheme[]): string {
    const selectedScheme = this.getWorkbenchSelectedScheme()
    const priorityCount = this.schemes.filter(s => isPriorityScheme(s)).length

    return `
      <div class="main-content">
        <aside class="sidebar workbench-sidebar">
          <div class="filter-section">
            <div class="filter-title">快速筛选</div>

            <div class="workbench-view-toggle">
              <button class="wb-view-btn ${this.workbenchView === 'priority' ? 'active' : ''}" data-wb-view="priority">
                🔔 待处理优先
                ${priorityCount > 0 ? `<span class="wb-priority-badge">${priorityCount}</span>` : ''}
              </button>
              <button class="wb-view-btn ${this.workbenchView === 'all' ? 'active' : ''}" data-wb-view="all">
                📁 全部方案
              </button>
            </div>

            <div class="filter-row">
              <label>盒型</label>
              <select id="wb-filter-boxType">
                <option value="">全部盒型</option>
                ${BOX_TYPES.map(bt => `<option value="${bt}" ${this.workbenchFilters.boxType === bt ? 'selected' : ''}>${bt}</option>`).join('')}
              </select>
            </div>

            <div class="filter-row">
              <label>主色</label>
              <select id="wb-filter-mainColor">
                <option value="">全部主色</option>
                ${COLORS.map(c => `<option value="${c.name}" ${this.workbenchFilters.mainColor === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}
              </select>
            </div>

            <div class="filter-row">
              <label>风险等级</label>
              <select id="wb-filter-riskLevel">
                <option value="">全部等级</option>
                ${RISK_LEVELS.map(r => `<option value="${r}" ${this.workbenchFilters.riskLevel === r ? 'selected' : ''}>${r}风险</option>`).join('')}
              </select>
            </div>

            <div class="filter-row">
              <label>状态</label>
              <select id="wb-filter-status">
                <option value="">全部状态</option>
                ${STATUSES.map(s => `<option value="${s}" ${this.workbenchFilters.status === s ? 'selected' : ''}>${s}</option>`).join('')}
              </select>
            </div>

            <div class="filter-row">
              <label>预计时长（小时）</label>
              <div class="duration-range">
                <input type="number" id="wb-filter-minDuration" placeholder="最小" value="${this.workbenchFilters.minDuration ?? ''}" min="0" step="0.5">
                <span>-</span>
                <input type="number" id="wb-filter-maxDuration" placeholder="最大" value="${this.workbenchFilters.maxDuration ?? ''}" min="0" step="0.5">
              </div>
            </div>
          </div>

          <div class="list-header">
            <div class="list-title">${this.workbenchView === 'priority' ? '待处理方案' : '方案列表'}</div>
            <div class="list-count">${filtered.length} 项</div>
          </div>

          <div class="list-container" id="wb-scheme-list">
            ${filtered.length === 0 ? `
              <div class="empty-state">
                <div class="empty-state-icon">${this.workbenchView === 'priority' ? '✅' : '📦'}</div>
                <div>${this.workbenchView === 'priority' ? '当前没有待处理的方案' : '暂无方案'}</div>
              </div>
            ` : filtered.map(scheme => {
              const checks = checkSingleScheme(scheme)
              const readiness = getSchemeReadiness(scheme)
              const errors = checks.filter(c => c.type === 'error').length
              const warnings = checks.filter(c => c.type === 'warning').length
              const infos = checks.filter(c => c.type === 'info').length
              const totalChecks = errors + warnings + infos
              const isPriority = isPriorityScheme(scheme)
              return `
                <div class="wb-scheme-item ${this.workbenchSelectedId === scheme.id ? 'selected' : ''} ${isPriority ? 'priority' : ''}"
                     data-wb-id="${scheme.id}">
                  <div class="wb-scheme-header">
                    <div class="wb-scheme-name">
                      ${isPriority ? '<span class="priority-dot" title="待处理"></span>' : ''}
                      ${this.escapeHtml(scheme.name)}
                    </div>
                    <span class="scheme-status" style="background:${STATUS_COLOR_MAP[scheme.status]}">${scheme.status}</span>
                  </div>
                  <div class="wb-scheme-meta">
                    <span class="wb-meta-box">${scheme.boxType}</span>
                    <span class="wb-meta-risk" style="color:${RISK_COLOR_MAP[scheme.riskLevel]}">${scheme.riskLevel}风险</span>
                    <span class="wb-meta-duration">${scheme.durationHours}h</span>
                  </div>
                  <div class="wb-scheme-colors">
                    <span class="color-swatch color-swatch-sm" style="background:${scheme.mainColor.hex}" title="主色: ${scheme.mainColor.name}"></span>
                    <span style="color:var(--text-muted); font-size:11px">+</span>
                    <span class="color-swatch color-swatch-sm" style="background:${scheme.secondaryColor.hex}" title="辅色: ${scheme.secondaryColor.name}"></span>
                    <span style="margin-left:4px; font-size:11px; color:var(--text-muted)">${scheme.lineMethod}</span>
                  </div>
                  <div class="wb-scheme-footer">
                    ${totalChecks > 0 ? `
                      <span class="check-badge ${errors > 0 ? 'check-error' : warnings > 0 ? 'check-warning' : 'check-info'}">
                        ${errors > 0 ? '⚠' : warnings > 0 ? '⚠' : 'ℹ'} ${totalChecks} 项提醒
                      </span>
                    ` : '<span class="check-badge check-info">无检查提醒</span>'}
                    ${readiness.isReadyForFinal ? (
                      '<span class="wb-readiness ready">✓ 可定稿</span>'
                    ) : (
                      '<span class="wb-readiness not-ready">✕ 暂不可定稿</span>'
                    )}
                  </div>
                  ${isPriority ? this.renderPriorityTags(readiness) : ''}
                </div>
              `
            }).join('')}
          </div>
        </aside>

        <main class="detail-panel workbench-detail">
          ${selectedScheme ? this.renderWorkbenchDetail(selectedScheme) : `
            <div class="empty-state">
              <div class="empty-state-icon">🔍</div>
              <div>请从左侧选择一个方案进行评审</div>
            </div>
          `}
        </main>
      </div>
    `
  }

  private renderPriorityTags(readiness: SchemeReadiness): string {
    const tags: string[] = []
    if (readiness.hasMissingInfo) tags.push('<span class="priority-tag missing">缺失信息</span>')
    if (readiness.hasDurationOverflow) tags.push('<span class="priority-tag duration">时长超限</span>')
    if (readiness.hasColorConflict) tags.push('<span class="priority-tag color">配色冲突</span>')
    if (readiness.hasInsufficientAdjustment) tags.push('<span class="priority-tag adjust">调整不足</span>')
    if (readiness.blockingReasons.length > 0 && tags.length === 0) tags.push('<span class="priority-tag missing">存在问题</span>')
    return `<div class="priority-tags">${tags.join('')}</div>`
  }

  private renderWorkbenchDetail(scheme: PatternScheme): string {
    const checks = checkSingleScheme(scheme)
    const readiness = getSchemeReadiness(scheme)

    return `
      <div class="detail-header workbench-detail-header">
        <div class="detail-title">
          <span style="font-size:18px; font-weight:600">${this.escapeHtml(scheme.name)}</span>
          <span class="scheme-status" style="background:${STATUS_COLOR_MAP[scheme.status]}; font-size:12px; padding:4px 10px">${scheme.status}</span>
          <span class="wb-risk-badge" style="background:${RISK_COLOR_MAP[scheme.riskLevel]}20; color:${RISK_COLOR_MAP[scheme.riskLevel]}; border:1px solid ${RISK_COLOR_MAP[scheme.riskLevel]}40">
            ${scheme.riskLevel}风险
          </span>
        </div>
        <div class="detail-actions">
          <button class="btn btn-sm" id="wb-btn-duplicate">复制</button>
          <button class="btn btn-sm" id="wb-btn-delete" style="color:#C82506; border-color:#E8B0B0">删除</button>
        </div>
      </div>

      <div class="detail-body">
        ${readiness.isReadyForFinal ? `
          <div class="wb-readiness-panel ready-panel">
            <div class="wb-readiness-icon">✓</div>
            <div>
              <div class="wb-readiness-title">该方案满足定稿条件</div>
              <div class="wb-readiness-desc">信息完整、无冲突，可以进入执行阶段</div>
            </div>
          </div>
        ` : `
          <div class="wb-readiness-panel not-ready-panel">
            <div class="wb-readiness-icon">!</div>
            <div>
              <div class="wb-readiness-title">该方案暂不满足定稿条件</div>
              <div class="wb-readiness-desc">存在以下问题需要处理：</div>
              <ul class="wb-readiness-list">
                ${readiness.blockingReasons.map(r => `<li>✕ ${this.escapeHtml(r)}</li>`).join('')}
                ${readiness.hasMissingInfo ? '<li>⚠ 存在缺失的必填信息</li>' : ''}
                ${readiness.hasDurationOverflow ? `<li>⚠ 预计时长 ${scheme.durationHours}h 超出建议上限 ${MAX_ACTIVITY_DURATION}h</li>` : ''}
                ${readiness.hasColorConflict ? '<li>⚠ 主辅色对比度较低，可能影响视觉层次</li>' : ''}
                ${readiness.hasInsufficientAdjustment ? '<li>ℹ 状态为「需调整」但未发现调整说明内容</li>' : ''}
                ${readiness.blockingReasons.length === 0 && !readiness.hasMissingInfo && !readiness.hasDurationOverflow && !readiness.hasColorConflict && !readiness.hasInsufficientAdjustment ? '<li>ℹ 当前状态不允许定稿</li>' : ''}
              </ul>
            </div>
          </div>
        `}

        ${checks.length > 0 ? `
          <div class="detail-section checks-panel">
            <div class="detail-section-title">
              <span>⚠ 检查提醒 (${checks.length})</span>
            </div>
            ${checks.map(check => `
              <div class="check-item ${check.type}">
                <span class="check-icon">
                  ${check.type === 'error' ? '✕' : check.type === 'warning' ? '⚠' : 'ℹ'}
                </span>
                <span>${check.message}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div class="wb-status-actions">
          <div class="detail-section-title">快速标记状态</div>
          <div class="wb-status-buttons">
            ${STATUSES.map(status => `
              <button class="wb-status-btn ${scheme.status === status ? 'active' : ''}" 
                      data-wb-status="${status}"
                      style="--status-color: ${STATUS_COLOR_MAP[status]}">
                ${status}
              </button>
            `).join('')}
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">基本信息</div>
          <div class="detail-grid">
            <div class="detail-field">
              <label>盒型</label>
              <div class="field-value">${scheme.boxType}</div>
            </div>
            <div class="detail-field">
              <label>描线方式</label>
              <div class="field-value">${scheme.lineMethod}</div>
            </div>
            <div class="detail-field">
              <label>罩面次数</label>
              <div class="field-value">${scheme.coatingCount !== null ? scheme.coatingCount + ' 次' : '<span style="color:#C82506">未填写</span>'}</div>
            </div>
            <div class="detail-field">
              <label>预计完成时长</label>
              <div class="field-value ${scheme.durationHours > MAX_ACTIVITY_DURATION ? 'text-warning' : ''}">
                ${scheme.durationHours} 小时
                ${scheme.durationHours > MAX_ACTIVITY_DURATION ? ' ⚠ 超限' : ''}
              </div>
            </div>
            <div class="detail-field">
              <label>适合人群</label>
              <div class="field-value">${this.escapeHtml(scheme.targetAudience) || '<span style="color:#C82506">未填写</span>'}</div>
            </div>
            <div class="detail-field">
              <label>风险等级</label>
              <div class="field-value" style="color:${RISK_COLOR_MAP[scheme.riskLevel]}; font-weight:600">
                ${scheme.riskLevel}风险
              </div>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">配色方案</div>
          <div class="wb-colors-display">
            <div class="wb-color-card">
              <div class="wb-color-label">主色</div>
              <div class="color-swatch" style="width:64px; height:64px; border-radius:8px; background:${scheme.mainColor.hex}"></div>
              <div class="wb-color-name">${scheme.mainColor.name}</div>
              <div class="wb-color-hex">${scheme.mainColor.hex}</div>
            </div>
            <div class="wb-color-plus">+</div>
            <div class="wb-color-card">
              <div class="wb-color-label">辅色</div>
              <div class="color-swatch" style="width:64px; height:64px; border-radius:8px; background:${scheme.secondaryColor.hex}"></div>
              <div class="wb-color-name">${scheme.secondaryColor.name}</div>
              <div class="wb-color-hex">${scheme.secondaryColor.hex}</div>
            </div>
            <div class="wb-color-preview">
              <div class="wb-color-label">配色预览</div>
              <div class="wb-preview-box" style="background:linear-gradient(135deg, ${scheme.mainColor.hex} 0%, ${scheme.mainColor.hex} 50%, ${scheme.secondaryColor.hex} 50%, ${scheme.secondaryColor.hex} 100%)"></div>
              ${readiness.hasColorConflict ? '<div class="wb-color-conflict">⚠ 对比度较低</div>' : '<div class="wb-color-ok">✓ 对比度良好</div>'}
            </div>
          </div>
          <div class="detail-field" style="margin-top:16px">
            <label>配色说明</label>
            <div class="wb-text-content">${this.escapeHtml(scheme.colorDescription) || '<span style="color:#C82506">未填写</span>'}</div>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">
            <span>工艺步骤</span>
            <span style="font-size:12px; color:var(--text-light); font-weight:normal">共 ${scheme.stepNotes.length} 步</span>
          </div>
          <ul class="wb-steps-list">
            ${scheme.stepNotes.map((step, idx) => `
              <li class="wb-step-item">
                <div class="wb-step-number">${step.step}</div>
                <div class="wb-step-content">
                  <div class="wb-step-title">${this.escapeHtml(step.title) || '<span style="color:#C82506">未填写标题</span>'}</div>
                  <div class="wb-step-note">${this.escapeHtml(step.note) || '<span style="color:#C82506">未填写备注</span>'}</div>
                </div>
              </li>
            `).join('')}
          </ul>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">操作提醒</div>
          <div class="wb-text-content ${!scheme.operationReminder.trim() ? 'text-warning' : ''}">
            ${this.escapeHtml(scheme.operationReminder) || '<span style="color:#C82506">未填写</span>'}
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">风险说明</div>
          <div class="wb-risk-content">
            <div class="wb-risk-level">
              <span style="font-size:12px; color:var(--text-light)">风险等级：</span>
              <span style="color:${RISK_COLOR_MAP[scheme.riskLevel]}; font-weight:600; font-size:16px">${scheme.riskLevel}风险</span>
            </div>
            <div class="wb-risk-desc">
              ${scheme.riskLevel === '高' ? '该方案工艺复杂度高，对制作人员技术要求高，建议在经验丰富的工艺师指导下进行。' : ''}
              ${scheme.riskLevel === '中' ? '该方案存在一定工艺难度，需按规范操作，注意关键环节质量把控。' : ''}
              ${scheme.riskLevel === '低' ? '该方案工艺难度较低，适合常规制作流程，风险可控。' : ''}
            </div>
          </div>
        </div>

        ${this.renderReviewSection(scheme, 'wb-')}
        ${this.renderChangeTimeline(scheme)}
        ${this.renderAdjustmentPanel(scheme, 'wb-')}
        ${this.renderFinalizedSummarySection(scheme, 'wb-')}
      </div>
    `
  }

  private renderWorkbenchSummary(): string {
    const summary = generateMaterialSummary(this.schemes)

    return `
      <div class="workbench-summary">
        <div class="wb-summary-header">
          <div class="wb-summary-title">📊 定稿汇总统计</div>
          <div class="wb-summary-subtitle">展示已定稿且可执行方案的整体情况，便于活动前快速确认物料与制作安排</div>
        </div>

        <div class="wb-summary-overview">
          <div class="wb-overview-card">
            <div class="wb-overview-value">${summary.totalSchemes}</div>
            <div class="wb-overview-label">可执行定稿方案</div>
          </div>
          <div class="wb-overview-card accent">
            <div class="wb-overview-value">${summary.totalHours}</div>
            <div class="wb-overview-label">总预计工时（小时）</div>
          </div>
          <div class="wb-overview-card">
            <div class="wb-overview-value">${summary.boxTypeSummary.length}</div>
            <div class="wb-overview-label">涉及盒型种类</div>
          </div>
          <div class="wb-overview-card">
            <div class="wb-overview-value">${summary.mainColors.length}</div>
            <div class="wb-overview-label">主色种类</div>
          </div>
        </div>

        <div class="wb-summary-grid">
          <div class="detail-section">
            <div class="detail-section-title">📦 盒型分布</div>
            <div class="wb-distribution-list">
              ${summary.boxTypeSummary.length > 0 ? summary.boxTypeSummary.map(item => `
                <div class="wb-dist-item">
                  <div class="wb-dist-label">${item.type}</div>
                  <div class="wb-dist-bar">
                    <div class="wb-dist-bar-fill" style="width:${(item.count / summary.totalSchemes) * 100}%"></div>
                  </div>
                  <div class="wb-dist-value">${item.count} 个</div>
                </div>
              `).join('') : '<div style="color:var(--text-muted)">暂无数据</div>'}
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section-title">✒️ 描线方式统计</div>
            <div class="wb-line-methods">
              ${summary.lineMethods.length > 0 ? summary.lineMethods.map(m => `
                <div class="wb-line-card">
                  <div class="wb-line-name">${m.method}</div>
                  <div class="wb-line-count">${m.count} 个方案</div>
                  <div class="wb-line-bar">
                    <div class="wb-line-bar-fill" style="width:${(m.count / summary.totalSchemes) * 100}%"></div>
                  </div>
                </div>
              `).join('') : '<div style="color:var(--text-muted)">暂无数据</div>'}
            </div>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">🎨 主色用量概览</div>
          <div class="material-summary-grid">
            ${summary.mainColors.length > 0 ? summary.mainColors.map(m => {
              const color = COLORS.find(c => c.name === m.color)
              return `
                <div class="material-card">
                  <div class="material-color" style="background:${color?.hex || '#ccc'}"></div>
                  <div class="material-info">
                    <div class="material-name">${m.color}</div>
                    <div class="material-count">${m.count} 个方案 · ${m.boxTypes.join('、')}</div>
                  </div>
                </div>
              `
            }).join('') : '<div style="color:var(--text-muted)">暂无数据</div>'}
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">🎨 辅色用量概览</div>
          <div class="material-summary-grid">
            ${summary.secondaryColors.length > 0 ? summary.secondaryColors.map(m => {
              const color = COLORS.find(c => c.name === m.color)
              return `
                <div class="material-card">
                  <div class="material-color" style="background:${color?.hex || '#ccc'}"></div>
                  <div class="material-info">
                    <div class="material-name">${m.color}</div>
                    <div class="material-count">${m.count} 个方案 · ${m.boxTypes.join('、')}</div>
                  </div>
                </div>
              `
            }).join('') : '<div style="color:var(--text-muted)">暂无数据</div>'}
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">📋 已定稿方案明细（共 ${summary.allFinalizedSchemes.length} 个，可执行 ${summary.executableSchemes.length} 个）</div>
          <table class="finalized-table">
            <thead>
              <tr>
                <th>序号</th>
                <th>方案名称</th>
                <th>盒型</th>
                <th>主色</th>
                <th>辅色</th>
                <th>描线</th>
                <th>罩面</th>
                <th>时长</th>
                <th>适合人群</th>
                <th>执行状态</th>
              </tr>
            </thead>
            <tbody>
              ${summary.allFinalizedSchemes.length > 0 ? summary.allFinalizedSchemes.map((s, i) => {
                const readiness = getSchemeReadiness(s)
                const isExecutable = readiness.isReadyForFinal
                const excluded = summary.excludedSchemes.find(e => e.name === s.name)
                const warningTitle = excluded ? excluded.reasons.join('; ') : ''
                const statusHtml = isExecutable
                  ? '<span class="mini-tag success">✅ 可执行</span>'
                  : '<span class="mini-tag warning" title="' + warningTitle + '">⚠ 有警告</span>'
                return `
                <tr style="${!isExecutable ? 'background: #FFFAF0; opacity: 0.9' : ''}">
                  <td>${i + 1}</td>
                  <td><strong>${this.escapeHtml(s.name)}</strong></td>
                  <td>${s.boxType}</td>
                  <td>${s.mainColor.name}</td>
                  <td>${s.secondaryColor.name}</td>
                  <td>${s.lineMethod}</td>
                  <td>${s.coatingCount ?? '-'}次</td>
                  <td>${s.durationHours}h</td>
                  <td>${this.escapeHtml(s.targetAudience) || '-'}</td>
                  <td>${statusHtml}</td>
                </tr>
              `
              }).join('') : `
                <tr>
                  <td colspan="10" style="text-align:center; color:var(--text-muted); padding:20px">暂无已定稿方案</td>
                </tr>
              `}
            </tbody>
          </table>
        </div>

        ${summary.excludedSchemes.length > 0 ? `
          <div class="detail-section" style="background: #FFF8F0; border: 1px solid #FFE0B8">
            <div class="detail-section-title" style="color: #C82506">⚠ 存在执行警告的方案（${summary.excludedSchemes.length} 个）</div>
            ${summary.excludedSchemes.map(item => `
              <div style="padding: 8px 0; border-bottom: 1px dashed #FFD6D6; font-size: 13px">
                <div style="font-weight: 500; margin-bottom: 4px">${this.escapeHtml(item.name)}</div>
                <div style="color: #C82506; font-size: 12px">
                  ${item.reasons.map(r => `• ${this.escapeHtml(r)}`).join('<br>')}
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `
  }

  private renderFinalizedModal(): string {
    const summary = generateMaterialSummary(this.schemes)
    const allFinalizedSchemes = summary.allFinalizedSchemes

    return `
      <div class="finalized-overlay" id="finalized-overlay">
        <div class="finalized-modal">
          <div class="finalized-header">
            <div class="finalized-title">定稿清单</div>
            <div style="display:flex; gap:8px">
              <button class="btn btn-sm" id="btn-print">打印</button>
              <button class="btn btn-sm" id="btn-close-finalized">关闭</button>
            </div>
          </div>
          <div class="finalized-body">
            <div class="print-only" style="text-align:center; margin-bottom:20px">
              <h1 style="font-size:24px; margin-bottom:8px">漆盒纹样定稿清单</h1>
              <p style="color:#666">生成时间：${new Date().toLocaleString('zh-CN')}</p>
            </div>

            <div class="finalized-section">
              <div class="finalized-section-title">📊 概览</div>
              <div style="display:flex; gap:24px; font-size:13px">
                <div>
                  <span style="color:var(--text-light)">已定稿方案：</span>
                  <strong>${summary.totalSchemes} 个</strong>
                </div>
                <div>
                  <span style="color:var(--text-light)">预计总工时：</span>
                  <strong>${summary.totalHours} 小时</strong>
                </div>
                <div>
                  <span style="color:var(--text-light)">涉及盒型：</span>
                  <strong>${summary.boxTypeSummary.length} 种</strong>
                </div>
              </div>
            </div>

            <div class="finalized-section">
              <div class="finalized-section-title">🎨 主色材料汇总</div>
              <div class="material-summary-grid">
                ${summary.mainColors.length > 0 ? summary.mainColors.map(m => {
                  const color = COLORS.find(c => c.name === m.color)
                  return `
                    <div class="material-card">
                      <div class="material-color" style="background:${color?.hex || '#ccc'}"></div>
                      <div class="material-info">
                        <div class="material-name">${m.color}</div>
                        <div class="material-count">${m.count} 个方案 · ${m.boxTypes.join('、')}</div>
                      </div>
                    </div>
                  `
                }).join('') : '<div style="color:var(--text-muted)">暂无数据</div>'}
              </div>
            </div>

            <div class="finalized-section">
              <div class="finalized-section-title">🎨 辅色材料汇总</div>
              <div class="material-summary-grid">
                ${summary.secondaryColors.length > 0 ? summary.secondaryColors.map(m => {
                  const color = COLORS.find(c => c.name === m.color)
                  return `
                    <div class="material-card">
                      <div class="material-color" style="background:${color?.hex || '#ccc'}"></div>
                      <div class="material-info">
                        <div class="material-name">${m.color}</div>
                        <div class="material-count">${m.count} 个方案 · ${m.boxTypes.join('、')}</div>
                      </div>
                    </div>
                  `
                }).join('') : '<div style="color:var(--text-muted)">暂无数据</div>'}
              </div>
            </div>

            <div class="finalized-section">
              <div class="finalized-section-title">✒️ 描线方式汇总</div>
              <div style="display:flex; gap:12px; flex-wrap:wrap">
                ${summary.lineMethods.length > 0 ? summary.lineMethods.map(m => `
                  <span style="padding:6px 14px; background:var(--bg); border-radius:20px; font-size:13px">
                    ${m.method}：<strong>${m.count}</strong> 个
                  </span>
                `).join('') : '<span style="color:var(--text-muted)">暂无数据</span>'}
              </div>
            </div>

            <div class="finalized-section">
              <div class="finalized-section-title">📋 方案明细（共 ${allFinalizedSchemes.length} 个，可执行 ${summary.executableSchemes.length} 个）</div>
              <table class="finalized-table">
                <thead>
                  <tr>
                    <th>序号</th>
                    <th>方案名称</th>
                    <th>盒型</th>
                    <th>主色</th>
                    <th>辅色</th>
                    <th>描线</th>
                    <th>罩面</th>
                    <th>时长</th>
                    <th>适合人群</th>
                    <th>执行状态</th>
                  </tr>
                </thead>
                <tbody>
                  ${allFinalizedSchemes.length > 0 ? allFinalizedSchemes.map((s, i) => {
                    const readiness = getSchemeReadiness(s)
                    const isExecutable = readiness.isReadyForFinal
                    const excluded = summary.excludedSchemes.find(e => e.name === s.name)
                    const warningTitle = excluded ? excluded.reasons.join('; ') : ''
                    const statusHtml = isExecutable
                      ? '<span class="mini-tag success">✅ 可执行</span>'
                      : '<span class="mini-tag warning" title="' + warningTitle + '">⚠ 有警告</span>'
                    return `
                    <tr style="${!isExecutable ? 'background: #FFFAF0; opacity: 0.9' : ''}">
                      <td>${i + 1}</td>
                      <td><strong>${this.escapeHtml(s.name)}</strong></td>
                      <td>${s.boxType}</td>
                      <td>${s.mainColor.name}</td>
                      <td>${s.secondaryColor.name}</td>
                      <td>${s.lineMethod}</td>
                      <td>${s.coatingCount ?? '-'}次</td>
                      <td>${s.durationHours}h</td>
                      <td>${this.escapeHtml(s.targetAudience) || '-'}</td>
                      <td>${statusHtml}</td>
                    </tr>
                  `
                  }).join('') : `
                    <tr>
                      <td colspan="10" style="text-align:center; color:var(--text-muted); padding:20px">暂无已定稿方案</td>
                    </tr>
                  `}
                </tbody>
              </table>
            </div>

            ${summary.excludedSchemes.length > 0 ? `
              <div class="finalized-section" style="background: #FFF8F0; border: 1px solid #FFE0B8">
                <div class="finalized-section-title" style="color: #C82506">⚠ 存在执行警告的方案（${summary.excludedSchemes.length} 个）</div>
                ${summary.excludedSchemes.map(item => `
                  <div style="padding: 8px 0; border-bottom: 1px dashed #FFD6D6; font-size: 13px">
                    <div style="font-weight: 500; margin-bottom: 4px">${this.escapeHtml(item.name)}</div>
                    <div style="color: #C82506; font-size: 12px">
                      ${item.reasons.map(r => `• ${this.escapeHtml(r)}`).join('<br>')}
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `
  }

  private bindEvents(): void {
    document.getElementById('btn-view-manager')?.addEventListener('click', () => {
      this.currentView = 'manager'
      this.render()
    })
    document.getElementById('btn-view-workbench')?.addEventListener('click', () => {
      this.currentView = 'workbench'
      this.render()
    })

    document.getElementById('btn-new')?.addEventListener('click', () => this.createNewScheme())
    document.getElementById('btn-export')?.addEventListener('click', () => exportToJson(this.schemes))
    document.getElementById('btn-import')?.addEventListener('click', () => {
      document.getElementById('file-input')?.click()
    })
    document.getElementById('file-input')?.addEventListener('change', async (e) => {
      const target = e.target as HTMLInputElement
      const file = target.files?.[0]
      if (file) {
        try {
          const result = await importFromJson(file)
          const { schemes: imported, issues } = result

          let message = `成功导入 ${imported.length} 个方案`
          if (issues.length > 0) {
            message += `\n\n以下问题已自动修正：\n• ${issues.slice(0, 10).join('\n• ')}`
            if (issues.length > 10) {
              message += `\n... 还有 ${issues.length - 10} 条修正记录`
            }
          }

          const action = confirm(`${message}\n\n是否合并到当前数据？\n取消则替换现有数据。`)
          if (action) {
            this.schemes = [...this.schemes, ...imported]
          } else {
            this.schemes = imported
          }
          this.save()
          if (this.schemes.length > 0 && !this.selectedId) {
            this.selectedId = this.schemes[0].id
            this.workbenchSelectedId = this.schemes[0].id
          }
          this.render()
        } catch (err) {
          alert((err as Error).message)
        } finally {
          target.value = ''
        }
      }
    })
    document.getElementById('btn-finalized')?.addEventListener('click', () => {
      this.showFinalizedModal = true
      this.render()
    })
    document.getElementById('btn-close-finalized')?.addEventListener('click', () => {
      this.showFinalizedModal = false
      this.render()
    })
    document.getElementById('finalized-overlay')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).id === 'finalized-overlay') {
        this.showFinalizedModal = false
        this.render()
      }
    })
    document.getElementById('btn-print')?.addEventListener('click', () => {
      window.print()
    })

    this.bindManagerEvents()
    this.bindWorkbenchEvents()
  }

  private bindManagerEvents(): void {
    if (this.currentView !== 'manager') return

    document.getElementById('filter-boxType')?.addEventListener('change', (e) => {
      this.filters.boxType = (e.target as HTMLSelectElement).value
      this.render()
    })
    document.getElementById('filter-mainColor')?.addEventListener('change', (e) => {
      this.filters.mainColor = (e.target as HTMLSelectElement).value
      this.render()
    })
    document.getElementById('filter-status')?.addEventListener('change', (e) => {
      this.filters.status = (e.target as HTMLSelectElement).value as SchemeStatus | ''
      this.render()
    })
    document.getElementById('filter-riskLevel')?.addEventListener('change', (e) => {
      this.filters.riskLevel = (e.target as HTMLSelectElement).value as RiskLevel | ''
      this.render()
    })
    document.getElementById('filter-minDuration')?.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value
      this.filters.minDuration = val === '' ? null : parseFloat(val)
      this.render()
    })
    document.getElementById('filter-maxDuration')?.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value
      this.filters.maxDuration = val === '' ? null : parseFloat(val)
      this.render()
    })
    document.getElementById('filter-batchMode')?.addEventListener('change', (e) => {
      this.batchMode = (e.target as HTMLInputElement).checked
      if (!this.batchMode) {
        this.selectedIds.clear()
      }
      this.render()
    })

    document.querySelectorAll('.scheme-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const target = e.target as HTMLElement
        if (target.classList.contains('scheme-item-checkbox')) return
        const id = item.getAttribute('data-id')!
        if (this.batchMode) {
          if (this.selectedIds.has(id)) {
            this.selectedIds.delete(id)
          } else {
            this.selectedIds.add(id)
          }
          this.render()
        } else {
          this.selectedId = id
          this.render()
        }
      })
    })

    document.querySelectorAll<HTMLInputElement>('.scheme-item-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        e.stopPropagation()
        const id = cb.getAttribute('data-id')!
        if (cb.checked) {
          this.selectedIds.add(id)
        } else {
          this.selectedIds.delete(id)
        }
        this.render()
      })
    })

    document.getElementById('select-all')?.addEventListener('change', () => {
      this.toggleSelectAll()
    })

    document.querySelectorAll('[data-batch-status]').forEach(btn => {
      btn.addEventListener('click', () => {
        const status = btn.getAttribute('data-batch-status') as SchemeStatus
        this.batchUpdateStatus(status)
      })
    })

    if (this.selectedId) {
      document.getElementById('btn-duplicate')?.addEventListener('click', () => {
        this.duplicateScheme(this.selectedId!)
      })
      document.getElementById('btn-delete')?.addEventListener('click', () => {
        this.deleteScheme(this.selectedId!)
      })

      document.getElementById('detail-name')?.addEventListener('change', (e) => {
        this.updateScheme(this.selectedId!, { name: (e.target as HTMLInputElement).value })
      })
      document.getElementById('detail-boxType')?.addEventListener('change', (e) => {
        this.updateScheme(this.selectedId!, { boxType: (e.target as HTMLSelectElement).value })
      })
      document.getElementById('detail-lineMethod')?.addEventListener('change', (e) => {
        this.updateScheme(this.selectedId!, { lineMethod: (e.target as HTMLSelectElement).value as any })
      })
      document.getElementById('detail-coatingCount')?.addEventListener('change', (e) => {
        const val = (e.target as HTMLInputElement).value
        this.updateScheme(this.selectedId!, { coatingCount: val === '' ? null : parseInt(val) })
      })
      document.getElementById('detail-durationHours')?.addEventListener('change', (e) => {
        this.updateScheme(this.selectedId!, { durationHours: parseFloat((e.target as HTMLInputElement).value) || 0 })
      })
      document.getElementById('detail-targetAudience')?.addEventListener('change', (e) => {
        this.updateScheme(this.selectedId!, { targetAudience: (e.target as HTMLInputElement).value })
      })
      document.getElementById('detail-riskLevel')?.addEventListener('change', (e) => {
        this.updateScheme(this.selectedId!, { riskLevel: (e.target as HTMLSelectElement).value as RiskLevel })
      })
      document.getElementById('detail-status')?.addEventListener('change', (e) => {
        const status = (e.target as HTMLSelectElement).value as SchemeStatus
        if (!this.tryUpdateStatus(this.selectedId!, status)) {
          this.render()
        }
      })
      document.getElementById('detail-operationReminder')?.addEventListener('change', (e) => {
        this.updateScheme(this.selectedId!, { operationReminder: (e.target as HTMLTextAreaElement).value })
      })
      document.getElementById('detail-colorDescription')?.addEventListener('change', (e) => {
        this.updateScheme(this.selectedId!, { colorDescription: (e.target as HTMLTextAreaElement).value })
      })

      document.querySelectorAll('[data-color-target]').forEach(opt => {
        opt.addEventListener('click', () => {
          const target = opt.getAttribute('data-color-target') as 'main' | 'secondary'
          const name = opt.getAttribute('data-color-name')!
          const hex = opt.getAttribute('data-color-hex')!
          const colorInfo: ColorInfo = { name, hex }
          if (target === 'main') {
            this.updateScheme(this.selectedId!, { mainColor: colorInfo })
          } else {
            this.updateScheme(this.selectedId!, { secondaryColor: colorInfo })
          }
        })
      })

      document.querySelectorAll('.step-title-input, .step-note-input').forEach(input => {
        input.addEventListener('change', (e) => {
          const idx = parseInt(input.getAttribute('data-step-index')!)
          const field = input.getAttribute('data-field') as 'title' | 'note'
          const scheme = this.getSelectedScheme()
          if (scheme) {
            const newSteps = [...scheme.stepNotes]
            newSteps[idx] = { ...newSteps[idx], [field]: (e.target as HTMLInputElement | HTMLTextAreaElement).value }
            this.updateScheme(this.selectedId!, { stepNotes: newSteps })
          }
        })
      })

      document.querySelectorAll('[data-step-action]').forEach(btn => {
        btn.addEventListener('click', () => {
          const action = btn.getAttribute('data-step-action')!
          const idx = parseInt(btn.getAttribute('data-step-index')!)
          const scheme = this.getSelectedScheme()
          if (!scheme) return

          const newSteps = [...scheme.stepNotes]
          if (action === 'up' && idx > 0) {
            [newSteps[idx - 1], newSteps[idx]] = [newSteps[idx], newSteps[idx - 1]]
            newSteps.forEach((s, i) => s.step = i + 1)
          } else if (action === 'down' && idx < newSteps.length - 1) {
            [newSteps[idx + 1], newSteps[idx]] = [newSteps[idx], newSteps[idx + 1]]
            newSteps.forEach((s, i) => s.step = i + 1)
          } else if (action === 'delete') {
            if (newSteps.length <= 1) {
              alert('至少保留一个步骤')
              return
            }
            newSteps.splice(idx, 1)
            newSteps.forEach((s, i) => s.step = i + 1)
          }
          this.updateScheme(this.selectedId!, { stepNotes: newSteps })
        })
      })

      document.getElementById('btn-add-step')?.addEventListener('click', () => {
        const scheme = this.getSelectedScheme()
        if (scheme) {
          const newSteps = [...scheme.stepNotes, { step: scheme.stepNotes.length + 1, title: '', note: '' }]
          this.updateScheme(this.selectedId!, { stepNotes: newSteps })
        }
      })

      document.getElementById('btn-toggle-checks')?.addEventListener('click', () => {
        this.showChecks = !this.showChecks
        this.render()
      })

      const scheme = this.getSelectedScheme()
      if (scheme) {
        document.getElementById('btn-add-review')?.addEventListener('click', () => {
          const conclusion = (document.getElementById('review-conclusion') as HTMLSelectElement)?.value as ReviewConclusion
          const reviewer = (document.getElementById('review-reviewer') as HTMLInputElement)?.value?.trim()
          const comment = (document.getElementById('review-comment') as HTMLTextAreaElement)?.value?.trim()

          if (!reviewer) {
            alert('请输入评审人姓名')
            return
          }

          let newStatus: SchemeStatus = scheme.status
          if (conclusion === '通过') {
            newStatus = '已定稿'
          } else if (conclusion === '需调整') {
            newStatus = '需调整'
          }

          if (newStatus !== scheme.status && newStatus === '需调整') {
            const reason = prompt('请输入调整原因：', '')
            if (reason === null) return
            if (!reason.trim()) {
              alert('请输入调整原因')
              return
            }
            const newReason: AdjustmentReason = {
              id: generateId(),
              createdAt: Date.now(),
              content: reason.trim()
            }

            const statusBefore = scheme.status
            const reviewRecord: ReviewRecord = {
              id: generateId(),
              timestamp: Date.now(),
              conclusion,
              reviewer,
              comment: comment || '',
              statusBefore,
              statusAfter: newStatus
            }

            const fieldChange = this.generateFieldChange(scheme.id, 'status', statusBefore, newStatus, reviewer, reason.trim())

            const index = this.schemes.findIndex(s => s.id === scheme.id)
            if (index !== -1) {
              this.schemes[index] = {
                ...this.schemes[index],
                status: newStatus,
                reviewRecords: [...this.schemes[index].reviewRecords, reviewRecord],
                fieldChanges: [...this.schemes[index].fieldChanges, fieldChange],
                adjustmentReasons: [...this.schemes[index].adjustmentReasons, newReason],
                updatedAt: Date.now()
              }
              this.save()
              this.render()
            }
          } else if (newStatus !== scheme.status && newStatus === '已定稿') {
            const statusBefore = scheme.status
            const summary = this.autoGenerateSummary(scheme)
            const reviewRecord: ReviewRecord = {
              id: generateId(),
              timestamp: Date.now(),
              conclusion,
              reviewer,
              comment: comment || '',
              statusBefore,
              statusAfter: newStatus
            }

            const fieldChange = this.generateFieldChange(scheme.id, 'status', statusBefore, newStatus, reviewer, comment || '评审通过，自动定稿')

            const index = this.schemes.findIndex(s => s.id === scheme.id)
            if (index !== -1) {
              this.schemes[index] = {
                ...this.schemes[index],
                status: newStatus,
                reviewRecords: [...this.schemes[index].reviewRecords, reviewRecord],
                fieldChanges: [...this.schemes[index].fieldChanges, fieldChange],
                finalizedSummary: summary,
                updatedAt: Date.now()
              }
              this.save()
              this.render()
            }
          } else {
            const reviewRecord: ReviewRecord = {
              id: generateId(),
              timestamp: Date.now(),
              conclusion,
              reviewer,
              comment: comment || '',
              statusBefore: scheme.status,
              statusAfter: scheme.status
            }

            const index = this.schemes.findIndex(s => s.id === scheme.id)
            if (index !== -1) {
              this.schemes[index] = {
                ...this.schemes[index],
                reviewRecords: [...this.schemes[index].reviewRecords, reviewRecord],
                updatedAt: Date.now()
              }
              this.save()
              this.render()
            }
          }
        })

        document.getElementById('btn-add-progress')?.addEventListener('click', () => {
          const operator = (document.getElementById('progress-operator') as HTMLInputElement)?.value?.trim()
          const content = (document.getElementById('progress-content') as HTMLTextAreaElement)?.value?.trim()

          if (!operator) {
            alert('请输入处理人姓名')
            return
          }
          if (!content) {
            alert('请输入进展说明')
            return
          }

          const progress: AdjustmentProgress = {
            id: generateId(),
            timestamp: Date.now(),
            content,
            operator
          }

          const index = this.schemes.findIndex(s => s.id === scheme.id)
          if (index !== -1) {
            this.schemes[index] = {
              ...this.schemes[index],
              adjustmentProgress: [...this.schemes[index].adjustmentProgress, progress],
              updatedAt: Date.now()
            }
            this.save()
            this.render()
          }
        })

        document.getElementById('btn-gen-summary')?.addEventListener('click', () => {
          const summary = this.autoGenerateSummary(scheme)
          const index = this.schemes.findIndex(s => s.id === scheme.id)
          if (index !== -1) {
            this.schemes[index] = {
              ...this.schemes[index],
              finalizedSummary: summary,
              updatedAt: Date.now()
            }
            this.save()
            this.render()
          }
        })
      }

      document.querySelectorAll('[data-summary-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = btn.getAttribute('data-summary-tab') as 'manager' | 'workbench'
          const schemeId = btn.getAttribute('data-scheme-id')!
          this.summaryTabManager[schemeId] = tab
          this.render()
        })
      })
    }
  }

  private bindWorkbenchEvents(): void {
    if (this.currentView !== 'workbench') return

    document.querySelectorAll('[data-wb-tab]').forEach(tab => {
      tab.addEventListener('click', () => {
        this.workbenchTab = tab.getAttribute('data-wb-tab') as WorkbenchTab
        this.render()
      })
    })

    document.querySelectorAll('[data-wb-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.workbenchView = btn.getAttribute('data-wb-view') as WorkbenchView
        this.render()
      })
    })

    document.getElementById('wb-filter-boxType')?.addEventListener('change', (e) => {
      this.workbenchFilters.boxType = (e.target as HTMLSelectElement).value
      this.render()
    })
    document.getElementById('wb-filter-mainColor')?.addEventListener('change', (e) => {
      this.workbenchFilters.mainColor = (e.target as HTMLSelectElement).value
      this.render()
    })
    document.getElementById('wb-filter-status')?.addEventListener('change', (e) => {
      this.workbenchFilters.status = (e.target as HTMLSelectElement).value as SchemeStatus | ''
      this.render()
    })
    document.getElementById('wb-filter-riskLevel')?.addEventListener('change', (e) => {
      this.workbenchFilters.riskLevel = (e.target as HTMLSelectElement).value as RiskLevel | ''
      this.render()
    })
    document.getElementById('wb-filter-minDuration')?.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value
      this.workbenchFilters.minDuration = val === '' ? null : parseFloat(val)
      this.render()
    })
    document.getElementById('wb-filter-maxDuration')?.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value
      this.workbenchFilters.maxDuration = val === '' ? null : parseFloat(val)
      this.render()
    })

    document.querySelectorAll('.wb-scheme-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.getAttribute('data-wb-id')!
        this.workbenchSelectedId = id
        this.render()
      })
    })

    if (this.workbenchSelectedId && this.workbenchTab === 'list') {
      document.getElementById('wb-btn-duplicate')?.addEventListener('click', () => {
        this.duplicateScheme(this.workbenchSelectedId!)
      })
      document.getElementById('wb-btn-delete')?.addEventListener('click', () => {
        this.deleteScheme(this.workbenchSelectedId!)
      })

      document.querySelectorAll('[data-wb-status]').forEach(btn => {
        btn.addEventListener('click', () => {
          const status = btn.getAttribute('data-wb-status') as SchemeStatus
          this.tryUpdateStatus(this.workbenchSelectedId!, status)
        })
      })

      const scheme = this.getWorkbenchSelectedScheme()
      if (scheme) {
        document.getElementById('wb-btn-add-review')?.addEventListener('click', () => {
          const conclusion = (document.getElementById('wb-review-conclusion') as HTMLSelectElement)?.value as ReviewConclusion
          const reviewer = (document.getElementById('wb-review-reviewer') as HTMLInputElement)?.value?.trim()
          const comment = (document.getElementById('wb-review-comment') as HTMLTextAreaElement)?.value?.trim()

          if (!reviewer) {
            alert('请输入评审人姓名')
            return
          }

          let newStatus: SchemeStatus = scheme.status
          if (conclusion === '通过') {
            newStatus = '已定稿'
          } else if (conclusion === '需调整') {
            newStatus = '需调整'
          }

          if (newStatus !== scheme.status && newStatus === '需调整') {
            const reason = prompt('请输入调整原因：', '')
            if (reason === null) return
            if (!reason.trim()) {
              alert('请输入调整原因')
              return
            }
            const newReason: AdjustmentReason = {
              id: generateId(),
              createdAt: Date.now(),
              content: reason.trim()
            }

            const statusBefore = scheme.status
            const reviewRecord: ReviewRecord = {
              id: generateId(),
              timestamp: Date.now(),
              conclusion,
              reviewer,
              comment: comment || '',
              statusBefore,
              statusAfter: newStatus
            }

            const fieldChange = this.generateFieldChange(scheme.id, 'status', statusBefore, newStatus, reviewer, reason.trim())

            const index = this.schemes.findIndex(s => s.id === scheme.id)
            if (index !== -1) {
              this.schemes[index] = {
                ...this.schemes[index],
                status: newStatus,
                reviewRecords: [...this.schemes[index].reviewRecords, reviewRecord],
                fieldChanges: [...this.schemes[index].fieldChanges, fieldChange],
                adjustmentReasons: [...this.schemes[index].adjustmentReasons, newReason],
                updatedAt: Date.now()
              }
              this.save()
              this.render()
            }
          } else if (newStatus !== scheme.status && newStatus === '已定稿') {
            const statusBefore = scheme.status
            const summary = this.autoGenerateSummary(scheme)
            const reviewRecord: ReviewRecord = {
              id: generateId(),
              timestamp: Date.now(),
              conclusion,
              reviewer,
              comment: comment || '',
              statusBefore,
              statusAfter: newStatus
            }

            const fieldChange = this.generateFieldChange(scheme.id, 'status', statusBefore, newStatus, reviewer, comment || '评审通过，自动定稿')

            const index = this.schemes.findIndex(s => s.id === scheme.id)
            if (index !== -1) {
              this.schemes[index] = {
                ...this.schemes[index],
                status: newStatus,
                reviewRecords: [...this.schemes[index].reviewRecords, reviewRecord],
                fieldChanges: [...this.schemes[index].fieldChanges, fieldChange],
                finalizedSummary: summary,
                updatedAt: Date.now()
              }
              this.save()
              this.render()
            }
          } else {
            const reviewRecord: ReviewRecord = {
              id: generateId(),
              timestamp: Date.now(),
              conclusion,
              reviewer,
              comment: comment || '',
              statusBefore: scheme.status,
              statusAfter: scheme.status
            }

            const index = this.schemes.findIndex(s => s.id === scheme.id)
            if (index !== -1) {
              this.schemes[index] = {
                ...this.schemes[index],
                reviewRecords: [...this.schemes[index].reviewRecords, reviewRecord],
                updatedAt: Date.now()
              }
              this.save()
              this.render()
            }
          }
        })

        document.getElementById('wb-btn-add-progress')?.addEventListener('click', () => {
          const operator = (document.getElementById('wb-progress-operator') as HTMLInputElement)?.value?.trim()
          const content = (document.getElementById('wb-progress-content') as HTMLTextAreaElement)?.value?.trim()

          if (!operator) {
            alert('请输入处理人姓名')
            return
          }
          if (!content) {
            alert('请输入进展说明')
            return
          }

          const progress: AdjustmentProgress = {
            id: generateId(),
            timestamp: Date.now(),
            content,
            operator
          }

          const index = this.schemes.findIndex(s => s.id === scheme.id)
          if (index !== -1) {
            this.schemes[index] = {
              ...this.schemes[index],
              adjustmentProgress: [...this.schemes[index].adjustmentProgress, progress],
              updatedAt: Date.now()
            }
            this.save()
            this.render()
          }
        })

        document.getElementById('wb-btn-gen-summary')?.addEventListener('click', () => {
          const summary = this.autoGenerateSummary(scheme)
          const index = this.schemes.findIndex(s => s.id === scheme.id)
          if (index !== -1) {
            this.schemes[index] = {
              ...this.schemes[index],
              finalizedSummary: summary,
              updatedAt: Date.now()
            }
            this.save()
            this.render()
          }
        })
      }

      document.querySelectorAll('[data-summary-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = btn.getAttribute('data-summary-tab') as 'manager' | 'workbench'
          const schemeId = btn.getAttribute('data-scheme-id')!
          this.summaryTabManager[schemeId] = tab
          this.render()
        })
      })
    }
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div')
    div.textContent = str
    return div.innerHTML
  }
}

new App()
