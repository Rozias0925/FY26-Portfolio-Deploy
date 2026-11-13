"""Serve only the reviewed static web tree, on loopback, without access logs."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[1] / "web"
    handler = partial(QuietHandler, directory=str(root))
    print("Educational site: http://127.0.0.1:8080 (Ctrl+C to stop)", flush=True)
    with ThreadingHTTPServer(("127.0.0.1", 8080), handler) as server:
        server.serve_forever()
