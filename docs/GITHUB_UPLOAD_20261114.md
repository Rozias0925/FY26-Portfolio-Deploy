# GitHub 上傳紀錄

日期：2026-11-14，Asia/Taipei。來源專案版本：1.1.2。

作者於本次對話指定目的地：`https://github.com/Rozias0925/FY26-Portfolio-Deploy.git`。上傳前透過 GitHub 核對 Repository 為空、私人可見，作者帳號具有管理與推送權限。本次保留私人設定。

## 提交範圍與先前嘗試

先前已建立初始化 README 提交 `542be10304de5bc27c20d4a816b2a76a3ae02493`，五個圖片 blob 已核對 SHA。第一次完整 tree 寫入因自動核准服務用量上限而未執行；這筆中斷保留為操作歷史。

其後依作者要求，主 README 與介面資料夾的 README 已改為英文，第一段直接說明專題目的與原始碼範圍。作者再次指示續傳後，已重新核對私人設定、主分支及來源一致性。本版本收錄新版 README 與完整 117 檔副本，檔案清單及 SHA256 見根目錄 `repository-manifest.json`。GitHub 提交以初始化提交為父節點，採一般快進更新；最終遠端核對結果另存於原工作區的上傳收據。

## 收錄內容

- 新合成工程的 `backend/`、`demo/`、`dashboard/`、`tests/` 與 `scripts/`。
- `web/` 的完整靜態網站、程式摘錄、合成示例與實測圖片。
- Dockerfile、Compose、依賴清單、設定範例及未實作的研究整合介面。
- 教學與重現文件、當前驗證摘要、來源指紋，以及腳本核對與匯出所需的合成 HTTP／Docker 證據。

每份網站來源摘錄都屬新合成工程。原始 Factor GCN、研究權重、金融資料與合作素材的整合狀態保持 `NOT INTEGRATED`。

## 本機保留範圍

虛擬環境、快取、`.runtime/`、`.tmp/`、本機秘密設定、安裝與 WSL 探測紀錄、舊版畫面及完整歷史嘗試留在工作區。倉庫內部分交付文件仍引用這些歷史證據，相關連結只適用於原始完整工作區；當前驗證與重現所需的證據已另行收錄。

11 月 13 日的測試輸出與檔案指紋保持原始內容和時間。GitHub 上傳屬 11 月 14 日的新操作，與當時「尚未建立遠端倉庫」的執行快照分開記錄。原始碼與網站使用相同的已驗證版本。

## 執行與授權範圍

本次操作只保存版本，不啟動 Docker、API 或 Streamlit，也不新增自動執行的 CI。Repository 保持私人，GitHub Pages、公開可見性及付費託管均未設定。

作者尚未選定本專題的開源授權；目前保留作者權利，第三方元件依各自條款辦理。Repository 中列出依賴安裝方式，並未附帶虛擬環境、第三方套件或容器映像。授權審查清單見 [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)。

## 後續 GitHub Pages 入口修正

後續檢查時，Repository 已顯示為 `public`，GitHub Pages 根網址也已提供頁面。根目錄原先只有 README，Pages 因此把英文 README 渲染成首頁；實際網站仍完整位於 `web/index.html`。

修正加入根目錄 `index.html` 與 `.nojekyll`，讓 Pages 根網址開啟既有網站，並保留網址中的查詢參數及章節錨點。README 同步加入網站連結。`web/` 的 HTML、CSS、JavaScript、圖片與保存證據均沿用原版本。

網站入口為 `https://rozias0925.github.io/FY26-Portfolio-Deploy/`。本次範圍為既有公開靜態網站的入口修正；API、Streamlit、Docker、付費服務及原始 Factor GCN 整合維持各自原狀。上方私人設定的敘述記錄首次上傳當時的狀態。
