#!/usr/bin/env python3
"""Statut du direct Twitch via API Helix : petit service local à placer derrière Caddy.

Ne pas publier ce script dans public/. Variables d'environnement obligatoires :
TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET. Aucune valeur privée dans GitHub.
"""
import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlencode
from urllib.request import Request, urlopen


class TwitchStatusClient:
    def __init__(self, client_id, client_secret, opener=urlopen, clock=time.monotonic):
        self.client_id = client_id
        self.client_secret = client_secret
        self.opener = opener
        self.clock = clock
        self.token = None
        self.token_expiry = 0
        self.live_cache = None
        self.live_expiry = 0
        self.lock = threading.Lock()

    def _json(self, request):
        with self.opener(request, timeout=5) as response:
            return json.loads(response.read().decode("utf-8"))

    def _token(self):
        now = self.clock()
        if self.token and now < self.token_expiry:
            return self.token
        payload = urlencode({
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "client_credentials",
        }).encode("ascii")
        request = Request(
            "https://id.twitch.tv/oauth2/token",
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST",
        )
        token = self._json(request)
        access_token = token["access_token"]
        lifetime = int(token["expires_in"])
        self.token, self.token_expiry = access_token, now + max(0, lifetime - 60)
        return access_token

    def get_live(self):
        with self.lock:
            now = self.clock()
            if self.live_cache is not None and now < self.live_expiry:
                return self.live_cache
            token = self._token()
            request = Request(
                "https://api.twitch.tv/helix/streams?user_login=deadelustv",
                headers={
                    "Client-ID": self.client_id,
                    "Authorization": "Bearer " + token,
                },
            )
            response = self._json(request)
            if not isinstance(response.get("data"), list):
                raise ValueError("Réponse Helix invalide")
            live = any(stream.get("type") == "live" for stream in response["data"])
            self.live_cache, self.live_expiry = live, now + 45
            return live


class Handler(BaseHTTPRequestHandler):
    client = None

    def do_GET(self):
        if self.path != "/api/twitch-status":
            self.send_error(404)
            return
        try:
            body = json.dumps({"live": self.client.get_live()}).encode("utf-8")
            code = 200
        except Exception:
            # Échec = inconnu, jamais « hors ligne » inventé.
            body = b'{"error":"unavailable"}'
            code = 503
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    client_id = os.environ.get("TWITCH_CLIENT_ID", "").strip()
    client_secret = os.environ.get("TWITCH_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise SystemExit("Variables TWITCH_CLIENT_ID et TWITCH_CLIENT_SECRET requises.")
    Handler.client = TwitchStatusClient(client_id, client_secret)
    server = ThreadingHTTPServer(("127.0.0.1", 8765), Handler)
    server.serve_forever()


if __name__ == "__main__":
    main()
