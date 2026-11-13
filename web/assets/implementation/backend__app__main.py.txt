"""Run locally: python -m uvicorn backend.app.main:app --host 127.0.0.1 --no-access-log."""

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import HTMLResponse, JSONResponse

from backend.app.local_docs import LOCAL_DOCS_HTML
from backend.app.routes import router
from demo.graph_demo_model import MODEL_VERSION

app = FastAPI(
    title="Synthetic Graph Portfolio Engineering Demo",
    version=MODEL_VERSION,
    docs_url=None,
    redoc_url=None,
    swagger_ui_oauth2_redirect_url=None,
    description=(
        "Local educational API using fictional observations only. No real securities, "
        "investment advice, trained Factor GCN, or original research assets. "
        "Use 127.0.0.1 host binding; public deployment requires human review."
    ),
)
app.include_router(router)


@app.get("/docs", response_class=HTMLResponse, include_in_schema=False)
def local_api_explorer() -> HTMLResponse:
    """Offline educational explorer; no externally hosted scripts or styles."""
    return HTMLResponse(
        LOCAL_DOCS_HTML,
        headers={
            "Content-Security-Policy": (
                "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; "
                "connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"
            ),
            "Referrer-Policy": "no-referrer",
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_error(_request: Request, exception: RequestValidationError) -> JSONResponse:
    # Avoid echoing submitted URLs, file paths, payloads, or sensitive input.
    known_locations = {"body", "scenario_id", "seed", "risk_level"}
    errors = [
        {
            "type": error["type"],
            "loc": [
                part if isinstance(part, int) or part in known_locations else "unrecognized_field"
                for part in error["loc"]
            ],
            "msg": error["msg"],
        }
        for error in exception.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": errors})


@app.exception_handler(Exception)
async def unexpected_error(_request: Request, _exception: Exception) -> JSONResponse:
    # Intentionally no request/body logging and no traceback in client responses.
    return JSONResponse(status_code=500, content={"detail": "Simulation failed safely."})
