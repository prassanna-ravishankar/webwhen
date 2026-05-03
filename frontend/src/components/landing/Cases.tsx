import { cn } from '@/lib/utils'

import styles from './Landing.module.css'

export const Cases: React.FC = () => {
  return (
    <section className={cn(styles.section, styles.sectionAlt)} id="cases">
      <div className={styles.container}>
        <div className={styles.eyebrow}>Use cases</div>
        <h2 className={styles.sectionHeading}>
          If it lives on the open web,{' '}
          <span className={styles.sectionHeadingAccent}>webwhen can wait for it.</span>
        </h2>
        <div className={styles.cases}>
          <div className={styles.caseCard}>
            <div className={styles.caseTag}>availability · retail</div>
            <p className={styles.caseQuestion}>
              Alert me when the PS5 is back in stock at Best Buy.
            </p>
            <div className={styles.caseResult}>
              <span className={styles.caseResultOk}>condition met</span> · 4m ago
            </div>
          </div>
          <div className={styles.caseCard}>
            <div className={styles.caseTag}>launches · industry</div>
            <p className={styles.caseQuestion}>
              Tell me when the next iPhone release date is announced.
            </p>
            <div className={styles.caseResult}>watching · run #284</div>
          </div>
          <div className={styles.caseCard}>
            <div className={styles.caseTag}>competitive intel</div>
            <p className={styles.caseQuestion}>
              Notify me when Linear changes Enterprise tier pricing.
            </p>
            <div className={styles.caseResult}>watching · checked 2h ago</div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Cases
