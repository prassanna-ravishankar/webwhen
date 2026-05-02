import ReactMarkdown, { type Components } from 'react-markdown'
import rehypeSanitize from 'rehype-sanitize'

import type { TaskExecution } from '@/types'
import { formatTimeAgo } from '@/lib/utils'

import styles from './Watch.module.css'

/**
 * Constrained markdown for legacy executions whose `notification` text still
 * contains raw markdown (lists, bold, headers). Post prompt-rewrite the agent
 * emits clean prose, so this map is a no-op for new runs. Rules:
 *  - p / strong / em / ul / ol / li render at body scale.
 *  - h1-h6 collapse to a paragraph (no markdown at title scale).
 *  - code / pre lose mono formatting; pre collapses to a paragraph.
 *  - img is stripped.
 *  - a renders inert text — the sources row below owns linking.
 */
const momentMarkdown: Components = {
  p: ({ children }) => <p className={styles.momentAnswerP}>{children}</p>,
  strong: ({ children }) => <strong>{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  ul: ({ children }) => <ul className={styles.momentList}>{children}</ul>,
  ol: ({ children }) => <ol className={styles.momentList}>{children}</ol>,
  li: ({ children }) => <li className={styles.momentListItem}>{children}</li>,
  h1: ({ children }) => <p className={styles.momentAnswerP}>{children}</p>,
  h2: ({ children }) => <p className={styles.momentAnswerP}>{children}</p>,
  h3: ({ children }) => <p className={styles.momentAnswerP}>{children}</p>,
  h4: ({ children }) => <p className={styles.momentAnswerP}>{children}</p>,
  h5: ({ children }) => <p className={styles.momentAnswerP}>{children}</p>,
  h6: ({ children }) => <p className={styles.momentAnswerP}>{children}</p>,
  code: ({ children }) => <span>{children}</span>,
  pre: ({ children }) => <p className={styles.momentAnswerP}>{children}</p>,
  img: () => null,
  a: ({ children }) => <span>{children}</span>,
}

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
      {answer ? (
        <div className={styles.momentAnswer}>
          <ReactMarkdown rehypePlugins={[rehypeSanitize]} components={momentMarkdown}>
            {answer}
          </ReactMarkdown>
        </div>
      ) : null}
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
