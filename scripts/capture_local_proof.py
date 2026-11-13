"""Capture real loopback responses after starting the API and dashboard."""
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.request import ProxyHandler, Request, build_opener

ROOT = Path(__file__).resolve().parents[1]
if __name__ == "__main__":
    opener = build_opener(ProxyHandler({}))
    responses = {}
    for route in ("health", "model-info", "scenarios", "openapi.json"):
        with opener.open("http://127.0.0.1:8000/" + route, timeout=8) as response:
            responses[route] = {"status": response.status, "body": json.load(response)}
    for scenario in ("scenario_a", "scenario_b", "scenario_c"):
        payload = {"scenario_id": scenario, "seed": 42, "risk_level": "balanced"}
        request = Request("http://127.0.0.1:8000/simulate", data=json.dumps(payload).encode(),
                          headers={"Content-Type": "application/json"})
        with opener.open(request, timeout=8) as response:
            body = json.load(response)
            assert body["metadata"]["data_mode"] == "synthetic"
            assert body["metadata"]["investment_advice"] is False
            assert abs(sum(row["weight"] for row in body["allocations"]) - 1) < 1e-8
            responses[scenario] = {"status": response.status, "request": payload, "body": body}
    for name, url in (("local-docs", "http://127.0.0.1:8000/docs"),
                      ("dashboard-health", "http://127.0.0.1:8501/_stcore/health"),
                      ("static-site", "http://127.0.0.1:8080/")):
        with opener.open(url, timeout=8) as response:
            assert response.status == 200
            responses[name] = {"status": response.status}
    evidence = {"captured_at": datetime.now(timezone(timedelta(hours=8))).isoformat(),
                "transport": "real HTTP to 127.0.0.1 only", "responses": responses}
    path = ROOT / "docs" / "evidence" / "local-http.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(evidence, ensure_ascii=False, indent=2), encoding="utf-8")
    print("PASS: 4 GET schemas, 3 genuine simulation responses, local docs, UI health, static site.")
