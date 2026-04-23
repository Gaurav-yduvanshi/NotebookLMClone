'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export type ToastType = 'success' | 'error'
export type ToastMessage = { id: number; type: ToastType; message: string }

let toastCount = 0
let listeners: ((t: ToastMessage[]) => void)[] = []
let toasts: ToastMessage[] = []

const dispatch = () => listeners.forEach(l => l(toasts))

export const globalToast = (type: ToastType, message: string) => {
  const id = ++toastCount
  toasts = [...toasts, { id, type, message }]
  dispatch()
  
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id)
    dispatch()
  }, 3000)
}

export function useToast() {
  const toast = useCallback((type: ToastType, message: string) => {
    globalToast(type, message)
  }, [])
  return { toast }
}

export function Toaster() {
  const [currentToasts, setCurrentToasts] = useState<ToastMessage[]>([])
  
  useEffect(() => {
    listeners.push(setCurrentToasts)
    setCurrentToasts(toasts)
    return () => { listeners = listeners.filter(l => l !== setCurrentToasts) }
  }, [])

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {currentToasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ opacity: 0, x: 20 }}
            className={`shadow-lg bg-surface border-l-2 rounded-lg px-4 py-3 font-mono text-xs pointer-events-auto ${
              t.type === 'success' ? 'border-success text-prose' : 'border-error text-error'
            }`}
          >
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
