import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

import styles from './Landing.module.css'

export const Footer: React.FC = () => {
  return (
    <footer className={styles.footer}>
      <div className={cn(styles.container, styles.footerGrid)}>
        <div>
          <Link to="/" className={styles.brand}>
            <img
              src="/brand/webwhen-mark.svg"
              alt="webwhen"
              width={26}
              height={26}
              className={styles.brandImg}
            />
            <span className={styles.brandWord}>webwhen</span>
          </Link>
          <p
            style={{
              color: 'var(--ww-ink-4)',
              fontSize: '14px',
              maxWidth: '24ch',
              marginTop: '16px',
            }}
          >
            The agent that waits for the web.
          </p>
        </div>
        <div>
          <h4 className={styles.footerHeading}>Product</h4>
          <ul className={styles.footerList}>
            <li className={styles.footerListItem}>
              <Link to="/dashboard">Dashboard</Link>
            </li>
            <li className={styles.footerListItem}>
              <Link to="/explore">Explore</Link>
            </li>
            <li className={styles.footerListItem}>
              <Link to="/changelog">Changelog</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className={styles.footerHeading}>Resources</h4>
          <ul className={styles.footerList}>
            <li className={styles.footerListItem}>
              <a href="https://docs.torale.ai">Docs</a>
            </li>
            <li className={styles.footerListItem}>
              <a href="https://github.com/prassanna-ravishankar/torale">GitHub</a>
            </li>
            <li className={styles.footerListItem}>
              <Link to="/compare/visualping-alternative">Compare</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className={styles.footerHeading}>Use cases</h4>
          <ul className={styles.footerList}>
            <li className={styles.footerListItem}>
              <Link to="/use-cases/steam-game-price-alerts">Steam game prices</Link>
            </li>
            <li className={styles.footerListItem}>
              <Link to="/use-cases/competitor-price-change-monitor">Competitor pricing</Link>
            </li>
            <li className={styles.footerListItem}>
              <Link to="/use-cases/crypto-exchange-listing-alert">Crypto listings</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className={styles.footerHeading}>Company</h4>
          <ul className={styles.footerList}>
            <li className={styles.footerListItem}>
              <Link to="/privacy">Privacy</Link>
            </li>
            <li className={styles.footerListItem}>
              <Link to="/terms">Terms</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className={cn(styles.container, styles.footerRow2)}>
        <span style={{ color: 'var(--ww-ink-4)', fontSize: '13px' }}>© 2026 webwhen</span>
      </div>
    </footer>
  )
}

export default Footer
