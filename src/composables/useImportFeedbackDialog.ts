import { ref } from 'vue'

type ImportFeedbackType = 'success' | 'error'

export function useImportFeedbackDialog() {
  const importFeedbackVisible = ref(false)
  const importFeedbackTitle = ref('')
  const importFeedbackMessage = ref('')
  const importFeedbackType = ref<ImportFeedbackType>('success')

  const showImportSuccess = (message: string, boardRegenerated: boolean) => {
    importFeedbackType.value = 'success'
    importFeedbackTitle.value = '配置导入成功'
    importFeedbackMessage.value = `${message}\n配置已成功应用到游戏中！${boardRegenerated ? '\n棋盘已重新生成。' : ''}`
    importFeedbackVisible.value = true
  }

  const showImportError = (error: string) => {
    importFeedbackType.value = 'error'
    importFeedbackTitle.value = '配置导入失败'
    importFeedbackMessage.value = error
    importFeedbackVisible.value = true
  }

  const closeImportFeedback = () => {
    importFeedbackVisible.value = false
  }

  return {
    importFeedbackVisible,
    importFeedbackTitle,
    importFeedbackMessage,
    importFeedbackType,
    showImportSuccess,
    showImportError,
    closeImportFeedback,
  }
}
