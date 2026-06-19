import type { PatternScheme, FilterOptions } from '../types'

export function filterSchemes(schemes: PatternScheme[], filters: FilterOptions): PatternScheme[] {
  return schemes.filter(scheme => {
    if (filters.boxType && scheme.boxType !== filters.boxType) return false
    if (filters.mainColor && scheme.mainColor.name !== filters.mainColor) return false
    if (filters.status && scheme.status !== filters.status) return false
    if (filters.riskLevel && scheme.riskLevel !== filters.riskLevel) return false
    if (filters.minDuration !== null && scheme.durationHours < filters.minDuration) return false
    if (filters.maxDuration !== null && scheme.durationHours > filters.maxDuration) return false
    return true
  })
}

export function sortSchemes(schemes: PatternScheme[], by: 'createdAt' | 'updatedAt' | 'name' | 'durationHours' = 'updatedAt', asc = false): PatternScheme[] {
  return [...schemes].sort((a, b) => {
    let compare = 0
    if (by === 'name') {
      compare = a.name.localeCompare(b.name, 'zh-CN')
    } else if (by === 'durationHours') {
      compare = a.durationHours - b.durationHours
    } else {
      compare = (a[by] || 0) - (b[by] || 0)
    }
    return asc ? compare : -compare
  })
}
