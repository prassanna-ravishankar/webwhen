/* webwhen marketing — Brand mark + nav */

const Brand = ({ size = 26 }) => (
  <a href="#" className="brand">
    <img src="../../assets/webwhen-mark.svg" alt="webwhen" width={size} height={size} />
    <span className="word">webwhen</span>
  </a>
);

const Nav = () => (
  <nav className="nav">
    <div className="container row">
      <div className="left">
        <Brand />
        <div className="links">
          <a href="#how">How it works</a>
          <a href="#cases">Use cases</a>
          <a href="#manifesto">Approach</a>
          <a href="#" >Docs</a>
        </div>
      </div>
      <div className="right">
        <a className="btn btn-ghost" href="#">Sign in</a>
        <a className="btn btn-primary" href="#">Start watching <span style={{fontFamily:'var(--ww-font-mono)'}}>→</span></a>
      </div>
    </div>
  </nav>
);

window.Brand = Brand;
window.Nav = Nav;
