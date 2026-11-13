# Windows 本機重現指南

本指南適用於專案根目錄的 CPython 3.12 環境，說明如何閱讀網站、建立隔離環境、操作 API、執行測試及分辨不同驗證證據。這些是重現指令，不代表執行指南就已取得當前版本的成功結果。

## 1. 先確認既有服務

若網站、API 或 Dashboard 已經由其他終端開啟，直接使用：

| 服務 | 本機位置 | 用途 |
| --- | --- | --- |
| 靜態專題網站 | `http://127.0.0.1:8080/` | 專題紀錄、術語、瀏覽器合成展示 |
| 本機實作成果頁 | `http://127.0.0.1:8080/#implementation` | 來源摘錄、API 回應與驗證紀錄 |
| 網站重現流程頁 | `http://127.0.0.1:8080/#reproduce` | 啟動、停止及重現步驟 |
| API 操作文件 | `http://127.0.0.1:8000/docs` | 真正的 Python 合成推論 |
| Streamlit | `http://127.0.0.1:8501/` | 透過 HTTP 操作 API |

可用以下唯讀命令觀察固定埠；它不會停止任何程序：

```powershell
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Where-Object { $_.LocalPort -in 8000, 8501, 8080 } |
    Select-Object LocalAddress, LocalPort, OwningProcess
```

`run_local.py` 需要三個固定埠都可用。如果任何埠已佔用，它會在建立服務之前退出，不會接管或清除原 listener。不要使用 `taskkill /IM python.exe`、廣泛的 `Stop-Process` 或依埠號直接終止來源不明的服務。已知屬於自己的舊服務，也應從原啟動終端正常停止，而不是為了跑一次測試任意清理。

## 2. 建立乾淨 Python 環境

先自行備妥 CPython 3.12.x、PowerShell 及可讀取專案的目錄；網站結構檢查另需 Node.js。Windows 原生基準為 CPython 3.12.14；2026-11-13 的 Linux 容器實測為 CPython 3.12.16，兩種環境分別保存證據。

在專案根目錄執行：

```powershell
py -3.12 --version
py -3.12 -m venv .venv-repro
.\.venv-repro\Scripts\python.exe -m pip install -r requirements.txt
.\.venv-repro\Scripts\python.exe -m pip check
```

`.venv-repro` 是新的重現環境，不要拿它覆寫或刪除正在使用的 `.venv`。若該名稱已存在，改用另一個清楚命名的全新環境；不要先遞迴刪除不明目錄。所有指令都直接指定 Python 路徑，不需要執行 activation script 或改變 PowerShell 執行政策。

`requirements.txt` 固定直接與遞迴相依版本，但沒有下載 hash；套件取得仍需要套件來源可連線。安裝失敗時保留錯誤與環境紀錄，不能跳過失敗後仍宣稱乾淨環境重現成功。

若只閱讀網站，可直接開 `web/index.html`，省略 Python 安裝。瀏覽器合成 Demo 不會呼叫本機 API。

## 3. 啟動與停止自己建立的服務

確認固定埠可用後，在專案根目錄執行：

```powershell
.\.venv-repro\Scripts\python.exe scripts/run_local.py
```

出現三個 `READY` 後再開啟網址。這個 launcher 使用執行它的同一個 Python，依序監看 API、Dashboard 及網站是否就緒。

在同一個終端按 **Ctrl+C**，launcher 只清理自己建立的程序樹。它不能代替其他啟動終端或其他工具管理的服務。若手動分別啟動服務，則各自回到原終端按 Ctrl+C。

需要分開觀察輸出時，可在三個終端各執行一個命令：

```powershell
.\.venv-repro\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --no-access-log
```

```powershell
.\.venv-repro\Scripts\python.exe -m streamlit run dashboard/app.py --server.address=127.0.0.1 --server.port=8501 --browser.gatherUsageStats=false
```

```powershell
.\.venv-repro\Scripts\python.exe scripts/serve_web.py
```

上列方式不能與已運作的相同固定埠服務並行。修改靜態網站後通常只需重新載入；修改 Python 程式則須在允許停止自己服務的時機重新啟動，才能保證回應來自新程式。本輪工作保留既有背景服務，沒有以重新驗證為由停止它們。

## 4. 核對 API 與 Dashboard

API 運作時，從另一個 PowerShell 終端執行：

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:8000/model-info
Invoke-RestMethod http://127.0.0.1:8000/scenarios
$requestBody = @{scenario_id='scenario_a'; seed=42; risk_level='balanced'} | ConvertTo-Json
$result = Invoke-RestMethod http://127.0.0.1:8000/simulate -Method Post -ContentType 'application/json' -Body $requestBody
$result.metadata
$result.allocations
```

核對 `metadata.data_mode` 是 `synthetic`、`investment_advice` 是 `false`，權重非負且總和約為 1。這證明本機 Python 合成流程有回應，不能證明原 Factor GCN 已整合，也不是金融績效驗證。

接著在 Dashboard 選擇情境並按呼叫按鈕，核對六個合成節點、權重、曲線及來源資訊。Dashboard 應只透過 HTTP 消費 API，不能把瀏覽器 Playground 的示意輸出當作 API 成果。

## 5. 執行測試及產生新證據

只跑測試、保留終端輸出：

```powershell
.\.venv-repro\Scripts\python.exe -m pytest -q
node scripts/check_web.mjs
```

產生最新整合證據與依賴 metadata：

```powershell
.\.venv-repro\Scripts\python.exe scripts/verify.py
.\.venv-repro\Scripts\python.exe scripts/dependency_report.py
```

若要更新實作成果頁，且三個既有服務已就緒，依下列順序執行，不必重新啟動服務：

```powershell
.\.venv-repro\Scripts\python.exe scripts/capture_local_proof.py
.\.venv-repro\Scripts\python.exe scripts/prepare_web_proof.py
.\.venv-repro\Scripts\python.exe scripts/verify.py
```

`prepare_web_proof.py` 本身不發送 HTTP，只從保存的合成 HTTP 紀錄匯出 request／response、明列的來源 allowlist 與既有畫面，寫入 `web/assets/implementation/` 及 `web/assets/implementation.js`。來源副本附 SHA256；HTTP capture 時間、匯出時間及截圖日期分別記錄。2026-10-18 的原生操作圖片與 2026-11-13 的容器 Dashboard 圖片分開保存，重新匯出沿用各自原始操作日期。

`verify.py` 會更新 `docs/evidence/verification.json`、來源 manifest、套件版本及各項原始輸出，並同步網站證據。它不是唯讀命令；比較新舊結果時，先確認歷史證據已保存。2026-10-18 的版本保存在 `docs/evidence/history/20261018/`，不能用新的執行輸出覆蓋後仍稱為原始歷史紀錄。

網站結構檢查不等於瀏覽器排版檢查；pytest 的容器政策或 Docker verifier 單元測試也不等於 Docker runtime。若需記錄已啟動服務的真實 HTTP 回應，可執行 `scripts/capture_local_proof.py`；它寫入 `docs/evidence/local-http.json`，不會啟動或停止服務。

`run_local.py --smoke` 會自行啟動並停止一組固定埠服務，**只在三個埠皆可用時使用**。本輪保留既有服務，不能把 2026-10-18 的 launcher smoke 紀錄當成本輪又啟停一次的證據。

## 6. Docker verifier

2026-11-13 已以 Docker Engine 29.9.1、Compose v5.6.0 完成容器驗收。若要重新執行，先開啟適用的本機 Engine，核對 context 的 endpoint 為本機，並只在當前終端指定驗證 context：

```powershell
docker context inspect desktop-linux
$env:DOCKER_CONTEXT = 'desktop-linux'
.\.venv-repro\Scripts\python.exe scripts/verify_docker.py
```

此工具使用獨立 Compose project、省略 `published` 以動態分配 host ports，並核對實際位址為 `127.0.0.1`。它只清理自己建立的容器／網路，報告位於 `docs/evidence/docker-runtime.json`。缺少 Docker 時回傳 **退出碼 2** 並保存 **NOT RUN** 原因。

目前的專案專用 bridge 設為 `internal:false`，允許容器對外連線。入站埠的 loopback 約束、無 host volume、非 root、唯讀根檔案系統與禁止提權設定各自保留。internal-only 網路的埠配置失敗與普通 bridge 成功對照另見 [Docker 驗收文件](DOCKER_SETUP_REVIEW.md)。

PowerShell 捷徑會依序尋找 `.venv-repro`、`.venv`。也可明確指定 Python 與報告位置：

```powershell
.\scripts\verify_docker.ps1 -Python '.\.venv-repro\Scripts\python.exe' -Output '.\docs\evidence\docker-runtime.json'
```

若 PowerShell wrapper 被執行政策拒絕，直接呼叫 Python，不需放寬政策。清理由隔離驗證工具依本次專案身分執行。

本輪已完成 12 項實際 HTTP 與 6 項 Dashboard 操作，詳見 [runtime](evidence/docker-runtime-20261113.json)、[HTTP](evidence/docker-http-20261113.json) 與 [UI](evidence/docker-dashboard-ui-20261113.json)。成功映像在同日先前建置，最後驗收先核對來源 SHA256 與 image ID，再沿用映像啟動；建置與重用分開記錄。

一般 verifier 的自動檢查涵蓋 API 與 UI health，真實 Dashboard 表單及圖表仍須另行操作驗收。它會清理本次 Compose 資源；原本已運作的 Docker Desktop 保留原狀。本輪另外採一次性私有流程加入服務限額、有界 UI 窗口，並在確認沒有其他 Docker 工作後停止本輪 Desktop。[一次性收尾](evidence/docker-once-20261113.json) 已確認服務及引擎停止，映像保留本機。後續重現同樣先確認背景工作與引擎的原始狀態。

## 7. 如何解讀可重現性

- 固定套件版本與 seed 是已提供的重現機制；結果仍受平台、套件 binary 與環境影響。
- 每次驗證須保存時間、版本、命令、退出碼、來源範圍及指紋；來源變更後，舊的 passed 不自動套用。
- 套件下載 hash 與 Dockerfile 基底 digest 尚未固定；本次 resolved digest 與兩個 image ID 已保存。Windows 原生與 Linux 容器已有各自實測，macOS／Linux 原生環境與跨 OS 逐位元重現另行驗證。
- 遠端 CI、LICENSE 選擇、公開發布與原研究素材整合仍是另行審核事項，這份本機指南沒有授權執行。
