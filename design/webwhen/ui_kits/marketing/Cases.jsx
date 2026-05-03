/* webwhen marketing — Use cases */

const Cases = () => (
  <section id="cases" className="section alt">
    <div className="container">
      <div className="eyebrow">things people watch for</div>
      <h2>If it lives on the open web, <span className="accent">webwhen can wait for it.</span></h2>
      <p className="desc">Real conditions from real users — three, of many.</p>

      <div className="cases">
        <div className="case">
          <span className="tag">availability · retail</span>
          <p className="q">"Alert me when the PS5 is back in stock at Best Buy."</p>
          <div className="res"><span className="ok">condition met</span><span>4m ago</span></div>
        </div>
        <div className="case">
          <span className="tag">launches · industry</span>
          <p className="q">"Tell me when the next iPhone release date is announced."</p>
          <div className="res"><span>watching</span><span>run #284</span></div>
        </div>
        <div className="case">
          <span className="tag">competitive intel</span>
          <p className="q">"Notify me when Linear changes Enterprise tier pricing."</p>
          <div className="res"><span>watching</span><span>checked 2h ago</span></div>
        </div>
      </div>
    </div>
  </section>
);

window.Cases = Cases;
