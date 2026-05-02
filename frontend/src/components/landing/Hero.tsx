import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

import styles from './Landing.module.css'

export const Hero: React.FC = () => {
  return (
    <section className={styles.hero}>
      <div className={cn(styles.container, styles.heroGrid)}>
        <div>
          <div className={styles.heroMeta}>
            <span className={styles.liveDot}></span>
            watching · 2,841 conditions
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
            <a href="https://docs.torale.ai" className={cn(styles.btn, styles.btnSecondary, styles.btnLg)}>
              Read the docs
            </a>
          </div>
        </div>
        <div>
          <div className={styles.composer}>
            <div className={styles.composerHead}>
              <span>new watch</span>
              <span>plain english · no rules</span>
            </div>
            <div className={styles.composerBody}>
              <p className={styles.composerPrompt}>
                Tell me when the PS5 is back in stock at Best Buy.
                <span className={styles.composerCursor}></span>
              </p>
              <p className={styles.composerSub}>
                webwhen will sit with this and check every few hours.
              </p>
            </div>
            <div className={styles.composerFoot}>
              <div>
                <span className={styles.chip}>every 6h</span>
                <span className={styles.chip}>notify once</span>
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
            <div className={styles.logItem}>
              <span className={styles.logItemTime}>14:32</span>
              <span className={styles.logItemDot}></span>
              <span className={styles.logItemBody}>checked bestbuy.com · listing live</span>
            </div>
            <div className={styles.logItem}>
              <span className={styles.logItemTime}>14:32</span>
              <span className={styles.logItemDot}></span>
              <span className={styles.logItemBody}>corroborated · polygon.com, r/PS5</span>
            </div>
            <div className={cn(styles.logItem, styles.logItemEmber)}>
              <span className={styles.logItemTime}>14:32</span>
              <span className={styles.logItemDot}></span>
              <span className={styles.logItemBody}>condition met · sending notification</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
