'use client'

import { useState, useCallback } from 'react'
import type { ToastType } from '@/app/components/Toast'

interface ToastState {
  message: string
  type: ToastType
  isVisible: boolean
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'info',
    isVisible: false,
  })

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({
      message,
      type,
      isVisible: true,
    })
  }, [])

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, isVisible: false }))
  }, [])

  const showSuccess = useCallback((message: string) => {
    showToast(message, 'success')
  }, [showToast])

  const showError = useCallback((message: string) => {
    showToast(message, 'error')
  }, [showToast])

  const showWarning = useCallback((message: string) => {
    showToast(message, 'warning')
  }, [showToast])

  const showInfo = useCallback((message: string) => {
    showToast(message, 'info')
  }, [showToast])

  return {
    toast,
    showToast,
    hideToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  }
}

