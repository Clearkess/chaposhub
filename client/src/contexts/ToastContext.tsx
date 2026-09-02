import React, { createContext, useCallback, useContext, useRef, useState } from 'react'

type ToastKind = 'default' | 'success' | 'error'

interface ToastState {
  message: string
  kind: ToastKind
  visible: boolean
}

interface ToastContextValue {
  showToast: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({ message: '', kind: 'default', visible: false })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((message: string, kind: ToastKind = 'default') => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ message, kind, visible: true })
    timerRef.current = setTimeout(() => {
      setToast((t) => ({ ...t, visible: false }))
    }, 2600)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={`toast ${toast.kind !== 'default' ? toast.kind : ''} ${toast.visible ? 'show' : ''}`}>
        {toast.message}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
