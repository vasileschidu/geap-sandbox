"""Local prototype server (http://localhost:8935) that never lets the browser cache.

`python -m http.server` sends no Cache-Control, so Chrome reuses a cached page when a link is
opened and shows the old version until a refresh. Usage: python3 tools/dev-server.py [port]
"""
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8935
    root = Path(__file__).resolve().parent.parent
    ThreadingHTTPServer(("", port), partial(NoCacheHandler, directory=str(root))).serve_forever()
