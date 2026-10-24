#!/usr/bin/env python3
"""Read the public Videos tab and publish metadata only; never download a video.

This is a public-page reader, not the official YouTube Data API. If YouTube
changes its page structure, fail without overwriting the previous JSON file.
Python's standard library is sufficient; no key, cookies or login are used.
"""

import argparse
import json
import os
from pathlib import Path
import re
import sys
import tempfile
import time
from urllib.parse import urlparse
from urllib.request import Request, urlopen


CHANNEL_ID = "UCTHePQHat_CYO3tqRfxLFRw"
CHANNEL_URL = "https://www.youtube.com/@deadelustv"
VIDEOS_URL = CHANNEL_URL + "/videos"
MAX_PAGE_BYTES = 8_000_000
VIDEO_ID = re.compile(r"[A-Za-z0-9_-]{11}")
DURATION = re.compile(r"\d{1,3}:\d{2}(?::\d{2})?")


def text(node):
    if not isinstance(node, dict):
        return ""
    return node.get("simpleText") or node.get("content") or "".join(
        run.get("text", "") for run in node.get("runs", [])
    )


def walk(node):
    if isinstance(node, dict):
        yield node
        for value in node.values():
            yield from walk(value)
    elif isinstance(node, list):
        for value in node:
            yield from walk(value)


def select_video(data):
    metadata = data.get("metadata", {}).get("channelMetadataRenderer", {})
    if metadata.get("externalId") != CHANNEL_ID:
        raise ValueError("La page ne correspond pas a la chaine DeadelusTV attendue.")

    tabs = data.get("contents", {}).get("twoColumnBrowseResultsRenderer", {}).get("tabs", [])
    selected = next((item["tabRenderer"] for item in tabs
                     if item.get("tabRenderer", {}).get("selected")), None)
    if not selected:
        raise ValueError("Onglet selectionne introuvable.")
    endpoint = selected.get("endpoint", {}).get("commandMetadata", {}).get("webCommandMetadata", {}).get("url", "")
    allowed_paths = {"/@deadelustv/videos", "/channel/" + CHANNEL_ID + "/videos"}
    if urlparse(endpoint).path.lower() not in {p.lower() for p in allowed_paths}:
        raise ValueError("L'onglet selectionne n'est pas Videos ; aucune substitution par Shorts.")

    grid = selected.get("content", {}).get("richGridRenderer", {})
    chips = grid.get("header", {}).get("chipBarViewModel", {}).get("chips", [])
    if not chips:
        chips = grid.get("header", {}).get("feedFilterChipBarRenderer", {}).get("contents", [])
    if not chips:
        raise ValueError("Tri des videos impossible a verifier.")
    first_chip = chips[0].get("chipViewModel", chips[0].get("chipCloudChipRenderer", {}))
    sort_name = text(first_chip.get("text", {})) if isinstance(first_chip.get("text"), dict) else first_chip.get("text", "")
    if sort_name not in {"Les plus récentes", "Récentes", "Latest"} or not first_chip.get("selected", first_chip.get("isSelected", False)):
        raise ValueError("Le tri des videos les plus recentes n'est pas actif.")

    for item in grid.get("contents", []):
        content = item.get("richItemRenderer", {}).get("content", {})
        modern = content.get("lockupViewModel")
        legacy = content.get("videoRenderer")
        if modern:
            if modern.get("contentType") != "LOCKUP_CONTENT_TYPE_VIDEO":
                continue
            video_id = modern.get("contentId", "")
            title = text(modern.get("metadata", {}).get("lockupMetadataViewModel", {}).get("title", {}))
            thumbnail_model = modern.get("contentImage", {}).get("thumbnailViewModel", {})
            thumbnails = thumbnail_model.get("image", {}).get("sources", [])
            badges = [node["thumbnailBadgeViewModel"] for node in walk(thumbnail_model.get("overlays", []))
                      if "thumbnailBadgeViewModel" in node]
            # A duration badge identifies a published recording; upcoming and
            # live badges are not accepted. Duration is NOT a Shorts filter.
            has_duration = any(DURATION.fullmatch(str(badge.get("text", ""))) for badge in badges)
            unavailable = any(any(word in str(badge.get("badgeStyle", "")) for word in ("LIVE", "UPCOMING"))
                              for badge in badges)
        elif legacy:
            video_id = legacy.get("videoId", "")
            title = text(legacy.get("title", {}))
            thumbnails = legacy.get("thumbnail", {}).get("thumbnails", [])
            has_duration = bool(DURATION.fullmatch(text(legacy.get("lengthText", {}))))
            unavailable = bool(legacy.get("upcomingEventData")) or any(
                node.get("style") in {"LIVE", "UPCOMING"} for node in walk(legacy.get("thumbnailOverlays", [])))
        else:
            continue

        if not VIDEO_ID.fullmatch(video_id) or not title or unavailable or not has_duration:
            continue
        images = [image for image in thumbnails
                  if urlparse(image.get("url", "")).scheme == "https"
                  and urlparse(image.get("url", "")).hostname == "i.ytimg.com"]
        if not images:
            raise ValueError("Miniature YouTube absente pour la derniere video.")
        thumbnail = max(images, key=lambda image: image.get("width", 0))
        return {
            "schemaVersion": 1,
            "channelId": CHANNEL_ID,
            "channelUrl": CHANNEL_URL,
            "source": VIDEOS_URL,
            "videoId": video_id,
            "title": title.strip(),
            "url": "https://www.youtube.com/watch?v=" + video_id,
            "thumbnail": thumbnail["url"],
        }
    raise ValueError("Aucune video principale publiee trouvee ; derniere valeur conservee.")


def fetch_video():
    request = Request(VIDEOS_URL + "?hl=fr&gl=FR", headers={
        "User-Agent": "Mozilla/5.0",
        "Accept-Language": "fr-FR,fr;q=0.9",
    })
    with urlopen(request, timeout=25) as response:
        page = response.read(MAX_PAGE_BYTES + 1)
        final_url = urlparse(response.url)
    if final_url.hostname != "www.youtube.com" or final_url.path.rstrip("/") not in {"/@deadelustv/videos", "/channel/" + CHANNEL_ID + "/videos"}:
        raise ValueError("YouTube n'a pas retourne l'onglet public attendu.")
    if len(page) > MAX_PAGE_BYTES:
        raise ValueError("Page YouTube trop volumineuse.")
    html = page.decode("utf-8")
    match = re.search(r"(?:var\s+)?ytInitialData\s*=\s*", html)
    if not match:
        raise ValueError("Donnees publiques YouTube absentes ou structure modifiee.")
    data, _ = json.JSONDecoder().raw_decode(html[match.end():])
    return select_video(data)


def write_metadata(output, video):
    payload = json.dumps(video, ensure_ascii=False, indent=2) + "\n"
    output.parent.mkdir(parents=True, exist_ok=True)
    if output.is_file() and output.read_text(encoding="utf-8") == payload:
        return
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=output.parent,
                                         prefix=".youtube-", delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(payload)
        temporary.chmod(0o644)
        os.replace(temporary, output)
    finally:
        if temporary and temporary.exists():
            temporary.unlink()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path("public/data/latest-youtube.json"))
    args = parser.parse_args()
    for attempt in range(2):
        try:
            video = fetch_video()
            write_metadata(args.output, video)
            print("YouTube : " + video["title"] + " [" + video["videoId"] + "]")
            return 0
        except (OSError, ValueError, KeyError, TypeError) as error:
            if attempt == 0:
                time.sleep(2)
            else:
                print("Actualisation YouTube impossible : " + str(error), file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
