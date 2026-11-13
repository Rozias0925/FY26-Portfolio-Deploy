# 中英文專有名詞索引

閱讀方式：先看「白話意思」，再看「本專題的例子」。網站另有可搜尋的互動索引；這份 Markdown 可在離線環境閱讀。所有「資產」「報酬」「權重」都是合成資料的工程示例。

## 系統與網頁溝通

| 術語 | 白話意思 | 本專題的例子與常見誤解 |
|---|---|---|
| 前端 Frontend | 人操作的介面，負責接收選擇、顯示結果 | Streamlit 控制項與圖表；前端不應自行重算後端模型 |
| 後端 Backend | 接收要求並執行運算的程式 | FastAPI 驗證參數後呼叫合成模型；後端不等於資料庫 |
| 用戶端 Client | 發出要求的一方 | Dashboard 對 FastAPI 是 client；不一定是瀏覽器 |
| 伺服器 Server | 等待並回應要求的一方 | Uvicorn 執行 FastAPI；server 可指程式，也可指電腦 |
| 請求 Request | 一次向服務提出的要求 | `POST /simulate` 加上 seed 等 JSON；不是畫面上的按鈕本身 |
| 回應 Response | 服務對請求的答覆 | HTTP 200 與 allocations JSON；不只是一段畫面文字 |
| 超文字傳輸協定 HTTP | 定義請求和回應如何交換的溝通規則 | Dashboard 透過本機 HTTP 呼叫 API；HTTP 本身不保證內容正確或加密 |
| GET | 一種讀取資源的 HTTP 方法 | `GET /health` 讀取服務狀態；不應靠 GET 執行有副作用的操作 |
| POST | 一種送出資料讓服務處理的 HTTP 方法 | `POST /simulate` 把合成參數放進 body；不等於資料一定會存入資料庫 |
| 端點 Endpoint | 一項 API 功能的位址與方法 | `POST /simulate`；同一路徑配不同方法可以有不同功能 |
| 應用程式介面 API — Application Programming Interface | 程式彼此使用功能的約定 | 規定接受什麼參數、回傳什麼 JSON；API 不等於網站，也不一定走網路 |
| REST — Representational State Transfer | 用資源、統一介面與無狀態等限制設計服務的架構風格 | 這裡用清楚 HTTP 路由示範常見 API 設計；有 JSON 就不必然符合完整 REST 限制 |
| JSON — JavaScript Object Notation | 以物件、陣列、數字、字串等表示資料的文字格式 | `{"seed":42}`；JSON 的鍵必須加雙引號，不是任意 Python dict 語法 |
| Body | HTTP 訊息中承載主要資料的部分 | `/simulate` 的 JSON request body；與 URL query 不是同一處 |
| 狀態碼 Status Code | HTTP 回應中的結果分類數字 | 200 成功、422 輸入不符、500 內部失敗；200 不能證明研究模型有效 |
| 結構規格 Schema | 對資料欄位、型別與限制的描述 | seed 必須是範圍內的嚴格整數；schema 不會驗證投資可行性 |
| OpenAPI | 描述 HTTP API 的標準格式 | `/openapi.json` 列出端點與 schema；它是規格，不是模型 |
| Swagger UI | 依 OpenAPI 產生的常見互動文件工具 | 本專題 `/docs` 改用自製離線 explorer，沒有載入 Swagger CDN；兩者都不代表已公開部署 |
| FastAPI | 用 Python 建立型別化 HTTP API 的框架 | 後端 routes 和 validation；框架不替代模型或資料授權 |
| Pydantic | 按型別與限制驗證 Python 資料的函式庫 | 拒絕真實 ticker、額外欄位與非法 seed；這個專題使用嚴格型別規則 |
| Uvicorn | 執行 ASGI Python 網路應用的伺服器 | 綁定 `127.0.0.1:8000` 接收請求；不是 API schema 本身 |
| Streamlit | 用 Python 元件快速建立互動網頁介面的工具 | 本機 Dashboard；每次互動可能重新執行腳本，所以結果存在 session state |
| 逾時 Timeout | 等待另一個服務多久後停止 | UI 每次 HTTP 請求最多等 8 秒；逾時不代表後端一定沒完成計算 |

## Python 程式的組裝方式

| 術語 | 白話意思 | 本專題的例子與常見誤解 |
|---|---|---|
| 筆記本 Notebook | 交錯執行程式格與文字的研究環境 | 作為研究到服務的概念背景；本專題不載入原研究 notebook |
| 腳本 Script | 通常由上而下執行的一份程式 | `scripts/serve_web.py` 啟動靜態服務；不是常駐 API 的唯一形式 |
| 模組 Module | 可匯入的 Python 程式單位，常是一個 `.py` 檔 | `demo/graph_demo_model.py`；模組不是整台伺服器 |
| 套件 Package | 把多個模組組織在一起的單位 | `backend.app` 將應用程式分層；「套件」也常指可安裝的 distribution |
| 依賴 Dependency | 程式需要的外部函式庫 | FastAPI、NumPy、Streamlit；安裝成功不代表授權審查完成 |
| 虛擬環境 Virtual Environment | 將專案 Python 套件與其他專案隔開的環境 | `.venv`；它不是虛擬機，也不會自動固定套件版本 |
| 版本固定 Version Pinning | 指定要安裝的確切套件版本 | `requirements.txt` 的 `==`；未固定的間接依賴仍可能變動 |
| 環境變數 Environment Variable | 在程式外部提供的設定值 | `API_BASE_URL` 決定 UI 要呼叫哪個 API；不要把密碼放進網址 |
| 服務 Service | 對其他程式持續提供某項功能的程式 | FastAPI 提供合成推論；服務不一定部署在雲端 |

## ML 與合成 pipeline

| 術語 | 白話意思 | 本專題的例子與常見誤解 |
|---|---|---|
| 機器學習 ML — Machine Learning | 從資料學習參數或規則的一類方法 | 本專題教 ML 工程流程，但 toy graph 模型本身沒有訓練學習參數 |
| 訓練 Training | 用訓練資料調整可學習參數 | 原研究可能有訓練；此 Demo 只在前 120 日估計特徵與圖，不進行神經網路訓練 |
| 推論 Inference | 把既定方法套在輸入上產生輸出 | 每次 `/simulate` 真正執行固定參數圖式計算；不是讀一份寫死 response |
| 檢查點 Checkpoint | 訓練過程保存的參數及可能的最佳化狀態 | 本專題不附原 Factor GCN checkpoint；不能因有 JSON 結果就說有訓練權重 |
| 模型產物 Model Artifact | 執行模型所需保存的參數、設定或轉換物件 | 已訓練權重是常見 artifact；此示範以程式版本與固定參數描述運算，沒有訓練權重檔 |
| 模型服務化 Model Serving | 把模型能力包成可驗證、可呼叫的介面 | FastAPI 將合成 pipeline 包成 `/simulate`；服務化不等於上線金融服務 |
| 特徵工程 Feature Engineering | 把資料轉成演算法要使用的量 | 訓練區段的平均、樣本標準差與標準化訊號；不讀取未來評估區段 |
| 圖 Graph | 以節點與邊描述關係的資料結構 | 6 個虛構資產是節點，相關程度是邊；不是圖表 chart 的同義詞 |
| 節點 Node | 圖中的一個個體 | `SIM-01`；它不是某家真實公司 |
| 邊 Edge | 圖中連接節點的關係 | 訓練相關絕對值達 0.25 才連邊；相關不能推論因果 |
| 建圖 Graph Construction | 將資料關係轉成圖結構 | 用前 120 日相關矩陣建圖；這不代表整合原研究的圖建立方法 |
| 圖卷積網路 GCN — Graph Convolutional Network | 以圖上鄰居資訊進行可學習特徵轉換的神經網路家族 | 原 Factor GCN 是研究背景；此 Demo 的固定訊號混合不是該原模型 |
| 訊息傳遞 Message Passing | 節點沿邊聚合其他節點資訊 | `P @ s` 混合鄰居訊號；固定矩陣乘法不自動變成已訓練 GCN |
| 管線 Pipeline | 依序把輸入轉為輸出的多個步驟 | 合成資料 → 特徵 → 圖 → 分數 → 權重 → 評估；各階段可分別測試 |
| 轉接層 Adapter | 讓不同模型符合相同呼叫介面的邊界 | `private_adapters/` 只是未整合的介面；有 adapter 檔名不代表原研究可用 |
| 資料切分 Train / Evaluation Split | 先用一段資料建立規則，再用另一段評估 | 120 日建立權重、後 60 日評估；兩段都是合成資料 |
| 資料洩漏 Data Leakage | 建模時使用了本不該預先知道的資訊 | 不用後 60 日計算圖或權重；切分仍不能保證現實有效性 |
| Softmax | 把一組分數轉成正數、總和為 1 的函式 | 配置計算最後一步的一部分；權重合法不等於配置有投資價值 |
| 合成資料 Synthetic Data | 按規則產生的人工資料 | seed 控制的虛構資產序列；不能當真實市場歷史資料 |
| 隨機種子 Seed | 初始化亂數產生器的數字 | 固定 seed 與環境可重現合成結果；不是投資「預測代碼」 |
| 中繼資料 Metadata | 描述結果來源、版本與條件的資料 | model_version、seed、data_mode；不應只保存圖而遺失這些條件 |
| 重現性 Reproducibility | 他人能依相同程式、資料條件與環境取得一致結果 | 固定 seed、固定版本與測試；不能保證跨平台浮點位元完全相同 |

## 驗證、測試與紀錄

| 術語 | 白話意思 | 本專題的例子與常見誤解 |
|---|---|---|
| 輸入驗證 Validation | 確認輸入符合作業契約 | seed 型別、範圍和 scenario 枚舉；不是論文的科學驗證 |
| 錯誤處理 Error Handling | 失敗時回報可理解結果並控制影響 | 非法輸入回 422，UI 無法連線有提示；不是把錯誤全部忽略 |
| 日誌 Logging | 記錄系統事件以協助診斷 | 本機可看啟動錯誤，逐筆 access log 關閉；不把 request 或 traceback 印進公開回應 |
| 單元測試 Unit Test | 測一小段邏輯是否符合規則 | 權重非負且和為 1；不需要靠截圖判斷浮點數 |
| 整合測試 Integration Test | 測多個模組接起來是否一致 | API 回應與真正模型輸出吻合；不等於所有網路環境都驗證完 |
| 冒煙測試 Smoke Test | 先檢查系統最基本功能能否跑通 | 啟動後呼叫 `/health` 與一筆 `/simulate`；不涵蓋每種邊界 |
| pytest | 執行 Python 測試的框架 | `python -m pytest -q`；綠燈不是金融或法律合規證書 |
| TestClient | 在測試程式內呼叫 web app 的用戶端 | 可測 FastAPI 而不開 TCP port；真正網路與容器仍需另外測 |
| 健康檢查 Healthcheck | 用簡短請求判斷服務是否就緒 | Compose 定期檢查服務；健康不代表資料授權已通過 |
| 無障礙 Accessibility | 讓不同能力與操作方式的人能使用介面 | 鍵盤導覽、清楚標籤、對比與圖表文字替代；基本檢查不等於完整認證 |

## 容器、部署與版本管理

| 術語 | 白話意思 | 本專題的例子與常見誤解 |
|---|---|---|
| Dockerfile | 寫下如何建立容器映像的配方 | 安裝依賴並設定啟動命令；檔案存在不等於映像已建置 |
| 映像 Image | 建置好的程式與執行環境範本 | API image；不是畫面截圖，也不是正在執行的程序 |
| 容器 Container | 用 image 啟動的隔離執行實例 | API 和 UI 各一個；一般容器共享核心，不應直接稱完整虛擬機 |
| Docker Compose | 用設定檔管理多個容器服務 | `compose.yaml` 連接 api 與 ui；不是雲端託管平台 |
| 本機部署 Local Deployment | 把服務啟動在自己的電腦 | `127.0.0.1` 的 API 和 UI；不用公開就能展示工程流程 |
| 雲端部署 Cloud Deployment | 在遠端基礎設施運行應用程式 | 本專題未執行；不是 Docker 的必要條件 |
| 連接埠 Port | 同一台機器上區分網路服務的數字 | API 8000、UI 8501；容器內 port 與主機映射不同 |
| localhost / Loopback | 回到目前所在機器的網路位址 | 主機用 `127.0.0.1`；UI 容器自己的 localhost 不會指到 API 容器 |
| Bind 綁定位址 | 決定服務在哪些網路介面監聽 | 主機只綁定 `127.0.0.1`；`0.0.0.0` 會涵蓋所有介面 |
| Git | 追蹤檔案版本與變更的工具 | 可在審查後管理新專題；不是資料授權機制 |
| GitHub | 可託管 Git repository 與協作功能的平台 | 未建立或公開新 repo；Git 不一定需要 GitHub |
| 儲存庫 Repository | 一個有版本歷史的專案集合 | 程式、文件與測試；刪掉目前檔案不代表從歷史移除機密 |
| README | 專案的第一份使用說明 | 說明定位、啟動與限制；不應用漂亮結果替代可執行指令 |
| 持續整合 CI — Continuous Integration | 版本變更時自動執行驗證的流程 | 可在未來核准的平台運作；本機 pytest 成功不等於已跑過遠端 CI |

## 權利與使用界線

| 術語 | 白話意思 | 本專題的例子與常見誤解 |
|---|---|---|
| 授權 Licensing | 權利人允許使用、修改或散布的條件 | 套件、資料、權重各自可能有不同授權；網路能下載不代表能公開 |
| 免責聲明 Disclaimer | 告知使用目的、範圍與限制的文字 | 教學、非投資建議、合成資料標示；不是法律豁免或授權替代品 |
| 隱私 Privacy | 對個人資料處理與使用的界線 | 無帳號、表單、自建分析；不宣稱網路完全沒有任何資訊處理 |
| 人工審查 PENDING REVIEW | 尚未由負責人確認可執行或可公開 | 原研究權利、依賴標示與外部發布；不等於已通過或會自動核准 |
| Production-like | 練習正式系統常見的分層與驗證方法 | schema、容器與測試；不宣稱達到金融業正式營運標準 |

下一步：沿著 [walkthrough](walkthrough.md) 實際送出請求，或在 [architecture](architecture.md) 對照公式與程式位置。
