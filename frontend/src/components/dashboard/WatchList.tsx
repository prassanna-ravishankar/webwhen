import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import type { Task } from '@/types'
import { cn } from '@/lib/utils'
import { getTaskStatus, type TaskActivityState } from '@/lib/taskStatus'

import { WatchRow } from './WatchRow'
import { WatchListEmpty } from './WatchListEmpty'
import styles from './Dashboard.module.css'

interface WatchListProps {
  watches: Task[]
  isLoading: boolean
  onCreate: () => void
  onMore?: (watch: Task) => void
  /**
   * Initial filter from URL query string (e.g. `/dashboard?filter=triggered`).
   */
  initialFilter?: ActivityFilter
}

type ActivityFilter = 'all' | 'active' | 'paused' | 'completed' | 'triggered'

const FILTERS: Array<{ key: ActivityFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Watching' },
  { key: 'triggered', label: 'Triggered' },
  { key: 'paused', label: 'Paused' },
  { key: 'completed', label: 'Done' },
]

export const WatchList: React.FC<WatchListProps> = ({
  watches,
  isLoading,
  onCreate,
  onMore,
  initialFilter = 'all',
}) => {
  const [filter, setFilter] = useState<ActivityFilter>(initialFilter)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let result = watches
    if (filter !== 'all') {
      result = result.filter((w) => {
        if (filter === 'triggered') return w.last_execution?.notification != null
        const status = getTaskStatus(w.state).activityState as TaskActivityState
        return status === filter
      })
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (w) =>
          (w.name ?? '').toLowerCase().includes(q) ||
          (w.condition_description ?? '').toLowerCase().includes(q),
      )
    }
    return result
  }, [watches, filter, search])

  if (isLoading) {
    return <div className={styles.loading}>loading watches…</div>
  }

  return (
    <>
      <div className={styles.filters}>
        <div className={styles.seg}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(styles.segButton, filter === f.key && styles.on)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search watches…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.search}
          aria-label="Search watches"
        />
      </div>

      {filtered.length === 0 ? (
        <WatchListEmpty
          filtered={filter !== 'all' && watches.length > 0}
          searched={!!search.trim() && watches.length > 0}
          onCreate={onCreate}
        />
      ) : (
        <div className={styles.list}>
          {filtered.map((w) => (
            <WatchRow key={w.id} watch={w} onMore={onMore} />
          ))}
        </div>
      )}
    </>
  )
}

export default WatchList
