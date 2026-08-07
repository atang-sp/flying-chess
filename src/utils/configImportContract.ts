import { EXPORT_VERSION, type ValidationResult } from '../types/export'
import { validateImportedConfigData } from './importValidation'

export function validateImportData(data: unknown): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const suggestions: string[] = []

  if (!data || typeof data !== 'object') {
    errors.push('无效的数据格式')
    return { isValid: false, errors, warnings, suggestions }
  }
  const document = data as Record<string, unknown>

  const version = document.version
  if (typeof version !== 'string') {
    warnings.push('缺少版本信息')
  } else if (version !== EXPORT_VERSION) {
    warnings.push(`版本不匹配，当前支持版本: ${EXPORT_VERSION}，文件版本: ${version}`)
  }

  const rawConfigData = document.data
  if (!rawConfigData || typeof rawConfigData !== 'object' || Array.isArray(rawConfigData)) {
    errors.push('缺少配置数据')
    return { isValid: false, errors, warnings, suggestions }
  }

  errors.push(...validateImportedConfigData(rawConfigData as Record<string, unknown>))
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  }
}
