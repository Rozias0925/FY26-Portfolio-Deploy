# 驗證紀錄：目前版本與歷史快照

更新日期：2026-11-13，Asia/Taipei。來源版本：1.1.2。每筆結果以命令、時間、環境與來源指紋界定範圍；操作方式見 [本機重現指南](LOCAL_REPRODUCTION.md)。

## 目前驗收

**Docker runtime、真實 HTTP 與 Dashboard 操作均已通過，測試服務已收尾。** 原始 Factor GCN 維持 **NOT INTEGRATED**；本輪執行的是新合成資料固定規則模型。

本輪完整驗證生成時間為 **2026-11-13T21:39:50.395017+08:00**，版本 **1.1.2**，Windows／CPython 3.12.14。Python 結果為 **141 passed, 1 warning in 21.53s**，網站 **32 passed、0 failed**，套件一致性為 **No broken requirements found.**；48 個來源檔案與 32 個網站檔案指紋已核對。完整結果見 [verification.json](evidence/verification.json)、[來源 manifest](evidence/source-manifest.json) 及 [版本表](evidence/versions.json)；網站 evidence.js 保存有日期的執行快照。

整合驗證的總來源指紋為 `f31243cec641ac9c951582c26047701a25e2f4f3d05488f092325cfd999c4fb7`。Docker 是另一組實際命令的結果，完成時間為 17:25:43；合併摘要前依 `tested_source_sha256` 核對對應來源。`verify.py` 的 Python／網站檢查與已保存的 Docker 執行紀錄分別標示，此次網站更新期間 Docker 維持停止。

| 已完成檢查 | 實際結果 | 證據 |
| --- | --- | --- |
| 完整 Python 測試 | 141 passed、1 warning、21.53s | [pytest 輸出](evidence/pytest.txt) |
| JavaScript／網站結構 | 32 passed、0 failed | [網站檢查](evidence/website-contract.txt) |
| Windows 套件一致性 | No broken requirements found. | [pip check](evidence/pip-check.txt) |
| 部署政策與 verifier 單元檢查 | 22 passed in 0.79s；fake CLI，不啟動 Docker | `tests/test_deployment_policy.py`、`tests/test_docker_verifier.py` |
| Docker 容器 runtime | passed；兩服務健康、本機 HTTP、真實 UI、自有資源清理與引擎停止 | [runtime](evidence/docker-runtime-20261113.json) |
| 容器 HTTP | 12 項通過，正常回應及三項無效輸入的 422 均符合預期 | [HTTP](evidence/docker-http-20261113.json) |
| Dashboard 真實操作 | 6 項通過 | [UI](evidence/docker-dashboard-ui-20261113.json) |
| API／UI 的 Linux 環境 | CPython 3.12.16、UID 10001；兩個 pip check 通過 | HTTP 紀錄的 `environment` |
| 原始建置 | API 93.235 秒、Dashboard 297.0 秒，兩項退出碼 0 | [同日建置紀錄](evidence/history/20261113-docker-port-attempt/docker-once-20261113.json) |
| 最後成功驗收的映像來源 | 18 個來源輸入 SHA256 與兩個 image ID 相符，沿用映像啟動 | runtime 的 `cache_verified`、`cache_proof`、`reused_images` |
| 一次性收尾 | Compose 容器／網路清理通過；本輪沒有建立新 builder；Desktop 停止、兩個 Docker 程序數均為 0 | [一次性紀錄](evidence/docker-once-20261113.json) |

最後驗收的 runtime 完成時間為 **2026-11-13T17:25:43.37231+08:00**。Docker CLI／Engine 為 29.9.1、Compose 為 v5.6.0。Windows 原生 Python 的歷史基準為 3.12.14；Linux 容器實際版本為 3.12.16，兩者分開記錄。

## 實際操作與測試邊界

HTTP 檢查涵蓋服務狀態、模型與情境資訊、API 文件、三種合成情境、固定 seed 的重現、無效 seed／情境／額外欄位的 422 回應。每次成功回應都保留合成資料與模型身分，原研究狀態仍為 `NOT INTEGRATED`。

Dashboard 的六項操作包括 Scenario A／seed 42／balanced 送出、參數改變後的舊結果提醒、Scenario B／seed 7／low 更新、Request JSON 與控制項一致、synthetic metadata 顯示，以及圖式解說展開。[圖表畫面](evidence/docker-dashboard-20261113.jpg) 與 [metadata 畫面](evidence/docker-dashboard-metadata-20261113.jpg) 是這次容器操作取得的新截圖。

本輪專用設定為 API 384 MiB、Dashboard 512 MiB，各 0.5 CPU、64 MiB tmpfs。原建置階段的獨立 builder 限制為 512 MiB、0.5 CPU，順序建置；成功驗收沿用已建映像，沒有重建 builder。資源限額與清理紀錄保存在實際指令及 inspect 輸出，沒有修改全域 WSL 配置。

## 網路與埠修正

先前的 internal-only 網路中，容器 healthcheck 通過，但 `docker compose port` 回傳 `:0`；省略 `published` 後仍無可用 host port。[internal 對照](evidence/docker-port-probe-20261113-internal.json) 與 [普通 bridge 對照](evidence/docker-port-probe-20261113.json) 保存相同映像的測試結果。

目前採專案專用 `driver: bridge`、`internal:false`，主機埠固定綁定 `127.0.0.1`。verifier 省略 `published` 以配置動態 host port，並拒絕零埠、非 loopback 或範圍外位址。此 bridge 允許容器對外連線，並非離線隔離；無 host volume、非 root、唯讀根檔案系統與禁止提權設定各自保留。

單元回歸另核對正常專案配置不變、ownership 標記、拒絕外部共用網路，以及收到 `:0`、零埠或非 loopback 回傳時，在 HTTP 之前失敗且仍清理自有資源。

## 重現與證據保存

```powershell
.\.venv\Scripts\python.exe scripts/verify.py
.\.venv\Scripts\python.exe scripts/dependency_report.py
# 本機 Docker Engine 與 context 已確認可用時：
.\.venv\Scripts\python.exe scripts/verify_docker.py
```

`verify.py` 寫入當前整合報告；Docker verifier 另執行真實容器流程。一般 verifier 清理自己建立的 Compose 容器與網路，並不負責退出先前已運作的 Docker Desktop。本輪另以私有一次性流程加入資源限額、有界 UI 操作窗口，以及本輪引擎停止；[Docker 驗收文件](DOCKER_SETUP_REVIEW.md) 說明兩者差別。

更新網站實作成果時，保存的 HTTP、程式來源副本、截圖與匯出日期分別核對。2026-10-18 的原生 API／Dashboard 圖片仍屬該日紀錄；2026-11-13 的容器圖片有獨立檔名與 UI 證據。重新匯出資料不會改變原始操作日期。

網站本次新增的兩項結構檢查，分別核對容器摘要與原始實測的一致性，以及公開圖片的位元組與輸出資料範圍。另以瀏覽器核對桌面四欄、手機兩欄摘要、兩張容器圖片與目錄開合，紀錄於 [site-refresh-browser-20261113.json](evidence/site-refresh-browser-20261113.json)。截圖 API 在本次檢查無法擷取畫面，沒有將 DOM／尺寸檢查列為視覺截圖驗收。

原生 launcher 採固定 8000／8501／8080，有 listener 時拒絕啟動。`run_local.py --smoke` 只在三個埠均可用時執行，清理本次自建程序。Docker verifier 則使用獨立 project、動態 loopback 埠，並依資源標記核對清理範圍。

## 歷史快照與失敗嘗試

| 紀錄 | 當時結果與範圍 |
| --- | --- |
| [2026-10-18／1.0.0](evidence/history/20261018/verification.json) | 118 passed、1 warning、22.31s；網站 21 passed；當時 Docker runtime NOT RUN |
| [2026-10-19／1.1.0](evidence/history/20261019-1.1.0/verification.json) | 保存該版本的原始輸出與來源指紋 |
| [2026-10-20／1.1.1](evidence/history/20261020-1.1.1/verification.json) | 136 passed、1 warning、27.87s；網站 30 passed；48 來源與 29 網站檔的當時摘要 |
| [10 月首次檢查失敗](evidence/history/20261020-1.1.1-first-attempt/pytest.txt) | PowerShell 測試輸出解碼問題，修正後才完成該輪驗證 |
| [2026-11-11 前置檢查](evidence/docker-runtime-20261111.json) | 安裝完成後 Engine 未啟動，verifier 停在前置檢查 |
| [11 月第一次容器工具嘗試](evidence/history/20261113-docker-first-attempt/docker-once-20261113.json) | inspect 可選欄位讀取錯誤；保存失敗與完整收尾 |
| [11 月埠配置嘗試](evidence/history/20261113-docker-port-attempt/docker-once-20261113.json) | 映像建置及 healthcheck 成功；host port 未建立，隨後正常收尾 |
| [11 月 sandbox 執行嘗試](evidence/history/20261113-sandbox-attempt/) | 整套驗證於 sandbox 執行逾時 180 秒；同一份來源接著在主機環境完成 141 項測試，沒有以逾時推論來源程式失敗 |
| [11 月網站更新前快照](evidence/history/20261113-before-site-refresh/) | 17:34:49 的完整驗證：141 passed、1 warning、20.76s；網站 30 passed；更新前的來源與網站指紋分開保留 |

歷史結果對應其原始來源與環境。這些輸出與目前成功的 Docker／HTTP／UI 證據分開保留，沒有以重試結果覆蓋失敗紀錄。

## 限制

固定規則模型使用 120 日合成校準與後續 60 日評估，沒有梯度訓練、原模型 checkpoint、交易執行或成本模型。Windows 原生與 Linux 容器各有實測紀錄；macOS／Linux 原生主機及跨 OS 逐位元重現仍未驗證。

基底 `python:3.12-slim` 的當次 resolved digest 已記錄，Dockerfile 仍是浮動 tag；`requirements.txt` 固定版本而未附下載 hash。建置時的 pip root 提醒、pip 更新通知及完整測試中的棄用警告依原始輸出保留。容器以 UID 10001 執行。

本輪沒有執行 CVE 掃描、滲透測試或正式無障礙認證。`pip check` 僅驗證套件相依一致性；公開發布、LICENSE 選擇與第三方再散布審查分開處理。
