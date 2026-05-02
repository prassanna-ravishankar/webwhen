import { useState } from 'react'
import { cn } from '@/lib/utils'
import styles from './onboarding/Onboarding.module.css'
import landing from './landing/Landing.module.css'

interface FirstTimeExperienceProps {
  onComplete: () => void
}

interface Step {
  heading: React.ReactNode
  body: string
  mono: string
}

const STEPS: Step[] = [
  {
    heading: <>Tell webwhen what to <span className={styles.emphasis}>watch</span> for.</>,
    body: "Plain English. No XPath, no regex, no flaky CSS selectors. Just say what you're waiting for.",
    mono: 'Tell me when the next iPhone release date is announced.',
  },
  {
    heading: <>It will sit with the question.</>,
    body: 'webwhen searches the open web on its own schedule, evaluates evidence against your condition, and remembers what it already knew.',
    mono: 'searches · evaluates · remembers · waits',
  },
  {
    heading: <>You'll hear when it has something to say.</>,
    body: 'No daily digests. No false positives. The agent stays quiet until the answer arrives — then it tells you.',
    mono: 'no settings to tune · no cadence to set',
  },
]

export function FirstTimeExperience({ onComplete }: FirstTimeExperienceProps) {
  const [currentStep, setCurrentStep] = useState(0)

  const step = STEPS[currentStep]
  const isLast = currentStep === STEPS.length - 1

  const next = () => setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1))
  const back = () => setCurrentStep((s) => Math.max(s - 1, 0))

  return (
    <div className={styles.overlay}>
      <button onClick={onComplete} className={styles.skip}>
        Skip intro
      </button>
      <div className="dot-bg" aria-hidden />
      <div className={styles.container}>
        <div className={styles.eyebrow}>{`step ${currentStep + 1} of 3`}</div>
        <div key={currentStep} className={styles.stepContent}>
          <h1 className={styles.heading}>{step.heading}</h1>
          <p className={styles.body}>{step.body}</p>
          <div className={styles.example}>{step.mono}</div>
        </div>
        <div className={styles.controls}>
          {currentStep > 0 && (
            <button onClick={back} className={cn(landing.btn, landing.btnGhost)}>
              Back
            </button>
          )}
          {!isLast ? (
            <button onClick={next} className={cn(landing.btn, landing.btnPrimary)}>
              Continue →
            </button>
          ) : (
            <button onClick={onComplete} className={cn(landing.btn, landing.btnPrimary)}>
              Start watching →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
