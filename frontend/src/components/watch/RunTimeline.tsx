import type { TaskExecution } from '@/types'
import { cn } from '@/lib/utils'

import styles from './Watch.module.css'

interface RunTimelineProps {
  executions: TaskExecution[]
}

interface RunRowProps {
  execution: TaskExecution
  isFirstInDay: boolean
}

const TIME_FMT: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
}

const DAY_FMT: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
}

function dayKey(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (isSameDay(d, today)) return 'today'
  if (isSameDay(d, yesterday)) return 'yesterday'
  return d.toLocaleDateString('en-US', DAY_FMT).toLowerCase()
}

function describeRun(ex: TaskExecution): { body: string; isMet: boolean } {
  const triggered = !!(ex.notification || ex.result?.notification)
  if (triggered) {
    const body = ex.notification || ex.result?.notification || 'condition met'
    return { body, isMet: true }
  }
  switch (ex.status) {
    case 'success':
      return { body: 'checked — nothing new', isMet: false }
    case 'failed':
      return { body: ex.error_message || 'check failed', isMet: false }
    case 'pending':
      return { body: 'queued', isMet: false }
    case 'running':
      return { body: 'checking now…', isMet: false }
    case 'retrying':
      return { body: 'retrying', isMet: false }
    case 'cancelled':
      return { body: 'cancelled', isMet: false }
    default:
      return { body: ex.status, isMet: false }
  }
}

const RunRow: React.FC<RunRowProps> = ({ execution, isFirstInDay }) => {
  const { body, isMet } = describeRun(execution)
  const sources = execution.result?.sources || execution.grounding_sources || []
  const triggered = isMet
  const completed = execution.status === 'success' && !triggered
  const inProgress = execution.status === 'pending' || execution.status === 'running' || execution.status === 'retrying'

  const time = new Date(execution.started_at).toLocaleTimeString('en-US', TIME_FMT).toLowerCase()

  return (
    <div className={cn(styles.run, isFirstInDay && styles.runFirst, triggered && styles.runMet)}>
      <span className={styles.runT}>{time}</span>
      <span
        className={cn(
          styles.runDot,
          triggered && styles.runDotMet,
          completed && styles.runDotChecked,
          inProgress && undefined,
        )}
      />
      <span className={styles.runB} title={body}>{body}</span>
      <span className={styles.runSrcCount}>
        {sources.length > 0 ? `${sources.length} src` : ''}
      </span>
    </div>
  )
}

/**
 * Run timeline per kit `.runs` pattern: grid of (time mono · status dot ·
 * description · source count), grouped by day with `.section-h`-style
 * sub-header per day, dashed border-top between rows.
 */
export const RunTimeline: React.FC<RunTimelineProps> = ({ executions }) => {
  if (executions.length === 0) {
    return <div className={styles.empty}>no runs yet — watch will check soon</div>
  }

  // Sort newest first, then group by day preserving order
  const sorted = [...executions].sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
  )

  const groups: { key: string; iso: string; rows: TaskExecution[] }[] = []
  for (const ex of sorted) {
    const key = dayKey(ex.started_at)
    const last = groups[groups.length - 1]
    if (last && last.key === key) {
      last.rows.push(ex)
    } else {
      groups.push({ key, iso: ex.started_at, rows: [ex] })
    }
  }

  return (
    <div className={styles.runs}>
      {groups.map((g) => (
        <div key={g.key}>
          <div className={styles.runDay}>{formatDayLabel(g.iso)}</div>
          {g.rows.map((ex, idx) => (
            <RunRow key={ex.id} execution={ex} isFirstInDay={idx === 0} />
          ))}
        </div>
      ))}
    </div>
  )
}

export default RunTimeline
