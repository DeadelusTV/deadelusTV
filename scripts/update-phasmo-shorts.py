#!/usr/bin/env python3
"""Synchroniser la playlist Phasmophobia avec YouTube Data API v3.

Clé via YOUTUBE_API_KEY uniquement. Sur erreur ou réponse vide, ne jamais
remplacer le dernier JSON valide. Bibliothèque standard Python uniquement.
"""
import argparse
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

PLAYLIST_ID = "PL-fyrrZ6KfGkn4a2bt07-HqyjIncP_X7g"
CHANNEL_ID = "UCTHePQHat_CYO3tqRfxLFRw"
PLAYLIST_URL = "https://www.youtube.com/playlist?list=" + PLAYLIST_ID
API_URL = "https://www.googleapis.com/youtube/v3/playlistItems"
VALID_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")


def fetch_page(api_key, token=None):
    params = {"part": "snippet,status", "playlistId": PLAYLIST_ID,
              "maxResults": 50, "key": api_key}
    if token:
        params["pageToken"] = token
    request = Request(API_URL + "?" + urlencode(params),
                      headers={"Accept": "application/json"})
    try:
        with urlopen(request, timeout=25) as response:
            data = response.read(3_000_001)
    except HTTPError as error:
        # Ne pas imprimer l'URL contenant la clé privée.
        raise ValueError("YouTube Data API, HTTP " + str(error.code)) from None
    except (URLError, TimeoutError):
        raise ValueError("YouTube Data API indisponible") from None
    if len(data) > 3_000_000:
        raise ValueError("Réponse YouTube trop volumineuse")
    page = json.loads(data.decode("utf-8"))
    if not isinstance(page, dict) or not isinstance(page.get("items"), list):
        raise ValueError("Réponse YouTube incorrecte")
    return page


def thumbnail(thumbnails):
    for size in ("maxres", "standard", "high", "medium", "default"):
        entry = (thumbnails or {}).get(size) or {}
        url = entry.get("url", "")
        host = urlparse(url)
        if host.scheme == "https" and (host.hostname == "i.ytimg.com" or
                                       (host.hostname or "").endswith(".ytimg.com")):
            return url
    return None


def collect(api_key):
    entries = []
    seen_ids = set()
    seen_tokens = set()
    token = None
    for _ in range(30):
        page = fetch_page(api_key, token)
        for item in page["items"]:
            snippet = item.get("snippet") or {}
            status = item.get("status") or {}
            if status.get("privacyStatus") not in (None, "public"):
                continue
            owner = snippet.get("videoOwnerChannelId")
            if owner and owner != CHANNEL_ID:
                continue
            video_id = (snippet.get("resourceId") or {}).get("videoId", "")
            title = (snippet.get("title") or "").strip()
            if (not VALID_ID.fullmatch(video_id) or video_id in seen_ids or
                    not title or title.lower() in ("private video", "deleted video")):
                continue
            picture = thumbnail(snippet.get("thumbnails"))
            if not picture:
                continue
            seen_ids.add(video_id)
            entries.append({"id": video_id, "title": title,
                            "url": "https://www.youtube.com/shorts/" + video_id,
                            "thumbnail": picture})
        token = page.get("nextPageToken")
        if not token:
            break
        if token in seen_tokens:
            raise ValueError("Pagination YouTube invalide")
        seen_tokens.add(token)
    else:
        raise ValueError("Limite de pagination atteinte")
    if not entries:
        raise ValueError("Playlist vide ou inaccessible : ancien JSON conservé")
    return {"schemaVersion": 1, "playlistId": PLAYLIST_ID,
            "playlistUrl": PLAYLIST_URL, "videos": entries}


def save_atomic(path, value):
    payload = json.dumps(value, ensure_ascii=False, indent=2) + "\n"
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_file() and path.read_text(encoding="utf-8") == payload:
        return
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8",
                                         dir=path.parent, prefix=".phasmo-",
                                         delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(payload)
        temporary.chmod(0o644)
        os.replace(temporary, path)
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path,
                        default=Path("public/data/phasmo-shorts.json"))
    args = parser.parse_args()
    key = os.environ.get("YOUTUBE_API_KEY", "").strip()
    if not key:
        print("YOUTUBE_API_KEY absent (secret GitHub requis)", file=sys.stderr)
        return 1
    for attempt in range(2):
        try:
            result = collect(key)
            save_atomic(args.output, result)
            print("Phasmophobia : " + str(len(result["videos"])) + " vidéos récupérées.")
            return 0
        except (ValueError, KeyError, TypeError, OSError, json.JSONDecodeError) as error:
            if attempt == 0:
                time.sleep(2)
            else:
                print("Échec synchronisation : " + str(error), file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
