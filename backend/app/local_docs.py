"""Self-contained educational API explorer; no Swagger/Redoc CDN or dependencies.

This is a small authored UI, not Swagger UI. It consumes the same typed OpenAPI
schema and API routes as other clients. Data is always rendered as text, never
interpreted as HTML. Its only network calls are fixed same-origin endpoints.
"""

LOCAL_DOCS_HTML = r"""<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="referrer" content="no-referrer">
  <title>本機 API Explorer · Synthetic Graph Engineering</title>
  <style>
    :root { color-scheme: light; font: 16px/1.65 system-ui, sans-serif; color: #153b35; background: #f4f5ee; }
    * { box-sizing: border-box; }
    body { margin: 0; }
    main { max-width: 1040px; margin: auto; padding: 36px 24px; }
    h1 { line-height: 1.25; font-size: clamp(1.7rem, 4vw, 2.6rem); margin: 12px 0; }
    h2 { font-size: 1.2rem; margin-top: 0; }
    .eyebrow { text-transform: uppercase; letter-spacing: .1em; font-size: .8rem; font-weight: 700; }
    .notice { padding: 14px 18px; border-left: 4px solid #317e67; background: #e6eee1; }
    .panel { background: #fff; border: 1px solid #cbd8cd; border-radius: 12px; padding: 22px; margin-top: 24px; }
    .buttons, .controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; }
    label { display: grid; gap: 5px; flex: 1 1 160px; }
    select, input, button { font: inherit; border-radius: 6px; border: 1px solid #829b8c; padding: 9px 12px; }
    select, input { min-width: 0; width: 100%; color: #153b35; background: white; }
    button { color: white; background: #195244; cursor: pointer; }
    button:hover { background: #103d32; }
    button:disabled { opacity: .55; cursor: wait; }
    button:focus-visible, select:focus-visible, input:focus-visible, a:focus-visible { outline: 3px solid #9c6422; outline-offset: 3px; }
    a { color: #195244; text-underline-offset: 3px; }
    .hint { color: #465f53; font-size: .92rem; }
    code { overflow-wrap: anywhere; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #102c28; color: #e0eee8; padding: 16px; border-radius: 7px; max-height: 560px; overflow: auto; font: .85rem/1.6 ui-monospace, monospace; }
    #status { min-height: 1.7em; font-weight: 600; }
    details summary { cursor: pointer; font-weight: 600; }
  </style>
</head>
<body>
<main>
  <div class="eyebrow">Local educational API explorer · Offline assets</div>
  <h1>看懂一筆真正的 API 請求</h1>
  <p>這是本專題自製的本機互動文件，不是 Swagger UI。HTML、樣式與程式都由目前的 API 提供，不載入外部字型、CDN 或分析工具。</p>
  <p class="notice"><strong>Synthetic Data Demo · No Real Securities</strong><br>所有資料均為合成示例；不提供投資建議。原始 Factor GCN：NOT INTEGRATED。請保持服務僅對本機開放。</p>
  <p><a href="/openapi.json">開啟機器可讀的 OpenAPI 規格</a>。這份規格描述正式 request / response schemas；下方操作會真正執行目前的本機服務。</p>

  <section class="panel" aria-labelledby="read-title">
    <h2 id="read-title">1. GET：先了解服務與資料契約</h2>
    <div class="buttons">
      <button type="button" data-endpoint="/health">GET /health</button>
      <button type="button" data-endpoint="/model-info">GET /model-info</button>
      <button type="button" data-endpoint="/scenarios">GET /scenarios</button>
      <button type="button" data-endpoint="/openapi.json">GET /openapi.json</button>
    </div>
    <p class="hint">Health 是就緒狀態；model-info 說明固定規則圖模型；scenarios 列出允許參數。200 代表請求成功，不能證明金融模型有效性。</p>
  </section>

  <section class="panel" aria-labelledby="simulate-title">
    <h2 id="simulate-title">2. POST /simulate：送出合成參數</h2>
    <form id="simulate-form">
      <div class="controls">
        <label for="scenario">情境 scenario_id
          <select id="scenario" name="scenario_id">
            <option value="scenario_a">Scenario A — 平穩群聚</option>
            <option value="scenario_b">Scenario B — 情境轉換</option>
            <option value="scenario_c">Scenario C — 分散連結</option>
          </select>
        </label>
        <label for="seed">種子 seed
          <input id="seed" name="seed" type="number" min="0" max="2147483647" step="1" value="42" required>
        </label>
        <label for="risk">運算參數 risk_level
          <select id="risk" name="risk_level">
            <option value="low">low</option>
            <option value="balanced" selected>balanced</option>
            <option value="high">high</option>
          </select>
        </label>
        <button id="simulate-button" type="submit">送出合成請求</button>
      </div>
    </form>
    <p class="hint">前 120 個合成日決定圖、特徵與權重；後 60 日只評估。每天套用同一組目標權重（隱含每日重設）；未模擬交易／再平衡執行、周轉與成本。風險標籤會改變公式參數，不能保證實現風險順序。</p>
  </section>

  <section class="panel" aria-labelledby="result-title">
    <h2 id="result-title">3. 對照 HTTP 與 JSON</h2>
    <p id="status" role="status" aria-live="polite">選擇 GET 端點，或送出 POST 請求。</p>
    <h3>Request</h3>
    <pre id="request-output">尚未送出請求。</pre>
    <h3>Response</h3>
    <pre id="response-output">尚未收到回應。</pre>
    <details>
      <summary>回應欄位與錯誤怎麼讀？</summary>
      <p><code>allocations</code> 是虛構資產權重；<code>metrics</code> 是合成統計；<code>equity_curve</code> 起點為 1；<code>graph</code> 呈現關係；<code>metadata</code> 包含 synthetic 身分；<code>explainability</code> 說明公式。</p>
      <p>報酬、波動、回落都是小數比例，0.1 代表 10%；Sharpe 是無單位比值。HTTP 422 表示輸入不符契約；500 表示非預期內部失敗。API 不接受 ticker、網址、路徑或額外欄位。</p>
    </details>
  </section>
</main>
<script>
"use strict";
const allowedEndpoints = new Set(["/health", "/model-info", "/scenarios", "/openapi.json", "/simulate"]);
const statusOutput = document.getElementById("status");
const requestOutput = document.getElementById("request-output");
const responseOutput = document.getElementById("response-output");
let requestSequence = 0;

async function runRequest(endpoint, payload, button) {
  if (!allowedEndpoints.has(endpoint)) return;
  const sequence = ++requestSequence;
  const method = payload === undefined ? "GET" : "POST";
  requestOutput.textContent = method + " " + endpoint + (payload === undefined ? "" : "\nContent-Type: application/json\n\n" + JSON.stringify(payload, null, 2));
  responseOutput.textContent = "等待回應…";
  statusOutput.textContent = "正在呼叫目前的本機服務…";
  button.disabled = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(endpoint, {
      method,
      headers: {"Accept": "application/json", ...(payload === undefined ? {} : {"Content-Type": "application/json"})},
      ...(payload === undefined ? {} : {body: JSON.stringify(payload)}),
      credentials: "omit", redirect: "error", cache: "no-store", signal: controller.signal
    });
    const result = await response.json();
    // Older requests must not overwrite a more recent result.
    if (sequence !== requestSequence) return;
    statusOutput.textContent = "HTTP " + response.status + (response.ok ? " · 請求完成（合成教學）" : " · 請求未成功，請檢查下方回應");
    responseOutput.textContent = JSON.stringify(result, null, 2);
  } catch (error) {
    if (sequence !== requestSequence) return;
    statusOutput.textContent = "未收到有效回應。";
    responseOutput.textContent = error.name === "AbortError" ? "等待超過 8 秒；請確認本機 API 狀態。" : "連線或 JSON 解析失敗；請確認目前的本機 API 是否仍在執行。";
  } finally {
    clearTimeout(timeout);
    button.disabled = false;
  }
}

document.querySelectorAll("button[data-endpoint]").forEach((button) => {
  button.addEventListener("click", () => runRequest(button.dataset.endpoint, undefined, button));
});
document.getElementById("simulate-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const seed = document.getElementById("seed").valueAsNumber;
  if (!Number.isInteger(seed) || seed < 0 || seed > 2147483647) {
    statusOutput.textContent = "seed 必須是 0 到 2147483647 的整數。";
    return;
  }
  const payload = {
    scenario_id: document.getElementById("scenario").value,
    seed,
    risk_level: document.getElementById("risk").value
  };
  runRequest("/simulate", payload, document.getElementById("simulate-button"));
});
</script>
</body>
</html>"""
