# 發布與人工審核關卡

**本機候選版本：1.1.2，2026-11-13；公開發布狀態：PENDING REVIEW，不自動發布。**

2026-11-14 決定更新：作者已指示上傳至 `https://github.com/Rozias0925/FY26-Portfolio-Deploy.git`。經查該 Repository 為空的私人倉庫；本次保留私人設定，收錄新合成工程及選定證據。此指示已提供本次 GitHub 上傳授權；下方 11 月 13 日的審查紀錄保留其原日期。公開託管、原研究素材整合、授權條款選擇及付費資源仍各自審核。

這份清單區分本機工程驗證、可選強化與權利／發布決定。空白 checkbox 表示尚未由負責人完成最終核對，不表示所有項目都是本輪必做功能。當前結果以 [testing.md](testing.md) 與 [交付報告](RELEASE_REPORT.md) 的實際版本、時間及原始輸出為準。

## A. 專案隔離與模型身分

- [ ] 新專題在獨立資料夾內工作；原 Factor GCN 網站及研究成果未被擅自變更。
- [ ] 沒有把「檔案存在」推論成已獲得原模型、合作研究或金融資料使用權。
- [ ] `/simulate` 只用新合成程式，未讀取行情、TEJ、企業合作資料、原模型或 checkpoint。
- [ ] Python 固定規則模型、瀏覽器 JavaScript 示意及原 Factor GCN 三者清楚區分，原模型保持 `NOT INTEGRATED`。
- [ ] 介面、metadata、來源摘錄與文件沒有把合成示例寫成真實投資建議、原研究績效或已訓練模型成果。
- [ ] `.gitignore`、候選檔案及可能存在的 Git 歷史沒有金鑰、受限資料、私有模型、venv 或本機暫存。

## B. 當前本機工程驗收

- [ ] 在明確支援的 CPython 3.12.x 環境依 [本機重現指南](LOCAL_REPRODUCTION.md) 建立新環境，不覆寫運作中的 `.venv`。
- [ ] 記錄當前 master verification 的實際命令、環境、passed／warning／失敗數及耗時；沒有沿用舊的 118 作為新結果。
- [ ] 固定 seed 可重現，權重非負且總和約為 1；校準與後續評估區段分離。
- [ ] `/health`、`/model-info`、`/scenarios`、`/simulate` 與 synthetic／no-advice 標籤符合實際輸出。
- [ ] 不合法 seed、情境、risk_level 與額外欄位被拒絕，錯誤回應不包含敏感輸入或 traceback。
- [ ] Dashboard 只透過 HTTP 使用 API，顯示配置、曲線、指標與來源；離線、逾時、參數改變及請求失敗不會把舊結果當作新成功。
- [ ] Dashboard 的 origin、proxy、redirect、回應大小與錯誤清理邊界有實際測試。
- [ ] 已知固定埠被占用時，launcher 只拒絕啟動，不停止既有 listener；本輪沒有擅自重啟或關閉其他背景服務。
- [ ] 若另行執行 launcher smoke，只清理該次建立的程序；清理結果附上該次時間，不能套用到仍運作的其他服務。
- [ ] 網站不啟動 Python 仍可讀九章、術語、本機實作成果與瀏覽器合成展示；來源摘錄與實際程式版本一致。
- [ ] 目錄、前後頁、術語搜尋、JSON tabs、學生研究說明及手機版經抽樣操作；未測裝置及正式無障礙認證明列。

## C. 證據一致性與歷史保留

- [ ] 當前 `evidence/verification.json` 版本與時間正確，原始輸出、版本表、manifest 及網站 evidence.js 互相對應。
- [ ] 來源凍結後逐檔核對 SHA256；範圍包含要交付的程式、設定與網站素材，並說明生成證據自身的排除規則。
- [ ] 2026-10-18／1.0.0 的原始證據另存 `evidence/history/20261018/`，沒有用新輸出覆蓋後仍稱為原始快照。
- [ ] 「42 檔一致」、「預覽已關閉」等歷史敘述只歸屬原日期；當前報告沒有拿它們描述現在的服務或檔案。
- [ ] 截圖、HTTP 結果及實作成果匯出的日期分開可辨識；先 capture、再匯出來源、再產生 master 證據，沒有把靜態內容或歷史畫面冒充當次執行。
- [ ] 所附證據與素材沒有受限資訊或無需公開的本機路徑；公開聯絡方式經使用者授權或確認來源。

## D. Docker 驗證狀態

- [x] API／UI Dockerfile 與 Compose 的 loopback、非 root、唯讀、專案 bridge 及 build allowlist 有實際部署政策檢查。
- [x] Portable verifier 使用獨立 Compose project、動態 loopback host ports，只清理自己的資源；無效埠、ownership、外部共用網路與失敗清理有測試，本輪兩個測試檔共 22 項通過。
- [x] [當前 runtime](evidence/docker-runtime-20261113.json) 明列 passed；歷史 failed／not_run 嘗試保留，不以安裝或靜態檢查替代執行證據。
- [x] 兩個映像同日先前建置成功；最後驗收核對 18 個來源輸入 SHA256 與兩個 image ID，沿用映像完成 12 項真實 HTTP 檢查。
- [x] [Dashboard 實際操作](evidence/docker-dashboard-ui-20261113.json) 六項通過，保存圖表與 metadata 畫面。
- [x] 本輪自有 Compose 容器／網路清理通過，Docker Desktop 已停止；兩個 Docker 程序數均為 0，其他背景工作保留。

本區勾選表示已有工程證據，與下方權利及對外發布的人工決定分開。當前 bridge 允許容器對外連線，主機埠仍為 `127.0.0.1`；網路不是 air-gapped。來源 1.1.2 的完整測試結果以當前 master verification 為準，歷史 136 項只對應 2026-10-20。

## E. 可選後續強化

以下沒有在本輪自動擴充；先依實際散布或部署需求決定：

- [ ] 套件下載 hash、容器 image digest 與可重建映像策略。
- [ ] 在既有 Windows 原生與 Linux 容器實測之外，補充 macOS／Linux 原生、額外 Python／平台矩陣及跨 OS 逐位元重現。
- [ ] 外部 CVE 掃描、正式無障礙或其他專項稽核；不以 pip check 代替。
- [ ] 本專案的獨立 Git／版本策略及 CI 設計；建立遠端倉庫或執行遠端 CI 仍需另行核准。
- [ ] LICENSE、第三方 notices 與實際再散布方式；不替權利人擅自選擇授權。

## F. 四項人工權利關卡

| 關卡 | 負責人要確認的內容 | 目前決定 |
| --- | --- | --- |
| 研究權利 | 原模型 code、合作契約、著作權與保密義務；目前不整合原模型 | PENDING REVIEW |
| 資料權利 | 金融／衍生資料、研究圖表的使用與散布；目前只採新合成資料 | PENDING REVIEW |
| 金融服務界線 | 功能與文案保持研究及工程展示範圍；真實證券功能先另行審查 | PENDING REVIEW |
| 自製與第三方授權 | 確切套件／映像 LICENSE、通知、圖片來源及自製內容的授權決定 | PENDING REVIEW |

此表沒有認定法規資格或法律豁免；需要時應由具相應經驗的人協助確認。免責文字不能取代授權。

## G. 對外操作需要具體核准

- [ ] 負責人已閱讀當前交付的完成、未完成、失敗及 NOT RUN 項目。
- [ ] 已選定要公開的檔案與目的地，沒有直接上傳整個工作區或 venv。
- [ ] 已決定自製內容授權及所需第三方 notices。
- [ ] 已核准特定 repository 的建立、公開或 push；不是由本機測試成功推定許可。
- [ ] 已核准特定靜態網站發布與託管方式；沒有一併核准公共 Python API／Streamlit。
- [ ] 任何收費或續費資源都有該項明確核准；沒有以工程需求推定可付費。
- [ ] 中英文聲明、資料與模型身分及原研究連結沒有暗示未取得的背書。

## 人工決定記錄

```text
Reviewed local candidate version: 1.1.2
Reviewer: PENDING REVIEW
Date: PENDING REVIEW
Reviewed current source / manifest: PENDING REVIEW
Approved files and destination: PENDING REVIEW
Unresolved items / accepted limitations: PENDING REVIEW
Explicitly approved external actions: NONE
Original Factor GCN integration: NOT INTEGRATED
Docker runtime: PASSED (2026-11-13; owned resources cleaned; session Desktop stopped)
Public deployment: NOT AUTHORIZED
Paid resources: NOT AUTHORIZED
```

本機合成實作、測試與文件修正已可在授權範圍內進行；只有對外發布、付費及權利不明的資料／模型整合停在相應人工關卡，不以等待發布審核為由擱置本機工程。
