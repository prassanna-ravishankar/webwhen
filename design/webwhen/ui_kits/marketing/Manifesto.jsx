/* webwhen marketing — Manifesto + CTA + Footer */

const Manifesto = () => (
  <section id="manifesto" className="section">
    <div className="container manifesto">
      <div className="eyebrow">approach</div>
      <div>
        <p className="pull">
          The web is not a feed. <span className="em">It's a place where things settle.</span>
        </p>
        <p style={{marginTop: '36px'}}>
          Most monitoring tools are alarms. They buzz when a pixel changes, when a status code flips, when anything happens. We think that's the wrong job.
        </p>
        <p>
          webwhen is patient. It waits for a specific answer to a specific question, and it stays quiet until that answer arrives. The agent reads the web the way a careful human would — checks a few sources, weighs them, decides whether the question has been answered. When it has, you hear about it once.
        </p>
        <p>
          That's the whole product. No dashboards to keep open. No pixel-diff noise. No daily digest you'll learn to ignore.
        </p>
      </div>
    </div>
  </section>
);

const CTA = () => (
  <section className="cta">
    <div className="container">
      <h2>What are you waiting <span style={{color: 'var(--ww-ember)'}}>for</span>?</h2>
      <p>Free while in beta. No credit card. One condition takes about 30 seconds to set up.</p>
      <a className="btn btn-primary btn-lg" href="#">Start watching <span style={{fontFamily:'var(--ww-font-mono)'}}>→</span></a>
    </div>
  </section>
);

const Footer = () => (
  <footer className="footer">
    <div className="container">
      <div className="grid">
        <div>
          <div className="brand" style={{marginBottom: '14px'}}>
            <img src="../../assets/webwhen-mark-mono.svg" alt="" width="22" height="22" style={{filter: 'invert(1)'}} />
            <span className="word" style={{fontFamily: 'var(--ww-font-serif)', fontStyle: 'italic', fontSize: '20px'}}>webwhen</span>
          </div>
          <p style={{fontSize: '13px', color: 'var(--ww-ink-4)', maxWidth: '32ch', lineHeight: 1.6}}>
            Patient web monitoring. We watch so you don't have to refresh.
          </p>
        </div>
        <div>
          <h4>Product</h4>
          <ul>
            <li><a href="#">How it works</a></li>
            <li><a href="#">Use cases</a></li>
            <li><a href="#">Pricing</a></li>
            <li><a href="#">Changelog</a></li>
          </ul>
        </div>
        <div>
          <h4>Developers</h4>
          <ul>
            <li><a href="#">Documentation</a></li>
            <li><a href="#">Python SDK</a></li>
            <li><a href="#">API reference</a></li>
            <li><a href="#">GitHub</a></li>
          </ul>
        </div>
        <div>
          <h4>Company</h4>
          <ul>
            <li><a href="#">Approach</a></li>
            <li><a href="#">Status</a></li>
            <li><a href="#">Contact</a></li>
          </ul>
        </div>
        <div>
          <h4>Legal</h4>
          <ul>
            <li><a href="#">Terms</a></li>
            <li><a href="#">Privacy</a></li>
          </ul>
        </div>
      </div>
      <div className="row2">
        <span>© 2026 webwhen, inc.</span>
        <span>watching · since 2025</span>
      </div>
    </div>
  </footer>
);

window.Manifesto = Manifesto;
window.CTA = CTA;
window.Footer = Footer;
