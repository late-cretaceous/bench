#!/usr/bin/env python3
# Serves this folder with caching turned off, so an edited file shows up on
# the next reload instead of whenever the browser feels like checking.

import http.server
import sys


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

    def log_message(self, *args):
        pass


port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
print(f'http://localhost:{port}')
http.server.ThreadingHTTPServer(('', port), Handler).serve_forever()
