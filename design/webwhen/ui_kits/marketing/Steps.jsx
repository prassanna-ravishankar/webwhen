/* webwhen marketing — How it works (3 steps) */

const Steps = () => (
  <section id="how" className="section">
    <div className="container">
      <div className="eyebrow">how it works</div>
      <h2>You set the condition. <span className="accent">webwhen does the rest.</span></h2>
      <p className="desc">Three quiet steps. The agent decides how often to check, remembers what it saw last time, and only interrupts you when something has actually changed.</p>

      <div className="steps">
        <div className="step">
          <span className="num">01 / describe</span>
          <h3>Describe the condition.</h3>
          <p>Plain English. No XPath, no regex, no flaky CSS selectors. Just say what you're waiting for.</p>
          <div className="hint">"Tell me when the next iPhone release date is announced."</div>
        </div>
        <div className="step">
          <span className="num">02 / settle</span>
          <h3>The agent settles in.</h3>
          <p>webwhen searches across the open web, evaluates evidence against your condition, and remembers what it already knew.</p>
          <div className="hint">searches · evaluates · remembers · waits</div>
        </div>
        <div className="step">
          <span className="num">03 / the moment</span>
          <h3>You hear from it once.</h3>
          <p>When the condition is met, you get one message with the answer and the sources. No false positives, no daily digest noise.</p>
          <div className="hint">notifies <span className="em">once</span> · or every time, your call</div>
        </div>
      </div>
    </div>
  </section>
);

window.Steps = Steps;
