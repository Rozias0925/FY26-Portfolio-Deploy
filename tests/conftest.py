"""A real loopback HTTP server for dashboard/API end-to-end checks."""
import socket
import threading
import time
from urllib.error import URLError
from urllib.request import urlopen

import pytest
import uvicorn


@pytest.fixture(scope="module")
def live_api():
    from backend.app.main import app
    listener = socket.socket()
    listener.bind(("127.0.0.1", 0))
    listener.listen(128)
    port = listener.getsockname()[1]
    server = uvicorn.Server(uvicorn.Config(app, log_level="critical", access_log=False))
    worker = threading.Thread(target=server.run, kwargs={"sockets": [listener]}, daemon=True)
    worker.start()
    base = f"http://127.0.0.1:{port}"
    try:
        for _ in range(100):
            try:
                with urlopen(base + "/health", timeout=0.2) as response:
                    if response.status == 200:
                        break
            except (URLError, TimeoutError, OSError):
                time.sleep(0.05)
        else:
            raise RuntimeError("Loopback API failed to start")
        yield base
    finally:
        server.should_exit = True
        worker.join(timeout=8)
        listener.close()

