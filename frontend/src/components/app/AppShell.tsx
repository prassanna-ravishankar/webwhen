import { useState, type ReactNode } from 'react'

import type { Task } from '@/types'

import { Sidebar } from './Sidebar'
import { MobileDrawer } from './MobileDrawer'
import { Topbar, type Crumb } from './Topbar'
import styles from './AppShell.module.css'

interface AppShellProps {
  children: ReactNode
  /**
   * Breadcrumbs rendered in the topbar. Last item is shown in italic-serif as
   * the current "you are here" marker. Pass at least one crumb per page.
   */
  crumbs: Crumb[]
  /**
   * Optional actions rendered on the right side of the topbar (e.g. New watch
   * button, edit/delete affordances on a detail page).
   */
  actions?: ReactNode
  /**
   * Watches the user has — passed through to the Sidebar for nav counts +
   * Recent watches section. Pass empty if not applicable.
   */
  watches?: Task[]
}

/**
 * App shell for every authenticated route. Provides the 240px sidebar
 * (hamburger drawer on mobile <768px), sticky topbar with crumbs + actions,
 * and a scrolling main content area.
 *
 * Reference: design/webwhen/ui_kits/app/Sidebar.jsx + app.css.
 */
export const AppShell: React.FC<AppShellProps> = ({ children, crumbs, actions, watches }) => {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className={styles.app}>
      <Sidebar watches={watches} />
      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        watches={watches}
      />
      <div className={styles.main}>
        <Topbar crumbs={crumbs} actions={actions} onHamburger={() => setDrawerOpen(true)} />
        <div className={styles.page}>{children}</div>
      </div>
    </div>
  )
}

export default AppShell

export type { Crumb }
