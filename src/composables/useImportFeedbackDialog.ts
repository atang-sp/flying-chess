import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

type ImportFeedbackType = 'success' | 'error'

export function useImportFeedbackDialog() {
  const { t } = useI18n()
  const importFeedbackVisible = ref(false)
  const importFeedbackTitle = ref('')
  const importFeedbackMessage = ref('')
  const importFeedbackType = ref<ImportFeedbackType>('success')

  const showImportSuccess = (message: string, boardRegenerated: boolean) => {
    importFeedbackType.value = 'success'
    importFeedbackTitle.value = t('config_import_success_title')
    importFeedbackMessage.value = `${message}\n${t('config_import_success_applied')}${boardRegenerated ? `\n${t('config_import_success_board')}` : ''}`
    importFeedbackVisible.value = true
  }

  const showError = (title: string, message: string) => {
    importFeedbackType.value = 'error'
    importFeedbackTitle.value = title
    importFeedbackMessage.value = message
    importFeedbackVisible.value = true
  }

  const showImportError = (error: string) => {
    showError(t('config_import_failed_title'), error)
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
    showError,
    closeImportFeedback,
  }
}
