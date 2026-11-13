# Graph-Based Portfolio API & Deployment System

## ML Engineering 專題實作紀錄

本專題記錄圖式模型服務化的系統設計、程式實作與驗證結果，整合合成資料流程、FastAPI、Streamlit、Docker 設定及自動化測試。原 Factor GCN 僅作研究背景參照，整合狀態為 **NOT INTEGRATED**。

本機 Python 使用自行實作的固定規則合成圖式模型，沒有梯度訓練或原模型權重。網站 Demo 則是獨立的 JavaScript 示意，不能冒充 Python API 回應或原研究成果。兩者都不提供真實證券推薦。

操作與驗證以 [本機重現指南](docs/LOCAL_REPRODUCTION.md) 為主要入口；下方提供快速開始與專題概覽。

### GitHub 版本

2026-11-14 依作者指示整理至 [FY26-Portfolio-Deploy](https://github.com/Rozias0925/FY26-Portfolio-Deploy)。Repository 保持私人設定，收錄合成工程原始碼、靜態網站、重現文件與經檢查的驗收證據。網站中的程式摘錄也屬合成示範；原始 Factor GCN 維持 **NOT INTEGRATED**。

本次範圍為 GitHub 版本保存，靜態網站託管另行設定。API、Streamlit 與 Docker 保持本機用途。完整本機安裝、探測與歷史暫存紀錄留在原工作區；倉庫內的證據範圍見 [上傳紀錄](docs/GITHUB_UPLOAD_20261114.md)。

### 三個入口

| 入口 | 位置 | 執行需求 |
| --- | --- | --- |
| 專題網站：九章紀錄、術語索引、合成展示、**本機實作成果與重現流程** | `web/index.html`；本機 HTTP 8080；成果頁 `#implementation`、重現頁 `#reproduce` | 瀏覽器，不需 Python API 或 npm |
| 本機互動 Dashboard | `http://127.0.0.1:8501` | Python 3.12、Streamlit、運作中的 API |
| Python 模型 API | `http://127.0.0.1:8000/docs`；schema `/openapi.json` | Python 3.12、FastAPI |

網站的「本機實作成果」頁提供工程來源摘錄、重現步驟及驗證證據入口。這是靜態專題紀錄，不會在訪客瀏覽器啟動 Python、Docker 或測試；API 與 Streamlit 仍只供私人本機驗證。

### 開始操作（Windows PowerShell）

先在專案根目錄開啟 PowerShell。支援 **CPython 3.12.x**；已驗證環境包括 Windows 原生 3.12.14 與 Linux 容器 3.12.16。完整環境建立、固定埠、停止方式及驗證順序見 [本機重現指南](docs/LOCAL_REPRODUCTION.md)。

新環境統一使用 `.venv-repro`：

```powershell
py -3.12 -m venv .venv-repro
.\.venv-repro\Scripts\python.exe -m pip install -r requirements.txt
.\.venv-repro\Scripts\python.exe -m pip check
```

已有安裝好依賴的 `.venv` 可直接沿用：跳過建立與安裝步驟，將後續命令的 `.venv-repro` 改為 `.venv`。不要重建正在使用的環境；若 `.venv-repro` 也已存在，依重現指南選擇另一個新目錄。

如果三個服務已運作，直接使用上表網址。只有 loopback 的 **8000、8501、8080** 都可用時，才啟動新的一組服務：

```powershell
.\.venv-repro\Scripts\python.exe scripts/run_local.py
```

Launcher 遇到埠佔用會在啟動前退出，不會終止原有 listener。不要為了執行本指南先停止既有服務。在 launcher 的原終端按 **Ctrl+C**，只清理這次 launcher 建立的程序樹；沿用的其他服務保持原狀。

不需要啟用 venv 或變更 PowerShell 執行政策。若 `py -3.12` 找不到直譯器，先備妥 CPython 3.12；完整網站結構檢查另需 Node.js，見 [本機重現指南](docs/LOCAL_REPRODUCTION.md)。直接開啟 `web/index.html` 仍可讀網站與操作瀏覽器合成展示，不需要 API。

macOS / Linux 原生環境可用 `python3.12 -m venv .venv-repro`，將 Python 路徑改為 `.venv-repro/bin/python`；這兩種原生環境仍待各自驗證。2026-11-13 的 Linux 容器結果獨立保存，不代表跨 OS 逐位元重現。

### API 範例

確認 API 已在本機運作後：

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:8000/model-info
Invoke-RestMethod http://127.0.0.1:8000/scenarios
$requestBody = @{scenario_id='scenario_a'; seed=42; risk_level='balanced'} | ConvertTo-Json
Invoke-RestMethod http://127.0.0.1:8000/simulate -Method Post -ContentType 'application/json' -Body $requestBody
```

`scenario_id` 限 `scenario_a / scenario_b / scenario_c`；seed 是 0–2147483647 的整數；`risk_level` 限 `low / balanced / high`。不接受 ticker、URL、檔案路徑或額外欄位。錯誤輸入回傳 HTTP 422，成功回應包含 synthetic 身分、版本及 `investment_advice: false`。

### 模型的計算範圍

1. 固定 seed 產生六個虛構資產，分成 120 日校準與後續 60 日評估。
2. 只用校準資料計算平均、波動與相關矩陣，以絕對相關至少 0.25 建圖。
3. 加入 self-loop，執行一次鄰居訊息傳遞；固定風險參數控制波動懲罰、softmax 溫度與集中度。
4. 固定配置後，用後續合成資料計算曲線、累積變化、波動、Sharpe 與最大回落。

沒有交易成本、實際執行或金融預測。`risk_level` 改變演算法，不保證每次實現波動排序。公式及限制見 [架構文件](docs/architecture.md) 和本機 `/model-info`。

### 測試與證據版本

```powershell
.\.venv-repro\Scripts\python.exe scripts/verify.py
.\.venv-repro\Scripts\python.exe scripts/dependency_report.py
```

`verify.py` 會真的執行檢查，寫入命令、退出碼、版本及來源 SHA256，並更新網站可讀的靜態證據。執行會更新最新紀錄；不是單純顯示既有結果的命令。

若要重新匯出實作成果頁，順序為 `capture_local_proof.py` → `prepare_web_proof.py` → `verify.py`。前者讀取已運作的 loopback 服務；匯出腳本只複製明列的來源 allowlist、合成回應及既有畫面，不連外或啟停服務。來源 SHA256、HTTP capture 時間與截圖日期分別記錄；重匯出不會把歷史截圖變成當日操作證據。完整命令見 [本機重現指南](docs/LOCAL_REPRODUCTION.md)。

- **目前來源版本：1.1.2，2026-11-13。** 完整 Python 驗證為 **141 passed、1 warning、21.53s**；網站 **32 passed、0 failed**。生成時間為 `2026-11-13T21:39:50.395017+08:00`，Windows／CPython 3.12.14；48 個來源檔案與 32 個網站檔案指紋已核對。結果以 `docs/evidence/verification.json`、`source-manifest.json` 與原始輸出為準。
- **Docker 實際驗收：PASSED。** 12 項容器 HTTP 檢查與 6 項真實 Dashboard 操作通過，容器／專案網路清理與本輪 Docker Desktop 停止均已確認。
- **歷史版本：1.1.1，2026-10-20。** 當時的 136 passed、1 warning、27.87s 與 30 項網站檢查保存於 `docs/evidence/history/20261020-1.1.1/`。
- **歷史版本：1.0.0，2026-10-18。** 原始證據保存在 `docs/evidence/history/20261018/`；當時的 118 passed 不等於後續修改的重新驗收。
- 網站「驗證紀錄」顯示執行快照，不是即時測試。來源變更後，須重新產生並核對證據。

首頁已加入完成摘要，實作成果頁提供 2026-11-13 的兩張 Docker 操作畫面及驗收摘要 JSON。桌面與手機的內容、圖片載入、目錄操作及橫向溢出檢查見 [網站更新紀錄](docs/WEBSITE_UPDATE_20261113.md)。本次更新沿用已核對來源的容器實測證據，Docker 維持停止。

2026-11-13 的 Docker 證據見 [runtime](docs/evidence/docker-runtime-20261113.json)、[HTTP](docs/evidence/docker-http-20261113.json)、[Dashboard UI](docs/evidence/docker-dashboard-ui-20261113.json) 與 [一次性停止紀錄](docs/evidence/docker-once-20261113.json)。本輪部署政策與 verifier 單元檢查共 **22 項通過**。詳細範圍與完整驗證摘要請查看 [驗證紀錄](docs/testing.md) 及 [交付報告](docs/RELEASE_REPORT.md)。`pip check` 檢查套件相依一致性；CVE 掃描與授權審查另行記錄。

### Docker 本機驗證

2026-11-13 已使用 Docker Engine 29.9.1、Compose v5.6.0 完成本機容器驗收，兩個 Linux 容器均以 UID 10001 執行。測試後本次容器、專案網路與 Docker Desktop 均已停止，既有背景工作保留。

API 與 Dashboard 映像於同日先前建置成功；最後驗收先核對 18 個映像來源輸入 SHA256 與兩個 image ID，再沿用映像啟動，沒有重複建置。Dockerfile 仍採 `python:3.12-slim` 浮動 tag，當次解析 digest、建置與重用紀錄分別保留於 [容器驗收文件](docs/DOCKER_SETUP_REVIEW.md)。

主要操作方式見 [本機重現指南](docs/LOCAL_REPRODUCTION.md)。使用獨立 portable verifier，不必先停止原有 Python 服務：

```powershell
.\.venv-repro\Scripts\python.exe scripts/verify_docker.py
```

工具為每次執行建立獨立 Compose project、省略固定 host port 並保留 `127.0.0.1`，只清理自己建立的資源，結果保存在 `docs/evidence/docker-runtime.json`。目前網路是專案專用 bridge，允許容器對外連線；loopback 約束主機入站範圍，整體並非離線隔離環境。無 host volume、唯讀、非 root 與禁止提權設定均保留。

缺少 Docker 時工具以 **退出碼 2 / NOT RUN** 保存原因。PowerShell wrapper `scripts/verify_docker.ps1` 依序選用 `.venv-repro`、`.venv`，也接受 `-Python` 與 `-Output`；若執行政策阻擋，直接用 Python。一般 verifier 清理自己的容器與網路；本輪另外以私有一次性流程限制資源、完成真實 UI 驗收並退出本輪啟動的 Desktop，原始紀錄可供核對。

固定埠的手動 Compose 僅作 [請求流程解說的補充](docs/walkthrough.md#補充固定埠的手動-compose)。只有確認 8000／8501 空閒、指定 project 尚無既有資源時才使用；埠被占用就略過，不為此關閉背景服務。清理只限自己當次建立的 project。Docker 靜態政策檢查、verifier 單元測試與真正容器 build/runtime 是不同證據。

### 專案地圖

```text
web/                 專題紀錄、實作成果、術語索引、瀏覽器合成展示
backend/app/         FastAPI routes、schemas、服務入口
demo/                合成資料與 Python 圖式模型
dashboard/           只透過 HTTP 消費 API 的 Streamlit
private_adapters/    抽象介面；未整合原始 Factor GCN
tests/               模型、API、整合、介面與部署邊界檢查
scripts/             啟動、驗證、依賴報告與靜態預覽
docs/evidence/       當前機器可讀證據及 history/20261018/ 歷史快照
docs/                架構、重現步驟、限制、政策與審核表
```

主要操作文件：[本機重現指南](docs/LOCAL_REPRODUCTION.md)。閱讀概念時可參考 [合成 API 請求流程解說](docs/walkthrough.md)、[術語表](docs/glossary.md) 及 [初次盤點](docs/AUDIT.md)。

### 資料、授權與公開邊界

新示範只使用程式生成的合成資料，沒有匯入或修改既有研究、TEJ 資料、合作程式或原模型。沒有因此建立遠端 Repository、公開 API 或付費資源。

開源 LICENSE、遠端 CI、公開發布及研究素材整合仍需另行審核，這次不擅自擴充。套件下載 hash、將基底 digest 固定於 Dockerfile、跨 OS 逐位元重現與外部弱點掃描是可選的後續強化；本次已保存 resolved digest 與兩個 image ID。詳見 [資料政策](docs/DATA_POLICY.md)、[第三方授權](docs/THIRD_PARTY_LICENSES.md) 與 [發布檢查表](docs/RELEASE_CHECKLIST.md)。未來若核准靜態發布，候選範圍是經檢查的 `web/`，不能直接上傳專案根目錄或任何 venv。

本網站供個人學習、學術交流及軟體工程展示，不提供證券推薦、即時交易訊號、資產管理、代客操作或報酬保證。合成結果不能作為投資決策依據。

**Educational and Technical Demonstration Only.** Public interactive examples use synthetic data and are not recommendations involving real securities. This project does not offer investment advice, trading signals, brokerage, asset management, or guarantees of investment performance. Illustrative results do not represent live or historical investment performance.

免責文字不代替實際授權或法律資格認定。

Docker 安裝、實際容器驗收、失敗嘗試與停止紀錄見 [Docker 驗收進度](docs/DOCKER_SETUP_REVIEW.md)。
