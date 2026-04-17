// React UI for Beach Volleyball resume
const { useState, useEffect } = React;

const SECTION_ORDER = ['summary','projects','experience','education','certifications','skills','volleyball'];
const S2D = {
  summary: 'summary', projects: 'projects', experience: 'experience',
  education: 'education', certifications: 'certs', skills: 'skills', volleyball: 'volley',
};
const D2S = Object.fromEntries(Object.entries(S2D).map(([k,v])=>[v,k]));
const ZONE_LABEL = {
  summary: 'SERVE',
  projects: 'BACK ROW',
  experience: '10-FT LINE',
  education: 'FRONT ROW',
  certifications: 'AT THE NET',
  skills: 'OPPOSITE SIDE',
  volleyball: 'ABOVE THE NET',
};
const RALLY_TERMS = ['PASS','SET','SPIKE','DIG','BLOCK','SERVE','TIP'];

function BeachApp() {
  const [active, setActive] = useState('summary');
  const [hovered, setHovered] = useState(null);
  const [projIdx, setProjIdx] = useState(0);
  const [showIntro, setShowIntro] = useState(true);
  const [score, setScore] = useState({ a: 15, b: 7, set: 1 });

  useEffect(() => {
    window.__onSectionClick = (id3d) => {
      const s = D2S[id3d]; if (s) { setActive(s); setShowIntro(false); bumpScore(); }
    };
    window.__onHoverChange = (id3d) => setHovered(id3d ? D2S[id3d] : null);
  }, []);

  const bumpScore = () => {
    setScore(s => ({ ...s, a: Math.min(s.a + 1, 21) }));
  };

  const go = (s) => {
    setActive(s);
    setShowIntro(false);
    bumpScore();
    if (window.__flyTo) window.__flyTo(S2D[s]);
  };

  const data = window.RESUME_DATA;

  return (
    <>
      <Scoreboard name={data.name} score={score} active={active} />
      <ZoneLegend active={active} hovered={hovered} onGo={go} />
      <SidePanel active={active} data={data} projIdx={projIdx} setProjIdx={setProjIdx} onGo={go} />
      <BottomBar onGo={go} active={active} />
      {showIntro && <IntroCard onDismiss={()=>setShowIntro(false)} />}
      <TweaksPanel />
      <VignetteFrame />
    </>
  );
}

function VignetteFrame() {
  return null;
}

function Scoreboard({ name, score, active }) {
  return (
    <div className="scoreboard">
      <div className="sb-team sb-left">
        <div className="sb-pill">A</div>
        <div className="sb-info">
          <div className="sb-nm">AHVNER</div>
          <div className="sb-sub">USF · DATA / SOFTWARE</div>
        </div>
        <div className="sb-score">{String(score.a).padStart(2,'0')}</div>
      </div>
      <div className="sb-middle">
        <div className="sb-set">SET {score.set} · {ZONE_LABEL[active]}</div>
        <div className="sb-vs">VS</div>
        <div className="sb-match">MATCH · SPRING 26</div>
      </div>
      <div className="sb-team sb-right">
        <div className="sb-score">{String(score.b).padStart(2,'0')}</div>
        <div className="sb-info">
          <div className="sb-nm">OPPORTUNITY</div>
          <div className="sb-sub">RECRUITING · 2026</div>
        </div>
        <div className="sb-pill">O</div>
      </div>
    </div>
  );
}

function ZoneLegend({ active, hovered, onGo }) {
  return (
    <div className="zone-legend">
      <div className="zl-label">COURT MAP</div>
      <div className="zl-court">
        <div className="zl-sand">
          <div className="zl-line zl-top" />
          <div className="zl-line zl-bot" />
          <div className="zl-line zl-net" />
          <div className="zl-line zl-10a" />
          <div className="zl-line zl-10b" />
          {SECTION_ORDER.map(s => {
            const pos = ZL_POS[s];
            return (
              <button
                key={s}
                className={`zl-dot ${active===s?'active':''} ${hovered===s?'hover':''}`}
                style={{ left: pos.x + '%', top: pos.y + '%' }}
                onClick={() => onGo(s)}
                title={s.toUpperCase()}
              >
                <span className="zl-dot-inner" />
                <span className="zl-dot-label">{s.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const ZL_POS = {
  summary:       { x: 8,  y: 50 },
  projects:      { x: 28, y: 28 },
  experience:    { x: 42, y: 72 },
  education:     { x: 58, y: 28 },
  certifications:{ x: 72, y: 72 },
  skills:        { x: 90, y: 40 },
  volleyball:    { x: 50, y: 50 },
};

function SidePanel({ active, data, projIdx, setProjIdx, onGo }) {
  return (
    <div className="side-panel" key={active}>
      <div className="sp-head">
        <div className="sp-zone">{ZONE_LABEL[active]}</div>
        <h2 className="sp-title">{titleFor(active, data)}</h2>
      </div>
      <div className="sp-body">
        {active === 'summary' && <SummaryBody data={data.summary} contact={data} />}
        {active === 'projects' && <ProjectsBody data={data.projects} idx={projIdx} setIdx={setProjIdx} />}
        {active === 'experience' && <ExperienceBody data={data.experience} />}
        {active === 'education' && <EducationBody data={data.education} />}
        {active === 'certifications' && <CertsBody data={data.certifications} />}
        {active === 'skills' && <SkillsBody data={data.skills} />}
        {active === 'volleyball' && <VolleyBody data={data.volleyball} />}
      </div>
    </div>
  );
}

function titleFor(active, data) {
  const map = {
    summary: data.summary.title,
    projects: data.projects.title,
    experience: data.experience.title,
    education: data.education.title,
    certifications: data.certifications.title,
    skills: data.skills.title,
    volleyball: data.volleyball.title,
  };
  return map[active];
}

function SummaryBody({ data, contact }) {
  return (
    <>
      <div className="tags">
        {data.tags.map(t => <span key={t} className="tag">{t}</span>)}
      </div>
      <ul className="bullets">
        {data.bullets.map((b, i) => <li key={i}>{b}</li>)}
      </ul>
      <div className="contact">
        <a href={`mailto:${contact.email}`}>✉ {contact.email}</a>
        <a href={`https://${contact.linkedin}`} target="_blank">↗ {contact.linkedin}</a>
        <a href={`https://${contact.github}`} target="_blank">↗ {contact.github}</a>
        <div className="phone">☎ {contact.phone} · {contact.location}</div>
      </div>
    </>
  );
}

function ProjectsBody({ data, idx, setIdx }) {
  const p = data.items[idx];
  return (
    <>
      <div className="proj-pips">
        {data.items.map((it, i) => (
          <button key={i} className={`proj-pip ${i===idx?'on':''}`} onClick={()=>setIdx(i)}>
            <span className="proj-pip-num">0{i+1}</span>
            <span className="proj-pip-name">{it.name}</span>
          </button>
        ))}
      </div>
      <div className="proj-card">
        <div className="proj-meta">
          <span className="proj-year">{p.year}</span>
          <span className="proj-sub">{p.sub}</span>
        </div>
        <h3 className="proj-name">{p.name}</h3>
        <ul className="bullets">
          {p.bullets.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
        <div className="tags">
          {p.tags.map(t => <span key={t} className="tag small">{t}</span>)}
        </div>
      </div>
    </>
  );
}

function ExperienceBody({ data }) {
  return (
    <div className="rally">
      <div className="rally-label">THE RALLY ↓</div>
      {data.items.map((e, i) => (
        <div key={i} className="rally-touch">
          <div className="rally-num">
            <div className="rally-term">{RALLY_TERMS[i % RALLY_TERMS.length]}</div>
            <div className="rally-idx">TOUCH {i+1}</div>
          </div>
          <div className="rally-body">
            <div className="rally-head">
              <div>
                <div className="rally-role">{e.role}</div>
                <div className="rally-co">{e.company}</div>
              </div>
              <div className="rally-date">{e.date}</div>
            </div>
            <ul className="bullets">
              {e.bullets.map((b, j) => <li key={j}>{b}</li>)}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}

function EducationBody({ data }) {
  const e = data.items[0];
  return (
    <div className="edu-card">
      <div className="edu-row edu-head">
        <h3 className="edu-school">{e.school}</h3>
        <span className="edu-date">{e.date}</span>
      </div>
      <div className="edu-row edu-meta">
        <span>{e.degree}</span>
        <span className="edu-gpa">GPA <strong>{e.gpa}</strong></span>
      </div>
      <ul className="bullets">
        {e.extras.map((x, i) => <li key={i}>{x}</li>)}
      </ul>
    </div>
  );
}

function CertsBody({ data }) {
  return (
    <div className="certs">
      {data.items.map((c, i) => (
        <div key={i} className="cert">
          <div className="cert-badge">◆</div>
          <div className="cert-main">
            <div className="cert-name">{c.name}</div>
            <div className="cert-org">{c.org}</div>
          </div>
          <div className="cert-year">{c.year}</div>
        </div>
      ))}
    </div>
  );
}

function SkillsBody({ data }) {
  return (
    <div className="skills">
      {data.groups.map(g => (
        <div key={g.name} className="skill-row">
          <div className="skill-head">{g.name}</div>
          <div className="tags">
            {g.items.map(s => <span key={s} className="tag">{s}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}

function VolleyBody({ data }) {
  return (
    <>
      <ul className="bullets">
        {data.bullets.map((b, i) => <li key={i}>{b}</li>)}
      </ul>
      <div className="volley-flair">
        <div className="vf-stat"><span className="vf-num">★</span><span className="vf-lbl">COACH</span></div>
        <div className="vf-stat"><span className="vf-num">3D</span><span className="vf-lbl">MAKER</span></div>
        <div className="vf-stat"><span className="vf-num">∞</span><span className="vf-lbl">REPS</span></div>
      </div>
    </>
  );
}

function BottomBar({ onGo, active }) {
  const idx = SECTION_ORDER.indexOf(active);
  const prev = () => onGo(SECTION_ORDER[(idx - 1 + SECTION_ORDER.length) % SECTION_ORDER.length]);
  const next = () => onGo(SECTION_ORDER[(idx + 1) % SECTION_ORDER.length]);
  return (
    <div className="bottom-bar">
      <button className="bb-btn" onClick={prev}>◀ PASS</button>
      <div className="bb-center">
        <div className="bb-indicator">
          {SECTION_ORDER.map((s, i) => (
            <span key={s} className={`bb-pip ${i <= idx ? 'on' : ''}`} />
          ))}
        </div>
        <div className="bb-hint">DRAG to look · SCROLL to zoom · CLICK beacons on the court</div>
      </div>
      <button className="bb-btn" onClick={next}>SPIKE ▶</button>
    </div>
  );
}

function IntroCard({ onDismiss }) {
  return (
    <div className="intro-wrap" onClick={onDismiss}>
      <div className="intro-card" onClick={e => e.stopPropagation()}>
        <div className="intro-meta">MATCH START · SPRING 2026</div>
        <h1 className="intro-name">AHVNER Z. VAZQUEZ</h1>
        <div className="intro-tag">Welcome to the court. Every position on the sand is a section of my resume — summary at serve, experience at the 10-ft line, skills across the net, and an easter egg above it.</div>
        <div className="intro-rules">
          <div><b>PASS</b> drag to orbit the court</div>
          <div><b>SET</b> click a beacon to jump to a zone</div>
          <div><b>SPIKE</b> use the side panel to read details</div>
        </div>
        <button className="intro-start" onClick={onDismiss}>TOSS THE BALL ▸</button>
      </div>
    </div>
  );
}

function TweaksPanel() {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState({
    intensity: 1,
    showPalms: true,
    showNet: true,
  });
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
  const apply = (k, v) => {
    setVals(s => ({ ...s, [k]: v }));
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*');
    if (k === 'intensity') document.body.style.setProperty('--sunset-intensity', v);
  };
  return (
    <div className="tweaks-panel">
      <div className="tweaks-head"><span>TWEAKS</span><button onClick={()=>setOpen(false)}>×</button></div>
      <div className="tweak-row">
        <label>Sunset glow</label>
        <input type="range" min="0.4" max="1.6" step="0.05" value={vals.intensity} onChange={e=>apply('intensity', +e.target.value)} />
      </div>
      <div className="tweak-hint">More tweaks available in the dedicated palette version (Resume.html).</div>
    </div>
  );
}

window.BeachApp = BeachApp;
