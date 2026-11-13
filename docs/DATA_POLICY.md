# 資料政策與檔案邊界

本文件描述此工程展示的實際設計邊界，並非對法律合規或權利歸屬的認證。任何尚未確認的使用或公開權限一律標示 **PENDING REVIEW**。公開發布目前沒有獲准。

2026-11-14 作者已指定將新合成工程上傳至私人 Repository `Rozias0925/FY26-Portfolio-Deploy`。這項授權適用於本次選定的原始碼、靜態網站、文件及驗收證據；Repository 維持私人設定。原研究整合、公開網站與付費服務保留各自審核。具體範圍見 [GitHub 上傳紀錄](GITHUB_UPLOAD_20261114.md)。

## 資料從哪裡來

本機 `/simulate` 的輸入只有情境 ID、整數 seed 和三種演算法風險參數。`demo/synthetic_data.py` 由 seed 與內建規則即時產生 6 個虛構資產的數列；沒有讀取行情服務、TEJ、券商、交易所、使用者檔案或研究資料。`SIM-01` 至 `SIM-06` 不映射任何真實股票。

前 120 日用來計算統計特徵與圖，後 60 日每天按相同目標權重評估，隱含每日權重重設，沒有模擬再平衡執行、周轉率與成本。這裡的 training window 只是統計校準區段，沒有 GCN 梯度訓練。固定 seed 是為了工程重現，不是從金融市場取得的樣本。網站 Playground 另在瀏覽器使用合成示意；沒有呼叫 Python 模型服務。

回應必須包含 `data_mode: "synthetic"` 與 `investment_advice: false`；`/simulate` 的標籤位於 metadata。原研究模型狀態固定為 **NOT INTEGRATED**。沒有原研究數學績效、資料或 checkpoint 的整合證據。

## 檔案分類

「可供公開審查的候選」只代表內容類型適合提交人工審查，不表示已發布或已取得完整授權。

| 分類 | 路徑或類型 | 允許用途 | 目前狀態 |
|---|---|---|---|
| 公開審查候選 | `web/` 的自製教學文字、CSS、JS 與合成示例 | 本機瀏覽；審核後才可發布 | PENDING REVIEW |
| 公開審查候選 | `backend/`, `demo/`, `dashboard/`, `tests/`, `scripts/` 的新程式 | 本機合成展示與測試 | 原始碼開源授權 PENDING REVIEW |
| 公開審查候選 | `docs/`, `README.md`, Dockerfile、Compose、套件清單 | 教學、檢查、重現 | 第三方標示與公開決定 PENDING REVIEW |
| 本機產物 | `.venv/`, `.tmp/`, `__pycache__/`, `.pytest_cache/`、安裝產物 | 本機執行與暫存 | 不應納入散布 |
| 本機證據候選 | 合成 API JSON、測試摘要、人工截圖 | 檢查工程實作 | 發布前檢查路徑、帳號名稱、個資與輸出範圍 |
| 隔離介面 | `private_adapters/` | 描述未整合介面 | 不含研究權重或受限資料 |
| 受限，未匯入 | 原 Factor GCN code、權重、原始與衍生金融資料、合作文件 | 本專題不讀取或散布 | 權利 PENDING REVIEW；不推定可用 |
| 不允許 | 私密金鑰、token、個資、券商設定、原始金融資料副本 | 不納入程式或版控 | 禁止匯入 |

原研究網站保留原狀。新專題僅可用經審核的連結提供背景；沒有複製既有研究圖表、績效數據、模型權重或合作素材的授權推定。工作區盤點範圍與實際使用檔案見專案的 audit 記錄。

## API 邊界

- 不接受真實 ticker、URL、資料檔案路徑、持倉或上傳。額外欄位被 schema 拒絕。
- 不提供使用者註冊、API key、留言、申請表單、個人化投資功能、交易與券商介面。
- 主機 API 與 Dashboard 的入站埠只綁定 `127.0.0.1`。Compose 使用專案專用 `bridge`、`internal:false`，允許容器對外連線；此設定不是離線或 air-gapped 環境。應用程式的既有呼叫範圍仍只有合成流程與本機／Compose API。
- Dashboard 的 `API_BASE_URL` 只接受 `127.0.0.1`、`localhost`、`::1` 或 Compose 的 `api`，不允許網址內含帳密、query、fragment 或路徑。不繼承 HTTP 代理、不跟隨重新導向。
- 不新增 tunnel、公網 port、雲端主機或外部金融 API 呼叫。
- 不建立自建訪客分析或逐筆 request body 日誌。原生 Uvicorn 啟動指令使用 `--no-access-log`，Streamlit 關閉 usage statistics。

Dashboard 的選擇與最近一次結果保存在該 Streamlit session 的記憶體，供當次操作顯示；本專題沒有資料庫、結果上傳或使用者追蹤。這不代表作業系統、瀏覽器、套件來源或未來託管商完全不處理任何連線資訊。

2026-11-13／來源版本 1.1.2 已實際完成 Docker 驗收，保存 12 項 HTTP、6 項 Dashboard 操作及自有資源清理證據。最終驗收核對 18 個映像來源輸入 SHA256 與兩個 image ID 後，沿用同日已建映像。建置範圍只含新合成工程與 requirements allowlist；原模型、金融資料、`.venv`、`.runtime` 與網站素材各自保留。

本次容器採 UID 10001、唯讀根檔案系統、無 host volume 及禁止提權設定。驗收後本次容器、專案網路與本輪 Docker Desktop 已停止，映像與經檢查的證據保存於本機。詳見 [容器驗收](DOCKER_SETUP_REVIEW.md) 與 [實際紀錄](evidence/docker-runtime-20261113.json)。本機驗收不代表素材取得新的公開授權。

## 回應、錯誤與可重現性

結果 metadata 記錄 seed、scenario_id、risk_level、模型 ID／版本、資料模式與校準／評估區段。只有在這些條件與執行環境可比時，才適合比較重現性。合成曲線不以原研究績效或實際市場績效呈現。

API 的 422 回應不回傳輸入值或內部 context；未知欄位名稱會去識別化。非預期 500 回傳一般訊息。Dashboard 不將原始錯誤、請求 body、帳密或環境設定放進使用者錯誤提示。除錯時也不要把可能受限的外部檔案混入日誌。

## 取得更多資料前的關卡

若將來需要原模型或真實資料，先另立需求，列出權利人、實際契約、允許用途、保存方式、可否改作與散布，以及是否涉及合作或保密義務。未完成前，停止該項整合或公開；可繼續合成示範與文件工作。

`.gitignore` 只是防誤納的第一層，不會撤銷 Git 歷史，也無法代替人工檢查。禁止先把不確定的資料放進 repository，才以「稍後刪除」處理。公開、上傳、push、分享、建立付費資源與原研究整合都須由負責人另行核准，詳見 [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md)。

免責聲明不是資料授權或法律豁免；本專題不承諾零法律責任。此文件的目的，是保留清楚且可檢查的工程範圍。
