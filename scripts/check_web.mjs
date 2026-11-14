#!/usr/bin/env node
/** Offline structural checks, not a substitute for browser layout/accessibility QA. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const web = path.join(root, 'web');
const html = fs.readFileSync(path.join(web, 'index.html'), 'utf8');
const content = fs.readFileSync(path.join(web, 'scripts', 'content.js'), 'utf8');
const app = fs.readFileSync(path.join(web, 'scripts', 'app.js'), 'utf8');
const implementation = fs.readFileSync(path.join(web, 'scripts', 'implementation.js'), 'utf8');
const browserCode = app + implementation;
const css = fs.readFileSync(path.join(web, 'styles', 'site.css'), 'utf8');
let passed = 0;
const failures = [];
function check(name, condition) {
  if (condition) { passed += 1; console.log(`PASS ${name}`); }
  else { failures.push(name); console.error(`FAIL ${name}`); }
}

for (const [name, source] of [['content.js', content], ['app.js', app], ['implementation.js', implementation]]) {
  try { new vm.Script(source, { filename: name }); check(`${name}: valid JavaScript`, true); }
  catch (error) { check(`${name}: valid JavaScript (${error.message})`, false); }
}
const context = vm.createContext({ window: {} });
vm.runInContext(content, context, { timeout: 1000, filename: 'content.js' });
const chapters = context.window.GUIDE_CHAPTERS;
const terms = context.window.GUIDE_GLOSSARY;
check('nine chapters with consecutive unique IDs', Array.isArray(chapters) && chapters.length === 9 && chapters.every((c, i) => c.id === i + 1));
check('every chapter includes six teaching sections', chapters.every(c => ['why', 'what', 'how', 'code', 'mistakes', 'built'].every(key => Array.isArray(c[key]) ? c[key].length > 0 : typeof c[key] === 'string' && c[key].length > 20)));
check('every chapter includes examples, file references and takeaway', chapters.every(c => c.explanation && c.files.length && c.takeaway && c.title && c.en));
check('at least 45 bilingual defined glossary terms', Array.isArray(terms) && terms.length >= 45 && terms.every(t => t.id && t.en && t.zh && t.definition.length > 10 && t.example.length > 10));
check('glossary IDs are unique safe anchors', new Set(terms.map(t => t.id)).size === terms.length && terms.every(t => /^[a-z][a-z0-9-]*$/.test(t.id)));
check('every glossary chapter reference exists', terms.every(t => t.chapters.length > 0 && t.chapters.every(id => chapters.some(c => c.id === id))));
const references = [...content.matchAll(/\[\[([^|]+)\|([^\]]+)\]\]/g)].map(match => match[1]);
check('all inline term references resolve to glossary', references.length > 20 && references.every(id => terms.some(t => t.id === id)));

const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => match[1]).filter(value => !value.startsWith('#') && !value.startsWith('?') && !/^https?:/.test(value));
check('all HTML local assets exist within web/', assets.length >= 5 && assets.every(asset => {
  const resolved = path.resolve(web, asset.split(/[?#]/)[0]);
  return resolved.startsWith(web + path.sep) && fs.existsSync(resolved) && fs.statSync(resolved).isFile();
}));
check('no external script, stylesheet, image or font assets', !/<(?:script|link|img)[^>]+(?:src|href)="(?:https?:)?\/\//i.test(html) && !/@import\b|url\(\s*["']?https?:/i.test(css));
const externalLinks = [...html.matchAll(/href="(https?:[^\"]+)"/g)].map(match => match[1]);
check('only the user research and profile websites are externally linked', externalLinks.every(url => ['https://rozias0925.github.io/FY26-Graph-Portfolio/', 'https://rozias0925.github.io/Rozias-Website/'].includes(url)));
check('no browser network data APIs', !/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(|\bnew\s+(?:XMLHttpRequest|WebSocket|EventSource)\b|navigator\s*\.\s*sendBeacon/i.test(browserCode));
check('no browser persistence, tracking or cookie APIs', !/\b(?:localStorage|sessionStorage|indexedDB|serviceWorker)\b|document\s*\.\s*cookie|\b(?:gtag|ga|fbq)\s*\(/i.test(browserCode));
check('no remote navigation or dynamic script injection in app', !/location\s*\.\s*(?:href|assign|replace)\s*(?:=|\()|createElement\s*\(\s*['"]script/i.test(app));
check('accessible shell: language, skip link, landmarks and compact navigation', /<html lang="zh-Hant">/.test(html) && /class="skip-link" href="#main"/.test(html) && /<main id="main"/.test(html) && /<nav class="page-directory" aria-label="頁面導覽">/.test(html) && /aria-controls="directory-panel"/.test(html) && /id="directory-panel" hidden/.test(html));
check('homepage includes exact bilingual educational notices', app.includes('本網站為個人學習、學術交流及軟體工程展示專案。') && app.includes('Educational and Technical Demonstration Only.') && app.includes('Illustrative results do not represent live or historical investment performance.'));
check('playground explicitly distinguishes browser illustration from API', app.includes("source:'browser_illustration'") && app.includes('python_api_called:false') && app.includes('NOT INTEGRATED') && app.includes('Illustrative Results · No Real Securities'));
check('playground offers three scenarios and keyboard-operable JSON tabs', ['scenario_a', 'scenario_b', 'scenario_c'].every(id => app.includes(`data-scenario="${id}"`)) && app.includes("event.key==='ArrowRight'") && app.includes('role="tablist"'));
check('responsive and reduced-motion styles exist', css.includes('@media(max-width:700px)') && css.includes('@media(prefers-reduced-motion:reduce)') && css.includes(':focus-visible'));
check('static evidence marks pending records and dates execution snapshots', app.includes('驗證紀錄待產生。') && app.includes('狀態對應所列時間與版本') && app.includes('evidence.generated_at'));

const proofContext = vm.createContext({window:{}});
vm.runInContext(fs.readFileSync(path.join(web,'assets','implementation.js'),'utf8'),proofContext,{timeout:1000});
const proof = proofContext.window.LOCAL_IMPLEMENTATION;
const http = JSON.parse(fs.readFileSync(path.join(root,'docs','evidence','local-http.json'),'utf8'));
check('saved Python request/response match real HTTP record', proof.http_status===200 && proof.captured_at===http.captured_at && JSON.stringify(proof.request)===JSON.stringify(http.responses.scenario_a.request) && JSON.stringify(proof.response)===JSON.stringify(http.responses.scenario_a.body));
check('saved proof preserves synthetic scope and API identity', proof.source==='saved_local_python_http' && proof.live_api_connected===false && proof.original_factor_gcn==='NOT INTEGRATED' && proof.response.metadata.data_mode==='synthetic' && proof.response.metadata.investment_advice===false && proof.response.metadata.model_version);
const digest = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
check('selected source snapshots match the current source hashes', Object.keys(proof.sources).length>=10 && Object.entries(proof.sources).every(([name,entry])=> {
  const source=path.resolve(root,name), target=path.resolve(web,entry.href);
  return source.startsWith(path.resolve(root)+path.sep) && target.startsWith(web+path.sep) && fs.existsSync(source) && fs.existsSync(target) && digest(source)===entry.sha256 && digest(target)===entry.sha256;
}));
check('static screenshots and complete JSON files exist', ['dashboard.jpg','api-explorer.jpg','request.json','response.json','record.json'].every(name=>fs.existsSync(path.join(web,'assets','implementation',name))) && JSON.stringify(JSON.parse(fs.readFileSync(path.join(web,'assets','implementation','response.json'),'utf8')))===JSON.stringify(proof.response));
const dockerReceipt = JSON.parse(fs.readFileSync(path.join(web,'assets','implementation','docker-verification.json'),'utf8'));
const dockerExecution = JSON.parse(fs.readFileSync(path.join(root,'docs','evidence','docker-runtime-20261113.json'),'utf8'));
const dockerUi = JSON.parse(fs.readFileSync(path.join(root,'docs','evidence','docker-dashboard-ui-20261113.json'),'utf8'));
const dockerHttp = JSON.parse(fs.readFileSync(path.join(root,'docs','evidence','docker-http-20261113.json'),'utf8'));
check('published Docker receipt matches independently saved execution and scope', JSON.stringify(dockerReceipt)===JSON.stringify(proof.docker) && dockerReceipt.status===dockerExecution.status && dockerReceipt.verified_at===dockerExecution.captured_at && dockerReceipt.http_checks===dockerHttp.checks.length && dockerReceipt.ui_checks===dockerUi.checks.length && dockerReceipt.cleanup==='passed' && dockerReceipt.engine_stop==='passed' && dockerReceipt.original_factor_gcn==='NOT INTEGRATED' && dockerReceipt.data_mode==='synthetic' && dockerReceipt.investment_advice===false);
check('Docker gallery preserves original screenshots and excludes private runtime logs', ['docker-dashboard-20261113.jpg','docker-dashboard-metadata-20261113.jpg'].every(name=>digest(path.join(web,'assets','implementation',name))===digest(path.join(root,'docs','evidence',name))) && !/(?:[A-Z]:\\|\.runtime[\\/]|"(?:token|actual_commands|container_id|recovery)")/i.test(JSON.stringify(dockerReceipt)));
check('implementation and reproduction routes are reachable from directory', ['implementation','reproduce'].every(page=>html.includes(`href="#${page}"`) && app.includes(`page==='${page}'`) && app.includes(`id:'${page}'`)));
check('reproduction includes startup, test, shutdown and missing-Docker scope', ['scripts/run_local.py','scripts/verify.py','scripts/prepare_web_proof.py','scripts/verify_docker.py','Ctrl','NOT RUN'].every(text=>implementation.includes(text)));
check('reproduction lists Node.js and distinguishes skipped website verification', ['Node.js','node --version','not_run','退出碼 0'].every(text=>implementation.includes(text)));
const lawLinks=[...app.matchAll(/href="(https:\/\/law\.moj\.gov\.tw[^\"]+)"/g)].map(match=>match[1].replaceAll('&amp;','&'));
check('law references use the two official article pages', lawLinks.length===2 && ['4','107'].every(article=>lawLinks.includes(`https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=G0400121&flno=${article}`)));

const englishContent = fs.readFileSync(path.join(web, 'scripts/content.en.js'), 'utf8');
const englishApp = fs.readFileSync(path.join(web, 'scripts/app.en.js'), 'utf8');
const englishImplementation = fs.readFileSync(path.join(web, 'scripts/implementation.en.js'), 'utf8');
const language = fs.readFileSync(path.join(web, 'scripts/language.js'), 'utf8');
for (const [name, source] of [['content.en.js', englishContent], ['app.en.js', englishApp], ['implementation.en.js', englishImplementation], ['language.js', language]]) {
  try { new vm.Script(source, {filename:name}); check(`${name}: valid JavaScript`, true); }
  catch { check(`${name}: valid JavaScript`, false); }
}
vm.runInContext(englishContent, context, {timeout:1000, filename:'content.en.js'});
const englishChapters = context.window.GUIDE_CHAPTERS_EN;
const englishTerms = context.window.GUIDE_GLOSSARY_EN;
const hasHan = value => /\p{Script=Han}/u.test(String(value));
check('English chapters preserve all routes, files and complete translated teaching fields', englishChapters?.length===chapters.length && englishChapters.every((c,i)=>c.id===chapters[i].id && JSON.stringify(c.files)===JSON.stringify(chapters[i].files) && ['title','summary','why','what','how','codeLabel','explanation','built','takeaway'].every(key=>typeof c[key]==='string' && c[key].length>0 && !hasHan(c[key])) && c.mistakes.length===chapters[i].mistakes.length && c.mistakes.every(m=>!hasHan(m))));
check('English glossary preserves all bilingual term IDs and translates definitions and examples', englishTerms?.length===terms.length && englishTerms.every((t,i)=>t.id===terms[i].id && t.zh===terms[i].zh && JSON.stringify(t.chapters)===JSON.stringify(terms[i].chapters) && t.definition.length>10 && t.example.length>10 && !hasHan(t.definition) && !hasHan(t.example)));
const englishReferences = [...JSON.stringify(englishChapters).matchAll(/\[\[([^|]+)\|([^\]]+)\]\]/g)].map(m=>m[1]);
check('English inline glossary links resolve to the shared bilingual term IDs', englishReferences.length>20 && englishReferences.every(id=>englishTerms.some(t=>t.id===id)));
check('language control appears immediately before Researcher Profile', /class="header-actions">\s*<a class="language-toggle"[^>]*id="language-toggle"[^>]*>[\s\S]*?<\/a>\s*<a class="profile-link"/.test(html));
const scriptOrder = [...html.matchAll(/<script[^>]+src="([^"?]+)(?:\?[^\"]*)?"/g)].map(m=>m[1]);
check('locale initialization and both content sets load before their renderers', scriptOrder.indexOf('scripts/language.js')<scriptOrder.indexOf('scripts/app.js') && scriptOrder.indexOf('scripts/content.js')<scriptOrder.indexOf('scripts/content.en.js') && scriptOrder.indexOf('scripts/content.en.js')<scriptOrder.indexOf('scripts/app.en.js') && scriptOrder.indexOf('scripts/implementation.en.js')<scriptOrder.indexOf('scripts/app.en.js'));
let inactiveRenderersSafe = true;
for(const [source,lang] of [[app,'en'],[implementation,'en'],[englishApp,'zh'],[englishImplementation,'zh']]) {
  try { vm.runInNewContext(source,{window:{GUIDE_LANGUAGE:lang}},{timeout:1000}); }
  catch { inactiveRenderersSafe=false; }
}
check('inactive language renderers leave the DOM and event handlers untouched', inactiveRenderersSafe);
const computation = source => source.slice(source.indexOf('  function syntheticBrowserModel()'),source.indexOf('  function bindPlayground()'));
check('English and Chinese browser demonstrations use identical computation', computation(app)===computation(englishApp));
let languageRoutesSafe = true;
for(const [href,expectedLanguage] of [['https://example.invalid/project/web/index.html?x=1&lang=en#chapter-5/built','en'],['file:///C:/project/web/index.html?lang=zh#glossary/api','zh'],['https://example.invalid/project/?lang=unsupported#reproduce/docker','zh']]) {
  const nodes=new Map(), events={};
  const node=key=>{if(!nodes.has(key))nodes.set(key,{textContent:'',firstChild:{textContent:''},setAttribute(name,value){this[name]=value;}});return nodes.get(key);};
  const fakeWindow={location:{href},addEventListener(name,callback){events[name]=callback;}};
  const fakeDocument={documentElement:{},getElementById:node,querySelector:node};
  vm.runInNewContext(language,{window:fakeWindow,document:fakeDocument,URL},{timeout:1000});
  const before=new URL(href), after=new URL(node('language-toggle').href);
  languageRoutesSafe &&= fakeWindow.GUIDE_LANGUAGE===expectedLanguage && fakeDocument.documentElement.lang===(expectedLanguage==='en'?'en':'zh-Hant') && after.pathname===before.pathname && after.hash===before.hash && after.searchParams.get('lang')===(expectedLanguage==='en'?'zh':'en') && after.searchParams.get('x')===before.searchParams.get('x');
  fakeWindow.location.href=href.replace(/#.*/, '#chapter-8/example'); events.hashchange();
  languageRoutesSafe &&= new URL(node('language-toggle').href).hash==='#chapter-8/example';
}
check('language switching preserves routes, anchors and unrelated query parameters without storage', languageRoutesSafe);
check('English runtime and language control add no network, tracking or persistent data APIs', !/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(|\b(?:localStorage|sessionStorage|indexedDB|serviceWorker)\b|document\s*\.\s*cookie|navigator\s*\.\s*sendBeacon/i.test(englishApp+englishImplementation+language));
check('English guide preserves synthetic scope and dated original execution evidence', englishApp.includes('NOT INTEGRATED') && englishApp.includes('python_api_called:false') && englishApp.includes('Educational and Technical Demonstration Only.') && englishImplementation.includes('original interface language') && englishImplementation.includes('2026-11-13'));

console.log(`\nWeb checks: ${passed} passed, ${failures.length} failed. Chapters: ${chapters.length}; glossary: ${terms.length}; inline glossary references: ${references.length}.`);
console.log('Scope: offline structural/content checks. Browser behavior, layout and true API execution require separate verification.');
if (failures.length) process.exitCode = 1;
