# 從零啟動：讀懂一筆合成 API 請求

這份解說使用 Windows PowerShell，沿著一筆 API 請求介紹 FastAPI、模型與 Streamlit 的分工。完整安裝、啟動及驗證步驟以 [本機重現指南](LOCAL_REPRODUCTION.md) 為主；本文提供逐步閱讀程式的補充。你不需要股票資料、API key、雲端帳號或原研究模型。

本專題是 **Synthetic Data Demo**，原始 Factor GCN 是 **NOT INTEGRATED**。合成結果是教學示例，沒有真實證券推薦或交易功能。所有步驟都在新專案資料夾完成。

## 1. 先理解終端機與瀏覽器

- **終端機 A** 執行 FastAPI。它要持續開著，才能接收請求。
- **終端機 B** 執行 Streamlit，需持續開著。
- **另一個終端機** 送出 API 請求或執行測試，不必為此關閉 A／B。
- **瀏覽器** 開啟本機網址。`127.0.0.1` 和 `localhost` 都代表你目前這台電腦；它們不是已上線的公開網站。

「終端機還沒有回到可輸入提示符號」通常代表伺服器正在運作。先不要把這個視窗關掉。

## 2. 進入專案與建立環境

先在 PowerShell 進入專案根目錄，確認看得到 `requirements.txt`、`backend`、`dashboard` 與 `web`。

```powershell
# 先將下方路徑換成你實際存放專案的位置
Set-Location -LiteralPath 'C:\你的專案路徑\graph-portfolio-engineering-guide'
Get-ChildItem
```

`Virtual Environment`（虛擬環境）為這個專案保留獨立套件。它不會替代你的作業系統，也不會建立虛擬機。本專題支援 CPython 3.12.x；新環境統一使用 `.venv-repro`。

```powershell
py -3.12 -m venv .venv-repro
.\.venv-repro\Scripts\python.exe -m pip install -r requirements.txt
```

安裝會從套件來源下載開源依賴，需要網路與磁碟空間；不需要付費 API。固定版本可降低重現差異，但不等於完成授權、安全或所有作業系統的相容性審查。套件狀態見 [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)。

已有安裝好依賴的 `.venv` 可直接沿用：略過建立與安裝，將後續命令中的 `.venv-repro` 改為 `.venv`。不要重建運作中的環境；若 `.venv-repro` 已存在，依 [本機重現指南](LOCAL_REPRODUCTION.md) 選擇另一個新目錄。直接指定環境的 Python 即可，不需變更 PowerShell 執行政策。找不到 `py -3.12` 時先備妥 CPython 3.12。

## 3. 啟動後端，認識健康檢查

只有確認 8000 未被占用時，才在終端機 A 啟動 API。若已有本專題 API，沿用它並直接進入 GET 檢查，不必另開或停止原服務：

```powershell
.\.venv-repro\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

`uvicorn` 是接收 HTTP 連線的伺服器。`backend.app.main:app` 指向 Python 模組中的 FastAPI 物件。`--host 127.0.0.1` 限定本機；`--port 8000` 是服務的數字門牌；`--no-access-log` 關閉逐筆存取日誌。

在另一個可輸入命令的終端機切換到同一個專案根目錄，再執行：

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:8000/health'
Invoke-RestMethod -Uri 'http://127.0.0.1:8000/model-info'
Invoke-RestMethod -Uri 'http://127.0.0.1:8000/scenarios'
```

`GET /health` 是最小就緒檢查。它應帶有 `status`、`version`、`data_mode: synthetic` 與 `investment_advice: false`。`/model-info` 應標示 `demo_synthetic_graph_model`、`trained_model: false`、`original_factor_gcn: NOT INTEGRATED`。這些是你應檢查的契約，實際測試記錄另見 [testing.md](testing.md)。

瀏覽器開啟 `http://127.0.0.1:8000/docs`。本專題使用自製的本機 API explorer，頁面資源不需 Swagger CDN；可檢視端點並送出合成請求。`http://127.0.0.1:8000/openapi.json` 另提供標準 OpenAPI schema。Swagger UI 是另一種常見的 OpenAPI 互動文件工具，此專題用離線可用的 explorer 取代它，避免啟動後還需載入外部 UI 資源。

## 4. 送出一筆 POST：讓模型真的執行

```powershell
$demoRequest = @{
    scenario_id = 'scenario_a'
    seed = 42
    risk_level = 'balanced'
} | ConvertTo-Json
$demoResult = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/simulate' -Method Post -ContentType 'application/json' -Body $demoRequest
$demoResult.metadata | Format-List
$demoResult.allocations | Format-Table
$demoResult.metrics | Format-List
```

`POST` 把參數放在 request body。Body 使用 JSON（程式之間共享的結構化文字），FastAPI 先用 Pydantic 驗證，再呼叫合成 pipeline。

回應分成六部分：`allocations` 是虛構資產與目標權重；`metrics` 是合成評估統計；`equity_curve` 是從 1 開始的合成曲線；`graph` 說明節點與邊；`metadata` 記錄種子、模型版本與資料邊界；`explainability` 解釋計算方式。評估日每天按相同目標權重計算，隱含每日權重重設，沒有模擬再平衡執行、周轉率與成本。

再次使用完全相同的參數，可驗證固定 seed 的重現性。改 seed 表示產生另一組合成輸入；改 `risk_level` 改變波動懲罰、溫度與集中度，不是調整個人投資偏好。比較浮點數通常要允許小量誤差；測試採用的判斷請看 `tests/`。

## 5. 看一次正確的錯誤處理

試著傳入不存在的情境：

```powershell
$invalidRequest = @{ scenario_id = 'REAL-STOCK'; seed = 42; risk_level = 'balanced' } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri 'http://127.0.0.1:8000/simulate' -Method Post -ContentType 'application/json' -Body $invalidRequest
} catch {
    Write-Output $_.Exception.Message
}
```

預期行為是 HTTP 422，表示伺服器收到請求，但資料不符 schema。這是輸入驗證正常工作，不能把它「修正」成接受真實股票代碼。API 不接收額外欄位、資料網址或檔案路徑，也不會因此讀取本機研究檔案。

## 6. 啟動 Dashboard，看前後端分工

保留 API。只有確認 8501 空閒時，才在終端機 B 啟動 Dashboard；已有適用的 Dashboard 就沿用，不重複啟動：

```powershell
$env:API_BASE_URL = 'http://127.0.0.1:8000'
.\.venv-repro\Scripts\python.exe -m streamlit run dashboard/app.py --server.address=127.0.0.1 --server.port=8501 --browser.gatherUsageStats=false
```

瀏覽器開啟 `http://127.0.0.1:8501`。選情境、seed 與風險參數，按「呼叫合成 API」，接著看配置長條圖、合成曲線、指標、圖結構與 JSON。這個按鈕送出 HTTP 請求，沒有在 Streamlit 裡重寫模型。

改變參數但還沒按按鈕時，原結果應標示為「上一次成功結果」。API 離線或新請求失敗時，介面應提示錯誤，不能把舊圖當成新成功結果。這些失敗情境由隔離測試驗證；不要為了本解說關閉既有 API。

此介面只適合本機。不要把 host 改為所有網路介面，也不要使用 tunnel 或公開轉發。

## 7. 讀程式時跟著一條線走

```text
dashboard/app.py                    選控制項 → 組 JSON → HTTP → 圖表
backend/app/main.py                 FastAPI app 與路由入口
backend/app/schemas.py              允許什麼輸入、承諾什麼輸出
backend/app/routes.py               哪個 URL 呼叫哪個服務
backend/app/services/               協調模型服務流程
demo/synthetic_data.py             由 seed 產生合成資料
demo/graph_demo_model.py            建圖 → 訊號混合 → 權重 → 獨立區段評估
tests/                             驗證數值、契約與邊界
```

先看 `schemas.py`，你會知道資料長什麼樣；再看路由與服務，最後才深入模型公式。數學與視覺流程見 [architecture.md](architecture.md)。名稱相近的「Graph」不代表這個小模型就是原始 Factor GCN；請看 `/model-info` 的身分欄位。

## 8. 把測試當成可重現的證據

在另一個終端機執行驗證，不必停止現有 API 或 Streamlit。完整網站結構檢查另需 Node.js；先以 `node --version` 確認可用，再執行：

```powershell
.\.venv-repro\Scripts\python.exe scripts/verify.py
```

`verify.py` 執行 Python 測試、相依一致性及可用時的 JavaScript／網站檢查，保存實際輸出與來源指紋，並為測試使用獨立暫存目錄。它會更新最新證據，執行前先確認需要保留的歷史快照已另存。沒有 Node 時，相關檢查會標示未執行，不能宣稱完整重現網站檢查。

測試涵蓋固定 seed、合法權重、時間切分、API 身分與錯誤邊界。`TestClient` 可在程式內呼叫 FastAPI；HTTP 與容器 runtime 則是不同驗證層次。實作成果頁的更新順序為 `capture_local_proof.py` → `prepare_web_proof.py` → `verify.py`，詳細前提與命令見 [本機重現指南](LOCAL_REPRODUCTION.md)。

命令印出的結果才是本次證據。請以 [testing.md](testing.md) 的版本、時間與原始輸出判斷實際已完成狀態，不把文章中的驗收期望當成成功紀錄。

## 9. Docker：把環境和程式一起包裝

Docker Image 是建立好的執行環境；Container 是執行中的實例；Compose 以一份設定協調 API 與 Dashboard。容器共享主機核心，不能稱為完整虛擬機。

主要入口是 portable verifier。先自行備妥適用的 Docker Engine 與 Compose v2，再於專案根目錄執行：

```powershell
.\.venv-repro\Scripts\python.exe scripts/verify_docker.py
```

它採獨立 Compose project、動態 loopback host ports 及資源歸屬標記，只清理自己當次建立的資源，不需要先停止原生 API／Streamlit。報告保存於 `docs/evidence/docker-runtime.json`；退出碼 0 表示自動檢查通過，1 表示失敗，2 表示缺少 Docker CLI。缺少 Docker 時保持 **NOT RUN**，不自動安裝，也不代表容器驗證成功。完整說明見 [本機重現指南](LOCAL_REPRODUCTION.md)。

自動檢查包含 build、服務 health 及合成推論；容器內 Dashboard 表單與圖表仍需實際操作驗收。設定或建置通過不能代替全部 runtime 證據。

### 補充：固定埠的手動 Compose

這是閱讀 Compose 分工的補充，不是一般重現的預設流程。原設定使用 8000／8501；若任一埠已被占用，略過此流程並使用上方動態埠 verifier，不要為此停止既有背景服務。

先唯讀確認埠與預定 project 的資源：

```powershell
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -in 8000, 8501 } |
    Select-Object LocalAddress, LocalPort, OwningProcess
$manualProject = 'graph-guide-manual-local'
docker ps -a --filter "label=com.docker.compose.project=$manualProject"
docker network ls --filter "label=com.docker.compose.project=$manualProject"
```

只有兩個埠都空閒，而且該 project 沒有既有 container／network 時，才建立這一組資源。若名稱已有資源，保留原狀，選擇未使用的新名稱並重新核對；不能因名稱相似就推定屬於自己。

```powershell
docker compose -p $manualProject -f compose.yaml config --quiet
docker compose -p $manualProject -f compose.yaml up --build --wait
docker compose -p $manualProject -f compose.yaml ps
Invoke-RestMethod -Uri 'http://127.0.0.1:8000/health'
```

Dashboard 容器使用 `http://api:8000` 找 API；瀏覽器使用 `http://127.0.0.1:8501`。`api` 是 Compose 網路中的服務名稱。第一次建置可能下載公開映像與套件。

結束後，在保有相同 `$manualProject` 值的終端，只清理自己上述步驟建立的這一組資源：

```powershell
docker compose -p $manualProject -f compose.yaml down
```

不要對不明 project 執行清理，也不使用全域 prune 或停止所有容器。手動 Compose host ports 仍應只綁定 `127.0.0.1`；缺少引擎、daemon 未就緒或下載失敗時，記錄失敗或未執行原因，不編造成功畫面。

## 10. 靜態教學網站與停止服務

專題網站是 `web/` 裡的 HTML/CSS/JavaScript，不需要 FastAPI。已有 8080 網站就沿用；只有確認該埠空閒時，才從專案根目錄另開終端啟動：

```powershell
.\.venv-repro\Scripts\python.exe scripts/serve_web.py
```

開啟 `http://127.0.0.1:8080`，瀏覽章節、術語與 Playground。這個 Playground 使用瀏覽器內的合成示意計算，沒有送出 Python 模型推論請求。

只停止自己這次建立的服務：原生伺服器回到各自啟動終端按 `Ctrl+C`；launcher 只清理其自建程序樹；portable verifier 會清理其自建 Compose project。沿用的既有服務保持原狀。手動 Compose 的清理須帶相同、已確認歸屬的 project 名稱，不能使用未指定 project 的通用清理命令。

要公開網站、開源程式或整合原研究前，先完成 [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)。目前流程停在人工審核，不包含上傳、push 或付費部署。

## 常見問題

| 現象 | 先檢查 | 代表什麼 |
|---|---|---|
| 連線被拒絕 | API 終端機是否還在運作、port 是否一致 | HTTP 服務沒啟動或位址不同 |
| `ModuleNotFoundError` | 是否使用選定的 `.venv-repro`／既有 `.venv`、是否安裝 requirements | 目前環境缺依賴 |
| port 已被使用 | 是否重複啟動原生與 Docker 服務 | 同一門牌已有人監聽 |
| HTTP 422 | 情境、seed 型別、risk_level、額外欄位 | schema 拒絕不符合契約的輸入 |
| 改參數但圖沒變 | 是否按「呼叫合成 API」 | 舊結果會有明確標籤 |
| Docker 找不到命令或 daemon | 本機 Docker 安裝與啟動狀態 | 目前無法驗證容器執行 |
| 同 seed 不同環境有微小差異 | Python、NumPy、平台與版本 | 固定 seed 不是跨平台位元一致保證 |
