import type { ReactNode } from 'react'

import { Nav } from './Nav'
import { Footer } from './Footer'

interface MarketingLayoutProps {
  children: ReactNode
  /**
   * Override the active nav link path. Defaults to `useLocation().pathname` via
   * Nav's internal default. Pass an empty string on Landing where nav links are
   * in-page anchors and "active" doesn't apply.
   */
  activePath?: string
}

/**
 * Shell wrapper for every public marketing page (Landing, Compare, Use Cases,
 * Concepts, Changelog, Privacy, Terms). Provides:
 * - Fixed dotted background (`.dot-bg`, defined globally in `index.css`)
 * - Sticky Nav (auth-aware via `useAuth`)
 * - <main> for content
 * - Dark Footer
 *
 * Per `design/webwhen/README.md`, the dot grid is the only decorative motif —
 * keep it page-global and don't add other backgrounds.
 */
export const MarketingLayout: React.FC<MarketingLayoutProps> = ({ children, activePath }) => {
  return (
    <>
      <div className="dot-bg" />
      <Nav activePath={activePath} />
      <main>{children}</main>
      <Footer />
    </>
  )
}

export default MarketingLayout
