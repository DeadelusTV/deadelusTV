#!/usr/bin/env python3
"""Prévisualisation locale du site avec proxy de statut Twitch vers OVH."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

PUBLIC = Path(__file__).resolve().parents[1] / 'public'
UPSTREAM = 'https://www.deadelustv.com/api/twitch-status'
PORT = 8766


class PreviewHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split('?', 1)[0] != '/api/twitch-status':
            return super().do_GET()
        request = Request(UPSTREAM, headers={
            'Accept': 'application/json',
            'User-Agent': 'DeadelusTV-local-preview/1.0',
        })
        try:
            with urlopen(request, timeout=8) as response:
                code, payload = response.status, response.read(8192)
        except HTTPError as exc:
            code, payload = exc.code, exc.read(8192)
        except (URLError, TimeoutError, OSError):
            code, payload = 503, b'{"error":"unavailable"}'
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Length', str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_HEAD(self):
        if self.path.split('?', 1)[0] == '/api/twitch-status':
            self.send_error(405, 'GET uniquement')
            return
        return super().do_HEAD()


if __name__ == '__main__':
    if not (PUBLIC / 'index.html').is_file():
        raise SystemExit('Dossier public/ introuvable dans le dépôt.')
    handler = partial(PreviewHandler, directory=str(PUBLIC))
    with ThreadingHTTPServer(('127.0.0.1', PORT), handler) as server:
        print(f'Prévisualisation du site : http://127.0.0.1:{PORT}/')
        print(f'Statut Twitch transmis depuis : {UPSTREAM}')
        print('Pour arrêter : Ctrl+C')
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print('\nPrévisualisation arrêtée.')
