# Docker 安裝進度與容器驗收

最新檢查日期：2026-11-13，Asia/Taipei。專案來源版本：1.1.2；示範 API／模型版本維持 1.0.0。

## 目前結果

**Docker 容器驗收已通過。** 本輪完成合成 HTTP 測試、Streamlit 表單與圖表操作、自有容器／網路清理，以及本輪啟動的 Docker Desktop 停止。結束時 Docker Desktop 與 backend 程序數均為 0，Engine 已無法連線；其他背景工作保持原狀。

| 項目 | 實際結果與證據 |
| --- | --- |
| Docker runtime | `passed`；[完整執行紀錄](evidence/docker-runtime-20261113.json)、[一次性收尾](evidence/docker-once-20261113.json) |
| 真實 HTTP | 12 項通過，包含服務資訊、三情境合成推論、固定 seed 重現、文件與無效輸入的 422 回應；[HTTP 紀錄](evidence/docker-http-20261113.json) |
| Dashboard 操作 | 6 項通過；[UI 紀錄](evidence/docker-dashboard-ui-20261113.json)、[圖表畫面](evidence/docker-dashboard-20261113.jpg)、[metadata 畫面](evidence/docker-dashboard-metadata-20261113.jpg) |
| 容器環境 | Linux／CPython 3.12.16，兩個服務均以 UID 10001 執行；兩個 `pip check` 皆通過 |
| 本輪服務限額 | API 384 MiB、Dashboard 512 MiB，各 0.5 CPU、64 MiB tmpfs；實際值保存於 runtime 的 `resource_limits` |
| 自有資源清理 | Compose 容器與專案網路清理通過；本輪使用既有映像，沒有建立新 builder |
| 引擎停止 | 本輪 Docker Desktop 已停止；程式只核對並處理本次資源，沒有使用全域 prune 或 WSL shutdown |
| 服務公開範圍 | 主機連接埠限定 `127.0.0.1`；容器服務屬本機工程驗證 |

API 與 Dashboard 映像已在同日先前的建置階段成功建立，耗時分別為 93.235 秒與 297.0 秒。最後成功驗收沿用這兩個映像，先核對 **18 個映像來源輸入 SHA256** 與 **兩個本機 image ID**，再以 `up --no-build` 啟動。這次沿用結果與先前建置結果分開記錄；[建置原始紀錄](evidence/history/20261113-docker-port-attempt/docker-once-20261113.json) 保留實際建置輸出。

基底 `python:3.12-slim` 當次解析的 digest 為 `sha256:5e2bdb1b0d542d5039cffb8181c65930093949194a65c365dfb1b0fe13a4fa5b`。Dockerfile 目前仍使用浮動 tag；保存本次解析值與固定未來的建置輸入是兩件事。

## 網路設定與修正依據

本輪實測發現，僅連接 `internal:true` 網路時，兩個服務 healthcheck 都可通過，但 host port 未建立，`docker compose port` 回傳 `:0`。省略 `published` 後仍有相同結果，紀錄見 [internal 網路對照](evidence/docker-port-probe-20261113-internal.json)。

改為專案專用 `bridge`、`internal:false` 後，使用相同映像與 loopback 動態連接埠成功連線，見 [bridge 對照](evidence/docker-port-probe-20261113.json)。正式 Compose 與 verifier 均採此設定；verifier 省略 `published`，交由 Docker 配置可用 host port，並持續核對實際回傳位址為 `127.0.0.1` 且埠號有效。

**此 bridge 允許容器對外連線，並非離線或 air-gapped 網路。** `127.0.0.1` 約束主機上的入站服務範圍。非 root、唯讀根檔案系統、無 host volume、禁止提權與 build allowlist 分別保留，不將網路範圍與檔案／權限邊界混為一談。

對應的部署政策與 verifier 單元檢查已實際通過 22 項。這些檢查驗證設定及失敗清理；真正容器行為由上面的 HTTP／UI／runtime 紀錄證明。

## 後續重現

一般 verifier 入口如下。先自行開啟適用的本機 Docker Engine，核對 context 的 endpoint 為本機，再於該終端指定 context；保留全域 context 與其他 Docker 工作。

```powershell
docker context inspect desktop-linux
$env:DOCKER_CONTEXT = 'desktop-linux'
.\.venv\Scripts\python.exe scripts/verify_docker.py
```

工具建立獨立 Compose project，配置動態 loopback host ports，並在結束時清理自己建立的容器與網路。一般 verifier 不負責退出原本已運作的 Docker Desktop；本輪另外使用一次性私有流程，保存資源限額、UI 握手及 Desktop 停止證據。若要重現只啟動一次的操作，應先確認引擎的原始狀態及其他工作，再安排相同的正常收尾。

## 安裝、條款與歷史紀錄

2026-11-11 已安裝 Microsoft WSL 3.0.5 與 Docker Desktop 4.96.0.243774，安裝器簽章與檔案指紋已核對，兩次安裝退出碼皆為 0；本機 CLI 為 Docker 29.9.1、Compose v5.6.0。[安裝證據](evidence/docker-setup-20261111.json) 保留原始結果。

代理程式沒有代為接受 Docker 首次使用條款，沒有建立付費服務、公開網站或遠端倉庫。Docker 的使用與散布條件依作者的實際用途自行確認。[Docker 官方安裝與首次啟動](https://docs.docker.com/desktop/setup/install/windows-install/)

- 2026-10-20：VMP 與 WSL 的安裝前置問題，見 [當時安裝紀錄](evidence/docker-installation-20261020.json)。
- 2026-11-11：Engine 未啟動的前置檢查失敗，見 [當時 verifier](evidence/docker-runtime-20261111.json)。
- 2026-11-13：第一次私有 inspect 工具讀取可選欄位失敗，已收尾，見 [第一次嘗試](evidence/history/20261113-docker-first-attempt/docker-once-20261113.json)。
- 同日先前：映像建置與 healthcheck 成功，host port 未建立，見 [埠配置嘗試](evidence/history/20261113-docker-port-attempt/docker-once-20261113.json)。

目前容器、專案網路與本輪引擎均已停止。Docker 映像與必要證據保留本機，供後續檢查；靜態網站閱讀與託管可獨立進行。