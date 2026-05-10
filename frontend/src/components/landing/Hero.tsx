import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useLandingExamples } from '@/contexts/LandingExamplesContext'
import { cn } from '@/lib/utils'

import styles from './Landing.module.css'

const CYCLE_MS = 4500

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/** Render a date as "May 9" — absolute, deterministic across SSR/CSR. */
function shortDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export const Hero: React.FC = () => {
  const { hero, snapshot } = useLandingExamples()
  // Deterministic first paint: always start at index 0 regardless of how
  // the snapshot was generated. Cycling is opt-in via useEffect, so the
  // SSR/prerender HTML and the React first paint render identical content.
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (hero.length <= 1) return
    if (prefersReducedMotion()) return
    if (paused) return
    const id = window.setTimeout(() => {
      setIndex((i) => (i + 1) % hero.length)
    }, CYCLE_MS)
    return () => window.clearTimeout(id)
  }, [index, paused, hero.length])

  const current = hero[index] ?? hero[0]
  const liveCount = snapshot.totalPublicConditions

  return (
    <section className={styles.hero}>
      <div className={cn(styles.container, styles.heroGrid)}>
        <div>
          <div className={styles.heroMeta}>
            <span className={styles.liveDot}></span>
            watching · {liveCount.toLocaleString('en-US')} {liveCount === 1 ? 'condition' : 'conditions'}
          </div>
          <h1 className={styles.heroTitle}>
            Get notified <span className={styles.heroEmber}>when</span> it matters.
          </h1>
          <p className={styles.heroLede}>
            Tell webwhen what to watch for in plain English. It will sit with the question, search the web on a schedule, and tell you the moment your condition is met.
          </p>
          <div className={styles.heroActions}>
            <Link to="/sign-up" className={cn(styles.btn, styles.btnPrimary, styles.btnLg)}>
              Start watching <span style={{ fontFamily: 'var(--ww-font-mono)' }}>→</span>
            </Link>
          </div>
        </div>
        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className={styles.composer} aria-live="polite">
            <div className={styles.composerHead}>
              <span>new watch</span>
              <span>plain english · no rules</span>
            </div>
            <div className={styles.composerBody}>
              <p className={styles.composerPrompt}>
                {current?.displayPrompt ?? 'Tell webwhen what to watch for.'}
                <span className={styles.composerCursor}></span>
              </p>
              <p className={styles.composerSub}>
                webwhen will sit with this and decide when to check.
              </p>
            </div>
            <div className={styles.composerFoot}>
              <div>
                <span className={styles.chip}>{current?.tag ?? 'nothing to tune'}</span>
              </div>
              <button
                className={cn(styles.btn, styles.btnPrimary)}
                style={{ padding: '8px 14px' }}
              >
                Watch <span style={{ fontFamily: 'var(--ww-font-mono)' }}>→</span>
              </button>
            </div>
          </div>
          <div className={styles.log}>
            {(current?.activity ?? []).map((step, i, arr) => {
              const isLast = i === arr.length - 1
              const date = shortDate(current?.startedAt ?? '')
              return (
                <div
                  key={`${current?.taskId}-${i}`}
                  className={cn(styles.logItem, isLast && styles.logItemEmber)}
                >
                  <span className={styles.logItemTime}>{date || '—'}</span>
                  <span className={styles.logItemDot}></span>
                  <span className={styles.logItemBody}>
                    {step.verb}
                    {step.detail ? ` · ${step.detail}` : ''}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
