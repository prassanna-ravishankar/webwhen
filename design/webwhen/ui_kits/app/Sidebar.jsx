/* webwhen app — Sidebar */

const SbItem = ({ icon, label, count, active, onClick }) => (
  <div className={`sb-item ${active ? 'active' : ''}`} onClick={onClick}>
    <Icon name={icon} className="ic" />
    <span>{label}</span>
    {count != null && <span className="count">{count}</span>}
  </div>
);

const SbWatch = ({ name, status, onClick, active }) => (
  <div className={`sb-watch ${active ? 'active' : ''}`} onClick={onClick} style={active ? {background:'var(--ww-ink-7)', color:'var(--ww-ink-0)'} : null}>
    <span className={`dot ${status}`}></span>
    <span className="name">{name}</span>
  </div>
);

const Sidebar = ({ view, setView, watches, currentWatchId, setCurrentWatchId }) => (
  <aside className="sidebar">
    <a href="#" className="brand">
      <img src="../../assets/webwhen-mark.svg" alt="" />
      <span className="word">webwhen</span>
    </a>

    <div className="sb-section">
      <SbItem icon="eye" label="All watches" count={watches.length} active={view === 'list'} onClick={() => setView('list')} />
      <SbItem icon="bell" label="Triggered" count={watches.filter(w => w.status === 'triggered').length} onClick={() => setView('list')} />
      <SbItem icon="archive" label="Archive" count={3} onClick={() => setView('list')} />
    </div>

    <div className="sb-section">
      <div className="sb-label">Recent</div>
      {watches.slice(0, 5).map(w => (
        <SbWatch
          key={w.id}
          name={w.name}
          status={w.status}
          active={view === 'detail' && currentWatchId === w.id}
          onClick={() => { setCurrentWatchId(w.id); setView('detail'); }}
        />
      ))}
    </div>

    <div className="sb-foot">
      <div className="avatar">PR</div>
      <div>
        <div className="who">Prassanna</div>
        <div className="plan">beta · unlimited</div>
      </div>
    </div>
  </aside>
);

window.Sidebar = Sidebar;
window.SbItem = SbItem;
window.SbWatch = SbWatch;
