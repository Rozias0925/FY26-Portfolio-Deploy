# 本機交付報告｜1.1.2

更新日期：2026-11-13，Asia/Taipei。範圍為合成資料工程系統與靜態專題紀錄。**Docker runtime PASSED，服務已收尾；原始 Factor GCN NOT INTEGRATED。** 對外發布、遠端倉庫與付費資源維持另行審核。

## 交付成果

本專題完成合成資料生成、固定規則圖式計算、FastAPI、HTTP 用戶端 Streamlit、Docker 設定、自動化測試與專題紀錄網站。網站包含九章、58 個中英術語、瀏覽器合成展示、實作成果及重現流程；首頁與第九章的架構圖採桌面四欄、手機直向排列。

Python 合成系統、瀏覽器 JavaScript 示意與原 Factor GCN 各自標示來源。示範 API／模型版本維持 1.0.0；這份 1.1.2 是工程專案來源版本。

## 本輪驗收結果

完整驗證生成時間為 **2026-11-13T21:39:50.395017+08:00**，版本 **1.1.2**，Windows／CPython 3.12.14。結果為 **141 passed、1 warning、21.53s**，網站 **32 passed、0 failed**；Windows pip check 通過，48 個來源與 32 個網站檔案指紋已核對。整合紀錄見 [verification.json](evidence/verification.json)、[來源 manifest](evidence/source-manifest.json)、[網站 manifest](evidence/web-artifact-manifest.json) 與原始輸出。

總來源指紋：`f31243cec641ac9c951582c26047701a25e2f4f3d05488f092325cfd999c4fb7`。Python／網站整套驗證與 Docker 命令各有時間與證據；Docker 摘要依其 tested source hash 核對後匯總。此次網站更新的 Docker 結果仍對應 17:25:43 的獨立實測。

| 已完成項目 | 實際結果 |
| --- | --- |
| 完整 Python／網站驗證 | 141 passed、1 warning、21.53s；網站 32 passed、0 failed；Windows pip check 通過 |
| 部署政策與 verifier 回歸 | 22 passed in 0.79s，檢查動態 loopback 埠、外部共用網路拒絕、ownership 與失敗清理 |
| Docker runtime | **PASSED**，完成時間 2026-11-13T17:25:43.37231+08:00 |
| 真實容器 HTTP | **12 項通過**，含正常合成推論與符合預期的 422 |
| Dashboard 真實 UI | **6 項通過**，含送出、參數變動與舊結果、JSON、metadata、圖式解說與圖表 |
| 執行環境 | Linux／CPython 3.12.16；API 與 Dashboard 均為 UID 10001；兩個 pip check 通過 |
| 映像建置 | 同日先前 API 93.235 秒、Dashboard 297.0 秒，均退出碼 0 |
| 最後成功驗收的映像重用 | 核對 18 個映像來源輸入 SHA256 與兩個 image ID，再以 `up --no-build` 啟動 |
| 收尾 | 本輪 Compose 容器／網路清理通過；本輪未建立新 builder；Docker Desktop 已停止，前端與 backend 程序均為 0 |
| 原有背景工作 | 保持原狀，沒有全域 prune 或 WSL shutdown |
| 對外發布與付費資源 | 未執行 |

主要證據：[runtime](evidence/docker-runtime-20261113.json)、[HTTP 與 Linux 環境](evidence/docker-http-20261113.json)、[Dashboard UI](evidence/docker-dashboard-ui-20261113.json)、[一次性執行及停止](evidence/docker-once-20261113.json)。容器操作畫面為 [Dashboard](evidence/docker-dashboard-20261113.jpg) 與 [metadata](evidence/docker-dashboard-metadata-20261113.jpg)。

## 網站內容更新

首頁以四項驗收數字呈現完成狀態，實作成果頁加入兩張有日期的容器操作畫面及精簡 JSON。第六章與第九章同步記錄已完成的 Docker 驗收、專案 bridge 網路及服務停止狀態。舊原生截圖保留原日期。

1280 × 720 與 390 × 844 的瀏覽器檢查確認內容、圖片載入與目錄開合正常，首頁與容器成果區均無橫向溢出。此次截圖 API 無法擷取畫面，版面驗證範圍為 DOM 與實際元素尺寸；紀錄見 [網站更新](WEBSITE_UPDATE_20261113.md)。

## 本輪修正與網路範圍

實測確認 internal-only 網路中兩服務雖 Healthy，host port 仍未建立。相同映像在專案專用 bridge 的對照成功後，Compose 改為 `driver: bridge`、`internal:false`。verifier 省略 `published`，由 Docker 指派可用埠；主機位址持續限定 `127.0.0.1`。

此網路允許容器對外連線，並非 air-gapped 設計。無 host volume、唯讀根檔案系統、非 root、禁止提權及 build allowlist 均保留。本輪的服務限額為 API 384 MiB、Dashboard 512 MiB，各 0.5 CPU、64 MiB tmpfs，實際值附於 runtime 證據。

[internal 對照](evidence/docker-port-probe-20261113-internal.json) 與 [bridge 對照](evidence/docker-port-probe-20261113.json) 保存原因核對。沒有將 `published:'0'` 單獨當作唯一原因。

## 映像、來源與歷史保留

成功映像的原始建置紀錄保存在 [同日先前嘗試](evidence/history/20261113-docker-port-attempt/docker-once-20261113.json)。最後成功驗收使用相同映像，沒有宣稱再建置一次；runtime 的 `cache_proof`、`reused_images` 與 `tested_source_sha256` 保存來源及執行設定的核對範圍。

Dockerfile 使用 `python:3.12-slim`。當次解析的基底 digest 為 `sha256:5e2bdb1b0d542d5039cffb8181c65930093949194a65c365dfb1b0fe13a4fa5b`；來源 Dockerfile 仍為浮動 tag。建置輸出的 pip root 警告與更新通知保留在原始紀錄，最終服務以 UID 10001 執行。

[第一次私有工具嘗試](evidence/history/20261113-docker-first-attempt/docker-once-20261113.json) 的可選欄位錯誤及其清理紀錄保留。10 月 18 日的 118 項與 10 月 20 日的 136 項 Python 結果各屬當時來源版本，分別保存於 [1.0.0 歷史](evidence/history/20261018/verification.json) 與 [1.1.1 歷史](evidence/history/20261020-1.1.1/verification.json)。

本輪亦保留 [sandbox 逾時嘗試](evidence/history/20261113-sandbox-attempt/)；相同來源後續在主機環境完成整套驗證。該環境逾時紀錄與最終通過結果分開保存。

## 操作與限制

本機重現入口見 [LOCAL_REPRODUCTION.md](LOCAL_REPRODUCTION.md)，Docker 的一般 verifier 與本次一次性 UI／停機流程差異見 [DOCKER_SETUP_REVIEW.md](DOCKER_SETUP_REVIEW.md)。本次服務已停止；網站的靜態內容與瀏覽器示意可獨立閱讀，成果截圖與 JSON 依原始日期保存。

模型使用固定規則合成流程，沒有原 Factor GCN 訓練、權重、研究資料、交易成本或市場執行。Windows 原生 CPython 3.12.14 與 Linux 容器 3.12.16 各有實際紀錄；macOS／Linux 原生環境與跨 OS 逐位元重現不在本輪驗證範圍。

套件版本固定而未附下載 hash；Dockerfile 基底未固定 digest。CVE 掃描、滲透測試、正式無障礙認證及第三方散布審查另行記錄，沒有由 pip check 或本次測試推定完成。

首次使用條款沒有由代理程式代為接受。本輪沒有公開網站、建立遠端倉庫、推送映像或新增付費服務。研究／資料權利、來源摘錄與圖片的公開範圍，以及發布目的地維持 [發布檢查表](RELEASE_CHECKLIST.md) 的人工關卡。
