"""Local synthetic-only interface. All inference happens in the HTTP backend."""

from __future__ import annotations

import json
import os
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener

import pandas as pd
import streamlit as st


API_BASE_URL = os.environ.get("API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
HTTP_TIMEOUT_SECONDS = 8
MAX_RESPONSE_BYTES = 2_000_000


class ApiError(Exception):
    """A safe user-facing connection or response error."""


class RejectRedirects(HTTPRedirectHandler):
    """Keep every request on its explicitly configured local service origin."""

    def redirect_request(self, _request, _file, _code, _message, _headers, _new_url):
        raise ApiError("本機 API 回傳重新導向，介面已停止跟隨，請檢查服務設定。")


def call_api(path: str, payload: dict | None = None) -> dict:
    """Call a fixed backend route; never import or recompute the demo model."""
    try:
        parsed = urlsplit(API_BASE_URL)
        _validated_port = parsed.port  # Assignment avoids Streamlit magic rendering this internal value.
    except ValueError:
        raise ApiError("API_BASE_URL 設定無效。請使用本機或 Compose 的 api 服務位址。") from None
    if (
        parsed.scheme not in {"http", "https"}
        or parsed.hostname not in {"127.0.0.1", "localhost", "::1", "api"}
        or parsed.username is not None
        or parsed.password is not None
        or parsed.query
        or parsed.fragment
        or parsed.path not in {"", "/"}
    ):
        raise ApiError("API_BASE_URL 僅接受 localhost、127.0.0.1、::1 或 Compose 的 api，且不可含帳密、查詢參數或路徑。")
    body = None if payload is None else json.dumps(payload).encode("utf-8")
    request = Request(
        API_BASE_URL + path,
        data=body,
        method="GET" if payload is None else "POST",
        headers={"Accept": "application/json", "Content-Type": "application/json"},
    )
    # Do not inherit a machine's HTTP(S)_PROXY or follow redirects off this origin.
    opener = build_opener(ProxyHandler({}), RejectRedirects())
    try:
        with opener.open(request, timeout=HTTP_TIMEOUT_SECONDS) as response:
            raw = response.read(MAX_RESPONSE_BYTES + 1)
        if len(raw) > MAX_RESPONSE_BYTES:
            raise ApiError("API 回應超過介面可接受的大小，請檢查後端版本。")
        result = json.loads(raw)
        if not isinstance(result, dict):
            raise ApiError("API 回應格式不符，請確認後端與介面使用相同版本。")
        return result
    except HTTPError as error:
        if error.code == 422:
            raise ApiError("API 拒絕了參數（HTTP 422）。請重新選擇情境、種子與風險參數。") from None
        raise ApiError(f"API 回報 HTTP {error.code}。請查看本機後端狀態。") from None
    except (URLError, TimeoutError, OSError):
        raise ApiError("無法連線至本機 API，或等待超過 8 秒。請先啟動後端，再按重新連線。") from None
    except (ValueError, UnicodeDecodeError):
        raise ApiError("API 未回傳有效 JSON。請確認服務與版本設定。") from None


def require_synthetic(response: dict) -> None:
    """Refuse a response without the required scope labels."""
    if response.get("data_mode") != "synthetic" or response.get("investment_advice") is not False:
        raise ApiError("回應缺少合成資料識別。介面已停止呈現，請檢查後端設定。")


def render_result(result: dict, request: dict, is_current: bool) -> None:
    metadata = result.get("metadata", {})
    require_synthetic(metadata)
    if (
        metadata.get("model_id") != "demo_synthetic_graph_model"
        or metadata.get("original_factor_gcn") != "NOT INTEGRATED"
    ):
        raise ApiError("回應不是本專題的合成示範模型，介面已停止呈現。")

    if is_current:
        st.success("下列結果對應目前選擇的參數，來自一次真正的本機 HTTP /simulate 呼叫。")
    else:
        st.warning("參數已變更，或最新請求尚未成功。下列為上一次成功結果；按「呼叫合成 API」才會更新。")
    st.caption(
        f"結果參數：{request['scenario_id']} · seed={request['seed']} · "
        f"risk_level={request['risk_level']} · model={metadata.get('model_version', 'unknown')}"
    )
    st.caption("前 120 日建立圖與目標權重；後 60 日每日按相同目標權重計算，隱含每日權重重設，未模擬再平衡執行、周轉率與成本。沒有真實證券或真實歷史績效。")

    metrics = result["metrics"]
    columns = st.columns(4)
    columns[0].metric("合成累積變化", f"{metrics['cumulative_return']:.2%}")
    columns[1].metric("合成年化波動", f"{metrics['annualized_volatility']:.2%}")
    sharpe = metrics.get("sharpe_ratio")
    columns[2].metric("合成 Sharpe", "未定義" if sharpe is None else f"{sharpe:.2f}")
    columns[3].metric("合成最大回落", f"{metrics['max_drawdown']:.2%}")
    st.caption("年化使用每年 252 個示意觀測日；Sharpe 以無風險利率 0 計算。60 日小樣本不能驗證金融模型有效性。")

    allocations = pd.DataFrame(result["allocations"])
    st.subheader("1. 合成資產配置")
    st.bar_chart(allocations.set_index("asset_id")[["weight"]], y_label="示範權重", color="#36B9A0")
    st.dataframe(
        allocations.rename(columns={"asset_id": "虛構資產 ID", "label": "名稱", "weight": "權重"}),
        hide_index=True,
        use_container_width=True,
    )
    st.caption("SIM-01 等 ID 是程式內的虛構標籤；權重僅用來教學，不是買賣建議。")

    st.subheader("2. 合成評估曲線")
    equity = pd.DataFrame(result["equity_curve"])
    st.line_chart(equity.set_index("day")[["equity"]], x_label="合成評估日（0 = 起點）", y_label="初值 1 的合成指數")

    with st.expander("3. 檢視圖結構與模型計算說明"):
        st.write("節點是虛構資產；邊代表前 120 個合成觀測日的相關程度。下列內容直接來自 API。")
        st.dataframe(pd.DataFrame(result["graph"]["nodes"]), hide_index=True, use_container_width=True)
        st.dataframe(pd.DataFrame(result["graph"]["edges"]), hide_index=True, use_container_width=True)
        st.json(result.get("explainability", {}))

    with st.expander("4. 對照 Request / Response JSON"):
        request_tab, response_tab, metadata_tab = st.tabs(["送出的 Request", "收到的 Response", "版本與資料邊界"])
        with request_tab:
            st.code(json.dumps(request, ensure_ascii=False, indent=2), language="json")
        with response_tab:
            st.json(result)
        with metadata_tab:
            st.json(metadata)


def main() -> None:
    st.set_page_config(page_title="Synthetic Graph · 本機工程展示", page_icon="◉", layout="wide")
    st.title("Graph-Based Portfolio · 本機工程展示")
    st.markdown("**Synthetic Data Demo · Illustrative Results · No Real Securities**")
    st.info("這個介面只呼叫本機合成資料 API。原始 Factor GCN：NOT INTEGRATED；沒有載入原研究模型或權重。")
    st.caption("教學與軟體工程展示；不提供投資建議、交易訊號、資產管理或任何報酬保證。")

    try:
        health = call_api("/health")
        require_synthetic(health)
        if health.get("status") != "ok":
            raise ApiError("後端尚未就緒，請稍後重新連線。")
        scenarios = call_api("/scenarios")
        require_synthetic(scenarios)
        model_info = call_api("/model-info")
        require_synthetic(model_info)
        if (
            model_info.get("model_id") != "demo_synthetic_graph_model"
            or model_info.get("original_factor_gcn") != "NOT INTEGRATED"
            or model_info.get("trained_model") is not False
        ):
            raise ApiError("後端並非本專題的合成示範服務，已停止呼叫。")
    except ApiError as error:
        st.error(str(error))
        st.code("python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --no-access-log", language="powershell")
        st.write("以原生 Python 啟動時，先開另一個終端機執行上列指令；Docker 模式請在專案根目錄執行 docker compose up --build。")
        st.button("重新連線", key="reconnect")
        st.stop()

    st.caption(f"本機 API 已連線 · 服務版本 {health.get('version', 'unknown')} · 每次 HTTP 請求最多等待 8 秒")
    with st.expander("先理解：介面與後端各做什麼？"):
        st.write("你選參數 → Streamlit 送出 HTTP POST → FastAPI 驗證 → 合成圖模型計算 → JSON 回應 → 介面畫圖。")
        st.write("Streamlit 不重算模型。瀏覽器的靜態教學網站則有另一個純 JavaScript 示意 Demo，不依賴這個 API。")
        st.json(model_info)

    catalog = scenarios["scenarios"]
    ids = [item["id"] for item in catalog]
    labels = {item["id"]: item["label"] for item in catalog}
    descriptions = {item["id"]: item["description"] for item in catalog}
    allowed = scenarios["allowed_parameters"]
    controls = st.columns([2, 1, 1])
    with controls[0]:
        scenario_id = st.selectbox("合成情境", ids, format_func=lambda value: labels[value])
    with controls[1]:
        seed = st.number_input(
            "隨機種子 seed",
            min_value=int(allowed["seed"]["minimum"]),
            max_value=int(allowed["seed"]["maximum"]),
            value=int(allowed["seed"]["default"]),
            step=1,
            help="相同程式、依賴與參數下，固定 seed 會重現相同合成輸入及輸出。",
        )
    with controls[2]:
        risk_levels = allowed["risk_level"]
        risk_level = st.selectbox(
            "演算法參數 risk_level",
            risk_levels,
            index=risk_levels.index("balanced") if "balanced" in risk_levels else 0,
            help="改變波動懲罰、溫度與集中度；名稱不保證每次實現波動依序排列。",
        )
    st.write(descriptions[scenario_id])
    current_request = {"scenario_id": scenario_id, "seed": int(seed), "risk_level": risk_level}
    st.caption("low / balanced / high 是示範演算法的參數名稱，並非個人風險承受度問卷。")

    if st.button("呼叫合成 API", type="primary"):
        st.session_state["latest_attempt_succeeded"] = False
        try:
            with st.spinner("正在呼叫本機 FastAPI 與合成模型…"):
                result = call_api("/simulate", current_request)
                require_synthetic(result.get("metadata", {}))
            st.session_state["last_result"] = result
            st.session_state["last_request"] = current_request.copy()
            st.session_state["latest_attempt_succeeded"] = True
            st.session_state.pop("request_error", None)
        except ApiError as error:
            st.session_state["request_error"] = str(error)

    if st.session_state.get("request_error"):
        st.error(st.session_state["request_error"])
    if "last_result" in st.session_state:
        is_current = (
            current_request == st.session_state["last_request"]
            and st.session_state.get("latest_attempt_succeeded", False)
        )
        try:
            render_result(st.session_state["last_result"], st.session_state["last_request"], is_current)
        except (ApiError, KeyError, TypeError, ValueError) as error:
            message = str(error) if isinstance(error, ApiError) else "API 結果欄位不符介面規格，請確認程式版本。"
            st.error(message)
    else:
        st.write("選好參數後按上方按鈕，介面才會執行一次真正的 HTTP 模擬請求。")

    st.divider()
    st.caption("不輸入真實股票代碼、不上傳檔案、不收集個人資料。請保持服務僅綁定本機 127.0.0.1。")


if __name__ == "__main__":
    main()
