import type { PatternScheme, ReviewRecord, FieldChange, AdjustmentReason, AdjustmentProgress, ExecutionOrder, TestRecord } from '../types'
import { COLORS, BOX_TYPES } from '../constants'
import { generateId } from './storage'

function createSampleReviews(schemeIndex: number): ReviewRecord[] {
  const now = Date.now()
  if (schemeIndex === 0) {
    return [
      {
        id: generateId(),
        timestamp: now - 86400000 * 4,
        conclusion: '需调整',
        reviewer: '王工艺师',
        comment: '初次评审：整体色彩搭配协调，但罩面次数需要从2次增加到3次，以保证漆面耐久性',
        statusBefore: '待试配',
        statusAfter: '需调整'
      },
      {
        id: generateId(),
        timestamp: now - 86400000 * 2,
        conclusion: '通过',
        reviewer: '李主管',
        comment: '二次评审：调整后罩面次数已完善，配色庄重大气，适合节庆场合使用，同意定稿',
        statusBefore: '需调整',
        statusAfter: '已定稿'
      }
    ]
  }
  if (schemeIndex === 2) {
    return [
      {
        id: generateId(),
        timestamp: now - 86400000 * 1,
        conclusion: '需调整',
        reviewer: '张评审',
        comment: '云纹线条流畅度需要优化，紫色与藏蓝搭配略显沉闷，建议增加对比色点缀',
        statusBefore: '待试配',
        statusAfter: '需调整'
      }
    ]
  }
  if (schemeIndex === 3) {
    return [
      {
        id: generateId(),
        timestamp: now - 86400000 * 3,
        conclusion: '待定',
        reviewer: '赵工艺',
        comment: '藕荷色与金黄搭配视觉效果柔和，需实际试色确认最终效果',
        statusBefore: '待试配',
        statusAfter: '待试配'
      },
      {
        id: generateId(),
        timestamp: now - 86400000 * 2,
        conclusion: '通过',
        reviewer: '钱主管',
        comment: '试色效果良好，配色柔和典雅，适合文房雅器类产品，同意定稿',
        statusBefore: '待试配',
        statusAfter: '已定稿'
      }
    ]
  }
  return []
}

function createSampleFieldChanges(schemeIndex: number): FieldChange[] {
  const now = Date.now()
  if (schemeIndex === 0) {
    return [
      {
        id: generateId(),
        timestamp: now - 86400000 * 3,
        field: 'coatingCount',
        fieldLabel: '罩面次数',
        beforeValue: '2 次',
        afterValue: '3 次',
        operator: '王工艺师',
        reason: '根据评审意见，增加罩面次数提升漆面耐久性'
      },
      {
        id: generateId(),
        timestamp: now - 86400000 * 1.5,
        field: 'durationHours',
        fieldLabel: '预计时长',
        beforeValue: '5 小时',
        afterValue: '6 小时',
        operator: '王工艺师',
        reason: '罩面次数增加导致总时长相应调整'
      }
    ]
  }
  if (schemeIndex === 2) {
    return [
      {
        id: generateId(),
        timestamp: now - 86400000 * 0.5,
        field: 'riskLevel',
        fieldLabel: '风险等级',
        beforeValue: '中风险',
        afterValue: '低风险',
        operator: '系统',
        reason: '调整步骤描述细化，风险等级下调'
      }
    ]
  }
  if (schemeIndex === 3) {
    return [
      {
        id: generateId(),
        timestamp: now - 86400000 * 2.5,
        field: 'colorDescription',
        fieldLabel: '配色说明',
        beforeValue: '金黄为底，藕荷回纹',
        afterValue: '金黄为底，藕荷回纹，配色柔和',
        operator: '赵工艺',
        reason: '补充配色意境描述'
      }
    ]
  }
  return []
}

function createSampleAdjustmentReasons(schemeIndex: number): AdjustmentReason[] {
  if (schemeIndex === 2) {
    return [
      {
        id: generateId(),
        createdAt: Date.now() - 86400000 * 1,
        content: '1. 云纹线条流畅度需优化，当前线条略显生硬\n2. 紫色与藏蓝搭配视觉上偏沉闷，建议增加少量明黄色点缀提升层次感\n3. 描银工艺效果待确认，可先试制小样评估'
      }
    ]
  }
  return []
}

function createSampleAdjustmentProgress(schemeIndex: number): AdjustmentProgress[] {
  if (schemeIndex === 2) {
    return [
      {
        id: generateId(),
        timestamp: Date.now() - 86400000 * 0.3,
        content: '已开始调整云纹线条草稿，优化曲线弧度',
        operator: '李工艺'
      }
    ]
  }
  return []
}

function createFinalizedSummary(schemeIndex: number) {
  const now = Date.now()
  if (schemeIndex === 0) {
    return {
      generatedAt: now - 86400000 * 1,
      managerView: {
        decisionBasis: '该方案配色庄重大气，朱砂红搭配明黄，符合传统节庆审美。经过两次评审，罩面次数由2次调整为3次，时长相应调整为6小时，满足质量与工期双重要求。',
        riskAssessment: '整体风险可控，中等风险主要来源于描金工艺对操作人员技术要求较高，需安排有经验的工艺师执行。',
        keyHighlights: ['传统节庆配色，市场接受度高', '工艺成熟，可复制性强', '罩面次数充足，产品耐久性好']
      },
      workbenchView: {
        executionStandard: '严格按照5步工艺流程执行，朱砂底漆髹涂2-3遍，每遍阴干打磨；描金环节注意漆面干燥度，避免晕染。',
        keyPoints: ['每遍漆髹涂后需彻底阴干（不少于24小时）', '描金前用细砂纸轻磨表面，增强附着力', '罩面漆采用薄涂多遍方式，每遍间隔24小时'],
        qualityRequirements: '最终漆面平整光滑无颗粒，纹样线条流畅清晰，金粉附着牢固，色泽均匀无漏涂。'
      }
    }
  }
  if (schemeIndex === 3) {
    return {
      generatedAt: now - 86400000 * 2,
      managerView: {
        decisionBasis: '金黄与藕荷搭配，配色柔和典雅，经过试色确认效果良好。适合文房雅器类产品定位，受众明确为中级爱好者。',
        riskAssessment: '工艺难度中等，色漆描线工艺相对成熟稳定，主要风险点在于套盒尺寸配合精度要求较高。',
        keyHighlights: ['配色柔和典雅，符合文房气质', '套盒设计实用性强', '工艺相对成熟，量产风险低']
      },
      workbenchView: {
        executionStandard: '套盒内外胎尺寸需精确控制，间隙不超过0.5mm。金黄底漆髹涂三遍，藕荷色回纹边框线条需工整对称。',
        keyPoints: ['长方套盒各边尺寸误差控制在±0.3mm以内', '回纹边框四角连接处线条需流畅过渡', '罩面三遍，每遍打磨后用棉布擦净粉尘'],
        qualityRequirements: '盒盖开合顺畅无卡顿，漆面色泽均匀，回纹线条工整无断笔，边角处无漆流挂现象。'
      }
    }
  }
  return null
}

export function createSampleSchemes(): PatternScheme[] {
  const now = Date.now()

  const baseSchemes: Omit<PatternScheme, 'reviewRecords' | 'fieldChanges' | 'adjustmentReasons' | 'adjustmentProgress' | 'finalizedSummary'>[] = [
    {
      id: generateId(),
      name: '朱砂描金方盒',
      boxType: BOX_TYPES[0],
      mainColor: COLORS[0],
      secondaryColor: COLORS[4],
      lineMethod: '描金',
      coatingCount: 3,
      durationHours: 6,
      targetAudience: '中级漆艺爱好者',
      operationReminder: '描金时注意漆面干燥度，避免晕染',
      status: '已定稿',
      colorDescription: '朱砂为底，明黄点缀，金色勾边，庄重大气',
      stepNotes: [
        { step: 1, title: '制胎', note: '木胎打磨光滑，裱布刮灰' },
        { step: 2, title: '髹底漆', note: '髹朱砂漆两至三遍，每遍阴干打磨' },
        { step: 3, title: '描纹样', note: '用明黄漆描绘云纹图案' },
        { step: 4, title: '描金', note: '金粉调和生漆，沿纹样边缘勾线' },
        { step: 5, title: '罩面', note: '罩透明漆三遍，打磨推光' }
      ],
      riskLevel: '中',
      createdAt: now - 86400000 * 5,
      updatedAt: now - 86400000
    },
    {
      id: generateId(),
      name: '石绿花卉圆盒',
      boxType: BOX_TYPES[1],
      mainColor: COLORS[6],
      secondaryColor: COLORS[1],
      lineMethod: '黑漆描线',
      coatingCount: 4,
      durationHours: 8,
      targetAudience: '高级漆艺爱好者',
      operationReminder: '花卉纹样层次多，注意每遍干透再继续',
      status: '待试配',
      colorDescription: '石绿为底，珊瑚红花，黑漆勾线，清雅脱俗',
      stepNotes: [
        { step: 1, title: '制胎', note: '圆形木胎，圆弧处需仔细打磨' },
        { step: 2, title: '髹底色', note: '石绿漆髹涂三遍，逐步加深' },
        { step: 3, title: '绘花卉', note: '珊瑚红漆画牡丹纹样，注意花瓣层次' },
        { step: 4, title: '描线', note: '黑漆细笔勾勒叶脉和轮廓' },
        { step: 5, title: '罩面', note: '透明漆四遍，精细打磨' }
      ],
      riskLevel: '高',
      createdAt: now - 86400000 * 3,
      updatedAt: now - 86400000 * 2
    },
    {
      id: generateId(),
      name: '藏蓝云纹葵瓣盒',
      boxType: BOX_TYPES[2],
      mainColor: COLORS[10],
      secondaryColor: COLORS[12],
      lineMethod: '描银',
      coatingCount: null,
      durationHours: 5,
      targetAudience: '初学者',
      operationReminder: '葵瓣形边缘处漆易流挂，薄涂多次',
      status: '需调整',
      colorDescription: '藏蓝为底，紫色云纹，银线点缀，神秘典雅',
      stepNotes: [
        { step: 1, title: '制胎', note: '葵瓣形木胎，注意瓣边整齐' },
        { step: 2, title: '髹底色', note: '藏蓝漆两遍，注意边缘均匀' },
        { step: 3, title: '绘云纹', note: '紫色漆绘云气纹，需调整线条流畅度' },
        { step: 4, title: '描银', note: '银粉描边，待确认效果' }
      ],
      riskLevel: '低',
      createdAt: now - 86400000 * 2,
      updatedAt: now - 86400000
    },
    {
      id: generateId(),
      name: '金黄回纹长方套盒',
      boxType: BOX_TYPES[5],
      mainColor: COLORS[3],
      secondaryColor: COLORS[13],
      lineMethod: '色漆描线',
      coatingCount: 3,
      durationHours: 7,
      targetAudience: '中级漆艺爱好者',
      operationReminder: '套盒尺寸需精确，避免盒盖配合不佳',
      status: '已定稿',
      colorDescription: '金黄为底，藕荷回纹，配色柔和',
      stepNotes: [
        { step: 1, title: '制胎', note: '长方套盒内外胎，尺寸需精确' },
        { step: 2, title: '髹底色', note: '金黄漆髹涂三遍' },
        { step: 3, title: '描回纹', note: '藕荷色漆描回纹边框' },
        { step: 4, title: '罩面', note: '透明漆三遍，打磨推光' }
      ],
      riskLevel: '中',
      createdAt: now - 86400000 * 4,
      updatedAt: now - 86400000 * 3
    },
    {
      id: generateId(),
      name: '漆黑洒金八方盒',
      boxType: BOX_TYPES[6],
      mainColor: COLORS[14],
      secondaryColor: COLORS[3],
      lineMethod: '无描线',
      coatingCount: 5,
      durationHours: 10,
      targetAudience: '高级漆艺爱好者',
      operationReminder: '洒金工艺需在半干状态进行，时机把握很重要',
      status: '仅展示',
      colorDescription: '黑漆为地，金箔洒点，简约华贵',
      stepNotes: [
        { step: 1, title: '制胎', note: '八方木胎，棱角分明' },
        { step: 2, title: '髹黑漆', note: '黑漆髹涂五遍，每遍精心打磨' },
        { step: 3, title: '洒金', note: '漆面半干时均匀洒金箔粉' },
        { step: 4, title: '罩面', note: '透明漆多遍罩涂，打磨推光' }
      ],
      riskLevel: '高',
      createdAt: now - 86400000 * 6,
      updatedAt: now - 86400000 * 4
    }
  ]

  return baseSchemes.map((base, index) => ({
    ...base,
    reviewRecords: createSampleReviews(index),
    fieldChanges: createSampleFieldChanges(index),
    adjustmentReasons: createSampleAdjustmentReasons(index),
    adjustmentProgress: createSampleAdjustmentProgress(index),
    finalizedSummary: createFinalizedSummary(index)
  }))
}

function createSampleTestRecords(orderIndex: number): TestRecord[] {
  const now = Date.now()
  if (orderIndex === 0) {
    return [
      {
        id: generateId(),
        timestamp: now - 86400000 * 1,
        result: '通过',
        executor: '李工艺师',
        actualHours: 6.5,
        issues: '试配过程顺利，描金环节注意控制漆层厚度，整体效果符合预期',
        suggestions: '可直接进入评审定稿流程',
        statusBefore: '执行中',
        statusAfter: '已完成'
      }
    ]
  }
  if (orderIndex === 1) {
    return [
      {
        id: generateId(),
        timestamp: now - 86400000 * 2,
        result: '需调整',
        executor: '王工艺师',
        actualHours: 5,
        issues: '1. 花卉纹样层次表现不足，花瓣过渡略显生硬\n2. 罩面第3遍时局部出现气泡\n3. 黑漆描线边缘不够整齐',
        suggestions: '1. 增加花瓣层次晕染，使用更细的毛笔勾勒\n2. 罩面时控制环境湿度，薄涂多次\n3. 描线前再次打磨底漆，确保附着力',
        statusBefore: '执行中',
        statusAfter: '需返工'
      },
      {
        id: generateId(),
        timestamp: now - 86400000 * 0.5,
        result: '待定',
        executor: '张工艺师',
        actualHours: 3,
        issues: '正在进行第二次试配，调整了花瓣绘制技法，等待漆层干透后评估效果',
        suggestions: '待漆层完全干透后（约24小时）进行效果评估',
        statusBefore: '执行中',
        statusAfter: '执行中'
      }
    ]
  }
  if (orderIndex === 2) {
    return [
      {
        id: generateId(),
        timestamp: now - 86400000 * 3,
        result: '需调整',
        executor: '赵工艺师',
        actualHours: 4,
        issues: '1. 云纹线条流畅度仍需优化，曲线弧度不够自然\n2. 紫色与藏蓝搭配在光线较暗处层次感不足\n3. 描银工艺附着力不够，有轻微脱落',
        suggestions: '1. 先用铅笔起稿确定云纹走向，再用漆描绘\n2. 增加少量明黄色点缀提升层次感\n3. 描银前用细砂纸轻磨底漆，增强附着力',
        statusBefore: '执行中',
        statusAfter: '需返工'
      }
    ]
  }
  return []
}

function createSampleOrderAdjustmentReasons(orderIndex: number): AdjustmentReason[] {
  if (orderIndex === 2) {
    return [
      {
        id: generateId(),
        createdAt: Date.now() - 86400000 * 2.5,
        content: '根据首次试配反馈，需要优化云纹线条流畅度，增加对比色点缀，并改进描银工艺附着力'
      }
    ]
  }
  return []
}

function createSampleOrderAdjustmentProgress(orderIndex: number): AdjustmentProgress[] {
  if (orderIndex === 2) {
    return [
      {
        id: generateId(),
        timestamp: Date.now() - 86400000 * 2,
        content: '已重新起稿云纹图案，优化曲线弧度',
        operator: '李工艺'
      },
      {
        id: generateId(),
        timestamp: Date.now() - 86400000 * 1.5,
        content: '在紫色纹样边缘增加明黄色细边点缀，提升层次感',
        operator: '李工艺'
      },
      {
        id: generateId(),
        timestamp: Date.now() - 86400000 * 0.8,
        content: '改进描银工艺，增加底漆打磨工序，准备二次试配',
        operator: '李工艺'
      }
    ]
  }
  if (orderIndex === 1) {
    return [
      {
        id: generateId(),
        timestamp: Date.now() - 86400000 * 1,
        content: '已调整花瓣绘制技法，增加晕染层次',
        operator: '王工艺'
      }
    ]
  }
  return []
}

export function createSampleExecutionOrders(schemes: PatternScheme[]): ExecutionOrder[] {
  const now = Date.now()
  const orders: ExecutionOrder[] = []

  const targetSchemes = schemes.filter(s => s.status === '待试配' || s.status === '需调整' || s.status === '已定稿')

  targetSchemes.forEach((scheme, index) => {
    let status: ExecutionOrder['status'] = '待执行'
    let startedAt: number | null = null
    let completedAt: number | null = null
    let currentExecutor: string | null = null
    let totalActualHours = 0
    let missingInfo: string[] = []

    if (index === 0) {
      status = '已完成'
      startedAt = now - 86400000 * 2
      completedAt = now - 86400000 * 1
      totalActualHours = 6.5
    } else if (index === 1) {
      status = '执行中'
      startedAt = now - 86400000 * 0.3
      currentExecutor = '张工艺师'
      totalActualHours = 8
    } else if (index === 2) {
      status = '需返工'
      startedAt = now - 86400000 * 3
      totalActualHours = 4
    } else if (index === 3) {
      status = '待执行'
      if (scheme.coatingCount === null) missingInfo.push('罩面次数未填写')
      if (scheme.operationReminder.trim() === '') missingInfo.push('操作提醒未填写')
    }

    const testRecords = createSampleTestRecords(index)
    const adjustmentReasons = createSampleOrderAdjustmentReasons(index)
    const adjustmentProgress = createSampleOrderAdjustmentProgress(index)

    orders.push({
      id: generateId(),
      schemeId: scheme.id,
      schemeName: scheme.name,
      status,
      boxType: scheme.boxType,
      mainColor: scheme.mainColor,
      secondaryColor: scheme.secondaryColor,
      lineMethod: scheme.lineMethod,
      coatingCount: scheme.coatingCount,
      durationHours: scheme.durationHours,
      targetAudience: scheme.targetAudience,
      operationReminder: scheme.operationReminder,
      stepNotes: scheme.stepNotes.map(s => ({ ...s })),
      riskLevel: scheme.riskLevel,
      colorDescription: scheme.colorDescription,
      createdAt: now - 86400000 * (index + 1),
      updatedAt: now - 86400000 * (index === 0 ? 1 : 0.5),
      startedAt,
      completedAt,
      testRecords,
      missingInfo,
      adjustmentReasons,
      adjustmentProgress,
      currentExecutor,
      totalActualHours
    })
  })

  return orders
}
