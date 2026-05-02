import { useEffect } from 'react'
import { X } from 'lucide-react'

import { cn } from '@/lib/utils'
import type { Task } from '@/types'

import { Sidebar } from './Sidebar'
import styles from './AppShell.module.css'

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  watches?: Task[]
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({ open, onClose, watches }) => {
  // Body scroll lock while drawer is open
  useEffect(() => {
    if (!open) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [open])

  // ESC closes
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      <div
        className={cn(styles.drawerScrim, open && styles.open)}
        onClick={onClose}
        aria-hidden
      />
      <div className={cn(styles.drawer, open && styles.open)} role="dialog" aria-modal="true">
        <button
          type="button"
          className={styles.drawerClose}
          onClick={onClose}
          aria-label="Close menu"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
        <Sidebar onNavigate={onClose} watches={watches} />
      </div>
    </>
  )
}

export default MobileDrawer
