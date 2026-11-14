(() => {
  'use strict';
  if (window.GUIDE_LANGUAGE === 'en') return;
  const chapters = window.GUIDE_CHAPTERS;
  const glossary = window.GUIDE_GLOSSARY;
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
  const pageOrder = [{id:'home',title:'專題首頁'},...chapters.map(c=>({id:`chapter-${c.id}`,title:c.title})),{id:'implementation',title:'本機實作成果'},{id:'reproduce',title:'啟動與重現流程'},{id:'glossary',title:'中英術語索引'}];

  function setDirectory(open, restoreFocus = false) {
    const focusWasInside = !open && directoryPanel.contains(document.activeElement);
    directoryPanel.hidden = !open;
    directoryToggle.setAttribute('aria-expanded',String(open));
    directoryToggle.setAttribute('aria-label',open ? '關閉章節目錄' : '開啟章節目錄');
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
    for(const [id,entry,label] of [['page-previous',pageOrder[index-1],'上一頁'],['page-next',pageOrder[index+1],'下一頁']]) {
      const link = document.getElementById(id);
      link.hidden = !entry;
      if(entry) {
        link.href = `#${entry.id}`;
        link.querySelector('strong').textContent = entry.title;
        link.setAttribute('aria-label',`${label}：${entry.title}`);
      } else {
        link.removeAttribute('href');
      }
    }
  }

  function architectureDiagram(compact = false) {
    const stages = [
      {label:'SYNTHETIC DATA',title:'合成資料',detail:'產生虛構資產與時間序列',icon:'<path d="M7 24V14m9 10V7m9 17V10M4 28h25"/>'},
      {label:'GRAPH INFERENCE',title:'圖式計算',detail:'以固定規則進行訊息傳播',icon:'<path d="m7 12 13-6 8 14-13 9-8-17 21 8M20 6l-5 23"/><circle cx="7" cy="12" r="3"/><circle cx="20" cy="6" r="3"/><circle cx="28" cy="20" r="3"/><circle cx="15" cy="29" r="3"/>'},
      {label:'FASTAPI',title:'HTTP API',detail:'將計算結果整理為 JSON',icon:'<path d="M11 6H8v8l-4 3 4 3v8h3m12-22h3v8l4 3-4 3v8h-3M15 22l4-10"/>'},
      {label:'STREAMLIT',title:'操作介面',detail:'呈現配置、曲線與指標',icon:'<rect x="3" y="5" width="28" height="24" rx="3"/><path d="M3 12h28M9 24v-5m7 5v-8m7 8v-4"/>'}
    ];
    return `<div class="architecture-diagram${compact?' architecture-diagram-compact':''}">
      <ol class="architecture-flow" aria-label="本機合成系統的結果資料流">
        ${stages.map((stage,i)=>`<li class="architecture-stage${i%2?' architecture-stage-orange':''}"><div class="architecture-stage-heading"><span class="architecture-number">${number(i+1)}</span><span class="architecture-label" lang="en">${stage.label}</span></div><span class="architecture-icon" aria-hidden="true"><svg viewBox="0 0 34 34" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" focusable="false">${stage.icon}</svg></span><h3>${stage.title}</h3><p>${stage.detail}</p></li>`).join('')}
      </ol>
      <p class="architecture-caption"><span>結果資料流</span>Streamlit 透過 HTTP 提交參數，FastAPI 呼叫合成計算流程並回傳結果。</p>
    </div>`;
  }

  function notices() {
    return `<section class="notice-section" aria-labelledby="notice-heading"><div class="section-eyebrow">PROJECT SCOPE</div><h2 id="notice-heading">資料來源與使用範圍</h2><div class="notice-columns"><p>本網站為個人學習、學術交流及軟體工程展示專案。所有公開互動示範均使用合成資料或獲得適當授權的示例，並非真實投資組合推薦。本站不提供證券投資顧問、即時交易訊號、資產管理、代客操作或投資報酬保證。模擬結果不代表實際市場表現。請勿依據本站示例作出投資決策。</p><p lang="en"><strong>Educational and Technical Demonstration Only.</strong> Public interactive examples use synthetic data and are not recommendations involving real securities. This project does not offer investment advice, trading signals, brokerage, asset management, or guarantees of investment performance. Illustrative results do not represent live or historical investment performance.</p></div><p class="fine-print">本站整理已完成的本機工程實作與驗證結果。API 與 Streamlit 維持私人本機用途。原始 Factor GCN 以既有研究網站作為背景參照，整合狀態為 NOT INTEGRATED。對外發布與研究素材整合需完成權利審核。第三方託管商的連線資訊處理方式依其政策辦理。</p></section>`;
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
    return `<section class="completion-summary" aria-labelledby="completion-title"><div class="completion-heading"><div><span class="section-eyebrow">${escape(docker.verified_at.slice(0,10))} · v${escape(evidence.version)}</span><h2 id="completion-title">本機工程驗收完成</h2></div><a class="text-action" href="#implementation/docker-verification">查看實測紀錄 →</a></div><p>合成模型、FastAPI、Streamlit 與 Docker 已完成本機驗收。測試容器與網路已清理，Docker 引擎已停止。</p><dl class="completion-metrics"><div><dt>Python 測試</dt><dd>${escape(pythonCount)} <span>通過 · ${escape(warnings)} 個警告</span></dd></div><div><dt>網站檢查</dt><dd>${escape(webCount)} <span>通過</span></dd></div><div><dt>容器 HTTP</dt><dd>${escape(docker.http_checks)} <span>通過</span></dd></div><div><dt>介面操作</dt><dd>${escape(docker.ui_checks)} <span>通過</span></dd></div></dl><p class="completion-scope">目前完成的是合成資料工程實作；原始 Factor GCN 的研究整合與對外發布各自保留審核。</p></section>`;
  }

  function home() {
    main.innerHTML = `<section class="hero"><h1>Graph-Based Portfolio<br>API &amp; Deployment System</h1><p class="hero-subtitle">圖式模型服務化與部署系統</p><p class="hero-description">以合成資料實作圖式模型服務化，整合 FastAPI 與 Streamlit，記錄系統架構、開發流程、容器設定及驗證結果。</p><div class="hero-actions"><a class="button button-primary" href="#chapter-1">專題概述 <span aria-hidden="true">↗</span></a><a class="text-action" href="#chapter-8">合成資料展示 <span aria-hidden="true">→</span></a></div></section>
      ${completionSummary()}<section class="intro-section"><div class="section-eyebrow">PROJECT OBJECTIVES</div><div class="intro-grid"><h2>模型服務化與<br>工程流程整合</h2><div><p>本專題將模型計算整理為具有明確輸入、輸出與版本資訊的服務。實作範圍包含合成資料生成、圖式推論、HTTP API、操作介面、容器設定與自動化測試。</p><p>FastAPI 負責資料驗證與模型呼叫，Streamlit 負責參數設定與結果呈現。靜態網站整理開發過程，並提供獨立的瀏覽器端合成展示。</p></div></div><div class="outcomes"><div><span>01 / ARCHITECTURE</span><h3>系統設計</h3><p>分離資料生成、推論、API 與介面，建立各模組的責任與資料契約。</p></div><div><span>02 / IMPLEMENTATION</span><h3>程式實作</h3><p>完成本機 Python 系統，提供情境選擇、參數驗證、模型執行及圖表輸出。</p></div><div><span>03 / VERIFICATION</span><h3>驗證紀錄</h3><p>保存測試輸出、HTTP 回應、套件版本與來源指紋，標示各項驗收狀態。</p></div></div></section>
      <section class="architecture-section" aria-labelledby="architecture-heading"><div class="section-heading"><div><div class="section-eyebrow">SYSTEM ARCHITECTURE</div><h2 id="architecture-heading">系統架構</h2></div><p>從合成資料到介面呈現的四個階段。</p></div><div class="hero-visual"><div class="figure-label"><span>FIG. 01</span> LOCAL SYSTEM ARCHITECTURE</div>${architectureDiagram()}</div></section>
      <section class="learning-path" aria-labelledby="path-title"><div class="section-heading"><div><div class="section-eyebrow">PROJECT SECTIONS</div><h2 id="path-title">專題紀錄</h2></div><p>依系統架構、實作流程與驗證結果整理。</p></div><div class="chapter-list">${chapters.map(c=>`<a class="chapter-row" href="#chapter-${c.id}"><span class="chapter-index">${number(c.id)}</span><div><h3>${c.title}</h3><span lang="en">${c.en}</span></div><p>${c.summary}</p><span class="row-time"><span aria-hidden="true">↗</span></span></a>`).join('')}</div></section>
      <section class="demo-teaser"><div><div class="section-eyebrow">SYNTHETIC DATA DEMONSTRATION</div><h2>合成資料互動展示</h2><p>三個預設情境呈現參數、圖式計算、配置權重與 JSON 結果。展示程式在瀏覽器內執行。</p><a class="button button-light" href="#chapter-8">開啟展示 <span aria-hidden="true">↗</span></a></div><div class="demo-teaser-graphic" aria-hidden="true"><div class="teaser-code"><span>REQUEST</span><code>{<br>&nbsp; "scenario_id": "scenario_a",<br>&nbsp; "seed": 42,<br>&nbsp; "risk_level": "balanced"<br>}</code></div><div class="teaser-result"><span>BROWSER ILLUSTRATION</span><div class="teaser-bars"><i style="--bar:62%"></i><i style="--bar:39%"></i><i style="--bar:78%"></i><i style="--bar:52%"></i><i style="--bar:44%"></i><i style="--bar:30%"></i></div><small>合成資產 · 配置權重</small></div></div></section>
      <section class="implementation-teaser"><div><h2>本機實作成果</h2><p>檢視真實 API 回應、Dashboard 操作畫面與關鍵程式，對照系統的實際執行流程。</p></div><div class="proof-links"><a class="button button-primary" href="#implementation">查看實作成果 ↗</a><a class="text-action" href="#reproduce">啟動與重現流程 →</a></div></section>${evidenceBlock()}${notices()}`;
  }

  function evidenceBlock() {
    const evidence = window.ENGINEERING_EVIDENCE;
    if (!evidence || typeof evidence !== 'object') return `<section class="evidence-section"><div class="section-eyebrow">VERIFICATION RECORD</div><div class="section-heading"><h2>驗證紀錄</h2><span class="evidence-badge pending">待產生</span></div><p>驗證紀錄待產生。執行 scripts/verify.py 後，此處會呈現測試狀態、版本與時間。</p><p class="fine-print">紀錄檔位於 assets/evidence.js，重現步驟收錄於 docs/testing.md。</p></section>`;
    let checks = evidence.checks || evidence.results || [];
    if (!Array.isArray(checks)) checks = Object.entries(checks).map(([name,value]) => typeof value === 'object' ? {name,...value} : {name,status:value});
    const stamp = evidence.generated_at || evidence.generated_at_utc || evidence.timestamp || '時間待補';
    const version = evidence.version || evidence.project_version || evidence.commit || '版本待補';
    const names = {'pytest':'自動化測試','pip-check':'套件相依一致性','javascript-app':'介面程式語法','javascript-content':'內容資料語法','website-contract':'網站結構與資源','Docker Compose runtime':'Docker 容器執行'};
    return `<section class="evidence-section"><div class="section-eyebrow">VERIFICATION RECORD · EXECUTION SNAPSHOT</div><div class="section-heading"><h2>驗證紀錄</h2><a class="text-action" href="#chapter-7">測試設計與結果 →</a></div><p>以下為本機執行時保存的結果，狀態對應所列時間與版本。<span class="evidence-meta">${escape(stamp)} · ${escape(version)}</span></p><div class="evidence-list">${checks.length ? checks.map(check=>{
      const status = String(check.status || check.result || 'unknown');
      const passed = /^(pass|passed|success|ok)$/i.test(status);
      const failed = /^(fail|failed|error)$/i.test(status);
      const detail = check.detail || check.summary || check.notes || check.output || '';
      const output = typeof detail === 'object' ? JSON.stringify(detail) : String(detail);
      const summary = check.name==='pytest' ? (output.match(/\d+ passed[^\n]*/)?.[0] || '測試結果見執行輸出。') : check.name==='website-contract' ? (output.match(/Web checks:[^\n]*/)?.[0] || '檢查結果見執行輸出。') : check.name==='Docker Compose runtime' ? output : passed ? '檢查通過。' : output;
      return `<div class="evidence-row"><div><strong>${escape(names[check.name] || check.name || check.label || '本機檢查')}</strong><p>${escape(summary)}</p>${check.command ? `<code>${escape(check.command)}</code>` : ''}${output ? `<details class="verification-detail"><summary>執行輸出</summary><pre>${escape(output)}</pre></details>` : ''}</div><span class="evidence-badge ${passed?'passed':failed?'failed':'pending'}">${passed?'通過':failed?'失敗':'待驗證'}</span></div>`;
    }).join('') : '<p>逐項結果待補，完整紀錄保存於專案文件。</p>'}</div><p class="fine-print">驗證範圍為合成資料流程與本機工程系統。原始 Factor GCN 研究另由研究網站呈現。</p></section>`;
  }

  function researchScopeNotice(chapterId) {
    if (![3,4,5,6,8].includes(chapterId)) return '';
    const email = 'ykskryrbo0925@gmail.com';
    return `<aside class="availability-notice" aria-labelledby="availability-notice-title">
      <h2 id="availability-notice-title">學生研究與功能開放說明</h2>
      <p>本專題為大學生的機器學習與工程概念研究實作，內容用於學習、學術交流及技術展示。</p>
      <section class="availability-reference" aria-labelledby="availability-laws-title">
        <h3 id="availability-laws-title">法規依據（條文重點摘要）</h3>
        <dl class="availability-laws">
          <div><dt><a href="https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0400121&amp;flno=4" target="_blank" rel="noopener noreferrer">《證券投資信託及顧問法》第 4 條第 1 項</a></dt><dd>證券投資顧問的定義包含直接或間接自委任人或第三人取得報酬，並對有價證券、證券相關商品或其他經主管機關核准項目的投資、交易事項，提供分析意見或推介建議。</dd></div>
          <div><dt><a href="https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0400121&amp;flno=107" target="_blank" rel="noopener noreferrer">《證券投資信託及顧問法》第 107 條第 1 款</a></dt><dd>未經主管機關許可而經營證券投資顧問等法定業務，處五年以下有期徒刑，併科新臺幣 100 萬元以上、5,000 萬元以下罰金。</dd></div>
        </dl>
        <p class="availability-law-note">以上為條文重點摘要，法規適用依實際行為判斷；點選條號可閱讀官方原文。</p>
      </section>
      <p>考量上述規範與本專題的研究用途，模型 API 與 Streamlit 互動服務目前暫不對外開放，僅供私人本機研究與工程驗證。原始 Factor GCN 尚未整合至本示範。</p>
      ${chapterId===8?'<p class="availability-demo-note">本頁的瀏覽器合成資料展示可直接操作，計算由瀏覽器內的 JavaScript 執行。</p>':''}
      <p>本站不提供個別證券推薦或投資建議。</p>
      <div class="availability-contact"><span>研究方法與工程問題，歡迎來信討論。</span><a href="mailto:${email}">${email}</a></div>
    </aside>`;
  }

  function endpoints() {
    return `<div class="endpoint-list" aria-label="本機 API 端點"><div><span class="method get">GET</span><code>/health</code><p>回傳服務狀態與版本</p></div><div><span class="method get">GET</span><code>/model-info</code><p>回傳模型資訊與資料模式</p></div><div><span class="method get">GET</span><code>/scenarios</code><p>取得合成情境與參數範圍</p></div><div><span class="method post">POST</span><code>/simulate</code><p>驗證輸入並執行合成計算</p></div></div><div class="small-callout"><b>本機 API 文件</b><p><code>http://127.0.0.1:8000/docs</code> 提供本機 API 操作介面。執行按鈕會送出 HTTP 請求，並顯示 FastAPI 的回應。</p></div>`;
  }

  function chapter(id) {
    const c = chapters.find(item=>item.id===id);
    if (!c) { home(); return; }
    main.innerHTML = `<article class="chapter-article">${researchScopeNotice(id)}<header class="chapter-header"><div class="reading-progress"><span>CHAPTER ${number(id)} / 09</span><span>PROJECT RECORD</span></div><div class="progress-track" role="progressbar" aria-label="目前章節位置" aria-valuemin="1" aria-valuemax="9" aria-valuenow="${id}"><span style="width:${id/9*100}%"></span></div><p class="chapter-kicker" lang="en">${c.en}</p><h1>${c.title}</h1><p class="chapter-lead">${c.summary}</p><nav class="chapter-toc" aria-label="本章段落"><a href="#chapter-${id}/why">實作目標</a><a href="#chapter-${id}/what">設計說明</a><a href="#chapter-${id}/how">處理流程</a><a href="#chapter-${id}/example">程式實作</a><a href="#chapter-${id}/mistakes">設計考量</a><a href="#chapter-${id}/built">實作結果</a></nav></header>
      <div class="chapter-body"><section id="why" class="lesson-section"><span class="lesson-number">01 / OBJECTIVE</span><h2>實作目標</h2><p>${rich(c.why)}</p></section><section id="what" class="lesson-section"><span class="lesson-number">02 / DESIGN</span><h2>設計說明</h2><p>${rich(c.what)}</p></section><section id="how" class="lesson-section"><span class="lesson-number">03 / PROCESS</span><h2>處理流程</h2><p>${rich(c.how)}</p>${c.extra==='endpoints'?endpoints():''}${c.extra==='architecture'?architectureDiagram(true):''}</section><section id="example" class="lesson-section"><span class="lesson-number">04 / IMPLEMENTATION</span><h2>程式實作</h2><div class="code-block"><div class="code-caption"><span>${escape(c.codeLabel)}</span><span aria-hidden="true">• • •</span></div><pre tabindex="0"><code>${escape(c.code)}</code></pre></div><p class="example-note">${rich(c.explanation)}</p></section>${c.extra==='playground'?playground():''}<section id="mistakes" class="lesson-section mistakes"><span class="lesson-number">05 / CONSIDERATIONS</span><h2>設計考量</h2><ul>${c.mistakes.map(m=>`<li>${rich(m)}</li>`).join('')}</ul></section><section id="built" class="lesson-section"><span class="lesson-number">06 / RESULTS</span><h2>實作結果</h2><p>${rich(c.built)}</p><div class="file-list" aria-label="專案內對應檔案">${c.files.map(f=>{const entry=window.LOCAL_IMPLEMENTATION?.sources[f];return entry?`<a href="${escape(entry.href)}" target="_blank" rel="noopener"><code>${escape(f)} ↗</code></a>`:`<code>${escape(f)}</code>`;}).join('')}</div><p class="fine-print">檔案路徑以專案根目錄為基準。</p></section>${c.extra==='evidence'?evidenceBlock():''}<aside class="takeaway"><span>IMPLEMENTATION NOTE</span><p>${c.takeaway}</p></aside><nav class="chapter-pagination" aria-label="上一章與下一章">${id>1?`<a href="#chapter-${id-1}"><span>← 上一章 · ${number(id-1)}</span><strong>${chapters[id-2].title}</strong></a>`:'<a href="#home"><span>← 回到首頁</span><strong>專題首頁</strong></a>'}${id<9?`<a href="#chapter-${id+1}"><span>下一章 · ${number(id+1)} →</span><strong>${chapters[id].title}</strong></a>`:'<a href="#glossary"><span>術語索引 →</span><strong>中英術語索引</strong></a>'}</nav></div></article>`;
    if (c.extra==='playground') { bindPlayground(); updateDemo(); }
  }

  const stepInfo = [
    ['01 / INPUT','輸入參數','情境、固定種子 42 與參數設定共同決定合成序列及計算方式。'],
    ['02 / GRAPH','圖式計算','六組合成序列產生各節點特徵，特徵相近程度決定連結權重，再整合自身與鄰居資訊。'],
    ['03 / NORMALIZE','權重正規化','softmax 將節點分數轉成非負權重，總和為 1。'],
    ['04 / RESPONSE','結果與來源','JSON 以 browser_illustration 記錄輸出來源，並列出各資產權重與合成路徑。']
  ];
  function playground() {
    return `<section class="playground" aria-labelledby="playground-title"><div class="playground-title"><div><span class="section-eyebrow">SYNTHETIC DATA DEMO</span><h2 id="playground-title">合成資料展示</h2></div><span class="outline-tag">BROWSER ONLY</span></div><p class="playground-warning"><b>Illustrative Results · No Real Securities</b><br>此展示採獨立的瀏覽器端合成演算法，呈現參數與輸出之間的關係。</p><div class="demo-controls"><div><span class="control-label" id="scenario-label">選擇合成情境</span><div class="scenario-buttons" role="group" aria-labelledby="scenario-label"><button type="button" data-scenario="scenario_a" aria-pressed="true"><strong>Scenario A</strong><small>穩定的共同變化</small></button><button type="button" data-scenario="scenario_b" aria-pressed="false"><strong>Scenario B</strong><small>群組之間的差異</small></button><button type="button" data-scenario="scenario_c" aria-pressed="false"><strong>Scenario C</strong><small>更明顯的擾動</small></button></div></div><div class="risk-control"><label for="demo-risk">示意參數</label><select id="demo-risk"><option value="low">Low · 較強平滑</option><option value="balanced" selected>Balanced · 中間設定</option><option value="high">High · 較強差異</option></select><span>固定 seed：42</span></div></div><div class="demo-steps" role="group" aria-label="選擇解說步驟">${['輸入','圖式計算','正規化','回應'].map((label,i)=>`<button type="button" data-step="${i}" aria-pressed="${i===0}"><span>${number(i+1)}</span>${label}</button>`).join('')}</div><div class="step-explanation" id="step-explanation" aria-live="polite"></div><div class="demo-results"><div class="weight-panel"><div class="panel-heading"><h3>六個虛構節點的權重</h3><span>SUM = 100%</span></div><div id="weights" class="weights"></div><p class="rounding-note">權重顯示至小數一位；個別四捨五入後的加總可能略高或略低於 100%。</p></div><div class="curve-panel"><div class="panel-heading"><h3>合成路徑</h3><span>START = 100</span></div><div id="curve"></div><p>曲線為所選合成序列的加權路徑，起點設為 100。</p></div></div><div class="json-panel"><div role="tablist" aria-label="JSON 解說"><button id="request-tab" role="tab" aria-selected="true" aria-controls="json-code" tabindex="0" data-json="request">Request 請求</button><button id="response-tab" role="tab" aria-selected="false" aria-controls="json-code" tabindex="-1" data-json="response">Response 示意</button></div><p id="json-description"></p><pre id="json-code" role="tabpanel" aria-labelledby="request-tab" tabindex="0"></pre></div><p class="fine-print">展示函式在瀏覽器重新計算 6 組、30 個週期的合成序列。Python 系統另採 120 日校準與 60 日評估流程，執行結果收錄於本機系統與驗證紀錄。</p></section>`;
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
    document.getElementById('curve').innerHTML = `<svg viewBox="0 0 410 200" role="img" aria-labelledby="curve-title curve-description"><title id="curve-title">合成路徑示意</title><desc id="curve-description">起點 100，30 個人造週期後為 ${curve[30].toFixed(2)}，資料來源為瀏覽器端合成函式。</desc>${[0,1,2].map(i=>{const y=30+i*63;return `<path d="M40 ${y}H385" stroke="var(--line)" stroke-dasharray="3 4"/><text x="3" y="${y+4}" fill="var(--muted)" font-size="10">${(max-i*(max-min)/2).toFixed(1)}</text>`;}).join('')}<path d="${path} L385 165 L40 165Z" fill="var(--palette-peach)" opacity=".5"/><path d="${path}" fill="none" stroke="var(--palette-orange)" stroke-width="2.5"/><circle cx="385" cy="${156-(curve[30]-min)/(max-min)*126}" r="4" fill="var(--palette-orange)"/><text x="40" y="190" fill="var(--muted)" font-size="10">0</text><text x="335" y="190" fill="var(--muted)" font-size="10">30 合成週期</text></svg>`;
    document.querySelectorAll('[data-json]').forEach(b=>{const selected=b.dataset.json===demoState.tab;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});
    document.getElementById('json-code').setAttribute('aria-labelledby',`${demoState.tab}-tab`);
    const request = {scenario_id:demoState.scenario,seed:42,risk_level:demoState.risk};
    const response = {source:'browser_illustration',python_api_called:false,original_factor_gcn:'NOT INTEGRATED',metadata:{data_mode:'synthetic',investment_advice:false},illustrative_allocations:weights.map((w,i)=>({asset_id:`SIM-${number(i+1)}`,weight:Number(w.toFixed(6))})),synthetic_path:{periods:30,start:100,end:Number(curve[30].toFixed(4))}};
    document.getElementById('json-description').textContent = demoState.tab==='request' ? '此處呈現 POST /simulate 的請求格式，欄位值隨展示選項更新。' : '此處呈現瀏覽器展示的輸出。Python API 的完整回應包含 graph、equity_curve、metrics 與 explainability，格式收錄於本機 /docs。';
    document.getElementById('json-code').textContent = JSON.stringify(demoState.tab==='request'?request:response,null,2);
  }

  function glossaryPage(termId) {
    const selectedTerm = glossary.find(t=>t.id===termId);
    if(selectedTerm) glossaryState = {query:selectedTerm.en,chapter:'all'};
    main.innerHTML = `<section class="glossary-page"><header class="glossary-header"><div class="eyebrow">TECHNICAL GLOSSARY</div><h1>技術術語索引</h1><p>收錄本專題使用的 ${glossary.length} 個中英術語，包含定義、實作例子與相關章節。</p></header><div class="glossary-tools"><div class="search-field"><label for="term-search">搜尋中英文術語</label><div><span aria-hidden="true">⌕</span><input id="term-search" type="search" placeholder="例如 API、容器、推論…" value="${escape(glossaryState.query)}" autocomplete="off" spellcheck="false"><button id="clear-search" type="button" aria-label="清除搜尋">×</button></div></div><div class="chapter-filter"><label for="chapter-filter">依章節篩選</label><select id="chapter-filter"><option value="all">所有章節</option>${chapters.map(c=>`<option value="${c.id}" ${String(c.id)===glossaryState.chapter?'selected':''}>${number(c.id)} ${c.title}</option>`).join('')}</select></div></div><p class="glossary-result-count" id="glossary-count" role="status" aria-live="polite"></p><div id="glossary-results" class="glossary-results"></div><div class="small-callout"><b>術語與實作對照</b><p>各條目附有相關章節連結，可對照本專題的程式、資料流程與部署設定。</p></div></section>`;
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
    document.getElementById('glossary-count').textContent = `找到 ${found.length} 個術語 · 全部 ${glossary.length} 個`;
    document.getElementById('glossary-results').innerHTML = found.length ? found.map(t=>`<article class="glossary-entry" id="term-${t.id}"><header><div><h2 lang="en">${escape(t.en)}</h2><span>${escape(t.zh)}</span></div><nav aria-label="${escape(t.en)} 相關章節">${t.chapters.map(id=>`<a href="#chapter-${id}">CH ${number(id)} ↗</a>`).join('')}</nav></header><p>${escape(t.definition)}</p><div class="term-example"><span>IN THIS PROJECT</span><p>${escape(t.example)}</p></div></article>`).join('') : '<div class="empty-results"><h2>搜尋結果為 0 筆</h2><p>搜尋支援中英文關鍵字與章節篩選。</p><button type="button" id="reset-glossary">重設搜尋與篩選</button></div>';
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
      const title = chapterMatch ? `${chapters[Number(chapterMatch[1])-1].title} — ` : page==='glossary'?'中英術語索引 — ':page==='implementation'?'本機實作成果 — ':page==='reproduce'?'啟動與重現流程 — ':'';
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


