// React UI overlay for the 3D scene

const { useState, useEffect, useRef } = React;

const SECTION_ORDER = ['summary', 'projects', 'experience', 'education', 'certifications', 'skills', 'volleyball'];
const SECTION_TO_3D = {
  summary: 'summary',
  projects: 'projects',
  experience: 'experience',
  education: 'education',
  certifications: 'certs',
  skills: 'skills',
  volleyball: 'volley',
};
const THREE_D_TO_SECTION = Object.fromEntries(Object.entries(SECTION_TO_3D).map(([k,v]) => [v,k]));

function ResumeApp({ tweaks, onTweak }) {
  const [active, setActive] = useState('summary');
  const [hovered, setHovered] = useState(null);
  const [projIdx, setProjIdx] = useState(0);
  const [showHelp, setShowHelp] = useState(true);

  useEffect(() => {
    window.__onSectionClick = (id3d) => {
      const s = THREE_D_TO_SECTION[id3d];
      if (s) { setActive(s); setShowHelp(false); }
    };
    window.__onHoverChange = (id3d) => {
      setHovered(id3d ? THREE_D_TO_SECTION[id3d] : null);
    };
  }, []);

  const data = window.RESUME_DATA;
  const go = (s) => {
    setActive(s);
    setShowHelp(false);
    if (window.__flyTo) window.__flyTo(SECTION_TO_3D[s]);
  };

  return (
    <>
      <TopHUD active={active} hovered={hovered} data={data} />
      <LeftRail active={active} hovered={hovered} onGo={go} />
      <ContentPanel active={active} data={data} projIdx={projIdx} setProjIdx={setProjIdx} />
      <BottomHUD onGo={go} active={active} />
      {showHelp && <HelpOverlay onDismiss={() => setShowHelp(false)} />}
      <TweaksPanel tweaks={tweaks} onTweak={onTweak} />
    </>
  );
}

function TopHUD({ active, hovered, data }) {
  return (
    <div className="top-hud">
      <div className="hud-left">
        <div className="hud-logo">
          <svg width="28" height="28" viewBox="0 0 28 28">
            <defs>
              <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--c1)" />
                <stop offset="100%" stopColor="var(--c2)" />
              </linearGradient>
            </defs>
            <path d="M14 2 L26 9 L26 19 L14 26 L2 19 L2 9 Z" fill="none" stroke="url(#lg)" strokeWidth="1.5" />
            <text x="14" y="18" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="var(--c2)" fontWeight="700">AZ</text>
          </svg>
        </div>
        <div className="hud-name">
          <div className="hud-caption">RESUME.3D · v2026.1</div>
          <div className="hud-title">{data.name}</div>
        </div>
      </div>
      <div className="hud-right">
        <div className="hud-status">
          <span className="dot" />
          <span>{hovered ? `HOVER · ${hovered.toUpperCase()}` : `VIEWING · ${active.toUpperCase()}`}</span>
        </div>
        <div className="hud-meta">
          <span>{data.location}</span>
          <span className="sep">·</span>
          <a href={`mailto:${data.email}`}>{data.email}</a>
        </div>
      </div>
    </div>
  );
}

function LeftRail({ active, hovered, onGo }) {
  return (
    <div className="left-rail">
      <div className="rail-label">SECTIONS</div>
      {SECTION_ORDER.map((s, i) => (
        <button
          key={s}
          className={`rail-item ${active === s ? 'active' : ''} ${hovered === s ? 'hover' : ''}`}
          onClick={() => onGo(s)}
        >
          <span className="rail-idx">{String(i+1).padStart(2,'0')}</span>
          <span className="rail-name">{s.toUpperCase()}</span>
          <span className="rail-mark">{active === s ? '◆' : '◇'}</span>
        </button>
      ))}
    </div>
  );
}

function ContentPanel({ active, data, projIdx, setProjIdx }) {
  return (
    <div className="content-panel" key={active}>
      {active === 'summary' && <SummaryPanel data={data.summary} contact={data} />}
      {active === 'projects' && <ProjectsPanel data={data.projects} idx={projIdx} setIdx={setProjIdx} />}
      {active === 'experience' && <ExperiencePanel data={data.experience} />}
      {active === 'education' && <EducationPanel data={data.education} />}
      {active === 'certifications' && <CertsPanel data={data.certifications} />}
      {active === 'skills' && <SkillsPanel data={data.skills} />}
      {active === 'volleyball' && <VolleyPanel data={data.volleyball} />}
    </div>
  );
}

function PanelHeader({ code, title, sub }) {
  return (
    <div className="panel-header">
      <div className="panel-code">{code}</div>
      <h2 className="panel-title">{title}</h2>
      {sub && <div className="panel-sub">{sub}</div>}
    </div>
  );
}

function SummaryPanel({ data, contact }) {
  return (
    <div className="panel">
      <PanelHeader code={data.code} title={data.title} />
      <div className="tag-row">
        {data.tags.map(t => <span key={t} className="tag">{t}</span>)}
      </div>
      <ul className="bullets">
        {data.bullets.map((b, i) => <li key={i}>{b}</li>)}
      </ul>
      <div className="contact-row">
        <a href={`https://${contact.linkedin}`} target="_blank" rel="noreferrer">↗ {contact.linkedin}</a>
        <a href={`https://${contact.github}`} target="_blank" rel="noreferrer">↗ {contact.github}</a>
        <a href={`mailto:${contact.email}`}>↗ {contact.email}</a>
      </div>
    </div>
  );
}

function ProjectsPanel({ data, idx, setIdx }) {
  const p = data.items[idx];
  return (
    <div className="panel">
      <PanelHeader code={data.code} title={data.title} sub={`${idx+1} of ${data.items.length}`} />
      <div className="card-carousel">
        <div className="proj-card">
          <div className="proj-year">{p.year}</div>
          <h3 className="proj-name">{p.name}</h3>
          <div className="proj-sub">{p.sub}</div>
          <ul className="bullets">
            {p.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
          <div className="tag-row">
            {p.tags.map(t => <span key={t} className="tag small">{t}</span>)}
          </div>
        </div>
        <div className="carousel-ctrls">
          <button className="cbtn" onClick={() => setIdx((idx - 1 + data.items.length) % data.items.length)}>◀ PREV</button>
          <div className="pips">
            {data.items.map((_, i) => (
              <span key={i} className={`pip ${i === idx ? 'on' : ''}`} onClick={() => setIdx(i)} />
            ))}
          </div>
          <button className="cbtn" onClick={() => setIdx((idx + 1) % data.items.length)}>NEXT ▶</button>
        </div>
      </div>
    </div>
  );
}

function ExperiencePanel({ data }) {
  return (
    <div className="panel">
      <PanelHeader code={data.code} title={data.title} />
      <div className="timeline">
        {data.items.map((e, i) => (
          <div key={i} className="tl-item">
            <div className="tl-head">
              <div>
                <div className="tl-role">{e.role}</div>
                <div className="tl-company">{e.company}</div>
              </div>
              <div className="tl-date">{e.date}</div>
            </div>
            <ul className="bullets">
              {e.bullets.map((b, j) => <li key={j}>{b}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function EducationPanel({ data }) {
  const e = data.items[0];
  return (
    <div className="panel">
      <PanelHeader code={data.code} title={data.title} />
      <div className="edu-card">
        <div className="edu-head">
          <h3 className="edu-school">{e.school}</h3>
          <div className="edu-date">{e.date}</div>
        </div>
        <div className="edu-row">
          <div className="edu-degree">{e.degree}</div>
          <div className="edu-gpa">GPA <strong>{e.gpa}</strong></div>
        </div>
        <ul className="bullets">
          {e.extras.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </div>
    </div>
  );
}

function CertsPanel({ data }) {
  return (
    <div className="panel">
      <PanelHeader code={data.code} title={data.title} />
      <div className="cert-list">
        {data.items.map((c, i) => (
          <div key={i} className="cert-row">
            <div className="cert-mark">◆</div>
            <div className="cert-body">
              <div className="cert-name">{c.name}</div>
              <div className="cert-org">{c.org}</div>
            </div>
            <div className="cert-year">{c.year}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SkillsPanel({ data }) {
  return (
    <div className="panel">
      <PanelHeader code={data.code} title={data.title} />
      {data.groups.map(g => (
        <div key={g.name} className="skill-group">
          <div className="skill-group-name">{g.name}</div>
          <div className="tag-row">
            {g.items.map(s => <span key={s} className="tag">{s}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}

function VolleyPanel({ data }) {
  return (
    <div className="panel">
      <PanelHeader code={data.code} title={data.title} />
      <ul className="bullets">
        {data.bullets.map((b, i) => <li key={i}>{b}</li>)}
      </ul>
      <div className="achievement">
        <span className="ach-badge">★ EASTER EGG</span>
        <span>You found the volleyball. Nice.</span>
      </div>
    </div>
  );
}

function BottomHUD({ onGo, active }) {
  // game-like d-pad
  const idx = SECTION_ORDER.indexOf(active);
  const prev = () => onGo(SECTION_ORDER[(idx - 1 + SECTION_ORDER.length) % SECTION_ORDER.length]);
  const next = () => onGo(SECTION_ORDER[(idx + 1) % SECTION_ORDER.length]);
  return (
    <div className="bottom-hud">
      <div className="dpad">
        <button className="dpad-btn dpad-left" onClick={prev}>◀</button>
        <div className="dpad-center">{String(idx+1).padStart(2,'0')}/{String(SECTION_ORDER.length).padStart(2,'0')}</div>
        <button className="dpad-btn dpad-right" onClick={next}>▶</button>
      </div>
      <div className="hint">DRAG to orbit · SCROLL to zoom · CLICK objects to jump</div>
    </div>
  );
}

function HelpOverlay({ onDismiss }) {
  return (
    <div className="help-overlay" onClick={onDismiss}>
      <div className="help-card" onClick={e => e.stopPropagation()}>
        <div className="help-code">README.md</div>
        <h2>Welcome to a spatial resume.</h2>
        <p>Each floating object is a section. Drag the scene to orbit, click an object to jump to its content, or use the sidebar.</p>
        <div className="help-legend">
          <div><span className="glyph">▣</span> Card = summary</div>
          <div><span className="glyph">▤</span> Stack = projects</div>
          <div><span className="glyph">▭</span> Laptop = experience</div>
          <div><span className="glyph">⊟</span> Scroll = education</div>
          <div><span className="glyph">♖</span> Trophy = certifications</div>
          <div><span className="glyph">⚭</span> Orbit = skills</div>
          <div><span className="glyph">●</span> ??? = hidden</div>
        </div>
        <button className="help-start" onClick={onDismiss}>PRESS START ▶</button>
      </div>
    </div>
  );
}

function TweaksPanel({ tweaks, onTweak }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setOpen(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  if (!open) return null;
  return (
    <div className="tweaks-panel">
      <div className="tweaks-head">
        <span>TWEAKS</span>
        <button onClick={() => setOpen(false)}>×</button>
      </div>
      <div className="tweak-row">
        <label>Palette</label>
        <div className="seg">
          {['teal','navy','mono','purple'].map(p => (
            <button key={p} className={tweaks.palette === p ? 'on' : ''} onClick={() => onTweak({ palette: p })}>{p}</button>
          ))}
        </div>
      </div>
      <div className="tweak-row">
        <label>Mode</label>
        <div className="seg">
          <button className={tweaks.dark ? 'on' : ''} onClick={() => onTweak({ dark: true })}>dark</button>
          <button className={!tweaks.dark ? 'on' : ''} onClick={() => onTweak({ dark: false })}>light</button>
        </div>
      </div>
      <div className="tweak-row">
        <label>Layout</label>
        <div className="seg">
          <button className={tweaks.layout === 'spatial' ? 'on' : ''} onClick={() => onTweak({ layout: 'spatial' })}>spatial</button>
          <button className={tweaks.layout === 'panel' ? 'on' : ''} onClick={() => onTweak({ layout: 'panel' })}>panel</button>
          <button className={tweaks.layout === 'immersive' ? 'on' : ''} onClick={() => onTweak({ layout: 'immersive' })}>immersive</button>
        </div>
      </div>
      <div className="tweak-row">
        <label>Hero geom</label>
        <div className="seg">
          <button className={tweaks.hero === 'card' ? 'on' : ''} onClick={() => onTweak({ hero: 'card' })}>card</button>
          <button className={tweaks.hero === 'knot' ? 'on' : ''} onClick={() => onTweak({ hero: 'knot' })}>knot</button>
          <button className={tweaks.hero === 'ico' ? 'on' : ''} onClick={() => onTweak({ hero: 'ico' })}>ico</button>
        </div>
      </div>
    </div>
  );
}

window.ResumeApp = ResumeApp;
