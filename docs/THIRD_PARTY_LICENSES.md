# 第三方依賴與素材審查清單

狀態：**PENDING REVIEW**。本文件是發布前需要核對的清單，不是已完成的授權報告。套件安裝成功、常見開源名稱、package metadata 中的一行 license 欄位，都不能單獨當成完整散布審查。

最終直接依賴與版本以專案根目錄 `requirements.txt` 為準；實際環境含其間接依賴。以下列出用途與待查項目，不在尚未核對原始 LICENSE 時推定授權種類。

| 元件 | 用途 | 必須核對 | 狀態 |
|---|---|---|---|
| CPython 與標準函式庫 | 執行 Python、HTTP client、靜態伺服器 | 發行版本授權與 notices | PENDING REVIEW |
| FastAPI | 本機 API 框架 | 使用版本 LICENSE、通知與間接依賴 | PENDING REVIEW |
| Starlette | FastAPI 的 ASGI 基礎 | 實際解析版本 LICENSE 與通知 | PENDING REVIEW |
| Pydantic / pydantic-core | 輸入輸出型別驗證 | 各自版本、編譯套件與附帶通知 | PENDING REVIEW |
| Uvicorn 及安裝 extras | HTTP 伺服器 | 實際安裝依賴、LICENSE、通知 | PENDING REVIEW |
| NumPy | 合成數值與圖運算 | LICENSE、附帶的數值函式庫與 binary notices | PENDING REVIEW |
| Pandas | Dashboard 圖表資料框 | LICENSE 與所有間接依賴 | PENDING REVIEW |
| Streamlit 與其圖表依賴 | 本機互動介面 | LICENSE、瀏覽器端附帶元件、通知 | PENDING REVIEW |
| pytest 與測試依賴 | 自動化測試 | 實際版本 LICENSE 與通知 | PENDING REVIEW |
| httpx 及 HTTP 測試依賴 | FastAPI TestClient | 實際版本 LICENSE 與通知 | PENDING REVIEW |
| Docker / Docker Compose | 容器建置與多服務啟動 | 所選安裝方式與工具條款 | PENDING REVIEW |
| Docker Desktop（若使用） | 個人電腦上的容器工具 | 自身使用資格與當時條款；不得推定所有使用情境免費 | PENDING REVIEW |
| Docker 基礎映像 | 容器作業系統與 Python | 指定 tag、套件、各自 notices 與更新狀態 | PENDING REVIEW |

## 素材與自製內容

本專題預期使用自製 HTML/CSS/JS、文字、圖解與系統字體，不下載金融圖片、原研究圖表、商標、照片、遠端字體或外部 icon pack。`/docs` 使用自製本機 explorer，沒有附帶或載入 Swagger UI／ReDoc；OpenAPI schema 仍由 FastAPI 產生。正式散布前仍應檢查 `web/`、文件、截圖與輸出資料是否與此範圍一致。

既有 Factor GCN 網站只作背景連結；「可以連結」不代表可以複製其中圖表或研究資料。原模型、權重、資料商內容與合作成果均無公開授權推定。

## 如何完成實際審查

1. 在乾淨環境安裝專案指定版本，保存 `python -m pip freeze` 或等價的完整解析清單。清單不是安全或授權通過證明。
2. 對直接與間接依賴逐一閱讀該**確切版本**的原始 LICENSE、NOTICE 和打包內附的第三方通知。binary 套件可能包含不同授權的元件。
3. 檢查散布方式：只發自製原始碼、提供依賴清單、提供容器 image、附帶套件或外部 UI 資源，可能有不同的通知義務。
4. 若需散布通知，保留原文，記錄版本、來源與核對日期。未知項目維持 PENDING REVIEW，不寫成已授權。
5. 檢查自製程式本身的開源授權決定；目前未替作者選擇或核發 LICENSE。確定權利人與發布意願後，才由負責人決定。
6. 與 [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) 一起記錄審核人、日期與結果，再決定是否公開。不得因測試通過自動發布。

這次工程工作沒有安裝付費套件服務、建立付費雲端資源或變更原研究網站。未來任何收費條款、雲端服務、公開託管或授權疑問都應停在對應的人工關卡。
