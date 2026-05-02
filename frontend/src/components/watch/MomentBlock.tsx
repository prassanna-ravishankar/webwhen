import type { TaskExecution } from '@/types'
import { formatTimeAgo } from '@/lib/utils'

import styles from './Watch.module.css'

interface MomentBlockProps {
  execution: TaskExecution
}

/**
 * Hostname helper — strips protocol + www prefix. Falls back to the raw URL if
 * it isn't a valid URL string (e.g. a plain title).
 */
function hostFromUrl(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * Editorial "moment" card per kit `.moment` pattern: ember left-border accent,
 * mono uppercase eyebrow ("the moment · 4m ago"), large serif-italic answer,
 * dashed-divider sources list. Used for triggered executions on the watch
 * detail page.
 */
export const MomentBlock: React.FC<MomentBlockProps> = ({ execution }) => {
  const answer = execution.notification || execution.result?.notification || execution.result?.evidence || ''
  const sources = execution.result?.sources || execution.grounding_sources || []
  const when = formatTimeAgo(execution.completed_at || execution.started_at)

  return (
    <article className={styles.moment}>
      <div className={styles.momentWhen}>
        <span>the moment · {when}</span>
      </div>
      <p className={styles.momentAnswer}>{answer}</p>
      {sources.length > 0 && (
        <div className={styles.momentSources}>
          {sources.map((s, i) => {
            const url = s.url
            const host = hostFromUrl(url)
            const label = s.title || url
            return (
              <div key={`${url}-${i}`} className={styles.momentSrc}>
                <span className={styles.momentSrcHost}>{host}</span>
                <a
                  className={styles.momentSrcLink}
                  href={url}
                  target="_blank"
                  rel="noreferrer noopener"
                  title={label}
                >
                  {label}
                </a>
              </div>
            )
          })}
        </div>
      )}
    </article>
  )
}

export default MomentBlock
