#!/usr/bin/env python3
"""Contrôle des fichiers statiques à publier, sans dépendance externe."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1] / "public"


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.local_assets = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if tag == "a" and attrs.get("target") == "_blank":
            if "noopener" not in attrs.get("rel", "").split():
                self.errors.append("Un lien externe manque de rel=noopener.")
        if tag in ("script", "img", "source"):
            self.local_assets.append(attrs.get("src", ""))
        if tag == "link" and attrs.get("rel") in ("stylesheet", "icon"):
            self.local_assets.append(attrs.get("href", ""))


def main():
    errors = []
    for path in ROOT.rglob("*"):
        if path.is_symlink():
            errors.append(f"Lien symbolique interdit dans public/: {path.name}")
        if path.name.startswith(".") or path.name.startswith("_mobile-check"):
            errors.append(f"Fichier de travail dans public/: {path.name}")
    for source in ROOT.rglob("*.html"):
        page = Page()
        text = source.read_text(encoding="utf-8")
        page.feed(text)
        if 'data-legal-pending="true"' in text and '--allow-legal-pending' not in sys.argv:
            errors.append("Textes légaux non finalisés : ne pas déployer les pages provisoires.")
        errors.extend(page.errors)
        errors.extend(f"Identifiant HTML répété : {key}" for key, n in Counter(page.ids).items() if n > 1)
        for asset in filter(None, page.local_assets):
            url = urlsplit(asset)
            if url.scheme or url.netloc or not url.path:
                continue
            target = (ROOT / unquote(url.path.lstrip("/")) if url.path.startswith("/")
                      else source.parent / unquote(url.path)).resolve()
            if not target.is_relative_to(ROOT.resolve()) or not target.is_file():
                errors.append(f"Ressource locale introuvable : {asset}")
    if not (ROOT / "index.html").is_file():
        errors.append("public/index.html est manquant.")
    if errors:
        raise SystemExit("\n".join(errors))
    print("Fichiers statiques vérifiés.")


if __name__ == "__main__":
    main()
