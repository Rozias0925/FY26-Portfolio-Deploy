# 網站內容更新紀錄

日期：2026-11-13，Asia/Taipei。專案版本：1.1.2。範圍為本機靜態網站。

## 更新內容

- 首頁加入工程驗收摘要，直接讀取保存的 Python、網站及 Docker 證據，呈現 141／32／12／6 四項結果。
- 實作成果頁加入兩張 2026-11-13 的 Docker Dashboard 實際操作畫面，以及可下載的容器驗收摘要 JSON。
- 容器摘要保留合成資料、原始 Factor GCN 整合狀態、來源核對、映像重用、HTTP／UI 結果與清理狀態；原始指令、使用者路徑及容器 ID 留在本機證據。
- 第六章、第九章及重現說明同步記錄已完成的容器驗收。舊原生截圖保留 2026-10-18 的原日期。
- README、驗證文件與交付報告同步使用最新完整驗證結果。

成果頁位置為 `web/index.html#implementation/docker-verification`。訪客可閱讀保存的畫面與 JSON，瀏覽器合成展示也可獨立操作。

## 驗證結果

完整驗證生成時間：`2026-11-13T21:39:50.395017+08:00`。

| 項目 | 結果 |
| --- | --- |
| Windows／CPython 3.12.14 完整測試 | 141 passed、1 warning、21.53s |
| 網站結構與資源 | 32 passed、0 failed |
| 套件相依 | pip check 通過 |
| 來源與網站指紋 | 48 個來源檔案、32 個網站檔案 |
| 桌面 1280 × 720 | 四欄摘要、成果連結、圖片載入正常，無橫向溢出 |
| 手機 390 × 844 | 兩欄摘要、圖片載入、目錄開合正常，無橫向溢出 |

總來源指紋：`f31243cec641ac9c951582c26047701a25e2f4f3d05488f092325cfd999c4fb7`。

網站檢查新增兩項有意義的核對：公開容器摘要與原始實測的一致性，以及圖片位元組與公開資料範圍。實際瀏覽器紀錄見 [site-refresh-browser-20261113.json](evidence/site-refresh-browser-20261113.json)。本次瀏覽器截圖 API 無法擷取畫面，桌面與手機版面的檢查依據為 DOM、圖片載入狀態及渲染尺寸。

## 證據時間與服務狀態

Docker 的 12 項 HTTP 與 6 項介面結果對應同日 `17:25:43.372310+08:00` 的獨立驗收。本次匯入前再次核對其 20 個執行來源檔案。這次網站更新沒有重新啟動 Docker、API 或 Streamlit。

瀏覽器檢查僅短暫啟動專案靜態 HTTP 伺服器，結束後已停止。測試分頁已關閉，手機尺寸設定已還原。原有背景工作保留。

更新前快照位於 [20261113-before-site-refresh](evidence/history/20261113-before-site-refresh/)，新的原生驗證結果另存 [native-verification-20261113-site-refresh.json](evidence/native-verification-20261113-site-refresh.json)。

網站維持本機版本，對外發布及研究素材整合保留審核。原始 Factor GCN 狀態為 `NOT INTEGRATED`。
