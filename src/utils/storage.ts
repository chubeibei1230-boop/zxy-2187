import type { PatternScheme } from '../types'

const STORAGE_KEY = 'lacquer_pattern_schemes'

export function loadSchemes(): PatternScheme[] {
  try {
    const data = sessionStorage.getItem(STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
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

export function importFromJson(file: File): Promise<PatternScheme[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const data = JSON.parse(content)
        if (Array.isArray(data)) {
          resolve(data.map(item => ({
            ...item,
            id: item.id || generateId(),
            createdAt: item.createdAt || Date.now(),
            updatedAt: item.updatedAt || Date.now()
          })))
        } else {
          reject(new Error('JSON 文件格式不正确'))
        }
      } catch (err) {
        reject(new Error('JSON 解析失败'))
      }
    }
    reader.onerror = () => reject(new Error('文件读取失败'))
    reader.readAsText(file)
  })
}
