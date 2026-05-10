import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { useLandingExamples } from '@/contexts/LandingExamplesContext'
import { cn } from '@/lib/utils'

import styles from './Landing.module.css'

// === Cycle pacing ====================================================
// `IDLE_MS` is the dwell after a prompt is fully typed — the time the
// reader actually sees the full sentence. Type/delete chew through their
// own time on top.
const IDLE_MS = 3000
const TYPE_MS_PER_CHAR = 28
const DELETE_MS_PER_CHAR = 18

type Phase = 'idle' | 'deleting' | 'typing'

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

  // Deterministic first paint: index 0, full prompt, idle phase. The
  // cycle starts only inside useEffect so the SSR/prerender HTML and the
  // React first paint render identical content.
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [typed, setTyped] = useState<string>(() => hero[0]?.displayPrompt ?? '')

  // Track the prompt the typewriter is animating toward. Lets us cleanly
  // start a delete-then-type sequence each cycle without racing setState.
  const targetIndexRef = useRef(0)

  useEffect(() => {
    if (hero.length <= 1) return
    if (paused) return
    if (prefersReducedMotion()) {
      // Reduced motion: instant swap on the same 4.5s cadence (IDLE+a bit).
      // Use the ref as source of truth for "where we are" so this effect
      // doesn't need `index` in its deps (which would re-arm on every tick).
      const id = window.setTimeout(() => {
        const next = (targetIndexRef.current + 1) % hero.length
        targetIndexRef.current = next
        setIndex(next)
        setTyped(hero[next]?.displayPrompt ?? '')
      }, IDLE_MS + 1500)
      return () => window.clearTimeout(id)
    }

    let cancelled = false
    let timeoutId: number | undefined

    const tickDelete = () => {
      if (cancelled) return
      setTyped((prev) => {
        if (prev.length <= 1) {
          // Last char deleted — flip to typing the next prompt.
          const next = (targetIndexRef.current + 1) % hero.length
          targetIndexRef.current = next
          setIndex(next)
          setPhase('typing')
          return ''
        }
        timeoutId = window.setTimeout(tickDelete, DELETE_MS_PER_CHAR)
        return prev.slice(0, -1)
      })
    }

    const tickType = () => {
      if (cancelled) return
      const target = hero[targetIndexRef.current]?.displayPrompt ?? ''
      setTyped((prev) => {
        if (prev.length >= target.length) {
          setPhase('idle')
          return target
        }
        timeoutId = window.setTimeout(tickType, TYPE_MS_PER_CHAR)
        return target.slice(0, prev.length + 1)
      })
    }

    if (phase === 'idle') {
      timeoutId = window.setTimeout(() => {
        if (cancelled) return
        setPhase('deleting')
      }, IDLE_MS)
    } else if (phase === 'deleting') {
      timeoutId = window.setTimeout(tickDelete, DELETE_MS_PER_CHAR)
    } else if (phase === 'typing') {
      timeoutId = window.setTimeout(tickType, TYPE_MS_PER_CHAR)
    }

    return () => {
      cancelled = true
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [phase, paused, hero])

  const current = hero[index] ?? hero[0]
  const liveCount = snapshot.totalPublicConditions
  const isAnimating = phase !== 'idle'

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
                {typed}
                <span
                  className={cn(
                    styles.composerCursor,
                    isAnimating && styles.composerCursorWorking,
                  )}
                  aria-hidden="true"
                ></span>
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
