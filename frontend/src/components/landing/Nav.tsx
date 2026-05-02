import { Link } from 'react-router-dom'

import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

import styles from './Landing.module.css'

export const Nav: React.FC = () => {
  const { user } = useAuth()

  return (
    <nav className={styles.nav}>
      <div className={cn(styles.container, styles.navRow)}>
        <div className={styles.navLeft}>
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
          <div className={styles.navLinks}>
            <a href="#how" className={styles.navLink}>How it works</a>
            <a href="#cases" className={styles.navLink}>Use cases</a>
            <a href="#manifesto" className={styles.navLink}>Approach</a>
            <a href="https://docs.torale.ai" className={styles.navLink}>Docs</a>
          </div>
        </div>
        <div className={styles.navRight}>
          {user ? (
            <Link to="/dashboard" className={cn(styles.btn, styles.btnPrimary)}>
              Dashboard <span style={{ fontFamily: 'var(--ww-font-mono)' }}>→</span>
            </Link>
          ) : (
            <>
              <Link to="/sign-in" className={cn(styles.btn, styles.btnGhost)}>
                Sign in
              </Link>
              <Link to="/sign-up" className={cn(styles.btn, styles.btnPrimary)}>
                Start watching <span style={{ fontFamily: 'var(--ww-font-mono)' }}>→</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Nav
