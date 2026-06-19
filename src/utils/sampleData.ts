import type { PatternScheme } from '../types'
import { COLORS, BOX_TYPES } from '../constants'
import { generateId } from './storage'

export function createSampleSchemes(): PatternScheme[] {
  const now = Date.now()

  return [
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
}
