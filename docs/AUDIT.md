# Phase 0：工作區盤點與邊界

盤點日期：2026-10-18（Asia/Taipei）。本次在 `Selected Projects/graph-portfolio-engineering-guide/` 建立全新專案，沒有複製、搬移或修改既有研究網站。原計畫書保存在本專案根目錄，作為需求參考。

## 既有項目

| 所在位置 | 僅依檔名與目錄觀察 | 本次處理 |
| --- | --- | --- |
| Selected Projects/Spectral Graph Lab | 靜態網站、文件、腳本與測試 | 保留，沒有匯入其素材 |
| Selected Projects/Static and Dynamic Graph Construction for GNNs | 靜態網站、Python 實驗程式、既有資料與圖表 | 保留，沒有執行原實驗、讀取資料內容或匯入素材 |
| Technical Experiments | Machine Learning From Scratch、Optimization Visual Lab 等項目 | 保留，沒有匯入 |
| 本次提供的計畫書 | ML Engineering 教學與本機合成系統需求 | 複製到新專案，據以實作 |

這次檔名盤點沒有確認任何可整合且已獲授權的原始 Factor GCN code／checkpoint。既有一般 GNN 程式不是原模型的可用授權證明。原 Factor GCN 一律標示 **NOT INTEGRATED**；不要求、下載或上傳 TEJ／企業合作資料。此盤點不是使用者整台電腦的全面搜尋，也不是研究權利查核。

## 檔案分類

| 分類 | 路徑 | 處理原則 |
| --- | --- | --- |
| Public candidate | `web/` | 自製文字、HTML/CSS/JS/SVG 與合成教學互動；發布前人工審核 |
| Local engineering | `backend/`, `demo/`, `dashboard/`, `tests/`, Docker 設定、`scripts/` | 本機可執行系統；沒有線上 Python API |
| Review documents | `docs/`, README、計畫書 | 含真實驗證狀態、限制與待審核事項 |
| Local environment | `.venv/`, `.tmp/`, caches | 忽略，不進容器與發布包 |
| Restricted / absent | 真實行情、原 Factor GCN 權重、合作研究程式、個資、金鑰 | 本專案不包含，不因檔案存在而推定授權 |

`.gitignore` 是減少誤加入的措施，不是完整資料外洩防護；容器 build context 使用 allowlist，網站的發布目錄只應指定 `web/`。不得把整個工作區或 Python 環境當成網站上傳。

## 實作分期

0. 獨立目錄、檔名盤點、資料邊界。
1. 真正執行的合成 NumPy 圖式模型、FastAPI、驗證與測試。
2. 只透過 HTTP 消費 API 的 Streamlit、容器設定與本機存取限制。
3. 九章靜態教學、術語索引、瀏覽器端合成示意。
4. 實際測試、文件、版本與可重跑證據。Docker 缺少時明列環境限制。
5. 停在人工發布審核；不建立線上站點、遠端倉庫、付費資源或公開 API。

## 環境初始結果

- 系統 Python 為 3.14.3；本專案明確採 CPython **3.12.x**，使用 Codex 提供的 3.12.14 建立獨立 `.venv`。
- Node.js 24.19.0 可用。靜態網站本身無需 npm、打包器或 Node 執行環境。
- `docker version` 無法執行：未找到 Docker CLI；標準 Docker Desktop 安裝位置亦未找到。沒有為了測試擅自安裝系統服務或接受軟體授權。
- 新增套件僅安裝在專案 `.venv`。沒有雲端、券商、行情資料或付費服務連線。

後續狀態以 `docs/testing.md` 與 `docs/RELEASE_REPORT.md` 為準。
