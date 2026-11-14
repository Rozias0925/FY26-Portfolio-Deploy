(() => {
  'use strict';
  if (window.GUIDE_LANGUAGE !== 'en') return;
  const chapters = window.GUIDE_CHAPTERS_EN;
  const glossary = window.GUIDE_GLOSSARY_EN;
  const main = document.getElementById('main');
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rich = value => String(value).replace(/\[\[([^|]+)\|([^\]]+)\]\]/g, (_,id,label) => `<a class="term-link" href="#glossary/${escape(id)}">${escape(label)}</a>`);
  const number = n => String(n).padStart(2,'0');
  let demoState = {scenario:'scenario_a',risk:'balanced',step:0,tab:'request'};
  let glossaryState = {query:'',chapter:'all'};
  let navigated = false;

  // A skip link moves focus within the current view; it must not enter the router.
  document.querySelector('.skip-link').addEventListener('click', event => {
    event.preventDefault();
    main.focus({preventScroll:true});
    main.scrollIntoView({block:'start',behavior:'instant'});
  });

  document.getElementById('chapter-nav').innerHTML = chapters.map(c => `<a href="#chapter-${c.id}"><span class="nav-number">${number(c.id)}</span><span>${c.title}</span></a>`).join('');
  document.querySelector('.glossary-count').textContent = glossary.length;
  const directory = document.querySelector('.page-directory');
  const directoryPanel = document.getElementById('directory-panel');
  const directoryToggle = document.getElementById('directory-toggle');
  const pageOrder = [{id:'home',title:'Project home'},...chapters.map(c=>({id:`chapter-${c.id}`,title:c.title})),{id:'implementation',title:'Local implementation'},{id:'reproduce',title:'Setup and reproduction'},{id:'glossary',title:'Bilingual glossary'}];

  function setDirectory(open, restoreFocus = false) {
    const focusWasInside = !open && directoryPanel.contains(document.activeElement);
    directoryPanel.hidden = !open;
    directoryToggle.setAttribute('aria-expanded',String(open));
    directoryToggle.setAttribute('aria-label',open ? 'Close chapter directory' : 'Open chapter directory');
    if (restoreFocus || focusWasInside) directoryToggle.focus();
  }
  directoryToggle.addEventListener('click',()=>setDirectory(directoryPanel.hidden));
  directoryPanel.addEventListener('click',event=>{if(event.target.closest('a')) setDirectory(false);});
  document.addEventListener('click',event=>{if(!directory.contains(event.target)) setDirectory(false);});
  document.addEventListener('focusin',event=>{if(!directory.contains(event.target)) setDirectory(false);});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape' && !directoryPanel.hidden) setDirectory(false,true);
  });

  function updatePageNavigation(page) {
    const index = Math.max(0,pageOrder.findIndex(p=>p.id===page));
    for(const [id,entry,label] of [['page-previous',pageOrder[index-1],'Previous page'],['page-next',pageOrder[index+1],'Next page']]) {
      const link = document.getElementById(id);
      link.hidden = !entry;
      if(entry) {
        link.href = `#${entry.id}`;
        link.querySelector('strong').textContent = entry.title;
        link.setAttribute('aria-label',`${label}: ${entry.title}`);
      } else {
        link.removeAttribute('href');
      }
    }
  }

  function architectureDiagram(compact = false) {
    const stages = [
      {label:'SYNTHETIC DATA',title:'Synthetic data',detail:'Generate fictional assets and time series',icon:'<path d="M7 24V14m9 10V7m9 17V10M4 28h25"/>'},
      {label:'GRAPH INFERENCE',title:'Graph computation',detail:'Propagate information with fixed rules',icon:'<path d="m7 12 13-6 8 14-13 9-8-17 21 8M20 6l-5 23"/><circle cx="7" cy="12" r="3"/><circle cx="20" cy="6" r="3"/><circle cx="28" cy="20" r="3"/><circle cx="15" cy="29" r="3"/>'},
      {label:'FASTAPI',title:'HTTP API',detail:'Return computation results as JSON',icon:'<path d="M11 6H8v8l-4 3 4 3v8h3m12-22h3v8l4 3-4 3v8h-3M15 22l4-10"/>'},
      {label:'STREAMLIT',title:'Interface',detail:'Display allocations, curves, and metrics',icon:'<rect x="3" y="5" width="28" height="24" rx="3"/><path d="M3 12h28M9 24v-5m7 5v-8m7 8v-4"/>'}
    ];
    return `<div class="architecture-diagram${compact?' architecture-diagram-compact':''}">
      <ol class="architecture-flow" aria-label="Result flow in the local synthetic system">
        ${stages.map((stage,i)=>`<li class="architecture-stage${i%2?' architecture-stage-orange':''}"><div class="architecture-stage-heading"><span class="architecture-number">${number(i+1)}</span><span class="architecture-label" lang="en">${stage.label}</span></div><span class="architecture-icon" aria-hidden="true"><svg viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" focusable="false">${stage.icon}</svg></span><h3>${stage.title}</h3><p>${stage.detail}</p></li>`).join('')}
      </ol>
      <p class="architecture-caption"><span>Result flow</span>Streamlit submits parameters over HTTP. FastAPI runs the synthetic pipeline and returns its results.</p>
    </div>`;
  }

  function notices() {
    return `<section class="notice-section" aria-labelledby="notice-heading"><div class="section-eyebrow">PROJECT SCOPE</div><h2 id="notice-heading">Data sources and scope</h2><div class="notice-columns"><p>This site records a student project in machine learning and software engineering. Its purpose is learning, academic discussion, and technical demonstration. The public examples use synthetic data to explain the implemented system.</p><p lang="en"><strong>Educational and Technical Demonstration Only.</strong> Public interactive examples use synthetic data and are not recommendations involving real securities. This project does not offer investment advice, trading signals, brokerage, asset management, or guarantees of investment performance. Illustrative results do not represent live or historical investment performance.</p></div><p class="fine-print">The site documents completed local implementation and verification. FastAPI and Streamlit remain private local services. The existing research website provides background on Factor GCN; its integration status here is NOT INTEGRATED. Publication and use of research materials require the relevant rights review. Third-party hosts process connection information under their own policies.</p></section>`;
  }

  function completionSummary() {
    const docker = window.LOCAL_IMPLEMENTATION?.docker;
    const evidence = window.ENGINEERING_EVIDENCE;
    if (docker?.status !== 'passed' || !Array.isArray(evidence?.checks)) return '';
    const checks = evidence.checks;
    if (checks.some(check=>check.name!=='Docker Compose runtime' && check.status!=='passed')) return '';
    const py = checks.find(check=>check.name==='pytest')?.detail || '';
    const web = checks.find(check=>check.name==='website-contract')?.detail || '';
    const pythonCount = py.match(/(\d+) passed/)?.[1] || '—';
    const webCount = web.match(/Web checks: (\d+) passed/)?.[1] || '—';
    const warnings = py.match(/(\d+) warning/)?.[1] || '0';
    return `<section class="completion-summary" aria-labelledby="completion-title"><div class="completion-heading"><div><span class="section-eyebrow">${escape(evidence.generated_at.slice(0,10))} · v${escape(evidence.version)}</span><h2 id="completion-title">Local engineering verification completed</h2></div><a class="text-action" href="#implementation/docker-verification">View records →</a></div><p>The synthetic pipeline, FastAPI, Streamlit, and Docker completed local verification. The test containers and network were cleaned up, and the Docker engine was stopped.</p><dl class="completion-metrics"><div><dt>Python tests</dt><dd>${escape(pythonCount)} <span>Passed · ${escape(warnings)} warning(s)</span></dd></div><div><dt>Website checks</dt><dd>${escape(webCount)} <span>Passed</span></dd></div><div><dt>Container HTTP</dt><dd>${escape(docker.http_checks)} <span>Passed</span></dd></div><div><dt>Interface interactions</dt><dd>${escape(docker.ui_checks)} <span>Passed</span></dd></div></dl><p class="completion-scope">The completed implementation uses synthetic data. Integration of the original Factor GCN research and any further publication remain separate review decisions.</p></section>`;
  }

  function home() {
    main.innerHTML = `<section class="hero"><h1>Graph-Based Portfolio<br>API &amp; Deployment System</h1><p class="hero-subtitle">Graph-based model serving and deployment</p><p class="hero-description">A synthetic graph-based serving workflow built with FastAPI and Streamlit, documenting system architecture, development, container configuration, and verification.</p><div class="hero-actions"><a class="button button-primary" href="#chapter-1">Project overview <span aria-hidden="true">↗</span></a><a class="text-action" href="#chapter-8">Synthetic illustration <span aria-hidden="true">→</span></a></div></section>
      ${completionSummary()}<section class="intro-section"><div class="section-eyebrow">PROJECT OBJECTIVES</div><div class="intro-grid"><h2>Model serving and<br>engineering integration</h2><div><p>This project packages model computation as a service with explicit inputs, outputs, and version information. Its implementation covers synthetic data generation, graph computation, an HTTP API, an interactive interface, containers, and automated tests.</p><p>FastAPI validates requests and calls the computation pipeline. Streamlit handles parameters and result presentation. The static guide records development and provides a separate synthetic illustration in the browser.</p></div></div><div class="outcomes"><div><span>01 / ARCHITECTURE</span><h3>System design</h3><p>Separate data generation, computation, API, and interface responsibilities through explicit data contracts.</p></div><div><span>02 / IMPLEMENTATION</span><h3>Implementation</h3><p>Implement a local Python system with scenario selection, parameter validation, computation, and visual results.</p></div><div><span>03 / VERIFICATION</span><h3>Verification records</h3><p>Preserve test outputs, HTTP responses, dependency versions, and source hashes with the status of each check.</p></div></div></section>
      <section class="architecture-section" aria-labelledby="architecture-heading"><div class="section-heading"><div><div class="section-eyebrow">SYSTEM ARCHITECTURE</div><h2 id="architecture-heading">System architecture</h2></div><p>Four stages connect synthetic data to the interface.</p></div><div class="hero-visual"><div class="figure-label"><span>FIG. 01</span> LOCAL SYSTEM ARCHITECTURE</div>${architectureDiagram()}</div></section>
      <section class="learning-path" aria-labelledby="path-title"><div class="section-heading"><div><div class="section-eyebrow">PROJECT SECTIONS</div><h2 id="path-title">Project record</h2></div><p>Organized by system architecture, implementation, and verification.</p></div><div class="chapter-list">${chapters.map(c=>`<a class="chapter-row" href="#chapter-${c.id}"><span class="chapter-index">${number(c.id)}</span><div><h3>${c.title}</h3>${c.en!==c.title?`<span lang="en">${c.en}</span>`:''}</div><p>${c.summary}</p><span class="row-time"><span aria-hidden="true">↗</span></span></a>`).join('')}</div></section>
      <section class="demo-teaser"><div><div class="section-eyebrow">SYNTHETIC DATA DEMONSTRATION</div><h2>Interactive synthetic illustration</h2><p>Three preset scenarios connect parameters, graph computation, allocation weights, and JSON results. The illustration runs in the browser.</p><a class="button button-light" href="#chapter-8">Open illustration <span aria-hidden="true">↗</span></a></div><div class="demo-teaser-graphic" aria-hidden="true"><div class="teaser-code"><span>REQUEST</span><code>{<br>&nbsp; "scenario_id": "scenario_a",<br>&nbsp; "seed": 42,<br>&nbsp; "risk_level": "balanced"<br>}</code></div><div class="teaser-result"><span>BROWSER ILLUSTRATION</span><div class="teaser-bars"><i style="--bar:62%"></i><i style="--bar:39%"></i><i style="--bar:78%"></i><i style="--bar:52%"></i><i style="--bar:44%"></i><i style="--bar:30%"></i></div><small>Synthetic assets · allocation weights</small></div></div></section>
      <section class="implementation-teaser"><div><h2>Local implementation</h2><p>Inspect saved API responses, dashboard screenshots, and source excerpts alongside the system workflow.</p></div><div class="proof-links"><a class="button button-primary" href="#implementation">View implementation ↗</a><a class="text-action" href="#reproduce">Setup and reproduction →</a></div></section>${evidenceBlock()}${notices()}`;
  }

  function evidenceBlock() {
    const evidence = window.ENGINEERING_EVIDENCE;
    if (!evidence || typeof evidence !== 'object') return `<section class="evidence-section"><div class="section-eyebrow">VERIFICATION RECORD</div><div class="section-heading"><h2>Verification records</h2><span class="evidence-badge pending">Pending</span></div><p>Verification evidence is pending. Running scripts/verify.py records the check status, version, and time for this section.</p><p class="fine-print">The record is stored in assets/evidence.js. Reproduction steps are documented in docs/testing.md.</p></section>`;
    let checks = evidence.checks || evidence.results || [];
    if (!Array.isArray(checks)) checks = Object.entries(checks).map(([name,value]) => typeof value === 'object' ? {name,...value} : {name,status:value});
    const stamp = evidence.generated_at || evidence.generated_at_utc || evidence.timestamp || 'Time pending';
    const version = evidence.version || evidence.project_version || evidence.commit || 'Version pending';
    const names = {'pytest':'Automated tests','pip-check':'Dependency consistency','javascript-app':'Application JavaScript syntax','javascript-content':'Content JavaScript syntax','javascript-implementation':'Implementation JavaScript syntax','website-contract':'Website structure and assets','Docker Compose runtime':'Docker container execution'};
    return `<section class="evidence-section"><div class="section-eyebrow">VERIFICATION RECORD · EXECUTION SNAPSHOT</div><div class="section-heading"><h2>Verification records</h2><a class="text-action" href="#chapter-7">Test design and results →</a></div><p>These saved results describe local execution at the stated time and source version.<span class="evidence-meta">${escape(stamp)} · ${escape(version)}</span></p><div class="evidence-list">${checks.length ? checks.map(check=>{
      const status = String(check.status || check.result || 'unknown');
      const passed = /^(pass|passed|success|ok)$/i.test(status);
      const failed = /^(fail|failed|error)$/i.test(status);
      const detail = check.detail || check.summary || check.notes || check.output || '';
      const output = typeof detail === 'object' ? JSON.stringify(detail) : String(detail);
      const summary = check.name==='pytest' ? (output.match(/\d+ passed[^\n]*/)?.[0] || 'See the recorded output for test results.') : check.name==='website-contract' ? (output.match(/Web checks:[^\n]*/)?.[0] || 'See the recorded output for check results.') : check.name==='Docker Compose runtime' ? (passed ? `The separately recorded Docker run completed ${window.LOCAL_IMPLEMENTATION?.docker?.http_checks ?? 'the recorded'} HTTP checks and ${window.LOCAL_IMPLEMENTATION?.docker?.ui_checks ?? 'the recorded'} interface checks. Its containers and network were cleaned up and its engine was stopped. Recorded at ${check.captured_at || 'the time shown in the original output'}.` : 'Container verification is pending or unsuccessful; inspect the saved output.') : passed ? 'Check passed.' : output;
      return `<div class="evidence-row"><div><strong>${escape(names[check.name] || check.name || check.label || 'Local check')}</strong><p>${escape(summary)}</p>${check.command ? `<code>${escape(check.command)}</code>` : ''}${output ? `<details class="verification-detail"><summary>Recorded output</summary><pre>${escape(output)}</pre></details>` : ''}</div><span class="evidence-badge ${passed?'passed':failed?'failed':'pending'}">${passed?'Passed':failed?'Failed':'Pending'}</span></div>`;
    }).join('') : '<p>Individual results are pending. Complete records are retained in the project documentation.</p>'}</div><p class="fine-print">Verification covers the synthetic pipeline and local engineering system. The original Factor GCN study is presented on its separate research website.</p></section>`;
  }

  function researchScopeNotice(chapterId) {
    if (![3,4,5,6,8].includes(chapterId)) return '';
    const email = 'ykskryrbo0925@gmail.com';
    return `<aside class="availability-notice" aria-labelledby="availability-notice-title">
      <h2 id="availability-notice-title">Student research and service availability</h2>
      <p>This undergraduate project implements machine-learning and software-engineering concepts for learning, academic discussion, and technical demonstration.</p>
      <section class="availability-reference" aria-labelledby="availability-laws-title">
        <h3 id="availability-laws-title">Regulatory references: provision summaries</h3>
        <dl class="availability-laws">
          <div><dt><a href="https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0400121&amp;flno=4" target="_blank" rel="noopener noreferrer">Securities Investment Trust and Consulting Act, Article 4(1)</a></dt><dd>The definition of securities investment consulting includes receiving remuneration, directly or indirectly, from a client or third party for analysis or recommendations concerning investment or trading in securities, securities-related products, or other items approved by the competent authority.</dd></div>
          <div><dt><a href="https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0400121&amp;flno=107" target="_blank" rel="noopener noreferrer">Securities Investment Trust and Consulting Act, Article 107, subparagraph 1</a></dt><dd>Operating securities investment consulting or the other specified businesses without permission from the competent authority is subject to imprisonment of up to five years and a fine of NT$1 million to NT$50 million.</dd></div>
        </dl>
        <p class="availability-law-note">These are summaries of the cited provisions. Their application depends on the actual conduct. The linked articles provide the official statutory text.</p>
      </section>
      <p>In view of these provisions and the research purpose of the project, the model API and Streamlit service are reserved for private local study and engineering verification. The original Factor GCN remains NOT INTEGRATED.</p>
      ${chapterId===8?'<p class="availability-demo-note">The synthetic illustration on this page is available to use directly. Its JavaScript computation runs in the browser.</p>':''}
      <p>The site provides educational examples rather than recommendations for individual securities or investment advice.</p>
      <div class="availability-contact"><span>Questions about the methods or implementation are welcome by email.</span><a href="mailto:${email}">${email}</a></div>
    </aside>`;
  }

  function endpoints() {
    return `<div class="endpoint-list" aria-label="Local API endpoints"><div><span class="method get">GET</span><code>/health</code><p>Return service status and version</p></div><div><span class="method get">GET</span><code>/model-info</code><p>Return model identity and data mode</p></div><div><span class="method get">GET</span><code>/scenarios</code><p>List synthetic scenarios and parameter bounds</p></div><div><span class="method post">POST</span><code>/simulate</code><p>Validate input and run the synthetic computation</p></div></div><div class="small-callout"><b>Local API explorer</b><p><code>http://127.0.0.1:8000/docs</code> provides the local API explorer. Its execution buttons send HTTP requests and display the FastAPI responses.</p></div>`;
  }

  function chapter(id) {
    const c = chapters.find(item=>item.id===id);
    if (!c) { home(); return; }
    main.innerHTML = `<article class="chapter-article">${researchScopeNotice(id)}<header class="chapter-header"><div class="reading-progress"><span>CHAPTER ${number(id)} / 09</span><span>PROJECT RECORD</span></div><div class="progress-track" role="progressbar" aria-label="Current chapter position" aria-valuemin="1" aria-valuemax="9" aria-valuenow="${id}"><span style="width:${id/9*100}%"></span></div><p class="chapter-kicker">CHAPTER ${number(id)}</p><h1>${c.title}</h1><p class="chapter-lead">${c.summary}</p><nav class="chapter-toc" aria-label="Chapter sections"><a href="#chapter-${id}/why">Objective</a><a href="#chapter-${id}/what">Design</a><a href="#chapter-${id}/how">Process</a><a href="#chapter-${id}/example">Implementation</a><a href="#chapter-${id}/mistakes">Design considerations</a><a href="#chapter-${id}/built">Results</a></nav></header>
      <div class="chapter-body"><section id="why" class="lesson-section"><span class="lesson-number">01 / OBJECTIVE</span><h2>Objective</h2><p>${rich(c.why)}</p></section><section id="what" class="lesson-section"><span class="lesson-number">02 / DESIGN</span><h2>Design</h2><p>${rich(c.what)}</p></section><section id="how" class="lesson-section"><span class="lesson-number">03 / PROCESS</span><h2>Process</h2><p>${rich(c.how)}</p>${c.extra==='endpoints'?endpoints():''}${c.extra==='architecture'?architectureDiagram(true):''}</section><section id="example" class="lesson-section"><span class="lesson-number">04 / IMPLEMENTATION</span><h2>Implementation</h2><div class="code-block"><div class="code-caption"><span>${escape(c.codeLabel)}</span><span aria-hidden="true">• • •</span></div><pre tabindex="0"><code>${escape(c.code)}</code></pre></div><p class="example-note">${rich(c.explanation)}</p></section>${c.extra==='playground'?playground():''}<section id="mistakes" class="lesson-section mistakes"><span class="lesson-number">05 / CONSIDERATIONS</span><h2>Design considerations</h2><ul>${c.mistakes.map(m=>`<li>${rich(m)}</li>`).join('')}</ul></section><section id="built" class="lesson-section"><span class="lesson-number">06 / RESULTS</span><h2>Results</h2><p>${rich(c.built)}</p><div class="file-list" aria-label="Related project files">${c.files.map(f=>{const entry=window.LOCAL_IMPLEMENTATION?.sources[f];return entry?`<a href="${escape(entry.href)}" target="_blank" rel="noopener"><code>${escape(f)} ↗</code></a>`:`<code>${escape(f)}</code>`;}).join('')}</div><p class="fine-print">File paths are relative to the project root.</p></section>${c.extra==='evidence'?evidenceBlock():''}<aside class="takeaway"><span>IMPLEMENTATION NOTE</span><p>${c.takeaway}</p></aside><nav class="chapter-pagination" aria-label="Previous and next chapters">${id>1?`<a href="#chapter-${id-1}"><span>← Previous chapter · ${number(id-1)}</span><strong>${chapters[id-2].title}</strong></a>`:'<a href="#home"><span>← Back to home</span><strong>Project home</strong></a>'}${id<9?`<a href="#chapter-${id+1}"><span>Next chapter · ${number(id+1)} →</span><strong>${chapters[id].title}</strong></a>`:'<a href="#glossary"><span>Glossary →</span><strong>Bilingual glossary</strong></a>'}</nav></div></article>`;
    if (c.extra==='playground') { bindPlayground(); updateDemo(); }
  }

  const stepInfo = [
    ['01 / INPUT','Input parameters','The scenario, fixed seed of 42, and parameter settings determine the synthetic sequences and computation.'],
    ['02 / GRAPH','Graph computation','Six synthetic sequences produce node features. Feature similarity determines edge weights, which combine each node’s own information with that of its neighbours.'],
    ['03 / NORMALIZE','Weight normalization','Softmax converts node scores into nonnegative weights that sum to one.'],
    ['04 / RESPONSE','Results and provenance','The JSON labels its source as browser_illustration and lists asset weights and the synthetic path.']
  ];
  function playground() {
    return `<section class="playground" aria-labelledby="playground-title"><div class="playground-title"><div><span class="section-eyebrow">SYNTHETIC DATA DEMO</span><h2 id="playground-title">Synthetic illustration</h2></div><span class="outline-tag">BROWSER ONLY</span></div><p class="playground-warning"><b>Illustrative Results · No Real Securities</b><br>This independent browser algorithm illustrates how the selected parameters affect the output.</p><div class="demo-controls"><div><span class="control-label" id="scenario-label">Select a synthetic scenario</span><div class="scenario-buttons" role="group" aria-labelledby="scenario-label"><button type="button" data-scenario="scenario_a" aria-pressed="true"><strong>Scenario A</strong><small>Stable common variation</small></button><button type="button" data-scenario="scenario_b" aria-pressed="false"><strong>Scenario B</strong><small>Differences between groups</small></button><button type="button" data-scenario="scenario_c" aria-pressed="false"><strong>Scenario C</strong><small>Stronger perturbations</small></button></div></div><div class="risk-control"><label for="demo-risk">Illustration settings</label><select id="demo-risk"><option value="low">Low · stronger smoothing</option><option value="balanced" selected>Balanced · intermediate settings</option><option value="high">High · stronger differentiation</option></select><span>Fixed seed: 42</span></div></div><div class="demo-steps" role="group" aria-label="Select an explanation step">${['Input','Graph computation','Normalize','Response'].map((label,i)=>`<button type="button" data-step="${i}" aria-pressed="${i===0}"><span>${number(i+1)}</span>${label}</button>`).join('')}</div><div class="step-explanation" id="step-explanation" aria-live="polite"></div><div class="demo-results"><div class="weight-panel"><div class="panel-heading"><h3>Weights of six fictional nodes</h3><span>SUM = 100%</span></div><div id="weights" class="weights"></div><p class="rounding-note">Weights are displayed to one decimal place. Individually rounded values may total slightly above or below 100%.</p></div><div class="curve-panel"><div class="panel-heading"><h3>Synthetic path</h3><span>START = 100</span></div><div id="curve"></div><p>The curve is the weighted path of the selected synthetic sequences, starting at 100.</p></div></div><div class="json-panel"><div role="tablist" aria-label="JSON explanation"><button id="request-tab" role="tab" aria-selected="true" aria-controls="json-code" tabindex="0" data-json="request">Request</button><button id="response-tab" role="tab" aria-selected="false" aria-controls="json-code" tabindex="-1" data-json="response">Illustrative response</button></div><p id="json-description"></p><pre id="json-code" role="tabpanel" aria-labelledby="request-tab" tabindex="0"></pre></div><p class="fine-print">The browser recalculates six synthetic sequences over 30 periods. The separate Python pipeline uses a 120-day calibration window and a subsequent 60-day evaluation window; its results appear in the local system and saved verification records.</p></section>`;
  }

  function syntheticBrowserModel() {
    // Deliberately small illustrative algorithm, separate from the local Python pipeline.
    const kind = {scenario_a:0,scenario_b:1,scenario_c:2}[demoState.scenario];
    let state = 42 + kind*101;
    const random = () => { state = (1664525*state+1013904223)>>>0; return state/4294967296; };
    const data = Array.from({length:6},(_,asset)=>Array.from({length:30},(_,day)=>{
      const common = Math.sin(day*.38)*.004;
      const group = Math.sin(day*.63+(asset<3?0:2.4))*.005;
      const noise = (random()-.5)*[.014,.02,.038][kind];
      return .0007 + asset*.00016 + common*(kind===0?1.2:.4) + group*(kind===1?1:.2) + noise;
    }));
    const features = data.map(series=>series.reduce((a,b)=>a+b,0)/series.length);
    const adjacency = features.map((v,i)=>features.map((u,j)=>i===j?0:Math.exp(-Math.abs(v-u)*350)));
    const scores = features.map((own,i)=>{
      const denom = adjacency[i].reduce((a,b)=>a+b,0);
      const neighbor = features.reduce((sum,f,j)=>sum+f*adjacency[i][j],0)/denom;
      const vol = Math.sqrt(data[i].reduce((sum,v)=>sum+(v-own)**2,0)/data[i].length);
      const penalty = {low:.55,balanced:.28,high:.08}[demoState.risk];
      return (.65*own+.35*neighbor-penalty*vol)*{low:100,balanced:230,high:420}[demoState.risk];
    });
    const max = Math.max(...scores);
    const exps = scores.map(s=>Math.exp(s-max));
    const sum = exps.reduce((a,b)=>a+b,0);
    const weights = exps.map(v=>v/sum);
    const curve = [100];
    for(let day=0;day<30;day++) curve.push(curve[curve.length-1]*(1+weights.reduce((s,w,i)=>s+w*data[i][day],0)));
    return {weights,curve};
  }

  function bindPlayground() {
    document.querySelectorAll('[data-scenario]').forEach(button=>button.addEventListener('click',()=>{demoState.scenario=button.dataset.scenario;updateDemo();}));
    document.getElementById('demo-risk').addEventListener('change',event=>{demoState.risk=event.target.value;updateDemo();});
    document.querySelectorAll('[data-step]').forEach(button=>button.addEventListener('click',()=>{demoState.step=Number(button.dataset.step);updateDemo();}));
    document.querySelectorAll('[data-json]').forEach(button=>{
      button.addEventListener('click',()=>{demoState.tab=button.dataset.json;updateDemo();});
      button.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();demoState.tab=demoState.tab==='request'?'response':'request';updateDemo();document.querySelector(`[data-json="${demoState.tab}"]`).focus();}});
    });
  }

  function updateDemo() {
    const {weights,curve} = syntheticBrowserModel();
    document.querySelectorAll('[data-scenario]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scenario===demoState.scenario)));
    document.getElementById('demo-risk').value = demoState.risk;
    document.querySelectorAll('[data-step]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.step)===demoState.step)));
    const step = stepInfo[demoState.step];
    document.getElementById('step-explanation').innerHTML = `<span>${step[0]}</span><div><h3>${step[1]}</h3><p>${step[2]}</p></div>`;
    document.getElementById('weights').innerHTML = weights.map((w,i)=>`<div class="weight-row"><span>SIM-${number(i+1)}</span><div class="weight-track" aria-hidden="true"><i style="width:${w*100*2.2}%"></i></div><strong>${(w*100).toFixed(1)}<small>%</small></strong></div>`).join('');
    const min = Math.min(...curve)-.7, max = Math.max(...curve)+.7;
    const points = curve.map((value,i)=>`${40+i/30*345},${156-(value-min)/(max-min)*126}`);
    const path = `M${points.join(' L')}`;
    document.getElementById('curve').innerHTML = `<svg viewBox="0 0 410 200" role="img" aria-labelledby="curve-title curve-description"><title id="curve-title">Synthetic path illustration</title><desc id="curve-description">Starting at 100, the path reaches ${curve[30].toFixed(2)} after 30 artificial periods. Data are generated by the browser illustration.</desc>${[0,1,2].map(i=>{const y=30+i*63;return `<path d="M40 ${y}H385" stroke="var(--line)" stroke-dasharray="3 4"/><text x="3" y="${y+4}" fill="var(--muted)" font-size="10">${(max-i*(max-min)/2).toFixed(1)}</text>`;}).join('')}<path d="${path} L385 165 L40 165Z" fill="var(--palette-peach)" opacity=".5"/><path d="${path}" fill="none" stroke="var(--palette-orange)" stroke-width="2.5"/><circle cx="385" cy="${156-(curve[30]-min)/(max-min)*126}" r="4" fill="var(--palette-orange)"/><text x="40" y="190" fill="var(--muted)" font-size="10">0</text><text x="335" y="190" fill="var(--muted)" font-size="10">30 synthetic periods</text></svg>`;
    document.querySelectorAll('[data-json]').forEach(b=>{const selected=b.dataset.json===demoState.tab;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
    document.getElementById('json-code').setAttribute('aria-labelledby',`${demoState.tab}-tab`);
    const request = {scenario_id:demoState.scenario,seed:42,risk_level:demoState.risk};
    const response = {source:'browser_illustration',python_api_called:false,original_factor_gcn:'NOT INTEGRATED',metadata:{data_mode:'synthetic',investment_advice:false},illustrative_allocations:weights.map((w,i)=>({asset_id:`SIM-${number(i+1)}`,weight:Number(w.toFixed(6))})),synthetic_path:{periods:30,start:100,end:Number(curve[30].toFixed(4))}};
    document.getElementById('json-description').textContent = demoState.tab==='request' ? 'This shows the POST /simulate request format. Field values update with the illustration controls.' : 'This shows the browser illustration output. The full Python API response includes graph, equity_curve, metrics, and explainability; its schema is documented in the local /docs explorer.';
    document.getElementById('json-code').textContent = JSON.stringify(demoState.tab==='request'?request:response,null,2);
  }

  function glossaryPage(termId) {
    const selectedTerm = glossary.find(t=>t.id===termId);
    if(selectedTerm) glossaryState = {query:selectedTerm.en,chapter:'all'};
    main.innerHTML = `<section class="glossary-page"><header class="glossary-header"><div class="eyebrow">TECHNICAL GLOSSARY</div><h1>Technical glossary</h1><p>${glossary.length} bilingual terms used in the project, with definitions, implementation examples, and related chapters.</p></header><div class="glossary-tools"><div class="search-field"><label for="term-search">Search English or Chinese terms</label><div><span aria-hidden="true">⌕</span><input id="term-search" type="search" placeholder="e.g. API, container, inference…" value="${escape(glossaryState.query)}" autocomplete="off" spellcheck="false"><button id="clear-search" type="button" aria-label="Clear search">×</button></div></div><div class="chapter-filter"><label for="chapter-filter">Filter by chapter</label><select id="chapter-filter"><option value="all">All chapters</option>${chapters.map(c=>`<option value="${c.id}" ${String(c.id)===glossaryState.chapter?'selected':''}>${number(c.id)} ${c.title}</option>`).join('')}</select></div></div><p class="glossary-result-count" id="glossary-count" role="status" aria-live="polite"></p><div id="glossary-results" class="glossary-results"></div><div class="small-callout"><b>Terminology in implementation</b><p>Each entry links to the relevant chapters, connecting terminology to source code, data flow, and deployment settings.</p></div></section>`;
    const search = document.getElementById('term-search');
    search.addEventListener('input',()=>{glossaryState.query=search.value;filterGlossary();});
    document.getElementById('chapter-filter').addEventListener('change',event=>{glossaryState.chapter=event.target.value;filterGlossary();});
    document.getElementById('clear-search').addEventListener('click',()=>{glossaryState.query='';search.value='';filterGlossary();search.focus();});
    filterGlossary();
  }
  function filterGlossary() {
    const query = glossaryState.query.trim().toLocaleLowerCase();
    const found = glossary.filter(t=>(glossaryState.chapter==='all'||t.chapters.includes(Number(glossaryState.chapter)))&&`${t.en} ${t.zh} ${t.definition} ${t.example}`.toLocaleLowerCase().includes(query));
    found.sort((a,b)=>Number(b.en.toLocaleLowerCase()===query)-Number(a.en.toLocaleLowerCase()===query));
    document.getElementById('glossary-count').textContent = `${found.length} terms found · ${glossary.length} in total`;
    document.getElementById('glossary-results').innerHTML = found.length ? found.map(t=>`<article class="glossary-entry" id="term-${t.id}"><header><div><h2 lang="en">${escape(t.en)}</h2><span lang="zh-Hant">${escape(t.zh)}</span></div><nav aria-label="${escape(t.en)} related chapters">${t.chapters.map(id=>`<a href="#chapter-${id}">CH ${number(id)} ↗</a>`).join('')}</nav></header><p>${escape(t.definition)}</p><div class="term-example"><span>IN THIS PROJECT</span><p>${escape(t.example)}</p></div></article>`).join('') : '<div class="empty-results"><h2>No matching terms</h2><p>Search supports English or Chinese terms and chapter filters.</p><button type="button" id="reset-glossary">Reset search and filters</button></div>';
    const reset = document.getElementById('reset-glossary');
    if(reset) reset.addEventListener('click',()=>{glossaryState={query:'',chapter:'all'};glossaryPage();document.getElementById('term-search').focus();});
  }

  function route() {
    const hash = location.hash.slice(1) || 'home';
    const [page,anchor] = hash.split('/');
    const chapterMatch = page.match(/^chapter-([1-9])$/);
    const sameChapterAnchor = chapterMatch && anchor && document.querySelector('.chapter-header') && main.dataset.route===page;
    if(!sameChapterAnchor) {
      if(chapterMatch) chapter(Number(chapterMatch[1]));
      else if(page==='glossary') glossaryPage(anchor);
      else if(page==='implementation') main.innerHTML=window.renderImplementation();
      else if(page==='reproduce') main.innerHTML=window.renderReproduction();
      else home();
      main.dataset.route=page;
      const title = chapterMatch ? `${chapters[Number(chapterMatch[1])-1].title} — ` : page==='glossary'?'Bilingual glossary — ':page==='implementation'?'Local implementation — ':page==='reproduce'?'Setup and reproduction — ':'';
      document.title = `${title}Graph-Based Portfolio API & Deployment System`;
      updatePageNavigation(page);
      document.querySelectorAll('.page-directory a, .brand').forEach(a=>{
        const active = a.getAttribute('href')===`#${page}`;
        if(active) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
      });
      if(navigated) { window.scrollTo({top:0,behavior:'instant'});main.focus({preventScroll:true}); }
    }
    if(anchor && (chapterMatch || page==='implementation' || page==='reproduce')) document.getElementById(anchor)?.scrollIntoView({block:'start'});
    setDirectory(false);
    navigated=true;
  }
  window.addEventListener('hashchange',route);
  route();
})();


