/* webwhen marketing — Hero with composer + live event log */

const HeroComposer = () => {
  const [text, setText] = React.useState("Tell me when the PS5 is back in stock at Best Buy.");
  return (
    <div className="composer">
      <div className="head">
        <span>new watch</span>
        <span>plain english · no rules</span>
      </div>
      <div className="body">
        <p className="prompt">
          {text}
          <span className="cursor"></span>
        </p>
        <p className="sub">webwhen will sit with this and check every few hours.</p>
      </div>
      <div className="foot">
        <div>
          <span className="chip">every 6h</span>
          <span className="chip">notify once</span>
        </div>
        <button className="btn btn-primary" style={{padding:'8px 14px'}}>Watch <span style={{fontFamily:'var(--ww-font-mono)'}}>→</span></button>
      </div>
    </div>
  );
};

const HeroLog = () => (
  <div className="log">
    <div className="item"><span className="t">14:32</span><span className="dot"></span><span className="b">checked bestbuy.com · listing live</span></div>
    <div className="item"><span className="t">14:32</span><span className="dot"></span><span className="b">corroborated · polygon.com, r/PS5</span></div>
    <div className="item ember"><span className="t">14:32</span><span className="dot"></span><span className="b">condition met · sending notification</span></div>
  </div>
);

const Hero = () => (
  <section className="hero">
    <div className="container hero-grid">
      <div>
        <div className="meta"><span className="live-dot"></span>watching · 2,841 conditions</div>
        <h1>
          Get notified <span className="ember">when</span> it matters.
        </h1>
        <p className="lede">
          Tell webwhen what to watch for in plain English. It will sit with the question, search the web on a schedule, and tell you the moment your condition is met.
        </p>
        <div className="actions">
          <a className="btn btn-primary btn-lg" href="#">Start watching <span style={{fontFamily:'var(--ww-font-mono)'}}>→</span></a>
          <a className="btn btn-secondary btn-lg" href="#">Read the docs</a>
        </div>
      </div>
      <div>
        <HeroComposer />
        <HeroLog />
      </div>
    </div>
  </section>
);

window.Hero = Hero;
