import landingStyles from '@/components/landing/Landing.module.css'
import { cn } from '@/lib/utils'

import styles from './Dashboard.module.css'

interface WatchListEmptyProps {
  filtered?: boolean
  searched?: boolean
  onCreate: () => void
}

/**
 * Empty state for the watch list. Three flavours:
 * - No watches at all (`!filtered && !searched`): editorial brand-voice copy + Create CTA
 * - Filter applied, no matches: terse "no watches match" + clear-filter affordance (passed by parent)
 * - Search applied, no matches: terse "no watches match your search" + Create CTA
 */
export const WatchListEmpty: React.FC<WatchListEmptyProps> = ({
  filtered,
  searched,
  onCreate,
}) => {
  if (filtered || searched) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyPull}>Nothing here yet.</p>
        <p className={styles.emptySub}>
          {searched ? 'Try a different search.' : 'Try a different filter.'}
        </p>
      </div>
    )
  }
  return (
    <div className={styles.empty}>
      <p className={styles.emptyPull}>Nothing yet. webwhen is waiting.</p>
      <p className={styles.emptySub}>Tell it what to watch for and it will sit with the question.</p>
      <button
        type="button"
        onClick={onCreate}
        className={cn(landingStyles.btn, landingStyles.btnPrimary, landingStyles.btnLg)}
      >
        Create a watch <span style={{ fontFamily: 'var(--ww-font-mono)' }}>→</span>
      </button>
    </div>
  )
}

export default WatchListEmpty
